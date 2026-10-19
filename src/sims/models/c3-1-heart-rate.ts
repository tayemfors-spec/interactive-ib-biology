/**
 * Qualitative model of the negative feedback control of heart rate (C3.1.14) and ventilation rate
 * (C3.1.15). It shows the directions of the responses, with values in realistic ranges, not a
 * physiological simulation.
 *
 * - Exercise intensity e (0–100 % of maximum) raises CO₂ production by muscles; above ~65 % some
 *   anaerobic respiration adds lactic acid (lactate + H⁺), which lowers plasma HCO₃⁻.
 * - Blood pH follows the Henderson–Hasselbalch relation for the CO₂/HCO₃⁻ buffer:
 *   pH = 6.1 + log10([HCO₃⁻] / (0.23 × pCO₂)), with pCO₂ in kPa and HCO₃⁻ in mmol dm⁻³.
 *   At rest (pCO₂ 5.3 kPa, HCO₃⁻ 24) this gives pH ≈ 7.40.
 * - With chemoreceptor feedback, ventilation rises with CO₂ production, so arterial pCO₂ changes
 *   only slightly and pH stays within about 7.35–7.45 except in very hard exercise. If the signal
 *   is blocked, ventilation stays at the resting value and CO₂ accumulates.
 * - Blood pressure is a separate input: a rise stretches baroreceptors, the medulla increases
 *   parasympathetic (vagus) and decreases sympathetic output, and heart rate falls.
 */

export interface Inputs {
  /** Exercise intensity, 0–100 % of maximum. */
  exercise: number;
  /** Change in blood pressure detected by baroreceptors: −2 (much lower) … 0 (normal) … +2 (much higher). */
  pressure: number;
  /** True when chemoreceptor signals reach the respiratory centre (normal); false = blocked (thought experiment). */
  feedback: boolean;
}

export interface State {
  /** Arterial partial pressure of CO₂, kPa. */
  pco2: number;
  /** Plasma hydrogencarbonate, mmol dm⁻³. */
  hco3: number;
  pH: number;
  /** Relative firing of chemoreceptors, 0–1. */
  chemo: number;
  /** Relative firing of baroreceptors, 0–1. */
  baro: number;
  /** Relative activity of the sympathetic (cardiac accelerator) nerve, 0–1. */
  sympathetic: number;
  /** Relative activity of the parasympathetic (vagus) nerve to the heart, 0–1. */
  vagus: number;
  /** Heart rate, beats per minute. */
  heartRate: number;
  /** Stroke volume, cm³ (mL) per beat. */
  strokeVolume: number;
  /** Cardiac output, dm³ (L) per minute. */
  cardiacOutput: number;
  /** Ventilation (breathing) rate, breaths per minute. */
  breathRate: number;
  /** Tidal volume, dm³ (L) per breath. */
  tidalVolume: number;
  /** Ventilation, dm³ (L) per minute. */
  ventilation: number;
}

export const REST = { pco2: 5.3, hco3: 24, heartRate: 70, strokeVolume: 70, breathRate: 12, tidalVolume: 0.5 } as const;
export const PH_RANGE = { low: 7.35, high: 7.45 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

/** Blood pH from pCO₂ (kPa) and HCO₃⁻ (mmol dm⁻³), using the CO₂/HCO₃⁻ buffer equation. */
export function bloodPH(pco2: number, hco3: number): number {
  return 6.1 + Math.log10(hco3 / (0.23 * pco2));
}

/** Fraction of maximum lactic acid production (0 below ~65 % intensity, 1 at maximum). */
export const lactate = (exercise: number) => clamp01((exercise - 65) / 35);

export function model({ exercise, pressure, feedback }: Inputs): State {
  const d = clamp01(exercise / 100);
  const p = clamp(pressure, -2, 2);
  const lac = lactate(exercise);
  const hco3 = REST.hco3 - 6 * lac;

  // Ventilation: with feedback it rises with CO₂ production; blocked, it stays at the resting value.
  const breathRate = feedback ? REST.breathRate + 28 * d : REST.breathRate;
  const tidalVolume = feedback ? REST.tidalVolume + 2 * d : REST.tidalVolume;
  const ventilation = breathRate * tidalVolume;

  // With feedback only a small residual rise in CO₂ remains (the error signal), and in very hard
  // exercise extra ventilation driven by lactic acid lowers pCO₂. Without feedback CO₂ accumulates.
  const pco2 = feedback ? REST.pco2 + 0.4 * d - 1.2 * lac : REST.pco2 + 4 * d;
  const pH = bloodPH(pco2, hco3);

  const chemo = clamp01(0.15 + (bloodPH(REST.pco2, REST.hco3) - pH) * 10 + (pco2 - REST.pco2) * 0.1);
  const baro = clamp01(0.5 + 0.22 * p);

  const sympathetic = clamp01(0.15 + 0.85 * d - 0.12 * p);
  const vagus = clamp01(0.75 - 0.75 * d + 0.12 * p);

  const heartRate = clamp(REST.heartRate + 115 * d - 9 * p, 45, 195);
  const strokeVolume = clamp(REST.strokeVolume + 40 * Math.min(1, d / 0.5) - 5 * p, 50, 120);
  const cardiacOutput = (heartRate * strokeVolume) / 1000;

  return { pco2, hco3, pH, chemo, baro, sympathetic, vagus, heartRate, strokeVolume, cardiacOutput, breathRate, tidalVolume, ventilation };
}

export const pressureNames = ['much lower', 'lower', 'normal', 'higher', 'much higher'] as const;
export const pressureName = (p: number) => pressureNames[clamp(Math.round(p), -2, 2) + 2]!;
