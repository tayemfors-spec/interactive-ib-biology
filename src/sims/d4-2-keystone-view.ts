/** Chart, food-web markup and reader text for the keystone-species sim, shared by server and browser. */
import { chartSvg, linePath, sx, sy, type Frame } from './d4-2-chart';
import { BASELINE, SPECIES, at, percentOf, simulate, type KeystonePoint, type KeystoneRun, type SpeciesId } from './models/d4-2-keystone';

export const YEARS = 80, REMOVE_AT = 10, REINTRO_AT = 40;
export interface KUi { remove: SpeciesId | null; reintroduce: boolean }
export const DEFAULT_K: KUi = { remove: null, reintroduce: false };

export const NAMES: Record<SpeciesId, string> = {
  otter: 'Sea otters', urchin: 'Sea urchins', kelp: 'Kelp', crab: 'Crabs', fish: 'Rockfish',
};

export const toRun = (u: KUi): KeystoneRun => ({ remove: u.remove, removeAt: REMOVE_AT, reintroduceAt: u.remove && u.reintroduce ? REINTRO_AT : null, years: YEARS });
export const run = (u: KUi) => simulate(toRun(u));

// Log scale: abundance as % of the intact community, from 1% to 2000%.
const LOG_MIN = 0, LOG_MAX = Math.log10(2000);
const frame: Frame = {
  w: 640, h: 360, left: 92, right: 18, top: 16, bottom: 52,
  x: { min: 0, max: YEARS, ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80], label: 'Time / years' },
  y: { min: LOG_MIN, max: LOG_MAX, ticks: [0, 1, 2, 3], label: 'Abundance / % of start (log scale)' },
};
const yLab = (v: number) => (v === 0 ? '1%' : v === 1 ? '10%' : v === 2 ? '100%' : '1000%');

export function chart(series: KeystonePoint[], u: KUi): string {
  const lines = SPECIES.map((id) => ({
    cls: id,
    d: linePath(frame, (t) => {
      const p = percentOf(id, at(series, t).s[id]);
      return p > 0 ? Math.log10(Math.max(1, Math.min(2000, p))) : NaN;
    }, 320),
  }));
  const x0 = sx(frame, REMOVE_AT), top = frame.top, bot = frame.h - frame.bottom;
  let under = '';
  if (u.remove) {
    under += `<line class="mark" x1="${x0}" x2="${x0}" y1="${top}" y2="${bot}"/><text class="mark-t" x="${x0 + 5}" y="${top + 14}">${NAMES[u.remove].toLowerCase()} removed</text>`;
    if (u.reintroduce) {
      const x1 = sx(frame, REINTRO_AT);
      under += `<line class="mark" x1="${x1}" x2="${x1}" y1="${top}" y2="${bot}"/><text class="mark-t" x="${x1 + 5}" y="${top + 14}">reintroduced</text>`;
    }
  }
  const y100 = sy(frame, 2);
  under += `<line class="ref" x1="${frame.left}" x2="${frame.w - frame.right}" y1="${y100}" y2="${y100}"/>`;
  return chartSvg({ frame, yLabels: yLab, series: lines, under });
}

/** End-of-run status of each species: % of start. */
export function finalPercents(series: KeystonePoint[]): Record<SpeciesId, number> {
  const s = series.at(-1)!.s;
  return Object.fromEntries(SPECIES.map((id) => [id, percentOf(id, s[id])])) as Record<SpeciesId, number>;
}

const fmtPct = (p: number) => (p >= 995 ? `${Math.round(p / 100) * 100}%` : p >= 100 ? `${Math.round(p)}%` : p >= 10 ? `${Math.round(p)}%` : `${p.toFixed(0)}%`);

// Food-web node layout (viewBox 0 0 300 270): arrows point from food to feeder.
export const NODES: Record<SpeciesId, { x: number; y: number }> = {
  otter: { x: 150, y: 34 }, urchin: { x: 72, y: 136 }, crab: { x: 228, y: 136 }, kelp: { x: 72, y: 236 }, fish: { x: 228, y: 236 },
};
const NW = 104, NH = 46;

