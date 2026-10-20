/** Charts and reader text for the sustainable-harvesting sim, shared by server and browser. */
import { chartSvg, linePath, niceAxis, sx, sy, ticksTo, type Frame } from './d4-2-chart';
import { DEFAULTS, at, collapseYear, effortYield, equilibria, msy, simulate, surplus, type HarvestMode, type HarvestParams, type HarvestPoint } from './models/d4-2-harvest';

export const YEARS = 60;
export interface HUi { mode: HarvestMode; quota: number; effort: number; r: number }
export const DEFAULT_H: HUi = { mode: 'quota', quota: 60, effort: 20, r: 0.4 };

export const toParams = (u: HUi): HarvestParams => ({ ...DEFAULTS, mode: u.mode, quota: u.quota, effort: u.effort / 100, r: u.r });
export const run = (u: HUi) => simulate(toParams(u), YEARS);
const K = DEFAULTS.K;
const kt = (v: number) => `${Math.round(v)}`;

const timeFrame: Frame = {
  w: 640, h: 360, left: 82, right: 20, top: 16, bottom: 52,
  x: { min: 0, max: YEARS, ticks: [0, 10, 20, 30, 40, 50, 60], label: 'Time / years' },
  y: { min: 0, max: 1000, ticks: [0, 250, 500, 750, 1000], label: 'Stock biomass / thousand tonnes' },
};

export function timeChart(series: HarvestPoint[], u: HUi): string {
  const p = toParams(u);
  const f = timeFrame;
  const yK = sy(f, K), yH = sy(f, K / 2), x0 = f.left, x1 = f.w - f.right;
  let under = `<line class="ref" x1="${x0}" x2="${x1}" y1="${yK}" y2="${yK}"/><text class="ref-t" x="${x1 - 4}" y="${yK + 16}" text-anchor="end">K (unfished)</text>`;
  under += `<line class="ref half" x1="${x0}" x2="${x1}" y1="${yH}" y2="${yH}"/><text class="ref-t" x="${x1 - 4}" y="${yH - 6}" text-anchor="end">K/2: stock size for MSY</text>`;
  const xs = sx(f, p.start);
  under += `<line class="mark" x1="${xs}" x2="${xs}" y1="${f.top}" y2="${f.h - f.bottom}"/><text class="mark-t" x="${xs + 5}" y="${f.h - f.bottom - 8}">fishing starts</text>`;
  const c = collapseYear(series);
  let over = '';
  if (c !== null) {
    const xc = sx(f, c), yc = sy(f, 0);
    over += `<circle class="collapse" cx="${xc}" cy="${yc}" r="7"/><text class="collapse-t" x="${Math.min(xc, x1 - 120)}" y="${yc - 14}" text-anchor="middle">collapse, year ${Math.round(c)}</text>`;
  }
  return chartSvg({ frame: f, series: [{ cls: 'stock', d: linePath(f, (t) => at(series, t).N, 300) }], under, over });
}

/** Replacement (surplus production) against stock size, with the harvest line and equilibria. */
export function prodChart(u: HUi): string {
  const p = toParams(u);
  const m = msy(p.r, K);
  const ny = niceAxis(Math.max(m, u.mode === 'quota' ? u.quota : 0, 50) * 1.15, 4);
  const f: Frame = {
    w: 640, h: 360, left: 82, right: 20, top: 16, bottom: 52,
    x: { min: 0, max: 1000, ticks: [0, 250, 500, 750, 1000], label: 'Stock biomass / thousand tonnes' },
    y: { min: 0, max: ny.max, ticks: ticksTo(ny.max, ny.step), label: 'Rate / thousand tonnes per year' },
  };
  const curve = linePath(f, (N) => surplus(p.r, K, N), 120);
  const harvest = u.mode === 'quota' ? linePath(f, () => u.quota, 2) : linePath(f, (N) => p.effort * N, 60);
  let over = '';
  const xm = sx(f, K / 2), ym = sy(f, m);
  over += `<circle class="msy" cx="${xm}" cy="${ym}" r="6"/><text class="msy-t" x="${xm}" y="${ym - 12}" text-anchor="middle">MSY = rK/4 = ${kt(m)}</text>`;
  const eq = equilibria(p);
  if (eq.stable !== null && eq.stable > 0) {
    const yv = u.mode === 'quota' ? u.quota : p.effort * eq.stable;
    over += `<circle class="eq stable" cx="${sx(f, eq.stable)}" cy="${sy(f, yv)}" r="6.5"/>`;
  }
  if (eq.unstable !== null) over += `<circle class="eq unstable" cx="${sx(f, eq.unstable)}" cy="${sy(f, u.quota)}" r="6.5"/>`;
  return chartSvg({ frame: f, series: [{ cls: 'prod', d: curve }, { cls: 'harv', d: harvest }], over });
}

