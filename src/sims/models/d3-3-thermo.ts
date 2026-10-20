/**
 * Qualitative model of thermoregulation by negative feedback in a lightly clothed adult (D3.3.5, D3.3.6).
 * It gives the direction and relative size of each response, not a physiological simulation.
 *
 * - Thermal stress s combines air temperature (neutral at about 24 °C for a lightly clothed adult in
 *   this model) and activity: muscle contraction releases heat. s > 0 means heat gain, s < 0 heat loss.
 * - With feedback, thermoreceptors signal to the hypothalamus, which switches on responses that oppose
 *   the change, so core temperature stays within a few tenths of a degree of 37 °C (a residual error
 *   remains: that is what drives the responses). In vigorous exercise core temperature runs slightly
 *   higher, as it does in life.
 * - Responses to heat: vasodilation of skin arterioles, sweating. Responses to cold: vasoconstriction,
 *   hair erection, shivering, uncoupled respiration in brown adipose tissue and, more slowly, increased
 *   thyroxin secretion (hypothalamus → TRH → anterior pituitary → TSH → thyroid).
 * - With feedback switched off (a thought experiment), every response stays at its neutral value and
 *   core temperature drifts with the thermal stress.
 */

export interface Inputs {
  /** Air temperature, °C (−10 to 45). */
  air: number;
  /** Activity: 0 = rest, 1 = moderate exercise, 2 = vigorous exercise. */
  activity: number;
  /** True when the hypothalamus can respond (normal). */
  feedback: boolean;
}

export interface State {
  stress: number;
  /** Core body temperature, °C. */
  core: number;
  /** Skin arteriole width / skin blood flow, 0 = fully constricted, 1 = fully dilated (0.4 neutral). */
  skinFlow: number;
  /** Sweat rate, dm³ per hour (up to about 2). */
  sweat: number;
  /** Shivering intensity, 0–1. */
  shiver: number;
  /** Heat output of brown adipose tissue, 0–1. */
  brownFat: number;
  /** Hair erection (erector muscles), 0–1. */
  hair: number;
  /** Relative thyroxin secretion (1 = normal). */
  thyroxin: number;
}

export const SET_POINT = 37;
export const NEUTRAL_AIR = 24;
export const activityNames = ['rest', 'moderate exercise', 'vigorous exercise'] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

export const thermalStress = (air: number, activity: number) => (air - NEUTRAL_AIR) / 12 + 0.65 * clamp(activity, 0, 2);

export function model({ air, activity, feedback }: Inputs): State {
  const s = thermalStress(air, activity);
  if (!feedback) {
    return {
      stress: s,
      core: clamp(SET_POINT + 1.6 * s, 28, 43),
      skinFlow: 0.4, sweat: 0, shiver: 0, brownFat: 0, hair: 0, thyroxin: 1,
    };
  }
  const heat = Math.max(0, s), cold = Math.max(0, -s);
  return {
    stress: s,
    core: SET_POINT + 0.3 * Math.tanh(s / 1.5) + 0.25 * clamp(activity, 0, 2),
    skinFlow: clamp01(0.4 + 0.6 * Math.tanh(heat / 0.8) - 0.4 * Math.tanh(cold / 0.5)),
    sweat: clamp(2 * Math.tanh(Math.max(0, s - 0.15) / 1.5), 0, 2),
    shiver: clamp01((cold - 0.6) / 1.4),
    brownFat: clamp01((cold - 0.25) / 1.2),
    hair: clamp01((cold - 0.1) / 0.6),
    thyroxin: 1 + 0.5 * clamp01((cold - 0.3) / 1.5) - 0.15 * clamp01(heat / 1.5),
  };
}
