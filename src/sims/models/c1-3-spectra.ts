/**
 * C1.3 absorption and action spectra (approximate shapes).
 *
 * Each pigment's absorption is a sum of Gaussian bands placed at the textbook peak wavelengths for the
 * pigment dissolved in an organic solvent (chlorophyll a ≈ 430 and 662 nm; chlorophyll b ≈ 453 and 642 nm;
 * carotenoids ≈ 425, 450 and 478 nm with almost nothing above 520 nm), scaled to 100 at the pigment's own
 * maximum. The action spectrum is modelled from the combined absorption of the pigments plus a small
 * broad contribution (green light that is absorbed after many reflections inside a leaf, and by accessory
 * pigments), scaled to 100 at its maximum. Shapes, not measurements.
 */
export type Pigment = 'chlA' | 'chlB' | 'car';
const g = (x: number, mu: number, sd: number, h: number) => h * Math.exp(-(((x - mu) / sd) ** 2) / 2);

const bands: Record<Pigment, [number, number, number][]> = {
  chlA: [[430, 13, 1], [410, 12, 0.42], [662, 10, 0.78], [615, 14, 0.13], [578, 14, 0.05]],
  chlB: [[453, 12, 1], [430, 14, 0.32], [642, 10, 0.36], [595, 14, 0.07]],
  car: [[425, 10, 0.68], [450, 11, 0.95], [478, 11, 0.82]],
};

const raw = (p: Pigment, nm: number) => bands[p].reduce((s, [mu, sd, h]) => s + g(nm, mu, sd, h), 0);
const peakOf = (fn: (nm: number) => number) => {
  let m = 0;
  for (let nm = 380; nm <= 750; nm += 0.5) m = Math.max(m, fn(nm));
  return m;
};
const peaks = { chlA: peakOf((n) => raw('chlA', n)), chlB: peakOf((n) => raw('chlB', n)), car: peakOf((n) => raw('car', n)) };

/** Relative absorption (0–100, 100 = this pigment's own peak). */
export const absorption = (p: Pigment, nm: number) => (100 * raw(p, nm)) / peaks[p];

// Absorption by a whole leaf or alga saturates at the peaks (most light of those colours is absorbed
// anyway), so the summed absorption is passed through 1 − e^(−kA).
const combined = (nm: number) =>
  1 - Math.exp(-0.012 * (absorption('chlA', nm) + 0.6 * absorption('chlB', nm) + 0.45 * absorption('car', nm) + g(nm, 550, 85, 20)));
const actionPeak = peakOf(combined);
/** Relative rate of photosynthesis (0–100) when the plant is lit with this wavelength only. */
export const action = (nm: number) => (100 * combined(nm)) / actionPeak;

export const RANGE = { min: 400, max: 700 } as const;

export const colourBands = [
  { name: 'violet', from: 400, to: 450 },
  { name: 'blue', from: 450, to: 495 },
  { name: 'green', from: 495, to: 570 },
  { name: 'yellow', from: 570, to: 590 },
  { name: 'orange', from: 590, to: 620 },
  { name: 'red', from: 620, to: 700 },
] as const;

export function colourName(nm: number): string {
  for (const b of colourBands) if (nm >= b.from && nm < b.to) return b.name;
  return nm < RANGE.min ? 'violet' : 'red';
}

/** Approximate sRGB colour of a wavelength (for swatches only). */
export function wavelengthToRgb(nm: number): string {
  let r = 0, gr = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { gr = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { gr = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; gr = 1; }
  else if (nm < 645) { r = 1; gr = -(nm - 645) / 65; }
  else { r = 1; }
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 680 ? 0.3 + (0.7 * (750 - nm)) / 70 : 1;
  const c = (v: number) => Math.round(255 * Math.max(0, Math.min(1, v * f)) ** 0.8);
  return `rgb(${c(r)}, ${c(gr)}, ${c(b)})`;
}

/** Wavelength (nm) at which a function peaks within [from, to]. */
export function peakWavelength(fn: (nm: number) => number, from: number, to: number): number {
  let best = from, val = -Infinity;
  for (let nm = from; nm <= to; nm += 0.5) { const v = fn(nm); if (v > val) { val = v; best = nm; } }
  return best;
}

/** Rate of photosynthesis from a measured volume of oxygen (or CO₂ taken up) over a time. */
export const rateFrom = (volume: number, minutes: number) => volume / minutes;
