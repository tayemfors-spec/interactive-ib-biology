/**
 * D2.1.17 mitotic index: a virtual field of view of cells, some in mitosis.
 *
 *   mitotic index = number of cells in mitosis ÷ total number of cells
 *
 * Cells in prophase, metaphase, anaphase or telophase count as "in mitosis"; interphase cells do not.
 * The fractions below are invented practice values chosen to show the expected pattern
 * (meristem ≫ zone of elongation; tumour > normal tissue). Pure functions only.
 */
import { MITOTIC, rng, type Phase } from './d2-1-phase-id';

export type TissueId = 'meristem' | 'elongation' | 'normal' | 'tumour';
export interface Tissue { id: TissueId; name: string; round: boolean; mitotic: number }
export const COLS = 10, ROWS = 7, TOTAL = COLS * ROWS;

export const TISSUES: Tissue[] = [
  { id: 'meristem', name: 'Root tip meristem', round: false, mitotic: 13 },
  { id: 'elongation', name: 'Root, zone of elongation', round: false, mitotic: 1 },
  { id: 'normal', name: 'Normal epithelium', round: true, mitotic: 2 },
  { id: 'tumour', name: 'Tumour biopsy', round: true, mitotic: 11 },
];
export const tissueById = (id: TissueId) => TISSUES.find((t) => t.id === id)!;

export interface FieldCell { i: number; phase: Phase; seed: number }

/** A field of TOTAL cells with exactly `tissue.mitotic` of them in mitosis, at seeded positions. */
export function field(id: TissueId, seed: number): FieldCell[] {
  const t = tissueById(id);
  const r = rng(seed * 977 + TISSUES.indexOf(t) * 31 + 5);
  const order = Array.from({ length: TOTAL }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [order[i], order[k]] = [order[k]!, order[i]!]; }
  const mitoticSlots = new Set(order.slice(0, t.mitotic));
  let m = 0;
  return Array.from({ length: TOTAL }, (_, i) => ({
    i,
    phase: mitoticSlots.has(i) ? MITOTIC[(m++ + Math.floor(r() * 4)) % 4]! : 'interphase',
    seed: Math.floor(r() * 1e6),
  }));
}

export const inMitosis = (p: Phase) => p !== 'interphase';

/** Mitotic index as a fraction (0–1). */
export function mitoticIndex(cellsInMitosis: number, totalCells: number): number {
  if (totalCells <= 0) throw new Error('total must be positive');
  if (cellsInMitosis < 0 || cellsInMitosis > totalCells) throw new Error('count out of range');
  return cellsInMitosis / totalCells;
}

export interface Check { marked: number; correct: number; missed: number[]; wrong: number[]; yourIndex: number; trueIndex: number; trueCount: number }

/** Compare the cells a student marked as "in mitosis" with the real phases. */
export function check(cells: FieldCell[], marked: Set<number>): Check {
  const truth = cells.filter((c) => inMitosis(c.phase)).map((c) => c.i);
  const t = new Set(truth);
  const missed = truth.filter((i) => !marked.has(i));
  const wrong = [...marked].filter((i) => !t.has(i)).sort((a, b) => a - b);
  return {
    marked: marked.size,
    correct: truth.length - missed.length,
    missed,
    wrong,
    yourIndex: mitoticIndex(marked.size, cells.length),
    trueIndex: mitoticIndex(truth.length, cells.length),
    trueCount: truth.length,
  };
}

/** Format a mitotic index to 2 decimal places, as usually reported (also as a percentage). */
export const fmt = (mi: number) => `${mi.toFixed(2)} (${(mi * 100).toFixed(1)}%)`;
