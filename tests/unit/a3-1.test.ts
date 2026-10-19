import { describe, expect, it } from 'vitest';
import {
  CHIMP_2N, FUSION_AT, HUMAN_2N, VESTIGIAL_CEN_AT, autosomes, centromereClass, check, chimp2, chromTypes, chromosomesOf,
  diagnose, patternCode, samples, shuffle, slotIds, solve, typeById,
} from '../../src/sims/models/a3-1-karyogram';
import { HUMAN_MB, chromNumbers, formatSize, genomes, logPos, versusHuman } from '../../src/sims/models/a3-1-genomes';
import { correctRoute, firstWrongStep, follow, key, specimens } from '../../src/sims/models/a3-1-key';

const sample = (id: string) => samples.find((s) => s.id === id)!;

describe('karyogram data', () => {
  it('has 22 autosomes plus X and Y, with chromosome 1 the longest and 21 the shortest', () => {
    expect(chromTypes).toHaveLength(24);
    const byLen = [...chromTypes].sort((a, b) => b.mb - a.mb);
    expect(byLen[0]!.id).toBe('1');
    expect(byLen[byLen.length - 1]!.id).toBe('21');
    expect(typeById.get('1')!.mb / typeById.get('21')!.mb).toBeGreaterThan(5);
    expect(typeById.get('21')!.mb).toBeLessThan(typeById.get('22')!.mb);
    expect(typeById.get('Y')!.mb).toBeLessThan(typeById.get('X')!.mb / 2);
  });
  it('classifies centromere positions as in the Denver groups', () => {
    for (const id of ['13', '14', '15', '21', '22', 'Y'] as const) expect(centromereClass(typeById.get(id)!.ci)).toBe('acrocentric');
    for (const id of ['1', '3', '19', '20'] as const) expect(centromereClass(typeById.get(id)!.ci)).toBe('metacentric');
    for (const id of ['2', '4', '5', '12', 'X'] as const) expect(centromereClass(typeById.get(id)!.ci)).toBe('submetacentric');
  });
  it('gives each chromosome type its own banding pattern and pattern letter', () => {
    const patterns = new Set(chromTypes.map((t) => JSON.stringify(t.bands)));
    expect(patterns.size).toBe(24);
    expect(new Set(patternCode.values()).size).toBe(24);
    for (const t of chromTypes) {
      expect(t.bands.length).toBeGreaterThan(0);
      for (const [s, e] of t.bands) { expect(s).toBeGreaterThanOrEqual(0); expect(e).toBeLessThanOrEqual(1); expect(e).toBeGreaterThan(s); }
    }
  });
});

describe('karyotypes', () => {
  it('typical cells have 46 chromosomes (an even number) and trisomy 21 has 47', () => {
    expect(chromosomesOf(sample('A'))).toHaveLength(HUMAN_2N);
    expect(chromosomesOf(sample('C'))).toHaveLength(46);
    expect(chromosomesOf(sample('B'))).toHaveLength(47);
    expect(HUMAN_2N % 2).toBe(0);
  });
  it('deduces sex from the sex chromosomes and names the trisomy', () => {
    expect(diagnose(chromosomesOf(sample('A')))).toMatchObject({ sex: 'female', formula: '46,XX', trisomies: [] });
    expect(diagnose(chromosomesOf(sample('C')))).toMatchObject({ sex: 'male', formula: '46,XY' });
    expect(diagnose(chromosomesOf(sample('B')))).toMatchObject({ sex: 'male', count: 47, formula: '47,XY,+21', trisomies: ['21'] });
  });
  it('a solved karyogram passes every group; homologues are interchangeable', () => {
    for (const s of samples) {
      const chroms = shuffle(chromosomesOf(s), 42);
      const r = check(chroms, solve(chroms));
      expect(r.complete).toBe(true);
      expect(r.correct).toBe(slotIds.length);
      expect(r.unplaced).toBe(0);
    }
  });
  it('flags a misplaced chromosome, an incomplete pair and an empty slot', () => {
    const chroms = chromosomesOf(sample('B'));
    const placement: Record<string, string | undefined> = solve(chroms);
    const a21 = chroms.find((c) => c.type === '21')!;
    placement[a21.uid] = '22';
    const r = check(chroms, placement);
    expect(r.slots['22']).toBe('wrong');
    expect(r.slots['21']).toBe('incomplete'); // two of the three 21s
    expect(r.complete).toBe(false);
    const none = check(chroms, {});
    expect(none.slots['1']).toBe('empty');
    expect(none.unplaced).toBe(47);
  });
  it('shuffling keeps every chromosome and is reproducible', () => {
    const list = chromosomesOf(sample('A'));
    const s1 = shuffle(list, 7), s2 = shuffle(list, 7);
    expect(s1.map((c) => c.uid)).toEqual(s2.map((c) => c.uid));
    expect([...s1].sort((a, b) => a.uid.localeCompare(b.uid))).toEqual([...list].sort((a, b) => a.uid.localeCompare(b.uid)));
    expect(s1.map((c) => c.uid)).not.toEqual(list.map((c) => c.uid));
  });
});

