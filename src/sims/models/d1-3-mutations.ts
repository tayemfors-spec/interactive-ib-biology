/**
 * D1.3 mutation explorer: pure functions for transcribing and translating a short gene, applying
 * substitutions, insertions and deletions, and classifying the effect on the polypeptide.
 *
 * The gene is written as its coding (sense) strand, 5′→3′, so the mRNA has the same sequence with U
 * in place of T. Translation starts at the first base (the gene fragment begins with the start codon)
 * and stops at the first stop codon or at the end of the fragment shown.
 */

export type DnaBase = 'A' | 'T' | 'G' | 'C';
export const DNA_BASES: readonly DnaBase[] = ['A', 'T', 'G', 'C'];
export const RNA_BASES = ['U', 'C', 'A', 'G'] as const;

/** Amino acids by three-letter code, with full names. */
export const AMINO_ACIDS: Record<string, { name: string; one: string }> = {
  Ala: { name: 'alanine', one: 'A' },
  Arg: { name: 'arginine', one: 'R' },
  Asn: { name: 'asparagine', one: 'N' },
  Asp: { name: 'aspartic acid', one: 'D' },
  Cys: { name: 'cysteine', one: 'C' },
  Gln: { name: 'glutamine', one: 'Q' },
  Glu: { name: 'glutamic acid', one: 'E' },
  Gly: { name: 'glycine', one: 'G' },
  His: { name: 'histidine', one: 'H' },
  Ile: { name: 'isoleucine', one: 'I' },
  Leu: { name: 'leucine', one: 'L' },
  Lys: { name: 'lysine', one: 'K' },
  Met: { name: 'methionine', one: 'M' },
  Phe: { name: 'phenylalanine', one: 'F' },
  Pro: { name: 'proline', one: 'P' },
  Ser: { name: 'serine', one: 'S' },
  Thr: { name: 'threonine', one: 'T' },
  Trp: { name: 'tryptophan', one: 'W' },
  Tyr: { name: 'tyrosine', one: 'Y' },
  Val: { name: 'valine', one: 'V' },
};

export const STOP = 'Stop';

/**
 * The standard genetic code, written as one string per first base (U, C, A, G). Within each
 * string the 16 codons run second base U, C, A, G and, inside that, third base U, C, A, G.
 */
const CODE_ROWS: Record<string, string[]> = {
  U: ['Phe', 'Phe', 'Leu', 'Leu', 'Ser', 'Ser', 'Ser', 'Ser', 'Tyr', 'Tyr', STOP, STOP, 'Cys', 'Cys', STOP, 'Trp'],
  C: ['Leu', 'Leu', 'Leu', 'Leu', 'Pro', 'Pro', 'Pro', 'Pro', 'His', 'His', 'Gln', 'Gln', 'Arg', 'Arg', 'Arg', 'Arg'],
  A: ['Ile', 'Ile', 'Ile', 'Met', 'Thr', 'Thr', 'Thr', 'Thr', 'Asn', 'Asn', 'Lys', 'Lys', 'Ser', 'Ser', 'Arg', 'Arg'],
  G: ['Val', 'Val', 'Val', 'Val', 'Ala', 'Ala', 'Ala', 'Ala', 'Asp', 'Asp', 'Glu', 'Glu', 'Gly', 'Gly', 'Gly', 'Gly'],
};

/** mRNA codon → three-letter amino acid code, or "Stop". All 64 codons. */
export const CODON_TABLE: Readonly<Record<string, string>> = (() => {
  const t: Record<string, string> = {};
  for (const first of RNA_BASES) {
    let k = 0;
    for (const second of RNA_BASES) for (const third of RNA_BASES) t[first + second + third] = CODE_ROWS[first]![k++]!;
  }
  return Object.freeze(t);
})();

/**
 * Start of the human β-globin gene (HBB) coding sequence: the start codon and codons 1–11.
 * Codons are numbered from the first amino acid of mature β-globin (valine), because the initial
 * methionine is removed after translation; codon 6 (GAG, glutamic acid) is the sickle-cell site.
 */
export const HBB_START = 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTT';
export const MAX_LENGTH = 48;

/** Coding-strand DNA → mRNA (same sequence, U for T). */
export const transcribe = (coding: string): string => coding.replace(/T/g, 'U');

export const codonsOf = (seq: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i + 3 <= seq.length; i += 3) out.push(seq.slice(i, i + 3));
  return out;
};

