/**
 * A1.2 complementary base pairing. Pure functions shared by the server render and the browser.
 * The strand the reader types (the template) is written 5′→3′; complementary strands are returned
 * aligned base-for-base with it, so they read 3′→5′ from left to right.
 */
export type DnaBase = 'A' | 'T' | 'G' | 'C';
export type RnaBase = 'A' | 'U' | 'G' | 'C';
export const MAX_LENGTH = 24;
export const DNA_PAIR: Record<DnaBase, DnaBase> = { A: 'T', T: 'A', G: 'C', C: 'G' };
export const RNA_PAIR: Record<DnaBase, RnaBase> = { A: 'U', T: 'A', G: 'C', C: 'G' };
/** Hydrogen bonds per base pair: two for A–T, three for G–C. */
export const H_BONDS: Record<DnaBase, 2 | 3> = { A: 2, T: 2, G: 3, C: 3 };

export interface Cleaned { seq: DnaBase[]; ignored: string[]; truncated: boolean }

/** Keep only A, T, G and C (any case); report other letters that were typed, such as U. */
export function clean(input: string): Cleaned {
  const seq: DnaBase[] = [];
  const ignored = new Set<string>();
  for (const ch of input.toUpperCase()) {
    if (ch === 'A' || ch === 'T' || ch === 'G' || ch === 'C') seq.push(ch);
    else if (/[A-Z]/.test(ch)) ignored.add(ch);
  }
  return { seq: seq.slice(0, MAX_LENGTH), ignored: [...ignored], truncated: seq.length > MAX_LENGTH };
}

/** Complementary DNA bases, aligned with the template (so this strand reads 3′→5′). */
export const complement = (seq: DnaBase[]): DnaBase[] => seq.map((b) => DNA_PAIR[b]);
/** Complementary RNA bases (uracil instead of thymine), aligned with the template (reads 3′→5′). */
export const rnaComplement = (seq: DnaBase[]): RnaBase[] => seq.map((b) => RNA_PAIR[b]);
/** A complementary strand rewritten the conventional way, 5′→3′. */
export const as5to3 = (aligned: string[]) => [...aligned].reverse().join('');

export interface PairStats { length: number; at: number; gc: number; hBonds: number; gcPercent: number }

export function stats(seq: DnaBase[]): PairStats {
  const gc = seq.filter((b) => b === 'G' || b === 'C').length;
  return {
    length: seq.length,
    at: seq.length - gc,
    gc,
    hBonds: seq.reduce((n, b) => n + H_BONDS[b], 0),
    gcPercent: seq.length ? (100 * gc) / seq.length : 0,
  };
}

/** Number of different base sequences possible for a strand of n nucleotides (4ⁿ). */
export const possibleSequences = (n: number) => 4 ** n;

/** A deterministic "random" strand for the Random button (so tests are repeatable). */
export function randomStrand(n: number, seed: number): DnaBase[] {
  const bases: DnaBase[] = ['A', 'T', 'G', 'C'];
  let a = seed >>> 0;
  return Array.from({ length: n }, () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return bases[a >>> 30]!;
  });
}
