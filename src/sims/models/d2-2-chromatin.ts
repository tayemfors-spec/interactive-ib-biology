/**
 * Qualitative model of how epigenetic tags near a gene affect its transcription (D2.2.6).
 *
 *  - Methylated cytosines (in CpG sites) in the promoter repress transcription: they stop some
 *    transcription factors binding, and proteins that recognise methyl-CpG help condense chromatin.
 *  - Histone acetylation generally loosens nucleosome packing (euchromatin), so it activates.
 *  - Histone methylation can activate or repress, depending on which amino acid is methylated:
 *    e.g. lysine 4 of histone H3 (activating) vs lysine 9 of H3 (repressive).
 *
 * All values are on a 0–1 scale; the numbers show directions of effect, not measurements.
 */
export type HistoneMethyl = 'none' | 'activating' | 'repressive';
export interface ChromatinParams {
  /** Fraction of CpG cytosines in the promoter that are methylated (0–1). */
  promoterMethyl: number;
  /** Histone tails acetylated? */
  acetylated: boolean;
  histoneMethyl: HistoneMethyl;
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** How open (accessible) the chromatin around the gene is: 0 = tightly packed, 1 = fully open. */
export function openness({ promoterMethyl, acetylated, histoneMethyl }: ChromatinParams): number {
  const m = clamp(promoterMethyl);
  let o = 0.45;
  if (acetylated) o += 0.35;
  if (histoneMethyl === 'activating') o += 0.25;
  if (histoneMethyl === 'repressive') o -= 0.35;
  o -= 0.25 * m;
  return clamp(o);
}

/** How readily transcription factors and RNA polymerase can bind the promoter (0–1). */
export function access(p: ChromatinParams): number {
  return clamp(openness(p) * (1 - 0.85 * clamp(p.promoterMethyl)));
}

/** Relative rate of transcription of the gene (0–1). */
export function transcriptionRate(p: ChromatinParams): number {
  const a = access(p);
  // a little cooperativity: once factors can bind, the rate rises steeply
  return clamp(a * a * (3 - 2 * a));
}

export type ChromatinState = 'heterochromatin' | 'intermediate' | 'euchromatin';
export const chromatinState = (o: number): ChromatinState =>
  o < 0.3 ? 'heterochromatin' : o >= 0.6 ? 'euchromatin' : 'intermediate';

export type RateBand = 'silenced' | 'low' | 'moderate' | 'high';
export const rateBand = (r: number): RateBand => (r < 0.08 ? 'silenced' : r < 0.35 ? 'low' : r < 0.7 ? 'moderate' : 'high');

/** Number of CpG sites drawn in the promoter. */
export const CPG_SITES = 6;
/** Order in which CpG sites become methylated as the slider rises (spread along the promoter). */
export const CPG_ORDER = [0, 3, 5, 1, 4, 2];

/** Schematic positions of five nucleosomes: closer together and zig-zagged when chromatin is condensed. */
export function nucleosomeLayout(o: number, cx = 260, cy = 84): [number, number][] {
  const spacing = 46 + clamp(o) * 50;
  const zig = (1 - clamp(o)) * 22;
  return [0, 1, 2, 3, 4].map((i) => [cx + (i - 2) * spacing, cy + (i % 2 ? zig : -zig)]);
}

/** Reader-facing explanation of the current state. */
export function describe(p: ChromatinParams): string {
  const o = openness(p);
  const r = transcriptionRate(p);
  const st = chromatinState(o);
  const parts: string[] = [];
  parts.push(
    st === 'euchromatin'
      ? 'Chromatin is open (euchromatin), so transcription factors and RNA polymerase can reach the promoter.'
      : st === 'heterochromatin'
        ? 'Chromatin is tightly condensed (heterochromatin), so the promoter is hard to reach.'
        : 'Chromatin is partly condensed.',
  );
  const n = Math.round(clamp(p.promoterMethyl) * CPG_SITES);
  if (n > 0) parts.push(`${n} of ${CPG_SITES} promoter cytosines are methylated, which stops some transcription factors binding.`);
  if (p.acetylated) parts.push('Acetylated histones loosen nucleosome packing.');
  if (p.histoneMethyl === 'activating') parts.push('Methylation of lysine 4 on histone H3 is linked to active genes.');
  if (p.histoneMethyl === 'repressive') parts.push('Methylation of lysine 9 on histone H3 is linked to condensed, repressed chromatin.');
  const band = rateBand(r);
  parts.push(`Transcription rate: ${band === 'silenced' ? 'none — the gene is silenced' : band}.`);
  return parts.join(' ');
}
