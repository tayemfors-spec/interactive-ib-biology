import { describe, expect, it } from 'vitest';
import {
  ALL_CODONS, AMINO_ACIDS, HBB_NORMAL, HBB_SICKLE, SICKLE_BASE, aminoAcidOf, anticodonOf, codingStrand, codonsFor, differences,
  fromMrna, isStop, randomMrna, templateStrand, threeLetter, toMrna, translate,
} from '../../src/sims/models/d1-2-codon-table';

/**
 * The standard genetic code written out independently of the model (grouped by amino acid),
 * so the model's compact table is checked against a second source rather than against itself.
 */
const EXPECTED: Record<string, string[]> = {
  F: ['UUU', 'UUC'],
  L: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG'],
  I: ['AUU', 'AUC', 'AUA'],
  M: ['AUG'],
  V: ['GUU', 'GUC', 'GUA', 'GUG'],
  S: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC'],
  P: ['CCU', 'CCC', 'CCA', 'CCG'],
  T: ['ACU', 'ACC', 'ACA', 'ACG'],
  A: ['GCU', 'GCC', 'GCA', 'GCG'],
  Y: ['UAU', 'UAC'],
  '*': ['UAA', 'UAG', 'UGA'],
  H: ['CAU', 'CAC'],
  Q: ['CAA', 'CAG'],
  N: ['AAU', 'AAC'],
  K: ['AAA', 'AAG'],
  D: ['GAU', 'GAC'],
  E: ['GAA', 'GAG'],
  C: ['UGU', 'UGC'],
  W: ['UGG'],
  R: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
  G: ['GGU', 'GGC', 'GGA', 'GGG'],
};

describe('D1.2 standard genetic code', () => {
  it('has 64 different codons (4 × 4 × 4)', () => {
    expect(ALL_CODONS).toHaveLength(64);
    expect(new Set(ALL_CODONS).size).toBe(64);
  });
  it('matches the standard codon table for every one of the 64 codons', () => {
    const listed = Object.values(EXPECTED).flat();
    expect(listed).toHaveLength(64);
    expect(new Set(listed).size).toBe(64);
    for (const [aa, codons] of Object.entries(EXPECTED)) for (const c of codons) expect(aminoAcidOf(c), c).toBe(aa);
    for (const [aa, codons] of Object.entries(EXPECTED)) expect(codonsFor(aa).sort()).toEqual([...codons].sort());
  });
  it('codes for exactly 20 amino acids plus stop', () => {
    const aas = new Set(ALL_CODONS.map(aminoAcidOf));
    expect(aas.size).toBe(21);
    expect(aas.has('*')).toBe(true);
    for (const a of aas) expect(AMINO_ACIDS[a], a).toBeDefined();
  });
  it('has three stop codons, UAA, UAG and UGA, and AUG codes for methionine', () => {
    expect(ALL_CODONS.filter(isStop).sort()).toEqual(['UAA', 'UAG', 'UGA']);
    expect(aminoAcidOf('AUG')).toBe('M');
    expect(AMINO_ACIDS.M!.three).toBe('Met');
  });
  it('is degenerate: most amino acids have more than one codon, but Met and Trp have only one', () => {
    const counts = Object.fromEntries(Object.keys(EXPECTED).map((a) => [a, codonsFor(a).length]));
    expect(counts.L).toBe(6); expect(counts.S).toBe(6); expect(counts.R).toBe(6);
    expect(counts.M).toBe(1); expect(counts.W).toBe(1);
    expect(counts.I).toBe(3);
    expect(Object.values(counts).filter((n) => n > 1).length).toBe(19); // 18 amino acids + stop
  });
  it('explains the triplet code: doublets give only 16 combinations, fewer than 20 amino acids', () => {
    expect(4 ** 1).toBeLessThan(20);
    expect(4 ** 2).toBeLessThan(20);
    expect(4 ** 3).toBeGreaterThanOrEqual(20);
  });
  it('rejects things that are not mRNA codons', () => {
    expect(() => aminoAcidOf('ATG')).toThrow();
    expect(() => aminoAcidOf('AU')).toThrow();
  });
});