export interface Translation {
  /** mRNA codons read in frame from the first base (complete codons only). */
  codons: string[];
  /** Amino acid (three-letter) for each codon, up to and including a stop if one is reached. */
  aminoAcids: string[];
  /** Index of the first stop codon, or −1 if translation runs to the end of the fragment. */
  stopAt: number;
  /** Bases left over after the last complete codon (0–2). */
  leftover: number;
}

export function translate(mrna: string): Translation {
  const codons = codonsOf(mrna);
  const aminoAcids: string[] = [];
  let stopAt = -1;
  for (let i = 0; i < codons.length; i++) {
    const aa = CODON_TABLE[codons[i]!];
    if (!aa) throw new Error(`not a codon: ${codons[i]}`);
    aminoAcids.push(aa);
    if (aa === STOP) { stopAt = i; break; }
  }
  return { codons, aminoAcids, stopAt, leftover: mrna.length % 3 };
}

/** The polypeptide as amino acids, without the stop. */
export const polypeptide = (tr: Translation) => (tr.stopAt >= 0 ? tr.aminoAcids.slice(0, tr.stopAt) : tr.aminoAcids);

// ---------- mutations ----------

export const clean = (s: string): string => s.toUpperCase().replace(/[^ATGC]/g, '');

export function substitute(seq: string, i: number, base: DnaBase): string {
  if (i < 0 || i >= seq.length) return seq;
  return seq.slice(0, i) + base + seq.slice(i + 1);
}

/** Insert bases so they start at position i (0 = before the first base; seq.length = at the end). */
export function insert(seq: string, i: number, bases: string): string {
  const j = Math.max(0, Math.min(seq.length, i));
  return (seq.slice(0, j) + clean(bases) + seq.slice(j)).slice(0, MAX_LENGTH);
}

export function remove(seq: string, i: number, n = 1): string {
  if (i < 0 || i >= seq.length) return seq;
  return seq.slice(0, i) + seq.slice(i + n);
}

// ---------- classification ----------

export type Effect =
  | 'none'
  | 'silent'
  | 'missense'
  | 'nonsense'
  | 'stop-lost'
  | 'start-lost'
  | 'in-frame'
  | 'frameshift';

export const EFFECT_LABEL: Record<Effect, string> = {
  none: 'No mutation',
  silent: 'Silent (same-sense) mutation',
  missense: 'Missense mutation',
  nonsense: 'Nonsense mutation',
  'stop-lost': 'Stop codon lost',
  'start-lost': 'Start codon lost',
  'in-frame': 'In-frame insertion or deletion',
  frameshift: 'Frameshift mutation',
};

export interface Classification {
  effect: Effect;
  /** Change in length in bases (positive = insertion). */
  lengthChange: number;
  /** Number of bases that differ, for equal-length sequences. */
  substitutions: number;
  /** Positions (codon indices) where the amino acid differs from the original. */
  changedCodons: number[];
  /** A premature stop codon now ends the polypeptide earlier than before. */
  prematureStop: boolean;
  /** Length of the polypeptide (amino acids, without stop) before and after. */
  lengthBefore: number;
  lengthAfter: number;
}

export function classify(original: string, mutated: string): Classification {
  const a = translate(transcribe(original));
  const b = translate(transcribe(mutated));
  const pa = polypeptide(a);
  const pb = polypeptide(b);
  const lengthChange = mutated.length - original.length;
  let substitutions = 0;
  if (lengthChange === 0) for (let i = 0; i < original.length; i++) if (original[i] !== mutated[i]) substitutions++;
  const changedCodons: number[] = [];
  const n = Math.max(a.aminoAcids.length, b.aminoAcids.length);
  for (let i = 0; i < n; i++) if (a.aminoAcids[i] !== b.aminoAcids[i]) changedCodons.push(i);
  // A stop is premature if it ends the chain before the original stop (or before the end of the fragment).
  const prematureStop = b.stopAt >= 0 && (a.stopAt < 0 ? b.stopAt < a.codons.length : b.stopAt < a.stopAt);
  const base = { lengthChange, substitutions, changedCodons, prematureStop, lengthBefore: pa.length, lengthAfter: pb.length };

  if (original === mutated) return { ...base, effect: 'none' };
  if (original.startsWith('ATG') && !mutated.startsWith('ATG')) return { ...base, effect: 'start-lost' };
  if (lengthChange % 3 !== 0) return { ...base, effect: 'frameshift' };
  if (lengthChange !== 0) return { ...base, effect: 'in-frame' };
  if (prematureStop) return { ...base, effect: 'nonsense' };
  if (a.stopAt >= 0 && b.stopAt !== a.stopAt) return { ...base, effect: 'stop-lost' };
  return { ...base, effect: changedCodons.length === 0 ? 'silent' : 'missense' };
}

