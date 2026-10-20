/**
 * Qualitative model of blood glucose regulation (D3.3.3) and of type 1 and type 2 diabetes (D3.3.4).
 * It shows the directions and rough sizes of the responses, not a clinical simulation.
 *
 * - Blood glucose G (mmol dm⁻³) rises as glucose is absorbed from a meal and as the liver releases
 *   glucose; it falls as cells take glucose up. Above the renal threshold (about 10 mmol dm⁻³) some
 *   glucose is lost in urine.
 * - β cells in the islets of the pancreas secrete insulin in proportion to how far G is above the set
 *   point (5 mmol dm⁻³); α cells secrete glucagon in proportion to how far G is below it. Insulin
 *   from neighbouring β cells also suppresses glucagon release, so with no insulin (type 1) glucagon
 *   stays high. Both hormones are relative values (1 = the fasting level of a healthy person).
 * - Insulin makes liver, muscle and fat cells take up glucose (liver and muscle store it as
 *   glycogen: glycogenesis) and reduces glucose release by the liver. Glucagon makes the liver
 *   break glycogen down to glucose (glycogenolysis) and release it.
 * - Exercising muscle takes up extra glucose even without insulin.
 * - Type 1: β cells destroyed, no insulin secretion. Treatment adds injected insulin: a basal dose
 *   plus a dose before each meal (no feedback from blood glucose).
 * - Type 2: target cells are insulin resistant (sensitivity 0.3 of normal) and glucagon is less well suppressed; β cells secrete
 *   more insulin and glucose is still higher than normal.
 */

export type Condition = 'healthy' | 'type1' | 'type2';
export type EventKind = 'meal' | 'exercise';
export interface GlucoseEvent { kind: EventKind; t: number }
export interface Inputs { condition: Condition; treated: boolean; events: GlucoseEvent[] }

export interface Sample {
  t: number;
  /** Blood glucose, mmol dm⁻³. */
  glucose: number;
  /** Relative insulin concentration in blood (1 = healthy fasting). */
  insulin: number;
  /** Relative glucagon concentration in blood (1 = healthy fasting). */
  glucagon: number;
  /** Net rate of glycogen storage in liver and muscle (positive = glycogenesis, negative = glycogenolysis), arbitrary units. */
  glycogenFlux: number;
  /** Glucose being lost in urine (mmol dm⁻³ of blood per minute). */
  urine: number;
  exercising: boolean;
}

export const SET_POINT = 5;
export const RENAL_THRESHOLD = 10;
export const DURATION = 480; // minutes
export const EXERCISE_MIN = 45;
export const MEAL_GLUCOSE = 25; // mmol dm⁻³ of blood absorbed in total from one meal
const MEAL_K = 1 / 35; // absorption peaks ~35 min after eating
const BOLUS_K = 1 / 45;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const gammaPulse = (dt: number, k: number) => (dt <= 0 ? 0 : k * k * dt * Math.exp(-k * dt));

export const sensitivity = (c: Condition) => (c === 'type2' ? 0.3 : 1);

/** Simulate DURATION minutes (after a warm-up to the fasting steady state), one sample per minute. */
export function simulate({ condition, treated, events }: Inputs): Sample[] {
  const S = sensitivity(condition);
  const secretes = condition !== 'type1';
  const injects = condition === 'type1' && treated;
  const meals = events.filter((e) => e.kind === 'meal').map((e) => e.t);
  const ex = events.filter((e) => e.kind === 'exercise').map((e) => e.t);
  let G = SET_POINT, I = secretes ? 1 : injects ? 0.8 : 0, N = 1;
  const out: Sample[] = [];
  const WARM = 1500;
  for (let m = -WARM; m <= DURATION; m++) {
    const t = m;
    const meal = t < 0 ? 0 : meals.reduce((s, t0) => s + MEAL_GLUCOSE * gammaPulse(t - t0, MEAL_K), 0);
    const exercising = t >= 0 && ex.some((t0) => t >= t0 && t < t0 + EXERCISE_MIN);

    // hormones
    let iTarget: number;
    // type 2: β cells secrete more insulin than normal at fasting, but their response to a rise in glucose is weaker
    if (secretes) iTarget = condition === 'type2' ? clamp(1.4 + 0.35 * (G - SET_POINT), 0.1, 9) : clamp(1 + 1.3 * (G - SET_POINT), 0.1, 9);
    else if (injects) iTarget = 0.8 + (t < 0 ? 0 : meals.reduce((s, t0) => s + 160 * gammaPulse(t - t0 + 15, BOLUS_K), 0));
    else iTarget = 0;
    if (exercising && secretes) iTarget *= 0.6; // sympathetic signals reduce insulin release during exercise
    // in type 2, α cells are also less responsive to insulin, so glucagon is not fully suppressed
    const nTarget = clamp(1 + 1.5 * (SET_POINT - G), 0.2, 6) + 0.8 * Math.max(0, 1 - I) + (condition === 'type2' ? 0.85 : 0);
    I += (iTarget - I) / 8;
    N += (nTarget - N) / 8;

    // glucose fluxes (mmol dm⁻³ min⁻¹)
    const u0 = 0.01 * G; // insulin-independent uptake (brain, red blood cells)
    const ui = 0.01 * S * I * G; // insulin-stimulated uptake into liver, muscle and fat
    const ue = exercising ? 0.06 * (G / SET_POINT) : 0; // contracting muscle
    const liver = (0.1 * N * 1.5) / (0.5 + S * I); // glucose released by the liver
    const urine = 0.02 * Math.max(0, G - RENAL_THRESHOLD);
    G = Math.max(1.5, G + meal + liver - u0 - ui - ue - urine);

    if (t >= 0) out.push({ t, glucose: G, insulin: I, glucagon: N, glycogenFlux: 0.6 * ui - liver + 0.07, urine, exercising });
  }
  return out;
}

export interface Summary { fasting: number; peak: number; min: number; final: number; timeOutside: number; urineMinutes: number }

/** Simple statistics of a run; timeOutside = minutes with glucose outside 4–8 mmol dm⁻³. */
export function summarise(run: Sample[]): Summary {
  const g = run.map((s) => s.glucose);
  return {
    fasting: g[0]!,
    peak: Math.max(...g),
    min: Math.min(...g),
    final: g[g.length - 1]!,
    timeOutside: g.filter((v) => v < 4 || v > 8).length,
    urineMinutes: run.filter((s) => s.urine > 0).length,
  };
}

export const conditionName: Record<Condition, string> = {
  healthy: 'no diabetes',
  type1: 'type 1 diabetes',
  type2: 'type 2 diabetes',
};
