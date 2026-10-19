/**
 * Water potential of a plant cell and its surroundings (D2.3.8–D2.3.11). All values in kPa,
 * relative to pure water at atmospheric pressure and 20 °C (ψ = 0).
 *
 *   ψw = ψs + ψp
 *
 * Simplified model of a walled cell:
 *  - Volume v is relative to the volume at incipient plasmolysis (v = 1: protoplast just fills the
 *    wall, no turgor pressure).
 *  - The amount of solute in the cell is fixed, so solute potential is inversely proportional to
 *    volume: ψs = ψs1 / v, where ψs1 is the solute potential at v = 1 (ideal, van 't Hoff behaviour).
 *  - Above v = 1 the stretched wall pushes back: ψp = ε (v − 1), with wall elasticity ε.
 *  - Below v = 1 the protoplast shrinks away from the wall (plasmolysis) and ψp = 0.
 * The surroundings (a large volume of bathing solution, or xylem sap) do not change.
 * Water moves from higher to lower ψ until the cell's ψ equals that of its surroundings.
 */

/** Wall elastic modulus, kPa. With ψs1 = −1000 kPa a cell in pure water swells by about 11 %. */
export const EPSILON = 8000;

/** Differences smaller than this (kPa) are treated as equal: dynamic equilibrium. */
export const TOLERANCE = 1;

export const waterPotential = (psiS: number, psiP: number) => psiS + psiP;

export type Direction = 'into-cell' | 'out-of-cell' | 'none';

/** Net water movement between a cell and its surroundings: from higher to lower water potential. */
export function netMovement(psiCell: number, psiOutside: number): Direction {
  if (Math.abs(psiCell - psiOutside) < TOLERANCE) return 'none';
  return psiOutside > psiCell ? 'into-cell' : 'out-of-cell';
}

export interface CellState { v: number; psiS: number; psiP: number; psi: number }

/** Pressure potential exerted by the wall at relative volume v. */
export const wallPressure = (v: number, eps = EPSILON) => (v > 1 ? eps * (v - 1) : 0);

/** The state of a cell with solute potential ψs1 (at v = 1) when its volume is v. */
export function cellAt(psiS1: number, v: number, eps = EPSILON): CellState {
  const psiS = psiS1 / v;
  const psiP = wallPressure(v, eps);
  return { v, psiS, psiP, psi: psiS + psiP };
}

/**
 * Reconstruct a cell from its current solute and pressure potentials. If ψp > 0 the protoplast
 * fills the wall and v = 1 + ψp/ε; if ψp = 0 the cell is taken to be at incipient plasmolysis (v = 1).
 */
export function cellFromPotentials(psiS: number, psiP: number, eps = EPSILON): { psiS1: number; v: number } {
  const v = psiP > 0 ? 1 + psiP / eps : 1;
  return { psiS1: psiS * v, v };
}

/** Volume at which the cell's water potential equals ψout (the equilibrium after water has moved). */
export function equilibriumVolume(psiS1: number, psiOut: number, eps = EPSILON): number {
  if (psiS1 >= 0) throw new Error('a cell always contains solutes, so ψs1 must be negative');
  if (psiOut > 0) throw new Error('surroundings cannot have ψ above 0 in this model');
  if (psiOut <= psiS1) {
    // hypertonic surroundings: plasmolysis, ψp = 0, so ψs must fall to ψout
    return psiS1 / psiOut;
  }
  // turgid: ε(v − 1) + ψs1/v = ψout  →  εv² − (ε + ψout)v + ψs1 = 0 (take the positive root)
  const b = eps + psiOut;
  return (b + Math.sqrt(b * b - 4 * eps * psiS1)) / (2 * eps);
}

export function equilibrate(psiS1: number, psiOut: number, eps = EPSILON): CellState {
  return cellAt(psiS1, equilibriumVolume(psiS1, psiOut, eps), eps);
}

export type CellCondition = 'fully-turgid' | 'turgid' | 'incipient' | 'plasmolysed';

/** Describe a cell's condition from its pressure potential, water potential and volume. */
export function condition(s: CellState): CellCondition {
  if (s.v < 1 - 1e-3) return 'plasmolysed';
  if (s.psiP < TOLERANCE) return 'incipient';
  if (Math.abs(s.psi) < TOLERANCE) return 'fully-turgid';
  return 'turgid';
}

/**
 * Keep slider values physically sensible: a cell's ψs is negative, its ψp is not negative,
 * and its ψ cannot exceed that of pure water (ψp ≤ −ψs).
 */
export function clampCell(psiS: number, psiP: number): { psiS: number; psiP: number; clamped: boolean } {
  const s = Math.min(psiS, -1);
  const p = Math.max(0, psiP);
  const maxP = -s;
  return p > maxP ? { psiS: s, psiP: maxP, clamped: true } : { psiS: s, psiP: p, clamped: false };
}

/** Surroundings: ψs ≤ 0; ψp = 0 for an open solution, ≤ 0 for xylem sap under tension. */
export function surroundings(psiS: number, psiP: number): number {
  return Math.min(0, psiS) + Math.min(0, psiP);
}

export const kPaToMPa = (kPa: number) => kPa / 1000;

/** Format a potential as "−700 kPa", using a true minus sign and avoiding "−0". */
export function fmtKPa(kPa: number): string {
  const r = Math.round(kPa);
  if (r === 0) return '0 kPa';
  return `${r < 0 ? '−' : '+'}${Math.abs(r)} kPa`;
}

export function fmtMPa(kPa: number): string {
  const r = Math.round(kPa) / 1000;
  if (r === 0) return '0 MPa';
  return `${r < 0 ? '−' : '+'}${Math.abs(r).toFixed(2)} MPa`;
}