describe('chromosome 2 fusion', () => {
  it('two ape chromosomes fused into one explains 48 → 46', () => {
    expect(CHIMP_2N - 2).toBe(HUMAN_2N);
    expect(autosomes.length).toBe(22);
  });
  it('chimpanzee 2A + 2B together are the length of human 2', () => {
    expect(chimp2.a.mb + chimp2.b.mb).toBeCloseTo(typeById.get('2')!.mb, 0);
  });
  it('human 2 banding is the 2A pattern followed by the 2B pattern', () => {
    const h = typeById.get('2')!.bands;
    expect(h).toHaveLength(chimp2.a.bands.length + chimp2.b.bands.length);
    const firstB = h[chimp2.a.bands.length]!;
    expect(firstB[0]).toBeGreaterThanOrEqual(FUSION_AT - 1e-9);
    expect(h[chimp2.a.bands.length - 1]![1]).toBeLessThanOrEqual(FUSION_AT + 1e-9);
  });
  it('the functional centromere matches 2A and the vestigial one lies in the 2B-derived part', () => {
    expect(chimp2.a.ci * FUSION_AT).toBeCloseTo(typeById.get('2')!.ci, 2);
    expect(VESTIGIAL_CEN_AT).toBeGreaterThan(FUSION_AT);
    expect(FUSION_AT + chimp2.b.ci * (1 - FUSION_AT)).toBeCloseTo(VESTIGIAL_CEN_AT, 2);
  });
});

describe('genome sizes', () => {
  it('prokaryotes have the smallest genomes', () => {
    const bacteria = genomes.filter((g) => g.group === 'bacterium');
    const euk = genomes.filter((g) => g.group !== 'bacterium');
    expect(Math.max(...bacteria.map((g) => g.mb))).toBeLessThan(Math.min(...euk.map((g) => g.mb)));
  });
  it('genome size does not follow complexity: several plants and animals exceed the human genome', () => {
    const bigger = genomes.filter((g) => g.mb > HUMAN_MB).map((g) => g.id);
    expect(bigger).toEqual(expect.arrayContaining(['onion', 'axolotl', 'paris']));
    expect(genomes.find((g) => g.id === 'onion')!.mb / HUMAN_MB).toBeGreaterThan(4.5);
    expect(genomes.find((g) => g.id === 'paris')!.mb / HUMAN_MB).toBeGreaterThan(45);
    expect(genomes.find((g) => g.id === 'pufferfish')!.mb).toBeLessThan(HUMAN_MB / 5);
  });
  it('the log axis spans every value and the formatter picks sensible units', () => {
    for (const g of genomes) { expect(logPos(g.mb)).toBeGreaterThan(0); expect(logPos(g.mb)).toBeLessThan(1); }
    expect(formatSize(0.58)).toBe('580 kb');
    expect(formatSize(4.6)).toBe('4.6 Mb');
    expect(formatSize(3100)).toBe('3.1 Gb');
    expect(formatSize(149000)).toBe('149 Gb');
    expect(versusHuman(16000)).toMatch(/5\.2 times/);
  });
  it('diploid chromosome numbers are even, humans 46 and chimpanzees 48', () => {
    for (const c of chromNumbers) expect(c.n2 % 2).toBe(0);
    expect(chromNumbers.find((c) => c.id === 'human')!.n2).toBe(46);
    expect(chromNumbers.find((c) => c.id === 'chimp')!.n2).toBe(48);
    const horse = chromNumbers.find((c) => c.id === 'horse')!.n2, donkey = chromNumbers.find((c) => c.id === 'donkey')!.n2;
    expect((horse + donkey) / 2).toBe(63); // a mule's 32 + 31
  });
});

describe('dichotomous key', () => {
  it('has n − 1 couplets, each with exactly two leads', () => {
    expect(key).toHaveLength(specimens.length - 1);
    for (const c of key) { expect(c.a.text).not.toBe(c.b.text); expect(c.a.to).toBeDefined(); expect(c.b.to).toBeDefined(); }
  });
  it('every specimen satisfies exactly one statement at each couplet on its route and is identified correctly', () => {
    for (const s of specimens) expect(correctRoute(s).result).toBe(s.id);
  });
  it('every species appears exactly once at the end of a lead and every couplet is reachable', () => {
    const ends = key.flatMap((c) => [c.a.to, c.b.to]).filter((t) => 'species' in t).map((t) => (t as { species: string }).species);
    expect([...ends].sort()).toEqual(specimens.map((s) => s.id).sort());
    const targets = new Set(key.flatMap((c) => [c.a.to, c.b.to]).filter((t) => 'couplet' in t).map((t) => (t as { couplet: number }).couplet));
    for (const c of key) if (c.n !== 1) expect(targets.has(c.n)).toBe(true);
  });
  it('each couplet splits the specimens reaching it into two non-empty groups', () => {
    for (const c of key) {
      const reaching = specimens.filter((s) => correctRoute(s).steps.some((st) => st.couplet === c.n));
      const a = reaching.filter((s) => c.a.test(s.traits));
      const b = reaching.filter((s) => c.b.test(s.traits));
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
      expect(a.length + b.length).toBe(reaching.length);
    }
  });
  it('follows a reader route and reports the first wrong couplet', () => {
    expect(follow(['b', 'a', 'a'])).toMatchObject({ at: null, result: 'ladybird' });
    expect(follow(['b'])).toMatchObject({ at: 3, result: null });
    const spider = specimens.find((s) => s.id === 'spider')!;
    expect(firstWrongStep(spider, ['b', 'a', 'b'])).toBe(3);
    expect(firstWrongStep(spider, ['b', 'b', 'a'])).toBeNull();
  });
});
