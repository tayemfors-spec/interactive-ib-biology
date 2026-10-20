/**
 * A kelp-forest community (D4.2.5) used to compare removing a keystone species with removing a
 * species that is not a keystone. Five populations, all in relative units:
 *   kelp    k' = gk·k(1 − k) − graze·u·k                       producer, grazed by urchins
 *   urchins u' = gu·u(1 − u/(u0 + uk·k)) − p·o·max(0, u − refuge)
 *            urchins can live on drift and encrusting algae even in a barren (u0), and a few always
 *            survive predation in crevices (refuge)
 *   otters  o' = go·o(1 − o/(o0 + oc·c))                       carrying capacity set partly by crab supply
 *            (otter numbers are also limited by territory, so they never depend on one prey alone)
 *   crabs   c' = gc·c(1 − c) − q·o·c                           alternative prey of otters
 *   fish    f' = gf·f(1 − f/(f0 + fk·k))                       rockfish that shelter and breed in kelp
 * Removing a species sets it to zero from the chosen year; it can be reintroduced later.
 * A qualitative model: the structure follows the sea otter–urchin–kelp cascade documented on the
 * Pacific coast of North America, but the parameter values are illustrative.
 */
export type SpeciesId = 'otter' | 'urchin' | 'kelp' | 'crab' | 'fish';
export const SPECIES: SpeciesId[] = ['otter', 'urchin', 'kelp', 'crab', 'fish'];
export type State = Record<SpeciesId, number>;
export interface KeystoneRun { remove: SpeciesId | null; removeAt: number; reintroduceAt: number | null; years: number }
export interface KeystonePoint { t: number; s: State }

export const P = {
  gk: 0.8, graze: 2,
  gu: 0.6, u0: 0.3, uk: 1.5, p: 3, refuge: 0.04,
  go: 0.3, o0: 0.55, oc: 0.72,
  gc: 0.8, q: 0.3,
  gf: 0.5, f0: 0.1, fk: 0.9,
};

/** Seed population used when a removed species is reintroduced (a small founding group). */
export const REINTRO = 0.05;

function derivs(s: State, absent: SpeciesId | null): State {
  const { kelp: k, urchin: u, otter: o, crab: c, fish: f } = s;
  const d: State = {
    kelp: P.gk * k * (1 - k) - P.graze * u * k,
    urchin: P.gu * u * (1 - u / (P.u0 + P.uk * k)) - P.p * o * Math.max(0, u - P.refuge),
    otter: P.go * o * (1 - o / (P.o0 + P.oc * c)),
    crab: P.gc * c * (1 - c) - P.q * o * c,
    fish: P.gf * f * (1 - f / (P.f0 + P.fk * k)),
  };
  if (absent) d[absent] = 0;
  return d;
}

const add = (a: State, b: State, h: number): State => {
  const r = { ...a };
  for (const id of SPECIES) r[id] = Math.max(0, a[id] + h * b[id]);
  return r;
};

function rk4(s: State, dt: number, absent: SpeciesId | null): State {
  const k1 = derivs(s, absent);
  const k2 = derivs(add(s, k1, dt / 2), absent);
  const k3 = derivs(add(s, k2, dt / 2), absent);
  const k4 = derivs(add(s, k3, dt), absent);
  const out = { ...s };
  for (const id of SPECIES) out[id] = Math.max(0, s[id] + (dt / 6) * (k1[id] + 2 * k2[id] + 2 * k3[id] + k4[id]));
  return out;
}

/** Run the intact community to its steady state (used as the starting point and the 100% reference). */
export function steadyState(): State {
  let s: State = { kelp: 0.8, urchin: 0.06, otter: 1, crab: 0.6, fish: 0.8 };
  for (let i = 0; i < 20000; i++) s = rk4(s, 0.05, null);
  return s;
}

export const BASELINE = steadyState();

export function simulate(run: KeystoneRun, dt = 0.05): KeystonePoint[] {
  let s: State = { ...BASELINE };
  const out: KeystonePoint[] = [{ t: 0, s: { ...s } }];
  const steps = Math.round(run.years / dt);
  let removed = false, back = false;
  for (let i = 1; i <= steps; i++) {
    const t = i * dt;
    const absentNow = removed && !back ? run.remove : null;
    s = rk4(s, dt, absentNow);
    if (run.remove && !removed && t >= run.removeAt - 1e-9) { removed = true; s[run.remove] = 0; }
    if (run.remove && removed && !back && run.reintroduceAt !== null && t >= run.reintroduceAt - 1e-9) { back = true; s[run.remove] = REINTRO; }
    out.push({ t, s: { ...s } });
  }
  return out;
}

/** Abundance as a percentage of the intact community's steady state. */
export const percentOf = (id: SpeciesId, v: number) => (v / BASELINE[id]) * 100;

export function at(series: KeystonePoint[], t: number): KeystonePoint {
  const dt = series[1]!.t - series[0]!.t;
  const i = Math.min(series.length - 1, Math.max(0, Math.round(t / dt)));
  return series[i]!;
}

/** Number of species (other than the one removed) whose abundance changed by more than `pct` percent. */
export function speciesChanged(series: KeystonePoint[], run: KeystoneRun, t: number, pct = 25): SpeciesId[] {
  const s = at(series, t).s;
  return SPECIES.filter((id) => id !== run.remove && Math.abs(percentOf(id, s[id]) - 100) > pct);
}
