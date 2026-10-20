/**
 * D1.2 the genetic code. Pure functions shared by the server render and the browser.
 *
 * The standard genetic code (NCBI translation table 1). Codons are mRNA triplets written 5′→3′.
 * CODE lists the amino acid (one-letter code, '*' = stop) for all 64 codons in the order
 * UUU, UUC, UUA, UUG, UCU, … GGG: first base U C A G (16 each), second base U C A G (4 each),
 * third base U C A G.
 *
 * Input can be typed as the mRNA (5′→3′), the DNA coding strand (5′→3′, same as mRNA with T for U)
 * or the DNA template strand written 3′→5′, so that it lines up base-for-base with the mRNA it makes.
 */
export type RnaBase = 'U' | 'C' | 'A' | 'G';
export type InputMode = 'mrna' | 'coding' | 'template';
export type Frame = 'aug' | 0 | 1 | 2;
export const BASES: RnaBase[] = ['U', 'C', 'A', 'G'];
export const MAX_LENGTH = 60;

const CODE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';

export interface AminoAcid { one: string; three: string; name: string }
export const AMINO_ACIDS: Record<string, AminoAcid> = {
  A: { one: 'A', three: 'Ala', name: 'alanine' },
  R: { one: 'R', three: 'Arg', name: 'arginine' },
  N: { one: 'N', three: 'Asn', name: 'asparagine' },
  D: { one: 'D', three: 'Asp', name: 'aspartic acid' },
  C: { one: 'C', three: 'Cys', name: 'cysteine' },
  Q: { one: 'Q', three: 'Gln', name: 'glutamine' },
  E: { one: 'E', three: 'Glu', name: 'glutamic acid' },
  G: { one: 'G', three: 'Gly', name: 'glycine' },
  H: { one: 'H', three: 'His', name: 'histidine' },
  I: { one: 'I', three: 'Ile', name: 'isoleucine' },
  L: { one: 'L', three: 'Leu', name: 'leucine' },
  K: { one: 'K', three: 'Lys', name: 'lysine' },
  M: { one: 'M', three: 'Met', name: 'methionine' },
  F: { one: 'F', three: 'Phe', name: 'phenylalanine' },
  P: { one: 'P', three: 'Pro', name: 'proline' },
  S: { one: 'S', three: 'Ser', name: 'serine' },
  T: { one: 'T', three: 'Thr', name: 'threonine' },
  W: { one: 'W', three: 'Trp', name: 'tryptophan' },
  Y: { one: 'Y', three: 'Tyr', name: 'tyrosine' },
  V: { one: 'V', three: 'Val', name: 'valine' },
  '*': { one: '*', three: 'Stop', name: 'stop' },
};

const idx: Record<RnaBase, number> = { U: 0, C: 1, A: 2, G: 3 };

/** All 64 codons in table order. */
export const ALL_CODONS: string[] = BASES.flatMap((a) => BASES.flatMap((b) => BASES.map((c) => a + b + c)));

/** One-letter amino acid code for an mRNA codon ('*' for a stop codon); throws on anything that is not a codon. */
export function aminoAcidOf(codon: string): string {
  const c = codon.toUpperCase();
  if (!/^[UCAG]{3}$/.test(c)) throw new Error(`not an mRNA codon: ${codon}`);
  return CODE[16 * idx[c[0] as RnaBase] + 4 * idx[c[1] as RnaBase] + idx[c[2] as RnaBase]]!;
}
export const isStop = (codon: string) => aminoAcidOf(codon) === '*';
export const START_CODON = 'AUG';
/** Every codon for an amino acid (one-letter code), in table order. */
export const codonsFor = (aa: string) => ALL_CODONS.filter((c) => aminoAcidOf(c) === aa);

const DNA_TO_MRNA_FROM_TEMPLATE: Record<string, RnaBase> = { A: 'U', T: 'A', G: 'C', C: 'G' };
const RNA_PAIR: Record<RnaBase, RnaBase> = { A: 'U', U: 'A', G: 'C', C: 'G' };
const RNA_TO_TEMPLATE: Record<RnaBase, string> = { A: 'T', U: 'A', G: 'C', C: 'G' };

export interface Parsed { mrna: RnaBase[]; ignored: string[]; truncated: boolean }

/**
 * Turn what the reader typed into mRNA (5′→3′). Spaces, dashes, 5′/3′ marks and digits are skipped;
 * other letters that do not belong to that kind of strand (U in DNA, T in mRNA) are reported.
 */
