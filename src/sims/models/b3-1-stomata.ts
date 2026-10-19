/**
 * Stomatal density from counts in a circular field of view (B3.1.10).
 *
 *   area of field of view = π r² = π (d ÷ 2)²            (mm², d = diameter of the field in mm)
 *   stomatal density      = mean number of stomata ÷ area of field   (stomata per mm², mm⁻²)
 *
 * The simulated leaf has a "true" density for each surface. Stomata are scattered at random
 * (a Poisson process), and each patch of leaf also differs a little from the leaf average, so
 * single counts vary and the mean of repeated counts is a better estimate.
 * Illustrative densities for a broad-leaved dicot: lower epidermis 150 mm⁻², upper 40 mm⁻².
 */

export type Surface = 'lower' | 'upper';
export const TRUE_DENSITY: Record<Surface, number> = { lower: 150, upper: 40 };
/** A stoma (pair of guard cells) is about 40 µm long. */
export const STOMA_LENGTH_MM = 0.04;

export const fieldArea = (diameterMm: number) => Math.PI * (diameterMm / 2) ** 2;
export const density = (meanCount: number, areaMm2: number) => meanCount / areaMm2;

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

/** Sample standard deviation (n − 1). */
export function sd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Poisson random number (Knuth's method; fine for λ below ~100). */
export function poisson(lambda: number, rand: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

export interface Stoma { x: number; y: number; angle: number }

/**
 * One field of view: stoma centres in mm relative to the field centre, all inside the circle.
 * `patchVariation` (default ±20 %) is the real difference between parts of a leaf.
 */
export function makeField(rand: () => number, surface: Surface, diameterMm: number, patchVariation = 0.2): Stoma[] {
  const r = diameterMm / 2;
  const patch = 1 + (rand() * 2 - 1) * patchVariation;
  const n = poisson(TRUE_DENSITY[surface] * patch * fieldArea(diameterMm), rand);
  const out: Stoma[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60) {
    const x = (rand() * 2 - 1) * r;
    const y = (rand() * 2 - 1) * r;
    if (x * x + y * y > r * r) continue;
    // stomata are spaced: they rarely touch (in real leaves at least one epidermal cell separates them)
    if (out.some((s) => (s.x - x) ** 2 + (s.y - y) ** 2 < (STOMA_LENGTH_MM * 0.8) ** 2)) continue;
    out.push({ x, y, angle: rand() * 180 });
  }
  return out;
}

/** The worked calculation, as text lines, for the counts recorded so far. */
export function working(counts: number[], diameterMm: number): { area: number; mean: number; density: number; lines: string[] } {
  const area = fieldArea(diameterMm);
  const m = mean(counts);
  const dens = density(m, area);
  const r = diameterMm / 2;
  const lines = [
    `Radius of field = ${diameterMm.toFixed(2)} ÷ 2 = ${r.toFixed(3)} mm`,
    `Area of field = π × ${r.toFixed(3)}² = ${area.toFixed(4)} mm²`,
    counts.length ? `Mean count = (${counts.join(' + ')}) ÷ ${counts.length} = ${m.toFixed(1)} stomata` : 'Mean count: record at least one field',
    counts.length ? `Stomatal density = ${m.toFixed(1)} ÷ ${area.toFixed(4)} = ${Math.round(dens)} stomata per mm²` : '',
  ].filter(Boolean);
  return { area, mean: m, density: dens, lines };
}
