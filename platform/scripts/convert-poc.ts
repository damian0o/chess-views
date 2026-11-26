/**
 * One-off: convert the proof of concept's positions.json into the platform's content format.
 * Writes content/library.yaml, content/en/library.yaml, the English lesson files and
 * content/poc-step-ids.json. Polish files are written separately (translations of these).
 * Run: npx tsx scripts/convert-poc.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';

type PocStep = {
  fen?: string; pgn?: string; ply?: number; pos?: string; same?: boolean; view: string; sq?: string; solve?: boolean; task?: string;
  flip?: boolean; shapes?: { gate?: boolean }; say?: string; moment?: string; recall?: boolean; blocks?: boolean;
  ask?: { q: string; choices?: string[]; answer?: number; tap?: string[]; right?: string };
};
type PocLesson = { id: string; name: string; about: string; game?: string; moments?: { id: string; name: string; fen?: string; pgn?: string; ply?: number; pos?: string; looksLike?: string[] }[]; steps: PocStep[] };
type PocPosition = { id: string; name: string; tags: string[]; view: string; fen?: string; pgn?: string; ply?: number; note: string };

const ROOT = new URL('../content/', import.meta.url).pathname;
const poc = JSON.parse(readFileSync(new URL('../../positions.json', import.meta.url), 'utf8')) as { positions: PocPosition[]; lessons: PocLesson[] };
const write = (rel: string, text: string) => { const p = join(ROOT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };

const SCENE: Record<string, string> = {
  board: 'board', territory: 'board+territory', reach: 'board+reach', roads: 'board+roads', kings: 'board+kings',
  engine: 'board+engine', diamond: 'diamond', shapes: 'blocks', knight: 'board+knight',
};
const LAYERS: Record<string, string[]> = { board: ['pieces'], territory: ['pieces', 'territory'], reach: ['pieces', 'reach'], roads: ['pieces', 'roads'], kings: ['pieces', 'kings'], engine: ['pieces', 'engine'], diamond: ['pieces', 'diamond'], shapes: ['shapes'], knight: ['pieces', 'knight'] };

/** Steps now show their layers by themselves: drop the leading "Open **View**." sentence. */
const stripOpen = (say: string) => say
  .replace(/^Open \*\*[^*]+\*\*\.\s*/, '')
  .replace(/Open \*\*[^*]+\*\*, (\w)/, (_m, c: string) => c.toUpperCase())
  .trim() || say;
const flow = (attrs: Record<string, unknown>) => `{${Object.entries(attrs).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}}`;
const slugView = (v: string) => (v === 'kings' ? 'houses' : v);

// ---------- library ----------
write('library.yaml', stringify(poc.positions.map((p) => ({
  id: p.id, tags: p.tags,
  source: p.fen ? { kind: 'fen', fen: p.fen } : { kind: 'pgn', pgn: p.pgn, ply: p.ply },
  scene: { base: p.view === 'diamond' ? 'diamond' : 'board', layers: LAYERS[p.view] ?? ['pieces'] },
}))));
write('en/library.yaml', stringify(Object.fromEntries(poc.positions.map((p) => [p.id, { name: p.name, note: p.note }]))));

// ---------- lessons ----------
const GROUP: Record<string, { kind: string; id: string; dir: string; file: string }> = {
  'scholars-mate': { kind: 'pattern', id: 'f7-attack', dir: 'patterns/f7-attack', file: '1-scholars-mate' },
  'eyes-on-f7': { kind: 'pattern', id: 'f7-attack', dir: 'patterns/f7-attack', file: '2-eyes-on-f7' },
  'opera-game-lesson': { kind: 'game', id: 'opera-game', dir: 'games', file: 'opera-game' },
  'legal-mate': { kind: 'game', id: 'legal-mate', dir: 'games', file: 'legal-mate' },
  'reti-tartakower': { kind: 'game', id: 'reti-tartakower', dir: 'games', file: 'reti-tartakower' },
  'lasker-thomas': { kind: 'game', id: 'lasker-thomas', dir: 'games', file: 'lasker-thomas' },
};

const ids: Record<string, string[]> = {};
for (const L of poc.lessons) {
  const g = GROUP[L.id];
  if (!g) throw new Error(`no group for ${L.id}`);
  const meta: Record<string, unknown> = { id: L.id, group: { kind: g.kind, id: g.id }, title: L.name, about: L.about, ...(L.game ? { game: L.game } : {}), experience: 'basic' };
  if (L.moments?.length) meta.moments = Object.fromEntries(L.moments.map((m) => [m.id, {
    name: m.name, ...(m.fen ? { fen: m.fen } : {}), ...(m.pgn ? { pgn: m.pgn } : {}), ...(m.pos ? { pos: m.pos } : {}), ...(m.ply !== undefined ? { ply: m.ply } : {}), ...(m.looksLike ? { looksLike: m.looksLike } : {}),
  }]));
  const stepIds: string[] = [];
  const body = L.steps.map((s, i) => {
    const id = `s${String(i + 1).padStart(2, '0')}-${s.recall || s.blocks ? 'blocks' : slugView(s.view)}`;
    stepIds.push(id);
    const yesNo = !!s.ask?.choices && s.ask.choices.join() === 'Yes,No';
    const recallNo = !!s.blocks && !!s.moment && yesNo;
    const attrs: Record<string, unknown> = { scene: s.recall || s.blocks ? 'blocks' : SCENE[s.view] };
    if (s.fen) attrs.fen = s.fen;
    if (s.pgn) attrs.pgn = s.pgn;
    if (s.pos) attrs.pos = s.pos;
    if (s.same) attrs.same = true;
    if (s.ply !== undefined) attrs.ply = s.ply;
    if (s.sq) attrs.focus = s.sq;
    if (s.moment) attrs.moment = s.moment;
    if (s.solve) attrs.solve = s.task ?? 'Find the move';
    if (s.flip) attrs.flip = true;
    const lines = [`## ${id} ${flow(attrs)}`, '', '::: kids', stripOpen(s.say ?? ''), ':::'];
    if (s.recall) lines.push('', `? ${s.ask?.q ?? 'Is this the moment?'} ${flow({ recall: s.moment, answer: 'yes' })}`);
    else if (recallNo) lines.push('', `? ${s.ask!.q} ${flow({ recall: s.moment, answer: s.ask!.answer === 0 ? 'yes' : 'no' })}`);
    else if (s.ask?.tap) lines.push('', `? ${s.ask.q} ${flow({ tap: s.ask.tap.length === 1 ? s.ask.tap[0] : s.ask.tap })}`);
    else if (s.ask?.choices) {
      lines.push('', `? ${s.ask.q}`);
      s.ask.choices.forEach((c, k) => lines.push(`- ${k === s.ask!.answer ? '[x] ' : ''}${c}`));
    }
    if (s.ask?.right) lines.push(`! ${s.ask.right}`);
    return lines.join('\n');
  });
  ids[L.id] = stepIds;
  write(`en/${g.dir}/${g.file}.md`, `---\n${stringify(meta)}---\n\n${body.join('\n\n')}\n`);
}
write('poc-step-ids.json', `${JSON.stringify(ids, null, 2)}\n`);
console.log(`converted ${poc.lessons.length} lessons and ${poc.positions.length} positions`);
