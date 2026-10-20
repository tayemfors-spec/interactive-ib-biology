/**
 * Harvesting a logistically growing population (D4.2.6), e.g. a stock of Atlantic cod.
 *   dN/dt = r·N·(1 − N/K) − H
 * The first term is the natural rate of replacement ("surplus production"): births plus growth minus
 * natural deaths. It is greatest at N = K/2, where it equals r·K/4: the maximum sustainable yield (MSY).
 * Two harvesting rules:
 *   quota  — a fixed catch every year, H = h (until there is nothing left to catch)
 *   effort — a fixed proportion of the stock every year, H = F·N
 * Arbitrary but plausible units (thousand tonnes, years); a qualitative model.
 */
export type HarvestMode = 'quota' | 'effort';
export interface HarvestParams { r: number; K: number; mode: HarvestMode; quota: number; effort: number; start: number }
export interface HarvestPoint { t: number; N: number; catch: number }

export const DEFAULTS: HarvestParams = { r: 0.4, K: 1000, mode: 'quota', quota: 80, effort: 0.2, start: 5 };

/** Natural rate of replacement (surplus production) at stock size N. */
export const surplus = (r: number, K: number, N: number) => r * N * (1 - N / K);
/** Maximum sustainable yield of a logistic population, reached when N = K/2. */
export const msy = (r: number, K: number) => (r * K) / 4;
/** Stock size at which the replacement rate is greatest. */
export const nAtMsy = (K: number) => K / 2;

/** Harvest rate at stock N under the chosen rule (none before year `start`). */
export function harvestRate(p: HarvestParams, N: number, t: number): number {
  if (t < p.start || N <= 0) return 0;
  return p.mode === 'quota' ? p.quota : p.effort * N;
}

const deriv = (p: HarvestParams, N: number, t: number) => surplus(p.r, p.K, N) - harvestRate(p, N, t);

/** RK4 integration from an unfished stock at K; the stock cannot fall below zero. */
export function simulate(p: HarvestParams, years: number, dt = 0.05): HarvestPoint[] {
  let N = p.K;
  const out: HarvestPoint[] = [{ t: 0, N, catch: harvestRate(p, N, 0) }];
  const steps = Math.round(years / dt);
  for (let i = 1; i <= steps; i++) {
    const t = (i - 1) * dt;
    const k1 = deriv(p, N, t);
    const k2 = deriv(p, Math.max(0, N + (dt / 2) * k1), t + dt / 2);
    const k3 = deriv(p, Math.max(0, N + (dt / 2) * k2), t + dt / 2);
    const k4 = deriv(p, Math.max(0, N + dt * k3), t + dt);
    N = Math.max(0, N + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
    if (N < 1e-6) N = 0;
    out.push({ t: i * dt, N, catch: harvestRate(p, N, i * dt) });
  }
  return out;
}

/**
 * Equilibria with harvesting. Quota: replacement = quota where r·N(1 − N/K) = h, i.e.
 * N = K/2 · (1 ± √(1 − h/MSY)); the upper one is stable, the lower one unstable, and there are none
 * (collapse) when h > MSY. Effort: N* = K(1 − F/r), stable whenever F < r.
 */
export function equilibria(p: HarvestParams): { stable: number | null; unstable: number | null } {
  if (p.mode === 'effort') return { stable: p.effort < p.r ? p.K * (1 - p.effort / p.r) : 0, unstable: null };
  const m = msy(p.r, p.K);
  if (p.quota > m + 1e-9) return { stable: null, unstable: null };
  const s = Math.sqrt(Math.max(0, 1 - p.quota / m));
  return { stable: (p.K / 2) * (1 + s), unstable: p.quota > 0 ? (p.K / 2) * (1 - s) : null };
}

/** Long-term yield per year under a fixed effort F: F·N* = F·K(1 − F/r) (maximal at F = r/2). */
export const effortYield = (r: number, K: number, F: number) => (F < r ? F * K * (1 - F / r) : 0);

/** Interpolated point of a series at time t. */
export function at(series: HarvestPoint[], t: number): HarvestPoint {
  const dt = series[1]!.t - series[0]!.t;
  const i = Math.min(series.length - 1, Math.max(0, Math.round(t / dt)));
  return series[i]!;
}

/** First time the stock reaches zero, or null. */
export const collapseYear = (series: HarvestPoint[]) => series.find((p) => p.N <= 0)?.t ?? null;

/** Total catch summed over the run (trapezium rule). */
export function totalCatch(series: HarvestPoint[]): number {
  let s = 0;
  for (let i = 1; i < series.length; i++) s += ((series[i]!.catch + series[i - 1]!.catch) / 2) * (series[i]!.t - series[i - 1]!.t);
  return s;
}
