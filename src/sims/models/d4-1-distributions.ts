/**
 * Schematic trait distributions for the patterns of selection (D4.1.12) and artificial selection (D4.1.15).
 *
 * The starting population has a normal distribution of a continuously varying trait (mean 0, SD 1, in
 * standard-deviation units). Each pattern is a fitness function w(x): the relative chance that an individual
 * with trait value x survives and reproduces. Assuming the trait is fully heritable, the distribution after
 * several generations is drawn as f(x) × w(x)^k, rescaled to the same total area (population size held by the
 * carrying capacity). Artificial selection is drawn instead as one generation of truncation selection: the
 * offspring curve is shifted by R = h²S (breeder's equation, h² = 0.5). Schematic only: real responses depend on heritability and on how variation is renewed.
 */
export type Pattern = 'start' | 'stabilizing' | 'directional' | 'disruptive' | 'artificial';
export const X_MIN = -3.6;
export const X_MAX = 3.6;
/** Generations of selection drawn in the "after" curve. */
export const GENS = 3;
/** Breeders keep the top 20 % of the trait as parents (truncation selection). */
export const TRUNCATION = 0.84;
export const HERITABILITY = 0.5;

export const normal = (x: number, mu = 0, sd = 1) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));

export function fitness(pattern: Pattern, x: number): number {
  switch (pattern) {
    case 'stabilizing': return Math.exp(-(x * x) / (2 * 1.1 * 1.1));
    case 'directional': return 1 / (1 + Math.exp(-1.6 * (x + 0.4)));
    case 'disruptive': return 1 - 0.85 * Math.exp(-(x * x) / (2 * 0.75 * 0.75));
    case 'artificial': return 1 / (1 + Math.exp(-6 * (x - TRUNCATION)));
    default: return 1;
  }
}

/** Sample points (x, y) of the distribution after selection, normalised to the starting area. */
export function curve(pattern: Pattern, samples = 121, gens = GENS): { x: number; y: number }[] {
  const xs = Array.from({ length: samples }, (_, i) => X_MIN + ((X_MAX - X_MIN) * i) / (samples - 1));
  const raw = xs.map((x) => normal(x) * fitness(pattern, x) ** (pattern === 'artificial' ? 1 : gens));
  let shift = 0;
  if (pattern === 'artificial') {
    // offspring of the chosen parents: a normal curve shifted by half the parents' advantage
    // (breeder's equation R = h²S with heritability h² = 0.5), after one generation
    shift = HERITABILITY * moments(xs.map((x, i) => ({ x, y: raw[i]! }))).mean;
    return xs.map((x) => ({ x, y: normal(x, shift, 1) }));
  }
  const dx = xs[1]! - xs[0]!;
  const area = raw.reduce((a, b) => a + b, 0) * dx;
  return xs.map((x, i) => ({ x, y: raw[i]! / area }));
}

/** Area under the starting curve that selection removes (relative fitness < 1), as a sampled band. */
export function removed(pattern: Pattern, samples = 121): { x: number; y: number }[] {
  const xs = Array.from({ length: samples }, (_, i) => X_MIN + ((X_MAX - X_MIN) * i) / (samples - 1));
  return xs.map((x) => ({ x, y: normal(x) * (1 - fitness(pattern, x)) }));
}

export function moments(pts: { x: number; y: number }[]): { mean: number; sd: number } {
  const tot = pts.reduce((a, p) => a + p.y, 0);
  const mean = pts.reduce((a, p) => a + p.x * p.y, 0) / tot;
  const v = pts.reduce((a, p) => a + (p.x - mean) ** 2 * p.y, 0) / tot;
  return { mean, sd: Math.sqrt(v) };
}

/** Number of local maxima (peaks) in a sampled curve. */
export function peaks(pts: { y: number }[]): number {
  let n = 0;
  for (let i = 1; i < pts.length - 1; i++) if (pts[i]!.y > pts[i - 1]!.y && pts[i]!.y >= pts[i + 1]!.y) n++;
  return n;
}
