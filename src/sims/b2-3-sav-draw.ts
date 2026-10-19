/**
 * SVG markup for the SA:V explorer's shape drawing (B2.3.6): a cube, a sphere or a flattened plate, whole or
 * divided into 8 smaller cells of the same shape. Oblique projection, drawn to one scale (px per µm) so sizes
 * compare honestly. Shared by the server render and the browser. Classes: .fr .tp .rt (faces), .sph, .hl, .eq.
 */
import { FLAT_ASPECT, type Shape } from './models/b2-3-sav';
import { sx, sy, type Frame } from './chart';

/**
 * Like chart.ts linePath, but points above the y-axis maximum are left out instead of clamped, so a curve that
 * starts off the top of the graph (SA:V → ∞ as size → 0) does not show a false plateau along the top edge.
 */
export function curvePath(f: Frame, fn: (x: number) => number, samples = 160): string {
  let d = '';
  let pen = false;
  for (let i = 0; i <= samples; i++) {
    const x = f.x.min + ((f.x.max - f.x.min) * i) / samples;
    const y = x > 0 ? fn(x) : Infinity;
    if (!Number.isFinite(y) || y > f.y.max) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${sx(f, x).toFixed(1)} ${sy(f, Math.max(f.y.min, y)).toFixed(1)}`;
    pen = true;
  }
  return d;
}

export const ART = { w: 360, h: 250, cx: 165, cy: 140, scale: 10 } as const;
const OX = 0.42, OY = -0.3; // screen offset per unit of depth

type V3 = [number, number, number];
const proj = ([x, y, z]: V3, s: number): [number, number] => [ART.cx + (x + z * OX) * s, ART.cy - y * s + z * OY * s];
const pts = (ps: [number, number][]) => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** A box with its minimum corner at (x, y, z) and size w (across) × h (up) × d (depth). */
function box([x, y, z]: V3, w: number, h: number, d: number, s: number): string {
  const p = (a: number, b: number, c: number) => proj([a, b, c], s);
  const front = [p(x, y + h, z), p(x + w, y + h, z), p(x + w, y, z), p(x, y, z)];
  const top = [p(x, y + h, z), p(x + w, y + h, z), p(x + w, y + h, z + d), p(x, y + h, z + d)];
  const right = [p(x + w, y + h, z), p(x + w, y + h, z + d), p(x + w, y, z + d), p(x + w, y, z)];
  return `<polygon class="tp" points="${pts(top)}"/><polygon class="rt" points="${pts(right)}"/><polygon class="fr" points="${pts(front)}"/>`;
}

function ball(c: V3, r: number, s: number): string {
  const [x, y] = proj(c, s);
  const R = r * s;
  return `<circle class="sph" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R.toFixed(1)}"/>` +
    `<ellipse class="eq" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${R.toFixed(1)}" ry="${(R * 0.3).toFixed(1)}"/>` +
    `<ellipse class="hl" cx="${(x - R * 0.35).toFixed(1)}" cy="${(y - R * 0.4).toFixed(1)}" rx="${(R * 0.28).toFixed(1)}" ry="${(R * 0.18).toFixed(1)}"/>`;
}

/** Dimensions (µm) of one whole cell of each shape with the volume of a cube of side L. */
function dims(shape: Shape, L: number) {
  const v = L ** 3;
  if (shape === 'sphere') { const r = Math.cbrt((3 * v) / (4 * Math.PI)); return { w: 2 * r, h: 2 * r, d: 2 * r, r }; }
  if (shape === 'flat') { const h = Math.cbrt(v / (FLAT_ASPECT * FLAT_ASPECT)); return { w: FLAT_ASPECT * h, h, d: FLAT_ASPECT * h, r: 0 }; }
  return { w: L, h: L, d: L, r: 0 };
}

/** Inner SVG markup for the shape, centred on the stage. `divided` draws 8 half-size cells, slightly separated. */
export function shapeArt(shape: Shape, L: number, divided: boolean): string {
  const s = ART.scale;
  const { w, h, d } = dims(shape, L);
  if (!divided) {
    if (shape === 'sphere') return ball([0, 0, 0], w / 2, s);
    return box([-w / 2, -h / 2, -d / 2], w, h, d, s);
  }
  const gap = Math.max(0.35, 0.12 * Math.max(w, d)); // µm between the pieces (exploded view)
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const gapY = shape === 'flat' ? Math.max(gap * 0.6, 0.35) : gap;
  let out = '';
  // painter's order: far → near, bottom → top, left → right
  for (const k of [1, 0]) for (const j of [0, 1]) for (const i of [0, 1]) {
    const x = -w / 2 - gap / 2 + i * (hw + gap);
    const y = -h / 2 - gapY / 2 + j * (hh + gapY);
    const z = -d / 2 - gap / 2 + k * (hd + gap);
    out += shape === 'sphere' ? ball([x + hw / 2, y + hh / 2, z + hd / 2], hw / 2, s) : box([x, y, z], hw, hh, hd, s);
  }
  return out;
}
