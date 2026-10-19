/**
 * Data and pure logic for the A3.1 karyogram sorter and the chromosome 2 fusion figure.
 *
 * Lengths are the GRCh38 sequence lengths in megabase pairs (Mb), so relative sizes are real.
 * Centromere indices (short arm ÷ whole length) are rounded cytogenetic values used to draw the
 * chromosomes; banding patterns are SCHEMATIC: each chromosome type gets its own reproducible
 * pattern, so homologues match and different types differ, but they are not the real G-band maps.
 */

export type ChromId =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
  | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22' | 'X' | 'Y';

export type CentromereClass = 'metacentric' | 'submetacentric' | 'acrocentric';
/** A dark band, as fractions of the chromosome length measured from the short-arm (p) tip. */
export type Band = readonly [number, number];

export interface ChromType {
  id: ChromId;
  /** Sequence length in Mb (GRCh38). */
  mb: number;
  /** Centromere index: length of the short arm as a fraction of the whole chromosome. */
  ci: number;
  /** Denver group (A–G), the traditional size/centromere grouping. */
  group: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  bands: Band[];
}

const raw: [ChromId, number, number, ChromType['group']][] = [
  ['1', 248.96, 0.49, 'A'], ['2', 242.19, 0.39, 'A'], ['3', 198.3, 0.47, 'A'],
  ['4', 190.21, 0.28, 'B'], ['5', 181.54, 0.28, 'B'],
  ['6', 170.81, 0.38, 'C'], ['7', 159.35, 0.37, 'C'], ['8', 145.14, 0.33, 'C'], ['9', 138.39, 0.34, 'C'],
  ['10', 133.8, 0.32, 'C'], ['11', 135.09, 0.39, 'C'], ['12', 133.28, 0.28, 'C'],
  ['13', 114.36, 0.16, 'D'], ['14', 107.04, 0.17, 'D'], ['15', 101.99, 0.18, 'D'],
  ['16', 90.34, 0.42, 'E'], ['17', 83.26, 0.33, 'E'], ['18', 80.37, 0.28, 'E'],
  ['19', 58.62, 0.46, 'F'], ['20', 64.44, 0.45, 'F'],
  ['21', 46.71, 0.24, 'G'], ['22', 50.82, 0.24, 'G'],
  ['X', 156.04, 0.39, 'C'], ['Y', 57.23, 0.22, 'G'],
];

/** Small seeded PRNG (mulberry32) so patterns and shuffles are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashId = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/** A schematic band pattern: roughly one dark band per 14 Mb, kept clear of the centromere and tips. */
export function makeBands(key: string, mb: number, ci: number): Band[] {
  const r = rng(hashId(key));
  const bands: Band[] = [];
  // walk along the chromosome in Mb: irregular light gaps (4–16 Mb) and dark bands (2.5–11 Mb)
  let pos = 2 + r() * 6;
  while (pos < mb - 3) {
    const w = 2.5 + r() * r() * 8.5;
    const s = pos / mb, e = Math.min(pos + w, mb - 2) / mb;
    if (!(s < ci + 0.03 && e > ci - 0.03) && e - s > 0.01) bands.push([round(s), round(e)]); // centromere kept clear
    pos += w + 4 + r() * 12;
  }
  if (bands.length === 0) bands.push([round(Math.min(0.9, ci + 0.2)), round(Math.min(0.97, ci + 0.32))]);
  return bands;
}
const round = (v: number) => Math.round(v * 1000) / 1000;

// ---------- chromosome 2 fusion (chimpanzee 2A + 2B → human 2) ----------

/** Position of the fusion site (band 2q13) as a fraction of human chromosome 2. */
export const FUSION_AT = 0.47;
/** Position of the inactive (vestigial) centromere (around band 2q21) on human chromosome 2. */
export const VESTIGIAL_CEN_AT = 0.545;

const hsa2 = raw[1]!;
const pt2aBands = makeBands('PTR2A', hsa2[1] * FUSION_AT, hsa2[2] / FUSION_AT);
const pt2bBands = makeBands('PTR2B', hsa2[1] * (1 - FUSION_AT), (VESTIGIAL_CEN_AT - FUSION_AT) / (1 - FUSION_AT));

export interface ApeChrom { id: '2A' | '2B'; mb: number; ci: number; bands: Band[] }
/**
 * Chimpanzee chromosomes 2A and 2B drawn in the orientation that lines them up with human 2:
 * 2A matches human 2p plus the start of 2q; 2B matches the rest of 2q. The ends that fused face each other.
 */
export const chimp2: { a: ApeChrom; b: ApeChrom } = {
  a: { id: '2A', mb: round(hsa2[1] * FUSION_AT), ci: round(hsa2[2] / FUSION_AT), bands: pt2aBands },
  b: { id: '2B', mb: round(hsa2[1] * (1 - FUSION_AT)), ci: round((VESTIGIAL_CEN_AT - FUSION_AT) / (1 - FUSION_AT)), bands: pt2bBands },
};

/** Human 2's banding is the chimpanzee 2A pattern followed by the 2B pattern. */
const hsa2Bands: Band[] = [
  ...pt2aBands.map(([s, e]) => [round(s * FUSION_AT), round(e * FUSION_AT)] as Band),
  ...pt2bBands.map(([s, e]) => [round(FUSION_AT + s * (1 - FUSION_AT)), round(FUSION_AT + e * (1 - FUSION_AT))] as Band),
];

