/**
 * Surface area-to-volume maths for B2.3.6 (and the shape comparison for B2.3.7).
 * Pure functions shared by the server render, the browser and the unit tests.
 *
 * Cube of side L:   SA = 6L², V = L³, SA:V = 6 / L.
 * Other shapes are compared at the SAME VOLUME as a cube of side L, so the only thing that changes is shape.
 */
export type Shape = 'cube' | 'sphere' | 'flat';
export interface Measures { sa: number; v: number; ratio: number }

/** How many times wider than thick the flattened cell (a square plate) is. */
export const FLAT_ASPECT = 8;

export const cube = (L: number): Measures => ({ sa: 6 * L * L, v: L ** 3, ratio: 6 / L });

/** Sphere with the same volume as a cube of side L. */
export function sphereOfVolume(v: number): Measures & { r: number } {
  const r = Math.cbrt((3 * v) / (4 * Math.PI));
  const sa = 4 * Math.PI * r * r;
  return { r, sa, v, ratio: sa / v };
}

/**
 * Square plate k times wider than it is thick (a = k·h), with volume v.
 * V = k²h³ and SA = 2a² + 4ah = (2k² + 4k)h², so SA:V = (2 + 4/k) / h. With k = 1 it is a cube.
 */
export function plateOfVolume(v: number, k = FLAT_ASPECT): Measures & { a: number; h: number } {
  const h = Math.cbrt(v / (k * k));
  const a = k * h;
  const sa = 2 * a * a + 4 * a * h;
  return { a, h, sa, v, ratio: sa / v };
}

/** Measures of one cell of the chosen shape whose volume equals a cube of side L. */
export function measure(shape: Shape, L: number): Measures {
  const v = L ** 3;
  if (shape === 'sphere') return sphereOfVolume(v);
  if (shape === 'flat') return plateOfVolume(v);
  return cube(L);
}

/** The SA:V ratio of each shape as a function of L (for the graph). */
export const ratioAt = (shape: Shape, L: number) => measure(shape, L).ratio;

/**
 * Split one cell into `n` identical smaller cells of the same shape (total volume unchanged).
 * Each linear dimension shrinks by n^(1/3), so the total surface area, and the SA:V ratio, rise by n^(1/3).
 * Dividing into 8 halves every length and doubles SA:V.
 */
export function divide(shape: Shape, L: number, n = 8): Measures & { each: Measures; n: number } {
  const each = measure(shape, L / Math.cbrt(n));
  return { n, each, sa: each.sa * n, v: each.v * n, ratio: each.ratio };
}

/** Rows for the cube data table, as in the classic "cubes of side 1, 2, 3 …" exercise. */
export const cubeTable = (sides: number[]) => sides.map((L) => ({ L, ...cube(L) }));

/** Round to n significant figures for display (avoids tails such as 0.6000000001). */
export function fmt(x: number, n = 3): string {
  if (!Number.isFinite(x)) return '–';
  const r = Number(x.toPrecision(n));
  return r.toLocaleString('en-GB', { maximumFractionDigits: 4 });
}

export const shapeName: Record<Shape, string> = {
  cube: 'cube',
  sphere: 'sphere',
  flat: `flattened cell (${FLAT_ASPECT}× wider than thick)`,
};