describe('D1.2 strands, codons and anticodons', () => {
  it('converts a coding strand to mRNA by replacing T with U', () => {
    expect(toMrna('5′-ATG GCA TTC-3′', 'coding').mrna.join('')).toBe('AUGGCAUUC');
  });
  it('converts a template strand (written 3′→5′) to mRNA by complementary pairing, A on the template → U', () => {
    expect(toMrna("3'-TAC CGT AAG-5'", 'template').mrna.join('')).toBe('AUGGCAUUC');
  });
  it('round-trips between mRNA and both DNA strands', () => {
    const m = toMrna('AUGGCAUUCUAA', 'mrna').mrna;
    expect(codingStrand(m)).toBe('ATGGCATTCTAA');
    expect(templateStrand(m)).toBe('TACCGTAAGATT');
    expect(toMrna(templateStrand(m), 'template').mrna).toEqual(m);
    expect(toMrna(fromMrna(m, 'coding'), 'coding').mrna).toEqual(m);
  });
  it('flags T typed as mRNA and U typed as DNA', () => {
    expect(toMrna('AUGT', 'mrna').ignored).toContain('T');
    expect(toMrna('ATGU', 'coding').ignored).toContain('U');
  });
  it('gives the anticodon aligned with its codon (3′→5′)', () => {
    expect(anticodonOf('AUG')).toBe('UAC');
    expect(anticodonOf('GCA')).toBe('CGU');
  });
});

describe('D1.2 translation with reading frames', () => {
  it('starts at the first AUG and stops at a stop codon, which adds no amino acid', () => {
    const r = translate(toMrna('GCAUGUUUGGCUAAGGG', 'mrna').mrna, 'aug');
    expect(r.start).toBe(2);
    expect(r.codons.map((c) => c.codon)).toEqual(['AUG', 'UUU', 'GGC', 'UAA']);
    expect(r.protein).toBe('MFG');
    expect(threeLetter(r.protein)).toBe('Met–Phe–Gly');
    expect(r.stopped).toBe(true);
    expect(r.codons[0]!.role).toBe('start');
    expect(r.codons.at(-1)!.role).toBe('stop');
    expect(r.after).toBe(3);
  });
  it('reports no start when there is no AUG', () => {
    const r = translate(toMrna('GGGCCC', 'mrna').mrna, 'aug');
    expect(r.start).toBe(-1);
    expect(r.codons).toHaveLength(0);
  });
  it('a different reading frame gives a completely different polypeptide', () => {
    const m = toMrna('AUGGCAUUCAAAGUG', 'mrna').mrna;
    expect(translate(m, 0).protein).toBe('MAFKV');
    expect(translate(m, 1).protein).toBe('WHSK');
    expect(translate(m, 2).protein).toBe('GIQS');
  });
});

describe('D1.2 sickle-cell point mutation (HBB)', () => {
  const normal = translate(toMrna(HBB_NORMAL, 'mrna').mrna);
  const sickle = translate(toMrna(HBB_SICKLE, 'mrna').mrna);
  it('normal β-globin begins Val-His-Leu-Thr-Pro-Glu-Glu-Lys after the initial Met', () => {
    expect(normal.protein).toBe('MVHLTPEEKS');
  });
  it('is a single base substitution, A → U in the second base of the codon for amino acid 6', () => {
    expect(differences(HBB_NORMAL, HBB_SICKLE)).toEqual([SICKLE_BASE]);
    expect(HBB_NORMAL.slice(18, 21)).toBe('GAG');
    expect(HBB_SICKLE.slice(18, 21)).toBe('GUG');
    expect(codingStrand(toMrna(HBB_SICKLE, 'mrna').mrna).slice(18, 21)).toBe('GTG');
  });
  it('replaces glutamic acid with valine at position 6 of the mature protein, and nothing else', () => {
    const mature = (p: string) => p.slice(1); // the initial methionine is removed
    expect(mature(normal.protein)[5]).toBe('E');
    expect(mature(sickle.protein)[5]).toBe('V');
    expect(differences(normal.protein, sickle.protein)).toHaveLength(1);
    expect(sickle.protein.length).toBe(normal.protein.length);
  });
});

describe('D1.2 random mRNA', () => {
  it('is repeatable and reads from AUG to a stop codon', () => {
    expect(randomMrna(5, 9)).toBe(randomMrna(5, 9));
    const r = translate(toMrna(randomMrna(6, 4), 'mrna').mrna);
    expect(r.codons).toHaveLength(8);
    expect(r.stopped).toBe(true);
  });
});