/** Recognise the two named β-globin substitutions at codon 6 (GAG). */
export function namedVariant(original: string, mutated: string): 'HbS' | 'HbC' | null {
  if (original !== HBB_START || mutated.length !== original.length) return null;
  const diff = [...original].flatMap((b, i) => (b === mutated[i] ? [] : [i]));
  if (diff.length !== 1) return null;
  const i = diff[0]!;
  // codon 6 of mature β-globin is codon index 6 here (index 0 is the start codon): bases 18–20
  if (i === 19 && mutated[i] === 'T') return 'HbS'; // GAG → GTG, Glu → Val
  if (i === 18 && mutated[i] === 'A') return 'HbC'; // GAG → AAG, Glu → Lys
  return null;
}

/** The codon number used for β-globin (start codon = "start", then 1, 2, 3 …). */
export const codonLabel = (index: number) => (index === 0 ? 'start' : String(index));

/** Degeneracy: how many codons code for each amino acid (and for Stop). */
export function codonCounts(): Record<string, number> {
  const c: Record<string, number> = {};
  for (const aa of Object.values(CODON_TABLE)) c[aa] = (c[aa] ?? 0) + 1;
  return c;
}

/** One-sentence description of a classification, for the live readout. */
export function describe(original: string, mutated: string, c = classify(original, mutated)): string {
  const text = describeRaw(original, mutated, c);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeRaw(original: string, mutated: string, c: Classification): string {
  const a = translate(transcribe(original));
  const b = translate(transcribe(mutated));
  const aaName = (x: string | undefined) => (x === undefined ? 'nothing' : x === STOP ? 'a stop codon' : AMINO_ACIDS[x]!.name);
  const first = c.changedCodons[0];
  const at = (i: number) => `codon ${codonLabel(i)}`;
  switch (c.effect) {
    case 'none':
      return 'The sequence is the same as the original gene, so the polypeptide is unchanged.';
    case 'silent': {
      const i = [...original].findIndex((x, k) => x !== mutated[k]);
      const k = Math.floor(i / 3);
      return `${at(k)} changes from ${a.codons[k]} to ${b.codons[k]}, but both code for ${aaName(a.aminoAcids[k])}. Because the genetic code is degenerate, the polypeptide is unchanged.`;
    }
    case 'missense':
      return c.changedCodons.length === 1
        ? `${at(first!)} changes from ${a.codons[first!]} to ${b.codons[first!]}, so ${aaName(a.aminoAcids[first!])} is replaced by ${aaName(b.aminoAcids[first!])}. One amino acid in the polypeptide is different.`
        : `${c.changedCodons.length} amino acids are different (${c.changedCodons.map(at).join(', ')}). The rest of the polypeptide is unchanged.`;
    case 'nonsense':
      return `${at(b.stopAt)} becomes ${b.codons[b.stopAt]}, a stop codon. Translation ends early, so the polypeptide is only ${c.lengthAfter} amino acids long and is very unlikely to function.`;
    case 'stop-lost':
      return 'The stop codon has been changed into a codon for an amino acid, so translation continues past the normal end of the polypeptide.';
    case 'start-lost':
      return 'The start codon (AUG) has been changed, so translation cannot begin at the normal place and the polypeptide is not made correctly.';
    case 'in-frame': {
      const n = Math.abs(c.lengthChange) / 3;
      const verb = c.lengthChange > 0 ? 'inserted' : 'deleted';
      const aa = `${n} amino acid${n > 1 ? 's' : ''} ${c.lengthChange > 0 ? 'more' : 'fewer'}`;
      const stop = c.prematureStop
        ? ' The change has also created a stop codon, so translation ends early.'
        : ' The reading frame is kept, so the codons further on are read normally.';
      return `${Math.abs(c.lengthChange)} bases ${verb} (a multiple of 3), so the polypeptide has ${aa}.${stop}`;
    }
    case 'frameshift': {
      const stop = c.prematureStop
        ? ` A stop codon is reached at ${at(b.stopAt)}, so translation ends early.`
        : ' Every amino acid from the mutation onwards may be different.';
      return `${Math.abs(c.lengthChange)} base${Math.abs(c.lengthChange) > 1 ? 's' : ''} ${c.lengthChange > 0 ? 'inserted' : 'deleted'} (not a multiple of 3): the reading frame shifts, so every codon after the mutation is read in a different set of three.${stop}`;
    }
  }
}
