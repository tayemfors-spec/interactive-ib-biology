/**
 * Qualitative model of a narrowed coronary artery (B3.2.6). Arbitrary units: the oxygen demand of the
 * heart muscle at rest is 1.
 *
 * - Plaque (atheroma) narrows the lumen. `n` is the fraction of the lumen diameter lost (0–1).
 * - At rest, arterioles downstream dilate to keep flow up, so resting flow is maintained until the
 *   narrowing is severe. The maximum flow the artery can deliver (normally about 4× resting) falls
 *   steeply once more than about half the diameter is lost. This is why angina appears on exertion first.
 * - A blood clot forming on a ruptured plaque blocks the artery completely (occlusion), so the muscle it
 *   supplies receives no oxygen: a myocardial infarction (heart attack).
 */
export type Activity = 'rest' | 'exercise';
export type Outcome = 'normal' | 'angina' | 'rest-ischaemia' | 'infarction';

export const DEMAND: Record<Activity, number> = { rest: 1, exercise: 3 };

/** Fraction of the original lumen cross-sectional area still open (area ∝ diameter²). */
export const areaLeft = (n: number) => (1 - Math.min(1, Math.max(0, n))) ** 2;

/** Maximum blood (oxygen) supply the artery can deliver, in units of resting demand. */
export function maxSupply(n: number): number {
  const c = Math.min(1, Math.max(0, n));
  if (c >= 1) return 0;
  return 4 * (1 - c ** 3.3);
}

export function supply(n: number, activity: Activity, clot = false): number {
  if (clot) return 0;
  return Math.min(DEMAND[activity], maxSupply(n));
}

export function outcome(n: number, activity: Activity, clot = false): Outcome {
  const s = supply(n, activity, clot);
  if (s <= 0) return 'infarction';
  if (maxSupply(n) < DEMAND.rest) return 'rest-ischaemia';
  if (s < DEMAND[activity] - 1e-9) return 'angina';
  return 'normal';
}
