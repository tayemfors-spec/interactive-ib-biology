/**
 * Positive feedback in global warming (D4.3.2–D4.3.3). QUALITATIVE MODEL.
 *
 * Warming is in relative units: 1 unit = the warming that human emissions would cause on their own,
 * with no feedback at all. Each feedback loop returns a fraction (its gain) of the total warming as
 * extra warming, so at equilibrium
 *
 *     T = direct + Σ gainᵢ(T) · T      →      T = direct / (1 − G)   when the gains are constant.
 *
 * Two loops have a tipping point: once total warming passes a threshold, the system changes state
 * (permafrost thaw becomes widespread and abrupt; boreal forest flips from carbon sink to carbon
 * source), and the loop's gain rises. The gains and thresholds are invented to show the behaviour,
 * not measured values, and the model has no hysteresis (real tipping points may not reverse).
 */

export type LoopId = 'ice' | 'permafrost' | 'boreal' | 'ocean';

export interface Loop {
  id: LoopId;
  /** Fraction of the total warming returned as extra warming, before any tipping point. */
  gain: number;
  /** Optional tipping point: above `at` units of warming the gain becomes `gainAfter`. */
  tip?: { at: number; gainAfter: number };
}

export const LOOPS: readonly Loop[] = [
  { id: 'ice', gain: 0.1 },
  { id: 'permafrost', gain: 0.06, tip: { at: 1.8, gainAfter: 0.12 } },
  { id: 'boreal', gain: 0.04, tip: { at: 2.4, gainAfter: 0.1 } },
  { id: 'ocean', gain: 0.05 },
];

export const LOOP_IDS = LOOPS.map((l) => l.id);
export const DIRECT_MIN = 0.5;
export const DIRECT_MAX = 3;
export const STRENGTH_MIN = 0.5;
export const STRENGTH_MAX = 1.5;

const loop = (id: LoopId) => LOOPS.find((l) => l.id === id)!;

/** Gain of one loop at a given total warming, scaled by the strength multiplier. */
export function gainAt(id: LoopId, warming: number, strength = 1): number {
  const l = loop(id);
  const g = l.tip && warming >= l.tip.at ? l.tip.gainAfter : l.gain;
  return g * strength;
}

export interface Result {
  direct: number;
  total: number;
  /** total ÷ direct */
  amplification: number;
  /** Extra warming added by each loop that is switched on (0 for loops that are off). */
  contributions: Record<LoopId, number>;
  /** Loops that are on and have passed their tipping point. */
  tipped: LoopId[];
  /** Sum of the gains of the loops that are on, at the final warming. */
  totalGain: number;
}

/**
 * Equilibrium warming. Solved by iteration from the no-feedback state; because every gain is
 * non-decreasing with warming, the sequence rises monotonically to the first stable state.
 */
export function equilibrium(direct: number, on: readonly LoopId[], strength = 1): Result {
  const G = (t: number) => on.reduce((s, id) => s + gainAt(id, t, strength), 0);
  let t = direct;
  for (let i = 0; i < 2000; i++) {
    const next = direct + G(t) * t;
    if (Math.abs(next - t) < 1e-10) { t = next; break; }
    t = next;
  }
  // with constant gains the fixed point is exact: use it to remove iteration error
  const g = G(t);
  const total = g < 1 ? direct / (1 - g) : Infinity;
  const contributions = Object.fromEntries(LOOP_IDS.map((id) => [id, on.includes(id) ? gainAt(id, total, strength) * total : 0])) as Record<LoopId, number>;
  const tipped = on.filter((id) => { const l = loop(id); return !!l.tip && total >= l.tip.at; });
  return { direct, total, amplification: total / direct, contributions, tipped, totalGain: g };
}

/**
 * Rounds of feedback for display: round 0 is the direct warming, round k adds directly × Gᵏ.
 * The rounds shrink geometrically when G < 1, which is why positive feedback amplifies warming
 * without (in this model) running away.
 */
export function rounds(r: Result, n = 6): number[] {
  return Array.from({ length: n }, (_, k) => r.direct * r.totalGain ** k);
}

/** Total warming over a range of direct warming, for the response graph. */
export function responseCurve(on: readonly LoopId[], strength = 1, samples = 125): { direct: number; total: number }[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const d = DIRECT_MIN + ((DIRECT_MAX - DIRECT_MIN) * i) / samples;
    return { direct: d, total: equilibrium(d, on, strength).total };
  });
}