export function web(series: KeystonePoint[], u: KUi): string {
  const fin = finalPercents(series);
  const arrow = (from: SpeciesId, to: SpeciesId, cls: string) => {
    const a = NODES[from], b = NODES[to];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const trim = (dxu: number, dyu: number) => Math.min(Math.abs((NW / 2 + 4) / (dxu || 1e-9)), Math.abs((NH / 2 + 4) / (dyu || 1e-9)));
    const s0 = trim(ux, uy), s1 = trim(ux, uy) + 4;
    return `<path class="w-arr ${cls}" d="M${(a.x + ux * s0).toFixed(1)} ${(a.y + uy * s0).toFixed(1)} L${(b.x - ux * s1).toFixed(1)} ${(b.y - uy * s1).toFixed(1)}" marker-end="url(#ks-m-${cls})"/>`;
  };
  let s = '';
  s += arrow('kelp', 'urchin', 'feed');
  s += arrow('urchin', 'otter', 'feed');
  s += arrow('crab', 'otter', 'feed');
  s += arrow('kelp', 'fish', 'habitat');
  s += `<text class="w-note" x="150" y="227" text-anchor="middle">shelter</text>`;
  for (const id of SPECIES) {
    const n = NODES[id];
    const gone = u.remove === id && !u.reintroduce;
    const p = fin[id];
    const trend = gone ? 'removed' : p > 125 ? 'up' : p < 75 ? 'down' : 'same';
    const sym = trend === 'up' ? '▲' : trend === 'down' ? '▼' : trend === 'same' ? '≈' : '✕';
    const val = gone ? 'removed' : `${sym} ${fmtPct(p)}`;
    s += `<g class="node ${id} ${trend}${id === 'otter' ? ' keystone' : ''}"><rect x="${n.x - NW / 2}" y="${n.y - NH / 2}" width="${NW}" height="${NH}" rx="10"/>`;
    s += `<text class="n-name" x="${n.x}" y="${n.y - 4}" text-anchor="middle">${NAMES[id]}</text>`;
    s += `<text class="n-val" x="${n.x}" y="${n.y + 14}" text-anchor="middle">${val}</text></g>`;
  }
  return s;
}

export function summary(series: KeystonePoint[], u: KUi): string {
  const fin = finalPercents(series);
  if (!u.remove) return 'The intact kelp-forest community stays at a steady state: every population stays at 100% of its starting level. Choose a species to remove.';
  const others = SPECIES.filter((id) => id !== u.remove);
  if (u.reintroduce) {
    const before = at(series, REINTRO_AT - 0.5).s;
    const changed = others.filter((id) => Math.abs(percentOf(id, before[id]) - 100) > 25);
    return `Before reintroduction (year ${REINTRO_AT}), ${changed.length} of the other ${others.length} species had changed by more than 25%. After ${NAMES[u.remove].toLowerCase()} return, the community moves back towards its original structure by year ${YEARS}: kelp ${fmtPct(fin.kelp)}, urchins ${fmtPct(fin.urchin)} of the starting level. Real recovery is often slower and less complete than this model suggests.`;
  }
  const changed = others.filter((id) => Math.abs(fin[id] - 100) > 25);
  const list = changed.map((id) => `${NAMES[id].toLowerCase()} ${fmtPct(fin[id])}`).join(', ');
  if (u.remove === 'otter') {
    return `Removing sea otters changed all ${changed.length} remaining species by more than 25% (${list} of the starting level). Released from predation, urchins multiply and graze the kelp away, leaving an urchin barren; rockfish lose their kelp habitat. The otter is a keystone species: its effect on the community is out of proportion to its abundance.`;
  }
  if (u.remove === 'crab') {
    return `Removing crabs cut otter numbers to ${fmtPct(fin.otter)}, but urchins rose only to ${fmtPct(fin.urchin)} and kelp stayed at ${fmtPct(fin.kelp)}: the remaining otters still keep urchins scarce. ${changed.length} of the other ${others.length} species changed by more than 25%, and the kelp forest survives. Crabs are not a keystone species here.`;
  }
  return `Removing rockfish changed ${changed.length} of the other ${others.length} species by more than 25%: kelp ${fmtPct(fin.kelp)}, urchins ${fmtPct(fin.urchin)}, otters ${fmtPct(fin.otter)}. The fish depend on the kelp, but nothing in this web depends strongly on them, so community structure is unchanged.`;
}

export const tableRows = (series: KeystonePoint[]) =>
  [0, 10, 20, 30, 40, 50, 60, 70, 80].map((y) => {
    const s = at(series, y).s;
    return { y, v: SPECIES.map((id) => Math.round(percentOf(id, s[id]))) };
  });

export { BASELINE, SPECIES };
