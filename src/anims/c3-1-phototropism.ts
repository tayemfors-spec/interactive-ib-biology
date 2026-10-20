import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
/** Base of the bending zone of the shoot; the stem below it stays straight. */
export const P0: XY = [120, 200];
const BEND_LEN = 80;
export const MAX_BEND = Math.PI / 4; // radians = 45°, matching the tropism-measure figure

/** Point and direction angle on the bending part of the shoot (s from 0 at P0 to 1 at the tip). */
export function onShoot(theta: number, s: number): { p: XY; phi: number } {
  const phi = theta * s;
  if (Math.abs(theta) < 1e-4) return { p: [P0[0], P0[1] - BEND_LEN * s], phi };
  const R = BEND_LEN / theta;
  return { p: [P0[0] + R * (1 - Math.cos(phi)), P0[1] - R * Math.sin(phi)], phi };
}

/** Centre line of the shoot from the soil surface to the tip. */
export function shootPath(theta: number): string {
  const tip = onShoot(theta, 1).p;
  if (Math.abs(theta) < 1e-4) return `M${P0[0]} 292 L${P0[0]} ${P0[1]} L${tip[0]} ${tip[1].toFixed(1)}`;
  const R = BEND_LEN / theta;
  return `M${P0[0]} 292 L${P0[0]} ${P0[1]} A${R.toFixed(1)} ${R.toFixed(1)} 0 0 1 ${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`;
}

/** A point offset sideways from the centre line: side −1 = left (shaded) flank, +1 = right (lit) flank. */
export function flank(theta: number, s: number, side: number, off = 5.5): XY {
  const { p, phi } = onShoot(theta, s);
  return [p[0] + side * off * Math.cos(phi), p[1] + side * off * Math.sin(phi)];
}

/** Auxin in the shoot: [s, side] at the start (even) and after lateral redistribution. */
export const AUXIN_EVEN: [number, number][] = [[0.25, -1], [0.55, -1], [0.85, -1], [0.25, 1], [0.55, 1], [0.85, 1]];
export const AUXIN_SHADED: [number, number][] = [[0.25, -1], [0.55, -1], [0.85, -1], [0.4, -1], [0.55, 1], [0.7, -1]];

// ---- inset: cells below the tip (4 columns: 0–1 shaded side, 2–3 lit side) ----
export const COLS = [318, 374, 430, 486];
export const CELL_W = 50;
export const CELL_H = 44;
const GAP = 5;
const BASE = 292;
/** Relative elongation of each column when the shoot has bent (follows the auxin gradient). */
const GROWTH = [1.6, 1.4, 1.2, 1.05];

export function cellRect(col: number, row: number, grow: number) {
  const h = CELL_H * lerp(1, GROWTH[col]!, grow);
  return { x: COLS[col]!, y: BASE - (row + 1) * h - row * GAP, w: CELL_W, h };
}

/** Inset auxin: one dot per cell; dots from the outermost lit column move to the shaded edge. */
export const INSET_DOTS = Array.from({ length: 12 }, (_, i) => ({ col: i % 4, row: Math.floor(i / 4) }));
const insetTarget = (col: number) => (col === 3 ? 0 : col);

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const show = (k: string, v: number) => (el(k).style.opacity = String(v));

  function render(index: number, t: number) {
    // light: overhead in step 1, from the right afterwards
    show('sun', index === 0 ? 1 : 0);
    show('lamp', index === 0 ? 0 : index === 1 ? ease(phase(t, 0, 0.4)) : 1);
    show('side-lbls', index === 0 ? 0 : index === 1 ? ease(phase(t, 0.3, 0.7)) : 1);
    show('photo', index === 1 ? ease(phase(t, 0.4, 0.8)) : 0);

    // auxin redistribution (step 3) and bending (step 5)
    const move = index < 2 ? 0 : index === 2 ? ease(phase(t, 0.15, 0.9)) : 1;
    const bend = index < 4 ? 0 : ease(phase(t, 0.1, 0.9));
    const theta = MAX_BEND * bend;
    el<SVGPathElement>('shoot').setAttribute('d', shootPath(theta));
    el<SVGPathElement>('shoot-in').setAttribute('d', shootPath(theta));
    const { p: tip, phi } = onShoot(theta, 1);
    el('tip').setAttribute('transform', `translate(${tip[0].toFixed(1)} ${tip[1].toFixed(1)}) rotate(${((phi * 180) / Math.PI).toFixed(1)})`);
    AUXIN_EVEN.forEach(([s0, side0], i) => {
      const [s1, side1] = AUXIN_SHADED[i]!;
      const [x, y] = flank(theta, lerp(s0, s1, move), lerp(side0, side1, move));
      const c = el<SVGCircleElement>(`ax${i}`);
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
    });
    show('angle', index === 4 ? ease(phase(t, 0.7, 1)) : 0);

    // inset: tissue (steps 1, 2, 3, 5) or the cell wall close-up (step 4)
    show('tissue', index === 3 ? 0 : 1);
    show('acid', index === 3 ? 1 : 0);
    show('pins', index < 2 ? 0 : index === 2 ? ease(phase(t, 0, 0.3)) : 1);
    show('lateral', index === 2 ? ease(phase(t, 0.2, 0.5)) : 0);
    for (let col = 0; col < 4; col++) for (let row = 0; row < 3; row++) {
      const r = cellRect(col, row, bend);
      const c = el<SVGRectElement>(`cell-${col}-${row}`);
      c.setAttribute('y', r.y.toFixed(1)); c.setAttribute('height', r.h.toFixed(1));
      const pin = el<SVGRectElement>(`pin-${col}-${row}`);
      pin.setAttribute('y', (r.y + r.h * 0.2).toFixed(1)); pin.setAttribute('height', (r.h * 0.6).toFixed(1));
    }
    INSET_DOTS.forEach(({ col, row }, i) => {
      const a = cellRect(col, row, bend), b = cellRect(insetTarget(col), row, bend);
      const x0 = a.x + CELL_W / 2, x1 = b.x + CELL_W / 2 + (col === 3 ? 12 : 0);
      const c = el<SVGCircleElement>(`ix${i}`);
      c.setAttribute('cx', lerp(x0, x1, move).toFixed(1));
      c.setAttribute('cy', (lerp(a.y, b.y, move) + lerp(a.h, b.h, move) / 2 + (col === 3 ? 10 * move : 0)).toFixed(1));
    });
    const tg = el('tissue-grow');
    tg.style.opacity = index === 4 ? String(ease(phase(t, 0.6, 1))) : '0';

    // acid growth close-up (step 4)
    const a = index === 3 ? t : 0;
    show('hplus', ease(phase(a, 0.1, 0.45)));
    show('expansin', ease(phase(a, 0.35, 0.6)));
    show('xlinks', 1 - ease(phase(a, 0.55, 0.8)));
    const spread = ease(phase(a, 0.65, 1));
    svg.querySelectorAll<SVGLineElement>('[data-fib]').forEach((ln) => {
      const k = Number(ln.dataset.fib);
      const y = 96 + k * 34 + (k - 2.5) * 10 * spread;
      ln.setAttribute('y1', y.toFixed(1)); ln.setAttribute('y2', y.toFixed(1));
    });
    show('elong', ease(phase(a, 0.7, 1)));
  }
  render(0, 0);
  return { render, durations: [3, 3, 4, 5, 4] };
}
