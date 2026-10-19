import { z } from 'astro/zod';

/** Topic codes such as "B2.1"; understanding codes such as "B2.1.14". */
export const topicCode = z.string().regex(/^[A-D][1-4]\.[1-3]$/);
export const understandingCode = z.string().regex(/^[A-D][1-4]\.[1-3]\.\d{1,2}$/);
export const level = z.enum(['SL', 'AHL']);
export type Level = z.infer<typeof level>;

// ---------- syllabus.json ----------

export const understandingSchema = z.object({
  code: understandingCode,
  level,
  title: z.string().min(3).max(90),
  summary: z.string().min(20),
});

export const syllabusTopicSchema = z.object({
  code: topicCode,
  title: z.string(),
  slug: z.string().regex(/^[a-d][1-4]-[1-3]-[a-z0-9-]+$/),
  theme: z.enum(['A', 'B', 'C', 'D']),
  organisation_level: z.enum(['Molecules', 'Cells', 'Organisms', 'Ecosystems']),
  status: z.enum(['SL', 'SL+AHL', 'AHL']),
  hours: z.object({ sl_hl: z.number(), ahl: z.number() }),
  big_questions: z.array(z.string()).min(1),
  understandings: z.array(understandingSchema).min(1),
  named_examples: z.array(z.string()),
  required_skills: z.array(z.string()),
  visualisation: z.object({
    priority: z.enum(['high', 'medium', 'low']),
    reason: z.string(),
  }),
});
export type SyllabusTopic = z.infer<typeof syllabusTopicSchema>;

export const syllabusSchema = z.object({
  guide: z.object({ subject: z.string(), first_assessment: z.number(), reference_version: z.string() }),
  themes: z.array(z.object({ id: z.enum(['A', 'B', 'C', 'D']), title: z.string() })).length(4),
  organisation_levels: z.array(z.string()).length(4),
  topics: z.array(syllabusTopicSchema).length(40),
});
export type Syllabus = z.infer<typeof syllabusSchema>;

// ---------- topic page frontmatter (src/content/topics/<id>/index.mdx) ----------

export const topicFrontmatterSchema = z.object({
  code: topicCode,
  /** Meta description: shown in Google results. */
  description: z.string().min(70).max(160),
  updated: z.coerce.date(),
  related: z.array(topicCode).default([]),
  mustKnow: z
    .array(z.object({ term: z.string(), definition: z.string().min(15), level }))
    .min(4),
  mistakes: z
    .array(z.object({ wrong: z.string().min(10), right: z.string().min(15), level }))
    .min(3),
});
export type TopicFrontmatter = z.infer<typeof topicFrontmatterSchema>;

// ---------- quiz.yaml ----------

const optionSchema = z.object({
  id: z.string().regex(/^[a-e]$/),
  text: z.string().min(1),
  /** Why this option is right or wrong; shown after the student checks their answer. */
  why: z.string().min(15),
});

export const quizSchema = z.object({
  questions: z
    .array(
      z
        .object({
          id: z.string().regex(/^q\d{1,2}$/),
          level,
          understanding: understandingCode,
          stem: z.string().min(10),
          options: z.array(optionSchema).min(3).max(5),
          answer: z.string().regex(/^[a-e]$/),
        })
        .refine((q) => q.options.some((o) => o.id === q.answer), { message: 'answer must match an option id' })
        .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, {
          message: 'option ids must be unique',
        }),
    )
    .min(5)
    .max(10)
    .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, { message: 'question ids must be unique' }),
});
export type Quiz = z.infer<typeof quizSchema>;

// ---------- flashcards.yaml ----------

export const flashcardsSchema = z.object({
  cards: z
    .array(z.object({ id: z.string().regex(/^c\d{1,2}$/), level, front: z.string().min(3), back: z.string().min(3) }))
    .min(8)
    .refine((cs) => new Set(cs.map((c) => c.id)).size === cs.length, { message: 'card ids must be unique' }),
});
export type Flashcards = z.infer<typeof flashcardsSchema>;

// ---------- visuals.yaml ----------

export const labelSchema = z.object({
  /** Must match an anchor id exported by the scene module. */
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  text: z.string().min(15).max(260),
  level: level.default('SL'),
});
export type LabelDef = z.infer<typeof labelSchema>;

export const stepSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  caption: z.string().min(15),
  level: level.default('SL'),
});
export type StepDef = z.infer<typeof stepSchema>;

const visualBase = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  /** Short alternative text for the visual as a whole. */
  alt: z.string().min(10).max(160),
  /** Full text description for screen-reader users and anyone who prefers text. */
  description: z.string().min(120),
  level: level.default('SL'),
};

export const sceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** File name in src/scenes without extension, e.g. "b2-1-membrane". */
  module: z.string().regex(/^[a-d][1-4]-[1-3]-[a-z0-9-]+$/),
  title: z.string(),
  labels: z.array(labelSchema).default([]),
  steps: z.array(stepSchema).default([]),
});
export type SceneDef = z.infer<typeof sceneSchema>;

export const visualSchema = z.discriminatedUnion('kind', [
  z.object({ ...visualBase, kind: z.literal('viewer3d'), scenes: z.array(sceneSchema).min(1) }),
  z.object({
    ...visualBase,
    kind: z.literal('anim'),
    module: z.string().regex(/^[a-d][1-4]-[1-3]-[a-z0-9-]+$/),
    steps: z.array(stepSchema).min(2),
  }),
  z.object({ ...visualBase, kind: z.literal('sim'), module: z.string() }),
]);
export type VisualDef = z.infer<typeof visualSchema>;

export const visualsSchema = z.object({ visuals: z.array(visualSchema).min(1) });

// ---------- facts.yaml (not published; feeds REVIEW.md) ----------

export const factsSchema = z.object({
  facts: z.array(
    z.object({
      id: z.string(),
      claim: z.string(),
      where: z.array(z.string()).min(1),
      confidence: z.enum(['high', 'medium', 'low']),
      basis: z.string(),
      status: z.enum(['open', 'checked', 'disputed']),
    }),
  ),
});