export function toMrna(input: string, mode: InputMode): Parsed {
  const out: RnaBase[] = [];
  const ignored = new Set<string>();
  // drop prime marks with their digit (5′, 3', 5’) so they are not read as bases
  const text = input.toUpperCase().replace(/[0-9]\s*[′'’`]/g, ' ');
  for (const ch of text) {
    if (!/[A-Z]/.test(ch)) continue;
    if (mode === 'mrna') {
      if (ch === 'A' || ch === 'U' || ch === 'G' || ch === 'C') out.push(ch);
      else ignored.add(ch);
    } else if (ch === 'A' || ch === 'T' || ch === 'G' || ch === 'C') {
      out.push(mode === 'coding' ? (ch === 'T' ? 'U' : ch) : DNA_TO_MRNA_FROM_TEMPLATE[ch]!);
    } else ignored.add(ch);
  }
  return { mrna: out.slice(0, MAX_LENGTH), ignored: [...ignored], truncated: out.length > MAX_LENGTH };
}

/** Write an mRNA back out as the strand the reader is using (for example after picking codons from the table). */
export function fromMrna(mrna: RnaBase[], mode: InputMode): string {
  if (mode === 'mrna') return mrna.join('');
  if (mode === 'coding') return mrna.map((b) => (b === 'U' ? 'T' : b)).join('');
  return mrna.map((b) => RNA_TO_TEMPLATE[b]).join('');
}

/** DNA coding strand (5′→3′) for an mRNA. */
export const codingStrand = (mrna: RnaBase[]) => fromMrna(mrna, 'coding');
/** DNA template strand, aligned with the mRNA (so it reads 3′→5′ from left to right). */
export const templateStrand = (mrna: RnaBase[]) => fromMrna(mrna, 'template');
/** tRNA anticodon for a codon, aligned with it (written 3′→5′ from left to right). */
export const anticodonOf = (codon: string) => [...codon.toUpperCase()].map((b) => RNA_PAIR[b as RnaBase]).join('');

export type CodonRole = 'start' | 'sense' | 'stop';
export interface ReadCodon { at: number; codon: string; aa: string; role: CodonRole }
export interface Translation {
  /** Index of the first base read (−1 if reading from AUG and there is none). */
  start: number;
  codons: ReadCodon[];
  /** Amino acids joined in order, one-letter codes (the stop codon is not included). */
  protein: string;
  /** True if a stop codon ended translation. */
  stopped: boolean;
  /** Bases after the end of translation (after a stop codon, or fewer than three left over). */
  after: number;
}

/**
 * Read an mRNA codon by codon. With frame 'aug', reading starts at the first AUG, as on a ribosome;
 * with 0, 1 or 2 it starts at that base, as in a reading-frame exercise. Reading stops at the first stop codon.
 */
export function translate(mrna: RnaBase[], frame: Frame = 'aug'): Translation {
  const s = mrna.join('');
  const start = frame === 'aug' ? s.indexOf(START_CODON) : Math.min(frame, s.length);
  const codons: ReadCodon[] = [];
  let protein = '';
  let stopped = false;
  let i = start;
  if (start >= 0) {
    for (; i + 3 <= s.length; i += 3) {
      const codon = s.slice(i, i + 3);
      const aa = aminoAcidOf(codon);
      const role: CodonRole = aa === '*' ? 'stop' : codons.length === 0 && codon === START_CODON ? 'start' : 'sense';
      codons.push({ at: i, codon, aa, role });
      if (aa === '*') { stopped = true; i += 3; break; }
      protein += aa;
    }
  }
  return { start, codons, protein, stopped, after: start < 0 ? 0 : s.length - i };
}

/** Amino acid sequence in three-letter codes joined with dashes, e.g. "Met–Val–His". */
export const threeLetter = (protein: string) => [...protein].map((a) => AMINO_ACIDS[a]!.three).join('–');

/**
 * The start of the human β-globin gene (HBB) as mRNA, 5′→3′, from the start codon: codons for
 * Met (removed after translation) then Val-His-Leu-Thr-Pro-Glu-Glu-Lys-Ser.
 * The sickle-cell allele (HbS) has a single base substitution in the codon for the 6th amino acid of
 * the mature protein (the 7th codon counting AUG): GAG → GUG in mRNA (GAG → GTG in the coding strand),
 * so glutamic acid is replaced by valine.
 */
export const HBB_NORMAL = 'AUGGUGCACCUGACUCCUGAGGAGAAGUCU';
export const SICKLE_CODON = 7; // counting AUG as codon 1
export const SICKLE_BASE = (SICKLE_CODON - 1) * 3 + 1; // 0-based index of the substituted base (2nd base of the codon)
export const HBB_SICKLE = HBB_NORMAL.slice(0, SICKLE_BASE) + 'U' + HBB_NORMAL.slice(SICKLE_BASE + 1);

/** Positions (0-based) where two equal-length sequences differ. */
export const differences = (a: string, b: string) => [...a].map((x, i) => (x === b[i] ? -1 : i)).filter((i) => i >= 0);

/** A deterministic "random" mRNA for the Random button: AUG, sense codons, then a stop codon. */
export function randomMrna(nCodons: number, seed: number): string {
  let a = seed >>> 0;
  const next = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a; };
  const sense = ALL_CODONS.filter((c) => !isStop(c));
  const stops = ALL_CODONS.filter(isStop);
  let s = START_CODON;
  for (let k = 0; k < nCodons; k++) s += sense[next() % sense.length];
  return s + stops[next() % stops.length];
}
