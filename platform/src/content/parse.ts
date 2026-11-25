/**
 * Reading one lesson file into a raw, line-numbered structure. No chess and no validation here:
 * `compile.ts` resolves positions and checks everything.
 *
 * Format:
 *   --- front matter (YAML) ---
 *   ## <step-id> {attrs}            a step; attrs is a YAML flow map
 *   ::: kids | teens | adults        an explanation block, closed by :::
 *   ? <prompt> {attrs}               the question (?teens / ?adults for other ages)
 *   - [x] right choice / - choice    choices of a choice question
 *   ! <text>                         shown after the right answer (!teens / !adults)
 */
import { parse as parseYaml } from 'yaml';

export type Age = 'kids' | 'teens' | 'adults';
export interface RawQuestion { line: number; prompt: Partial<Record<Age, string>>; attrs: Record<string, unknown>; choices: { text: string; right: boolean }[]; right: Partial<Record<Age, string>> }
export interface RawStep { id: string; line: number; attrs: Record<string, unknown>; explain: Partial<Record<Age, string>>; question?: RawQuestion }
export interface RawLesson { file: string; meta: Record<string, unknown>; metaLine: (key: string) => number; steps: RawStep[] }
export interface ParseError { file: string; line: number; message: string }

const ATTRS = /\s*(\{.*\})\s*$/;

function attrsOf(text: string, file: string, line: number, errors: ParseError[]): { rest: string; attrs: Record<string, unknown> } {
  const m = ATTRS.exec(text);
  if (!m) return { rest: text.trim(), attrs: {} };
  try {
    const v: unknown = parseYaml(m[1]!);
    if (v && typeof v === 'object' && !Array.isArray(v)) return { rest: text.slice(0, m.index).trim(), attrs: v as Record<string, unknown> };
  } catch { /* reported below */ }
  errors.push({ file, line, message: `cannot read the attributes ${m[1]}` });
  return { rest: text.slice(0, m.index).trim(), attrs: {} };
}

export function parseLesson(file: string, text: string): { lesson: RawLesson | null; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');   // Windows and old Mac line endings read the same
  if (lines[0]?.trim() !== '---') return { lesson: null, errors: [{ file, line: 1, message: 'a lesson starts with front matter (---)' }] };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) return { lesson: null, errors: [{ file, line: 1, message: 'the front matter is not closed (---)' }] };
  let meta: Record<string, unknown> = {};
  try { meta = (parseYaml(lines.slice(1, end).join('\n')) ?? {}) as Record<string, unknown>; }
  catch (e) { return { lesson: null, errors: [{ file, line: 1, message: `the front matter is not valid YAML: ${(e as Error).message}` }] }; }
  const metaLine = (key: string) => {
    const i = lines.slice(0, end).findIndex((l) => new RegExp(`^\\s*${key.replace(/[-/]/g, '\\$&')}:`).test(l));
    return i < 0 ? 1 : i + 1;
  };

  const steps: RawStep[] = [];
  let step: RawStep | null = null;
  let block: { age: Age; text: string[]; line: number } | null = null;
  for (let i = end + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    const line = i + 1;
    const l = raw.trim();
    if (block) {
      if (l === ':::') { if (step) step.explain[block.age] = block.text.join(' ').replace(/\s+/g, ' ').trim(); block = null; }
      else block.text.push(l);
      continue;
    }
    if (!l || l.startsWith('<!--')) continue;
    const heading = /^##\s+(\S+)(.*)$/.exec(l);
    if (heading) {
      const { attrs } = attrsOf(heading[2] ?? '', file, line, errors);
      step = { id: heading[1]!, line, attrs, explain: {} };
      steps.push(step);
      continue;
    }
    if (!step) { errors.push({ file, line, message: 'text before the first step (## id)' }); continue; }
    const open = /^:::\s*(kids|teens|adults)\s*$/.exec(l);
    if (open) { block = { age: open[1] as Age, text: [], line }; continue; }
    const q = /^\?(teens|adults)?\s+(.*)$/.exec(l);
    if (q) {
      const age = (q[1] ?? 'kids') as Age;
      const { rest, attrs } = attrsOf(q[2]!, file, line, errors);
      if (!step.question) step.question = { line, prompt: {}, attrs: {}, choices: [], right: {} };
      step.question.prompt[age] = rest;
      Object.assign(step.question.attrs, attrs);
      continue;
    }
    const choice = /^-\s+(\[x\]\s+)?(.+)$/.exec(l);
    if (choice && step.question) { step.question.choices.push({ text: choice[2]!.trim(), right: !!choice[1] }); continue; }
    const right = /^!(teens|adults)?\s+(.+)$/.exec(l);
    if (right && step.question) { step.question.right[(right[1] ?? 'kids') as Age] = right[2]!.trim(); continue; }
    errors.push({ file, line, message: `unexpected text: ${l.slice(0, 40)}` });
  }
  if (block) errors.push({ file, line: block.line, message: 'an explanation block is not closed (:::)' });
  return { lesson: { file, meta, metaLine, steps }, errors };
}
