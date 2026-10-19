/**
 * Capture–mark–release–recapture (C4.1.4).
 * Lincoln index: population estimate = M × N ÷ R, where M = number caught and marked in the first sample,
 * N = total number caught in the second sample and R = number of marked individuals in the second sample.
 *
 * The simulation can break each assumption of the method so its effect on the estimate can be seen:
 *  - markLoss: fraction of marks that wear off before recapture (R too low → overestimate)
 *  - markedDeath: fraction of marked animals killed because the mark makes them conspicuous (overestimate)
 *  - trapBias: marked animals stay near the release point and are this many times more likely to be
 *    recaptured than unmarked ones, i.e. no random mixing (R too high → underestimate)
 *  - immigration: unmarked animals arriving between samples, as a fraction of the true population (overestimate)
 */
import { mulberry32, sampleIndices, type Rng } from './c4-1-rng';

export const lincoln = (m: number, n: number, r: number) => (r > 0 ? (m * n) / r : Infinity);

export interface CmrParams {
  trueN: number;
  firstCatch: number;
  secondCatch: number;
  markLoss?: number;
  markedDeath?: number;
  trapBias?: number;
  immigration?: number;
}

export interface Animal { marked: boolean; everMarked: boolean; alive: boolean; immigrant: boolean; recaptured: boolean }
export interface CmrResult { M: number; N: number; R: number; estimate: number; animals: Animal[] }

export function runCmr(p: CmrParams, rng: Rng): CmrResult {
  const animals: Animal[] = Array.from({ length: p.trueN }, () => ({ marked: false, everMarked: false, alive: true, immigrant: false, recaptured: false }));
  // 1. first capture: mark M individuals chosen at random, then release
  const first = sampleIndices(rng, animals.length, p.firstCatch);
  for (const i of first) { animals[i]!.marked = true; animals[i]!.everMarked = true; }
  const M = first.length;
  // 2. between samples: assumption breaks
  for (const a of animals) {
    if (!a.marked) continue;
    if (rng() < (p.markedDeath ?? 0)) { a.alive = false; continue; }
    if (rng() < (p.markLoss ?? 0)) a.marked = false;
  }
  const arrivals = Math.round((p.immigration ?? 0) * p.trueN);
  for (let i = 0; i < arrivals; i++) animals.push({ marked: false, everMarked: false, alive: true, immigrant: true, recaptured: false });
  // 3. second capture: weighted sampling without replacement among the living
  const bias = p.trapBias ?? 1;
  const pool = animals.filter((a) => a.alive);
  const k = Math.min(p.secondCatch, pool.length);
  const weights = pool.map((a) => (a.marked ? bias : 1));
  let total = weights.reduce((s, w) => s + w, 0);
  for (let c = 0; c < k; c++) {
    let x = rng() * total;
    let j = 0;
    while (j < pool.length - 1 && (weights[j] === 0 || x >= weights[j]!)) { x -= weights[j]!; j++; }
    while (weights[j] === 0 && j > 0) j--; // floating-point edge case at the end of the list
    pool[j]!.recaptured = true;
    total -= weights[j]!;
    weights[j] = 0;
  }
  const R = pool.filter((a) => a.recaptured && a.marked).length;
  return { M, N: k, R, estimate: lincoln(M, k, R), animals };
}

/** Repeated independent trials with consecutive seeds. */
export function trials(p: CmrParams, seed: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => runCmr(p, mulberry32(seed + i * 7919)).estimate);
}
