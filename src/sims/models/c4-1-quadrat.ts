/**
 * Random quadrat sampling of a sessile population (C4.1.3).
 * A square field (side `size` m) holds plants placed by a seeded random generator in one of three
 * patterns: random, clumped or even (regular). Quadrats are placed at random coordinates and the plants
 * inside are counted. Population estimate = mean count per quadrat × area of site ÷ area of one quadrat.
 */
import { gaussian, mean, mulberry32, sd, type Rng } from './c4-1-rng';

export type Pattern = 'random' | 'clumped' | 'even';
export interface Plant { x: number; y: number }
export interface Quadrat { x: number; y: number; count: number }

export const FIELD = 20; // metres along each side
export const QUADRAT = 1; // quadrat side in metres

export function makeField(seed: number, pattern: Pattern, n: number, size = FIELD): Plant[] {
  const rng = mulberry32(seed);
  const pts: Plant[] = [];
  if (pattern === 'random') {
    for (let i = 0; i < n; i++) pts.push({ x: rng() * size, y: rng() * size });
  } else if (pattern === 'clumped') {
    const centres = Array.from({ length: 14 }, () => ({ x: 1.5 + rng() * (size - 3), y: 1.5 + rng() * (size - 3) }));
    while (pts.length < n) {
      const c = centres[Math.floor(rng() * centres.length)]!;
      const x = c.x + gaussian(rng) * 1.1, y = c.y + gaussian(rng) * 1.1;
      if (x >= 0 && x < size && y >= 0 && y < size) pts.push({ x, y });
    }
  } else {
    // even: a grid with slight jitter, then trimmed at random to exactly n
    const per = Math.ceil(Math.sqrt(n));
    const step = size / per;
    for (let i = 0; i < per; i++)
      for (let j = 0; j < per; j++)
        pts.push({ x: (i + 0.5 + (rng() - 0.5) * 0.3) * step, y: (j + 0.5 + (rng() - 0.5) * 0.3) * step });
    while (pts.length > n) pts.splice(Math.floor(rng() * pts.length), 1);
  }
  return pts;
}

export const countIn = (plants: Plant[], x: number, y: number, q = QUADRAT) =>
  plants.reduce((c, p) => c + (p.x >= x && p.x < x + q && p.y >= y && p.y < y + q ? 1 : 0), 0);

/** Random coordinates (to 0.1 m) for the corner of a quadrat that fits inside the field. */
export function randomCorner(rng: Rng, size = FIELD, q = QUADRAT): { x: number; y: number } {
  const span = Math.round((size - q) * 10);
  return { x: Math.floor(rng() * (span + 1)) / 10, y: Math.floor(rng() * (span + 1)) / 10 };
}

export function placeQuadrats(plants: Plant[], rng: Rng, k: number, size = FIELD, q = QUADRAT): Quadrat[] {
  return Array.from({ length: k }, () => {
    const { x, y } = randomCorner(rng, size, q);
    return { x, y, count: countIn(plants, x, y, q) };
  });
}

export const estimate = (meanPerQuadrat: number, siteArea: number, quadratArea: number) =>
  (meanPerQuadrat * siteArea) / quadratArea;

export interface Summary { n: number; mean: number; sd: number; estimate: number; error: number; errorPct: number }

export function summarize(counts: number[], trueN: number, size = FIELD, q = QUADRAT): Summary {
  const m = mean(counts);
  const est = estimate(m, size * size, q * q);
  return { n: counts.length, mean: m, sd: sd(counts), estimate: est, error: est - trueN, errorPct: trueN ? ((est - trueN) / trueN) * 100 : 0 };
}

/** Running estimate after each successive quadrat (to show how sampling error shrinks with sample size). */
export const runningEstimates = (counts: number[], size = FIELD, q = QUADRAT) =>
  counts.map((_, i) => estimate(mean(counts.slice(0, i + 1)), size * size, q * q));
