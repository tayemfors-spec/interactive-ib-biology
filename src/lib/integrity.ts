import type { CollectionEntry } from 'astro:content';
import type { SyllabusTopic } from '../schemas';

export interface SectionMeta { id: string; title: string; level: 'SL' | 'AHL'; covers: string[] }

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** Read the <Section …> tags from a topic's MDX source: they define the page outline. */
export function parseSections(body: string): SectionMeta[] {
  return [...body.matchAll(/<Section\b[^>]*>/g)].map(([tag]) => ({
    id: attr(tag, 'id') ?? '',
    title: attr(tag, 'title') ?? '',
    level: (attr(tag, 'level') ?? 'SL') as 'SL' | 'AHL',
    covers: (attr(tag, 'covers') ?? '').split(/[\s,]+/).filter(Boolean),
  }));
}

/** The visual ids a topic's MDX uses, e.g. <Viewer3D topic="b2-1" id="membrane" />. */
export function parseVisualRefs(body: string): string[] {
  return [...body.matchAll(/<(?:Viewer3D|Anim|Sim)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]!);
}

interface Bundle {
  topic: CollectionEntry<'topics'>;
  syllabus: SyllabusTopic;
  quiz?: CollectionEntry<'quizzes'>;
  cards?: CollectionEntry<'flashcards'>;
  visuals?: CollectionEntry<'visuals'>;
  facts?: CollectionEntry<'facts'>;
}

/** Cross-file checks the schemas can't express. Returns a list of human-readable problems. */
export function checkTopic({ topic, syllabus, quiz, cards, visuals, facts }: Bundle): string[] {
  const p: string[] = [];
  const where = `${syllabus.code} (src/content/topics/${topic.id})`;
  if (topic.data.code !== syllabus.code) p.push(`${where}: frontmatter code ${topic.data.code} does not match folder`);
  if (!quiz) p.push(`${where}: missing quiz.yaml`);
  if (!cards) p.push(`${where}: missing flashcards.yaml`);
  if (!visuals) p.push(`${where}: missing visuals.yaml`);
  if (!facts) p.push(`${where}: missing facts.yaml`);

  const body = topic.body ?? '';
  const sections = parseSections(body);
  const levelOf = new Map(syllabus.understandings.map((u) => [u.code, u.level]));
  const covered = new Map<string, string>();
  for (const s of sections) {
    if (!s.id || !s.title) p.push(`${where}: a <Section> is missing id or title`);
    for (const c of s.covers) {
      if (!levelOf.has(c)) p.push(`${where}: section "${s.id}" covers unknown understanding ${c}`);
      if (covered.has(c)) p.push(`${where}: ${c} is covered by both "${covered.get(c)}" and "${s.id}"`);
      covered.set(c, s.id);
      if (levelOf.get(c) === 'AHL' && s.level !== 'AHL') p.push(`${where}: AHL understanding ${c} sits in non-AHL section "${s.id}"`);
    }
    if (s.level === 'AHL' && s.covers.some((c) => levelOf.get(c) === 'SL')) p.push(`${where}: AHL section "${s.id}" also covers SL content`);
  }
  for (const u of syllabus.understandings) if (!covered.has(u.code)) p.push(`${where}: understanding ${u.code} (${u.title}) is not covered by any section`);

  if (syllabus.status === 'AHL' && sections.some((s) => s.level !== 'AHL')) p.push(`${where}: AHL-only topic has a non-AHL section`);
  for (const q of quiz?.data.questions ?? []) {
    if (!levelOf.has(q.understanding)) p.push(`${where}: quiz ${q.id} targets unknown understanding ${q.understanding}`);
    else if (levelOf.get(q.understanding) !== q.level) p.push(`${where}: quiz ${q.id} level ${q.level} ≠ ${q.understanding} level`);
  }
  if (syllabus.status === 'AHL') {
    for (const c of cards?.data.cards ?? []) if (c.level !== 'AHL') p.push(`${where}: card ${c.id} must be AHL in an AHL-only topic`);
  }
  if (!body.includes('<Section')) p.push(`${where}: page has no <Section> blocks`);

  const defined = new Set(visuals?.data.visuals.map((v) => v.id));
  for (const ref of parseVisualRefs(body)) if (!defined.has(ref)) p.push(`${where}: visual "${ref}" used in MDX but not defined in visuals.yaml`);
  if (syllabus.visualisation.priority === 'high' && !visuals?.data.visuals.some((v) => v.kind === 'viewer3d' || v.kind === 'anim')) {
    p.push(`${where}: high-priority topic needs a 3D viewer or animation`);
  }
  // Internal links must go through withBase(); a hard-coded root link breaks on a sub-path.
  if (/\]\(\/(?!\/)|href="\/(?!\/)/.test(body)) p.push(`${where}: hard-coded root-relative link; use a relative slug or withBase()`);
  return p;
}
