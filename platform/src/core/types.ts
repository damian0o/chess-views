/**
 * The platform's data types. Each is a Zod schema (checked at build time for content and at load
 * time for saved profiles) and the TypeScript type inferred from it. Lists such as the layer kinds
 * are defined once here and imported everywhere else.
 */
import { z } from 'zod';

// ---------- lists defined once ----------

export const LAYER_KINDS = ['territory', 'reach', 'roads', 'kings', 'shapes', 'diamond', 'knight', 'engine', 'pieces'] as const;
export const AGE_BANDS = ['kids', 'teens', 'adults'] as const;   // 8–12, 12–16, adult
export const EXPERIENCES = ['basic'] as const;                   // more levels later
export const LOCALES = ['pl', 'en'] as const;                    // pl is the default

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------- board basics ----------

export const SquareSchema = z.string().regex(/^[a-h][1-8]$/).brand<'Square'>();
export type Square = z.infer<typeof SquareSchema>;

export const ColorSchema = z.enum(['w', 'b']);
export type Color = z.infer<typeof ColorSchema>;

/** A six-field FEN; whether the position is legal is checked by the rules adapter, not here. */
export const FenSchema = z.string().regex(/^\S+ [wb] \S+ \S+ \d+ \d+$/).brand<'Fen'>();
export type Fen = z.infer<typeof FenSchema>;

export const PositionSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fen'), fen: FenSchema }),
  z.object({ kind: z.literal('pgn'), pgn: z.string().min(1), ply: z.number().int().min(0) }),
]);
export type PositionSource = z.infer<typeof PositionSourceSchema>;

// ---------- audience ----------

export const AgeBandSchema = z.enum(AGE_BANDS);
export type AgeBand = z.infer<typeof AgeBandSchema>;
export const ExperienceSchema = z.enum(EXPERIENCES);
export type Experience = z.infer<typeof ExperienceSchema>;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

/** Text per age band; `kids` is required, the others fall back to the next younger. */
export const AgedTextSchema = z.object({
  kids: z.string().min(1),
  teens: z.string().min(1).optional(),
  adults: z.string().min(1).optional(),
});
export type AgedText = z.infer<typeof AgedTextSchema>;

// ---------- scenes ----------

export const LayerKindSchema = z.enum(LAYER_KINDS);
export type LayerKind = z.infer<typeof LayerKindSchema>;

export const SceneSchema = z.object({
  position: PositionSourceSchema,
  base: z.enum(['board', 'diamond']),
  layers: z.array(LayerKindSchema),           // draw order; no 'pieces' means blocks only
  focus: z.array(SquareSchema).optional(),
  hideMoves: z.boolean().optional(),
  flip: z.boolean().optional(),
  lockedLayers: z.array(LayerKindSchema).optional(),   // hidden while the step's question is open
});
export type Scene = z.infer<typeof SceneSchema>;

// ---------- lessons ----------

export const LessonIdSchema = z.string().regex(SLUG).brand<'LessonId'>();
export type LessonId = z.infer<typeof LessonIdSchema>;
export const MomentIdSchema = z.string().regex(SLUG).brand<'MomentId'>();
export type MomentId = z.infer<typeof MomentIdSchema>;
/** "<lessonId>/<momentId>" */
export const MomentRefSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/).brand<'MomentRef'>();
export type MomentRef = z.infer<typeof MomentRefSchema>;

export const QuestionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('choice'), prompt: AgedTextSchema,
    choices: z.array(z.string().min(1).max(32)).min(2).max(4), answer: z.number().int().min(0),
    right: AgedTextSchema.optional(),
  }).refine((q) => q.answer < q.choices.length, { message: 'the answer is not one of the choices', path: ['answer'] }),
  z.object({ kind: z.literal('tap'), prompt: AgedTextSchema, squares: z.array(SquareSchema).min(1), right: AgedTextSchema.optional() }),
  z.object({ kind: z.literal('recall'), moment: MomentIdSchema, answer: z.enum(['yes', 'no']), right: AgedTextSchema.optional() }),
]);
export type Question = z.infer<typeof QuestionSchema>;

export const StepSchema = z.object({
  id: z.string().regex(SLUG),
  scene: SceneSchema,
  explain: AgedTextSchema,
  moment: MomentIdSchema.optional(),
  solve: z.object({ task: AgedTextSchema }).optional(),
  question: QuestionSchema.optional(),
  audience: z.object({ ages: z.array(AgeBandSchema).optional(), experience: z.array(ExperienceSchema).optional() }).optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const MomentSchema = z.object({
  id: MomentIdSchema,
  name: z.string().min(1),
  board: PositionSourceSchema,
  looksLike: z.array(MomentRefSchema).optional(),
});
export type Moment = z.infer<typeof MomentSchema>;

export const LessonSchema = z.object({
  id: LessonIdSchema,
  group: z.object({ kind: z.enum(['pattern', 'strategy', 'game']), id: z.string().regex(SLUG) }),
  title: z.string().min(1),
  about: AgedTextSchema,
  game: z.string().min(1).optional(),         // the name used in recognition answers
  experience: ExperienceSchema,
  moments: z.array(MomentSchema),
  steps: z.array(StepSchema).min(1),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const LibraryEntrySchema = z.object({
  id: z.string().regex(SLUG),
  name: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  note: AgedTextSchema,
  source: PositionSourceSchema,
  scene: SceneSchema.partial().optional(),
});
export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

// ---------- the child's profile ----------

export const ProfileSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().optional(),
  age: AgeBandSchema,
  experience: ExperienceSchema,
  locale: LocaleSchema,
  theme: z.object({ family: AgeBandSchema, mode: z.enum(['light', 'dark', 'system']) }),
  pieceStyle: z.enum(['images', 'letters']),
  progress: z.record(z.string(), z.object({ reachedStep: z.string(), done: z.boolean() })),
  unlockedLayers: z.array(LayerKindSchema),
});
export type Profile = z.infer<typeof ProfileSchema>;
