/** Pearson correlation coefficient (r), coefficient of determination (R²) and least-squares line. */
export function correlation(pts: [number, number][]) {
  const n = pts.length;
  const mx = pts.reduce((s, [x]) => s + x, 0) / n;
  const my = pts.reduce((s, [, y]) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  const r = sxy / Math.sqrt(sxx * syy);
  const slope = sxy / sxx;
  return { r, r2: r * r, slope, intercept: my - slope * mx };
}

/**
 * Illustrative (not measured) conduction speeds for myelinated mammalian fibres, scattered around the
 * typical relationship of about 6 m s⁻¹ per µm of fibre diameter.
 */
const noise = [3, -4, 6, -2, 5, -7, 2, 9, -6, 4, -3, 8, -10, 3, -5, 6, -4];
const diam = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20];
export const myelinatedData: [number, number][] = diam.map((d, i) => [d, Math.max(4, 6 * d + noise[i]!)]);
