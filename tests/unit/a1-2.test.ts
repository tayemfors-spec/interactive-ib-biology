import { describe, expect, it } from 'vitest';
import { as5to3, clean, complement, possibleSequences, randomStrand, rnaComplement, stats } from '../../src/sims/models/a1-2-pairing';
import { fitsTetranucleotide, organisms, ratios } from '../../src/sims/models/a1-2-chargaff';

describe('A1.2 base pairing model', () => {
  it('pairs A with T and G with C, and the complement of the complement is the original', () => {
    const { seq } = clean('ATGCCGTA');
    expect(complement(seq).join('')).toBe('TACGGCAT');
    expect(complement(complement(seq)).join('')).toBe('ATGCCGTA');
  });
  it('uses uracil, not thymine, in the RNA complement', () => {
    const rna = rnaComplement(clean('AATTGC').seq).join('');
    expect(rna).toBe('UUAACG');
    expect(rna).not.toContain('T');
  });
  it('writes the antiparallel complement 5′→3′ by reversing it', () => {
    expect(as5to3(complement(clean('ATGC').seq))).toBe('GCAT');
  });
  it('counts 2 hydrogen bonds per A–T pair and 3 per G–C pair', () => {
    expect(stats(clean('AT').seq).hBonds).toBe(4);
    expect(stats(clean('GC').seq).hBonds).toBe(6);
    const s = stats(clean('AATGCG').seq);
    expect(s.hBonds).toBe(3 * 2 + 3 * 3);
    expect(s.gcPercent).toBeCloseTo(50);
  });
  it('more G–C pairs means more hydrogen bonds for the same length', () => {
    expect(stats(clean('GGGCCC').seq).hBonds).toBeGreaterThan(stats(clean('AAATTT').seq).hBonds);
  });
  it('ignores spaces and flags letters that are not DNA bases (such as U)', () => {
    const c = clean('5′ a t u g x 3′');
    expect(c.seq.join('')).toBe('ATG');
    expect(c.ignored).toEqual(expect.arrayContaining(['U', 'X']));
  });
  it('has 4ⁿ possible sequences: over a million for 10 bases', () => {
    expect(possibleSequences(10)).toBe(1_048_576);
    expect(randomStrand(12, 3)).toHaveLength(12);
    expect(randomStrand(12, 3)).toEqual(randomStrand(12, 3));
  });
});

describe("A1.2 Chargaff's data", () => {
  const ds = organisms.filter((o) => !o.singleStranded);
  it('each sample adds up to about 100%', () => {
    for (const o of organisms) expect(o.A + o.G + o.C + o.T).toBeGreaterThan(99.5);
  });
  it('in double-stranded DNA A ≈ T and G ≈ C (within measurement error)', () => {
    for (const o of ds) {
      expect(Math.abs(o.A - o.T), o.name).toBeLessThan(2);
      expect(Math.abs(o.G - o.C), o.name).toBeLessThan(2);
      expect(ratios(o).purinesToPyrimidines).toBeGreaterThan(0.95);
      expect(ratios(o).purinesToPyrimidines).toBeLessThan(1.05);
    }
  });
  it('base composition varies between species', () => {
    const gc = ds.map((o) => ratios(o).gcPercent);
    expect(Math.max(...gc) - Math.min(...gc)).toBeGreaterThan(10);
  });
  it('the data falsify the tetranucleotide hypothesis (equal amounts of the four bases)', () => {
    expect(ds.filter((o) => !fitsTetranucleotide(o)).length).toBeGreaterThan(3);
  });
  it('single-stranded φX174 DNA does not follow A = T', () => {
    const phi = organisms.find((o) => o.singleStranded)!;
    expect(ratios(phi).aToT).toBeLessThan(0.85);
  });
});
