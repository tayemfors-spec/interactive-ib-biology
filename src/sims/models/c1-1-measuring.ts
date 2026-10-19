/**
 * Catalase experiment model (C1.1.9): 2 H₂O₂ → 2 H₂O + O₂, oxygen collected in a gas syringe.
 *
 * A fixed amount of hydrogen peroxide is used up, so the volume of oxygen approaches the same final
 * volume whatever the enzyme concentration; more enzyme only gets there faster. With substrate being
 * used up, the rate falls with time, so the curve is steepest at the start: V(t) = Vfinal·(1 − e^(−k·t)),
 * with k proportional to the enzyme concentration.
 *
 * Repeats add small, deterministic measurement noise so the mean of three repeats can be calculated.
 */
export const V_FINAL = 30; // cm³ of O₂ when all the H₂O₂ has been broken down
const K_PER_UNIT = 0.012; // s⁻¹ per % enzyme

export const kFor = (enzyme: number) => K_PER_UNIT * enzyme;

/** Volume of oxygen (cm³) collected after t seconds, enzyme concentration in % (0.5–5). */
export const volume = (t: number, enzyme: number) => (t <= 0 ? 0 : V_FINAL * (1 - Math.exp(-kFor(enzyme) * t)));

/** Gradient of the curve (cm³ s⁻¹) at time t: the slope of the tangent there. */
export const gradient = (t: number, enzyme: number) => V_FINAL * kFor(enzyme) * Math.exp(-kFor(enzyme) * Math.max(0, t));

/** Initial rate: gradient of the tangent at t = 0. */
export const initialRate = (enzyme: number) => gradient(0, enzyme);

/** Time (s) to collect `target` cm³ of oxygen, or Infinity if it is never reached. */
export function timeTo(target: number, enzyme: number): number {
  if (target >= V_FINAL || enzyme <= 0) return Infinity;
  return -Math.log(1 - target / V_FINAL) / kFor(enzyme);
}

/** Deterministic noise in [−1, 1] for repeat r at time index i. */
const noise = (r: number, i: number, e: number) => {
  const x = Math.sin((r + 1) * 12.9898 + i * 78.233 + e * 37.719) * 43758.5453;
  return 2 * (x - Math.floor(x)) - 1;
};

/** Gas-syringe reading (to 0.5 cm³) for repeat r (0–2) at time t; readings never decrease. */
export function reading(r: number, t: number, enzyme: number, step = 10): number {
  let prev = 0;
  for (let i = 1; i * step <= t + 1e-9; i++) {
    const v = volume(i * step, enzyme) * (1 + 0.05 * noise(r, i, enzyme)) + 0.4 * noise(r + 7, i, enzyme);
    prev = Math.max(prev, Math.min(V_FINAL + 1, v));
  }
  return Math.round(prev * 2) / 2;
}

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
