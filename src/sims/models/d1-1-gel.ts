/**
 * D1.1 gel electrophoresis and DNA profiling. Qualitative model shared by the server render and the browser.
 * DNA is negatively charged (phosphate groups), so it moves from the wells at the negative electrode towards
 * the positive electrode. The agarose mesh slows long molecules more than short ones; over the useful range
 * of a gel the distance travelled falls roughly linearly with log(size).
 */
export const GEL_LENGTH = 100; // arbitrary units from the wells to the positive end
export const LADDER = [100, 200, 300, 400, 500, 700, 1000, 1500, 2000, 3000];
const LOG_LIMIT = Math.log10(5000); // molecules this long would hardly enter the gel
const K = 90 / (100 * 60 * (LOG_LIMIT - 2)); // a 100 bp fragment travels 90 units in 60 min at 100 V

/** Distance (units) moved by a fragment of `bp` base pairs after `minutes` at `volts`. */
export function distance(bp: number, minutes: number, volts = 100): number {
  return Math.max(0, K * volts * Math.max(0, minutes) * Math.max(0, LOG_LIMIT - Math.log10(bp)));
}

/** True once the fragment has run off the far end of the gel into the buffer. */
export const ranOff = (bp: number, minutes: number, volts = 100) => distance(bp, minutes, volts) > GEL_LENGTH;

/**
 * Estimate a fragment's size from how far it moved, using the ladder run in the same gel: interpolate
 * log(size) between the two ladder bands either side. Returns null if the ladder cannot be used.
 */
export function estimateSize(d: number, minutes: number, volts = 100): number | null {
  const pts = LADDER.map((bp) => ({ bp, d: distance(bp, minutes, volts) })).filter((p) => p.d > 0 && p.d <= GEL_LENGTH);
  if (pts.length < 2) return null;
  // pts are in order of increasing size = decreasing distance
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!; // a is smaller (farther)
    if (d <= a.d && d >= b.d) {
      const f = (a.d - d) / (a.d - b.d);
      return Math.pow(10, Math.log10(a.bp) + f * (Math.log10(b.bp) - Math.log10(a.bp)));
    }
  }
  return null; // outside the ladder's range
}

export interface Lane { id: string; name: string; bands: number[] }
export interface Scenario { id: 'forensic' | 'paternity'; name: string; lanes: Lane[] }

/**
 * Short tandem repeat (STR) profiles at three loci (each person has two alleles per locus; the same size twice
 * gives a single band). Locus 1: 120–200 bp, locus 2: 250–450 bp, locus 3: 550–900 bp. Invented data.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'forensic',
    name: 'Forensic case',
    lanes: [
      { id: 'scene', name: 'Crime scene', bands: [140, 180, 290, 350, 620, 800] },
      { id: 's1', name: 'Suspect 1', bands: [140, 160, 290, 330, 560, 800] },
      { id: 's2', name: 'Suspect 2', bands: [140, 180, 290, 350, 620, 800] },
      { id: 's3', name: 'Suspect 3', bands: [120, 180, 310, 350, 620, 700] },
    ],
  },
  {
    id: 'paternity',
    name: 'Paternity case',
    lanes: [
      { id: 'mother', name: 'Mother', bands: [130, 170, 270, 340, 580, 760] },
      { id: 'child', name: 'Child', bands: [130, 190, 340, 400, 580, 680] },
      { id: 'man1', name: 'Man 1', bands: [150, 190, 300, 360, 680, 820] },
      { id: 'man2', name: 'Man 2', bands: [160, 190, 400, 440, 680, 880] },
    ],
  },
];
export const LOCI: [number, number][] = [[100, 220], [220, 500], [500, 1000]];
const locusOf = (bp: number) => LOCI.findIndex(([a, b]) => bp >= a && bp < b);
const alleles = (lane: Lane, locus: number) => lane.bands.filter((b) => locusOf(b) === locus);

/** Two profiles match if they have exactly the same bands. */
export function profilesMatch(a: Lane, b: Lane): boolean {
  const x = [...new Set(a.bands)].sort((p, q) => p - q);
  const y = [...new Set(b.bands)].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/**
 * Could `man` be the biological father? At every locus the child must have one allele that could come from
 * the mother and the other from the man. Returns the loci (0-based) where he is excluded.
 */
export function paternityExclusions(child: Lane, mother: Lane, man: Lane): number[] {
  const out: number[] = [];
  for (let l = 0; l < LOCI.length; l++) {
    const c = alleles(child, l), m = alleles(mother, l), f = alleles(man, l);
    const c1 = c[0]!, c2 = c[1] ?? c[0]!;
    const ok = (m.includes(c1) && f.includes(c2)) || (m.includes(c2) && f.includes(c1));
    if (!ok) out.push(l);
  }
  return out;
}

/**
 * Probability that an unrelated person matches by chance at every one of `markers` independent loci, when
 * the chance of sharing one locus's genotype is `perLocus` (illustrative; real values vary by locus and population).
 */
export const randomMatchProbability = (markers: number, perLocus = 0.1) => Math.pow(perLocus, Math.max(0, markers));
