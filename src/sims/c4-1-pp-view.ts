/** Chart markup and reader text for the predator–prey sim, shared by server and browser. */
import { chartSvg, linePath, niceAxis } from './c4-1-chart';
import type { Frame } from './chart';
import { DEFAULTS, at, peaks, preyEquilibrium, simulate, type PPParams, type PPPoint } from './models/c4-1-predator-prey';

export const YEARS = 60;
export const H0 = 60, L0 = 15;
export const FOOD_MAX = 11; // slider position meaning "unlimited"
export interface PPUi { food: number; b: number; predators: boolean }
export const DEFAULT_PP: PPUi = { food: FOOD_MAX, b: 0.02, predators: true };

export const foodK = (food: number) => (food >= FOOD_MAX ? Infinity : 100 + 50 * food);
export const foodLabel = (food: number) => (food >= FOOD_MAX ? 'unlimited' : `K = ${foodK(food)} hares`);
export const toParams = (u: PPUi): PPParams => ({ ...DEFAULTS, K: foodK(u.food), b: u.b, predators: u.predators });
export const run = (u: PPUi) => simulate(toParams(u), H0, L0, YEARS);

const geo = { w: 640, h: 360, left: 62, right: 60, top: 16, bottom: 52 };
const xAxis = { min: 0, max: YEARS, ticks: [0, 10, 20, 30, 40, 50, 60], label: 'Time / years' };
const axis = (max: number, label: string) => {
  const n = niceAxis(max * 1.05, 5);
  const ticks: number[] = [];
  for (let v = 0; v <= n.max + 1e-9; v += n.step) ticks.push(Number(v.toFixed(6)));
  return { min: 0, max: n.max, ticks, label };
};

export function ppSvg(series: PPPoint[], u: PPUi): string {
  const fh: Frame = { ...geo, x: xAxis, y: axis(Math.min(2000, Math.max(...series.map((p) => p.H))), 'Hares (prey) →') };
  const fl: Frame = { ...geo, x: xAxis, y: axis(Math.max(5, ...series.map((p) => p.L)), 'Lynx (predators) →') };
  const lineOf = (f: Frame, key: 'H' | 'L') => linePath(f, (t) => at(series, t)[key], 300);
  const s = [{ cls: 'hare', d: lineOf(fh, 'H') }];
  if (u.predators) s.push({ cls: 'lynx', d: lineOf(fl, 'L') });
  return chartSvg({ frame: fh, right: { frame: fl, cls: 'r-lynx' }, series: s });
}

export function ppText(series: PPPoint[], u: PPUi): string {
  const p = toParams(u);
  const last = series.at(-1)!;
  if (!u.predators) {
    return Number.isFinite(p.K)
      ? `With the lynx removed, hares increase until their food runs short and level off at about ${Math.round(last.H)}, the carrying capacity set by their food. Control is now only bottom-up.`
      : 'With the lynx removed and unlimited food, nothing limits the hares: they increase exponentially. Real populations always meet a limit eventually.';
  }
  if (Number.isFinite(p.K) && last.L < 0.5) {
    return `Food holds hares below about ${Math.round(preyEquilibrium(p))}, the number the lynx need to replace their own losses, so the lynx die out and hares settle at ${Math.round(last.H)}. Bottom-up control dominates.`;
  }
  const hp = peaks(series, 'H'), lp = peaks(series, 'L');
  const period = hp.length > 2 ? (hp.at(-1)! - hp[0]!) / (hp.length - 1) : NaN;
  const firstL = lp.find((t) => t > (hp[0] ?? 0));
  const lag = hp.length && firstL !== undefined ? firstL - hp[0]! : NaN;
  let t = '';
  if (Number.isFinite(period)) t += `Hare numbers peak about every ${period.toFixed(1)} years, and each lynx peak follows a hare peak by about ${lag.toFixed(1)} years. `;
  t += 'More hares → more food for lynx → more lynx → more hares eaten → fewer hares → lynx starve → fewer lynx → hares recover. ';
  t += Number.isFinite(p.K)
    ? `Limited food (${foodLabel(u.food)}) damps the cycles towards a steady state of about ${Math.round(last.H)} hares and ${Math.round(last.L)} lynx: both top-down and bottom-up control act.`
    : 'With unlimited food, the classic model cycles for ever: hares are controlled top-down, by predation.';
  return t;
}

export const tableRows = (series: PPPoint[], u: PPUi) =>
  [0, 10, 20, 30, 40, 50, 60].map((y) => { const q = at(series, y); return { y, H: Math.round(q.H), L: u.predators ? Math.round(q.L) : 0 }; });
