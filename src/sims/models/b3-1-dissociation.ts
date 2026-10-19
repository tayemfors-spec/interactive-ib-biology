/**
 * Oxygen dissociation curves (B3.1.11–13). Partial pressures are in kPa throughout.
 *
 * Saturation follows the Hill equation  S = pO₂ⁿ / (P50ⁿ + pO₂ⁿ):
 *  - Adult haemoglobin (HbA, α₂β₂): P50 ≈ 3.5 kPa (≈ 26–27 mmHg) at pH 7.4, pCO₂ 5.3 kPa, 37 °C;
 *    Hill coefficient n ≈ 2.7. n > 1 is what makes the curve S-shaped (cooperative binding).
 *  - Foetal haemoglobin (HbF, α₂γ₂): P50 ≈ 2.5 kPa (≈ 19 mmHg), so the curve lies to the left.
 *  - Myoglobin: one haem per molecule, so no cooperativity (n = 1): a hyperbola with P50 ≈ 0.37 kPa.
 *
 * Bohr shift: CO₂ lowers blood pH (CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻) and also binds to the globin
 * chains (carbaminohaemoglobin). Both lower O₂ affinity. The model lumps them together:
 *   pH from Henderson–Hasselbalch with plasma HCO₃⁻ fixed at 24 mmol dm⁻³ (no extra buffering);
 *   log₁₀ P50 rises by 0.48 per unit fall in pH (the CO₂ Bohr coefficient, ≈ −0.48).
 * A simplified but realistic model: the Hill equation is least accurate below ≈ 10 % saturation.
 */

export type Pigment = 'adult' | 'foetal' | 'myoglobin';

export const STANDARD_PCO2 = 5.3; // kPa, arterial / alveolar
export const STANDARD_PH = 7.4;
export const LUNG_PO2 = 13.3; // kPa, alveolar air
export const ATMOSPHERIC_PO2 = 21.2; // kPa at sea level
const BOHR_COEFFICIENT = -0.48; // Δlog₁₀P50 / ΔpH
const HCO3 = 24; // mmol dm⁻³
const CO2_SOLUBILITY = 0.23; // mmol dm⁻³ kPa⁻¹

export const PIGMENTS: Record<Pigment, { p50: number; n: number; bohr: boolean }> = {
  adult: { p50: 3.5, n: 2.7, bohr: true },
  foetal: { p50: 2.5, n: 2.7, bohr: true },
  myoglobin: { p50: 0.37, n: 1, bohr: false },
};

/** Blood pH for a given pCO₂ (kPa), by Henderson–Hasselbalch with fixed bicarbonate. */
export function phFromPco2(pco2: number): number {
  return 6.1 + Math.log10(HCO3 / (CO2_SOLUBILITY * Math.max(0.1, pco2)));
}

/** P50 (kPa) of a pigment at a given pCO₂ (kPa). Myoglobin has no Bohr effect. */
export function p50(pigment: Pigment, pco2 = STANDARD_PCO2): number {
  const base = PIGMENTS[pigment];
  if (!base.bohr) return base.p50;
  const dpH = phFromPco2(pco2) - phFromPco2(STANDARD_PCO2);
  return base.p50 * 10 ** (BOHR_COEFFICIENT * dpH);
}

/** Fractional saturation (0–1) at a given pO₂ and pCO₂ (kPa). */
export function saturation(po2: number, pigment: Pigment = 'adult', pco2 = STANDARD_PCO2): number {
  if (po2 <= 0) return 0;
  const { n } = PIGMENTS[pigment];
  const k = p50(pigment, pco2);
  const x = (po2 / k) ** n;
  return x / (1 + x);
}

/** Percentage saturation, rounded to a whole number for display. */
export const percent = (s: number) => Math.round(s * 100);

/**
 * Oxygen given up between the lungs and a tissue, as percentage points of saturation.
 * In the lungs the blood has the standard pCO₂; in the tissue it has the tissue pCO₂.
 */
export function unloading(tissuePo2: number, tissuePco2: number, pigment: Pigment = 'adult') {
  const lungs = saturation(LUNG_PO2, pigment, STANDARD_PCO2);
  const tissue = saturation(tissuePo2, pigment, tissuePco2);
  return { lungs, tissue, released: lungs - tissue };
}

/** Slope dS/dpO₂ (per kPa), used to show where the curve is steepest. */
export function slope(po2: number, pigment: Pigment = 'adult', pco2 = STANDARD_PCO2, h = 1e-3): number {
  return (saturation(po2 + h, pigment, pco2) - saturation(Math.max(0, po2 - h), pigment, pco2)) / (po2 < h ? po2 + h : 2 * h);
}