export function harvestLabel(u: HUi) {
  return u.mode === 'quota' ? `${u.quota} thousand t per year` : `${u.effort}% of the stock per year`;
}

export function summary(series: HarvestPoint[], u: HUi): string {
  const p = toParams(u);
  const m = msy(p.r, K);
  const eq = equilibria(p);
  const c = collapseYear(series);
  const last = series.at(-1)!;
  if (u.mode === 'quota') {
    if (u.quota === 0) return `No fishing: the stock stays at its carrying capacity (${K} thousand t). Births and growth are balanced by natural deaths, so there is no surplus to harvest.`;
    if (c !== null) return `A quota of ${u.quota} thousand t per year is more than the greatest possible rate of replacement (MSY = rK/4 = ${kt(m)} thousand t per year), so the stock shrinks every year and collapses in year ${Math.round(c)}. Overfishing like this caused the collapse of the Grand Banks cod in the early 1990s.`;
    if (Math.abs(u.quota - m) < 1e-6) return `The quota equals the maximum sustainable yield (${kt(m)} thousand t per year), so the stock falls towards K/2 = ${K / 2}, where replacement is fastest. This is the most that can be caught for ever, but it is risky: one poor breeding year pushes the stock below K/2, where replacement is slower than the catch, and it collapses.`;
    return `A quota of ${u.quota} thousand t per year is below the MSY (${kt(m)}). The stock falls until its rate of replacement equals the catch, and levels off at about ${kt(eq.stable!)} thousand t: sustainable. Warning: if the stock were ever pushed below about ${kt(eq.unstable!)} thousand t (the open circle), the same quota would make it collapse.`;
  }
  const y = effortYield(p.r, K, p.effort);
  if (p.effort === 0) return `No fishing: the stock stays at its carrying capacity (${K} thousand t).`;
  if (p.effort >= p.r) return `Removing ${u.effort}% of the stock each year is at least as fast as its maximum per-capita rate of increase (r = ${Math.round(p.r * 100)}% per year), so the stock declines towards zero: now ${kt(last.N)} thousand t. Unsustainable.`;
  const best = p.effort > p.r / 2 - 0.005 && p.effort < p.r / 2 + 0.005;
  return `Catching ${u.effort}% of the stock each year, the stock settles at about ${kt(eq.stable!)} thousand t with a yield of ${kt(y)} thousand t per year. ${best ? 'This effort gives the maximum sustainable yield, because it holds the stock at K/2.' : `The greatest yield, ${kt(m)} thousand t per year, comes from an effort of ${Math.round((p.r / 2) * 100)}% (r/2), which holds the stock at K/2.`} A fixed proportion is safer than a fixed quota: as the stock shrinks, so does the catch.`;
}

export const tableRows = (series: HarvestPoint[]) =>
  [0, 5, 10, 20, 30, 40, 50, 60].map((y) => { const q = at(series, y); return { y, N: Math.round(q.N), c: Math.round(q.catch) }; });

export { msy };