export const chromTypes: ChromType[] = raw.map(([id, mb, ci, group]) => ({
  id, mb, ci, group, bands: id === '2' ? hsa2Bands : makeBands(`HSA${id}`, mb, ci),
}));
export const typeById = new Map(chromTypes.map((t) => [t.id, t]));
export const autosomes = chromTypes.filter((t) => t.id !== 'X' && t.id !== 'Y');

export function centromereClass(ci: number): CentromereClass {
  if (ci >= 0.4) return 'metacentric';
  if (ci >= 0.25) return 'submetacentric';
  return 'acrocentric';
}

export const HUMAN_2N = 46;
export const CHIMP_2N = 48;

// ---------- karyotypes and sorting ----------

export type SampleId = 'A' | 'B' | 'C';
export interface Sample { id: SampleId; sex: ChromId[]; extra: ChromId[] }
/** A: typical female; B: male with trisomy 21 (Down syndrome); C: typical male. */
export const samples: Sample[] = [
  { id: 'A', sex: ['X', 'X'], extra: [] },
  { id: 'B', sex: ['X', 'Y'], extra: ['21'] },
  { id: 'C', sex: ['X', 'Y'], extra: [] },
];

export interface Chromosome { uid: string; type: ChromId }

/** Every chromosome in one cell of the sample, in karyogram order. */
export function chromosomesOf(sample: Sample): Chromosome[] {
  const types: ChromId[] = [];
  for (const a of autosomes) {
    types.push(a.id, a.id);
    for (const e of sample.extra) if (e === a.id) types.push(a.id);
  }
  types.push(...sample.sex);
  return types.map((type, i) => ({ uid: `k${i}`, type }));
}

export function shuffle<T>(list: readonly T[], seed: number): T[] {
  const r = rng(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * A neutral letter for each banding pattern, so a screen-reader user can match homologues
 * without being told the chromosome's number. Letters are assigned in a scrambled order.
 */
const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const patternCode = new Map<ChromId, string>(shuffle(chromTypes.map((t) => t.id), 2025).map((id, i) => [id, letters[i]!]));

/** Relative length on a 0–100 scale (chromosome 1 = 100). */
export const relLength = (mb: number) => Math.round((mb / 248.96) * 100);

/** Slot names: '1'…'22' for autosome pairs and 'sex' for the sex chromosomes. */
export type Slot = (typeof slotIds)[number];
export const slotIds = [...autosomes.map((a) => a.id), 'sex'] as const;
export const slotFor = (type: ChromId): string => (type === 'X' || type === 'Y' ? 'sex' : type);

export type SlotState = 'empty' | 'incomplete' | 'ok' | 'wrong';
export interface CheckResult {
  slots: Record<string, SlotState>;
  correct: number;
  total: number;
  unplaced: number;
  complete: boolean;
}

/** Compare a placement (uid → slot, or absent if still in the spread) with the correct karyogram. */
export function check(chroms: Chromosome[], placement: Record<string, string | undefined>): CheckResult {
  const slots: Record<string, SlotState> = {};
  let correct = 0;
  for (const slot of slotIds) {
    const expected = chroms.filter((c) => slotFor(c.type) === slot);
    const placed = chroms.filter((c) => placement[c.uid] === slot);
    let state: SlotState;
    if (placed.length === 0) state = 'empty';
    else if (placed.some((c) => slotFor(c.type) !== slot)) state = 'wrong';
    else state = placed.length === expected.length ? 'ok' : 'incomplete';
    slots[slot] = state;
    if (state === 'ok') correct++;
  }
  const unplaced = chroms.filter((c) => !placement[c.uid]).length;
  return { slots, correct, total: slotIds.length, unplaced, complete: correct === slotIds.length };
}

export function solve(chroms: Chromosome[]): Record<string, string> {
  return Object.fromEntries(chroms.map((c) => [c.uid, slotFor(c.type)]));
}

export interface Diagnosis { count: number; sex: 'female' | 'male'; formula: string; trisomies: ChromId[] }

/** What a karyogram of this cell shows: chromosome number, sex and any trisomy. */
export function diagnose(chroms: Chromosome[]): Diagnosis {
  const count = chroms.length;
  const sexChroms = chroms.filter((c) => c.type === 'X' || c.type === 'Y').map((c) => c.type).sort();
  const sex = sexChroms.includes('Y') ? 'male' : 'female';
  const trisomies = autosomes.map((a) => a.id).filter((id) => chroms.filter((c) => c.type === id).length === 3);
  const formula = `${count},${sexChroms.join('')}${trisomies.map((t) => `,+${t}`).join('')}`;
  return { count, sex, formula, trisomies };
}

/** Text a screen reader hears for a chromosome: everything needed to sort it, but not its number. */
export function describeChrom(type: ChromType): string {
  const pct = Math.round(type.ci * 100);
  return `length ${relLength(type.mb)}, centromere ${pct}% along (${centromereClass(type.ci)}), banding pattern ${patternCode.get(type.id)}`;
}
