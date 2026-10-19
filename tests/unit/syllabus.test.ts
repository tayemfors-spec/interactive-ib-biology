import { describe, expect, it } from 'vitest';
import raw from '../../syllabus.json';
import { syllabusSchema } from '../../src/schemas';

describe('syllabus.json', () => {
  const s = syllabusSchema.parse(raw);
  it('has 40 topics with unique codes and slugs', () => {
    expect(s.topics).toHaveLength(40);
    expect(new Set(s.topics.map((t) => t.code)).size).toBe(40);
    expect(new Set(s.topics.map((t) => t.slug)).size).toBe(40);
  });
  it('numbers understandings 1..n with SL before AHL, and status matches levels', () => {
    for (const t of s.topics) {
      t.understandings.forEach((u, i) => expect(u.code).toBe(`${t.code}.${i + 1}`));
      const levels = t.understandings.map((u) => u.level);
      const firstAhl = levels.indexOf('AHL');
      if (firstAhl >= 0) expect(levels.slice(firstAhl).every((l) => l === 'AHL')).toBe(true);
      const status = !levels.includes('AHL') ? 'SL' : levels.every((l) => l === 'AHL') ? 'AHL' : 'SL+AHL';
      expect(t.status, t.code).toBe(status);
    }
  });
  it('matches the guide for topics that are AHL-only and SL-only', () => {
    const by = (st: string) => s.topics.filter((t) => t.status === st).map((t) => t.code);
    expect(by('AHL')).toEqual(['A2.1', 'A2.3', 'A3.2', 'B3.3', 'C2.1', 'D2.2']);
    expect(by('SL')).toEqual(['A4.2', 'B1.1', 'B4.1', 'B4.2', 'C3.2', 'C4.1', 'C4.2']);
  });
});
