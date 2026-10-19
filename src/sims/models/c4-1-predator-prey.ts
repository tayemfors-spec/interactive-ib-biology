/**
 * Lotka–Volterra predator–prey model (C4.1.16–17), with an optional limit on the prey's food supply.
 *   dH/dt = a·H·(1 − H/K) − b·H·L        H = prey (e.g. snowshoe hare)
 *   dL/dt = e·b·H·L − d·L                L = predator (e.g. Canada lynx)
 * a = prey per-capita birth rate, K = carrying capacity for the prey set by its food (bottom-up),
 * b = predation (attack) rate (top-down), e = conversion efficiency of prey eaten into new predators,
 * d = predator death rate. With K = ∞ this is the classic model: neutral cycles that repeat forever.
 * A finite K damps the cycles towards a steady state; if K is below the prey level that predators need
 * (d / (e·b)), the predators die out and the prey settle at K. Arbitrary units; a qualitative model.
 */
export interface PPParams { a: number; b: number; e: number; d: number; K: number; predators: boolean }
export interface PPPoint { t: number; H: number; L: number }

export const DEFAULTS: PPParams = { a: 0.6, b: 0.02, e: 0.2, d: 0.6, K: Infinity, predators: true };

export function derivs(p: PPParams, H: number, L: number): [number, number] {
  const food = Number.isFinite(p.K) ? 1 - H / p.K : 1;
  const Lx = p.predators ? L : 0;
  return [p.a * H * food - p.b * H * Lx, p.predators ? p.e * p.b * H * L - p.d * L : 0];
}

/** Fourth-order Runge–Kutta integration from (H0, L0) over `years`, sampled every `dt`. */
export function simulate(p: PPParams, H0: number, L0: number, years: number, dt = 0.05): PPPoint[] {
  const out: PPPoint[] = [{ t: 0, H: H0, L: p.predators ? L0 : 0 }];
  let H = H0, L = p.predators ? L0 : 0;
  const steps = Math.round(years / dt);
  for (let i = 1; i <= steps; i++) {
    const [k1h, k1l] = derivs(p, H, L);
    const [k2h, k2l] = derivs(p, H + (dt / 2) * k1h, L + (dt / 2) * k1l);
    const [k3h, k3l] = derivs(p, H + (dt / 2) * k2h, L + (dt / 2) * k2l);
    const [k4h, k4l] = derivs(p, H + dt * k3h, L + dt * k3l);
    H = Math.max(0, H + (dt / 6) * (k1h + 2 * k2h + 2 * k3h + k4h));
    L = Math.max(0, L + (dt / 6) * (k1l + 2 * k2l + 2 * k3l + k4l));
    out.push({ t: i * dt, H, L });
  }
  return out;
}

/** Equilibrium prey level needed to sustain predators, and the predator level there. */
export const preyEquilibrium = (p: PPParams) => p.d / (p.e * p.b);
export const predatorEquilibrium = (p: PPParams) =>
  Math.max(0, (p.a / p.b) * (Number.isFinite(p.K) ? 1 - preyEquilibrium(p) / p.K : 1));

/** Times of local maxima of a series (prey 'H' or predator 'L'). */
export function peaks(series: PPPoint[], key: 'H' | 'L'): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length - 1; i++) {
    const v = series[i]![key];
    if (v > series[i - 1]![key] && v >= series[i + 1]![key] && v > 1e-3) out.push(series[i]!.t);
  }
  return out;
}

/** Interpolated value of a series at time t. */
export function at(series: PPPoint[], t: number): PPPoint {
  const dt = series[1]!.t - series[0]!.t;
  const i = Math.min(series.length - 1, Math.max(0, Math.round(t / dt)));
  return series[i]!;
}
