import raw from '../../syllabus.json';
import { syllabusSchema, type SyllabusTopic } from '../schemas';

/** The whole syllabus, validated once at import time so a malformed file fails the build. */
export const syllabus = syllabusSchema.parse(raw);
export const topics: SyllabusTopic[] = syllabus.topics;
export const themes = syllabus.themes;

/** "B2.1" -> "b2-1": the content folder and collection id for a topic. */
export const idOf = (code: string) => code.toLowerCase().replace('.', '-');

export function topicByCode(code: string): SyllabusTopic {
  const t = topics.find((x) => x.code === code);
  if (!t) throw new Error(`Unknown topic code ${code}`);
  return t;
}

export const themeSlug = (id: string) => {
  const th = themes.find((t) => t.id === id)!;
  return `${id.toLowerCase()}-${th.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
};

/** Topics grouped by theme, then by level of organisation (Molecules → Ecosystems). */
export function topicsByThemeAndLevel() {
  return themes.map((theme) => ({
    theme,
    levels: syllabus.organisation_levels.map((lvl) => ({
      level: lvl,
      topics: topics.filter((t) => t.theme === theme.id && t.organisation_level === lvl),
    })),
  }));
}

export const levelLabel = (status: SyllabusTopic['status']) =>
  status === 'AHL' ? 'AHL only' : status === 'SL' ? 'SL and HL' : 'SL and HL, with AHL content';
