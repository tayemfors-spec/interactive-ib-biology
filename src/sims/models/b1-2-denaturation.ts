/**
 * Qualitative model of protein denaturation by temperature and pH (B1.2.5).
 *
 *  - Unfolding is cooperative, so the proportion of molecules with their native shape falls steeply
 *    (logistic curve) around a characteristic temperature or pH.
 *  - Each protein is stable over its own range: most human proteins near 37 °C and pH ≈ 7; pepsin in
 *    the acid of the stomach; enzymes of thermophilic organisms at temperatures that denature ours.
 *  - Denaturation breaks the weak bonds that hold the 3D shape (hydrogen bonds, ionic bonds, hydrophobic
 *    interactions). Peptide bonds are not broken (primary structure is unchanged) and disulfide bonds
 *    usually survive. In this model denaturation is permanent: once a molecule has unfolded, returning to
 *    the original conditions does not restore its shape (true of almost all heat denaturation).
 * Values are illustrative, not measurements.
 */
export interface ProteinDef {
  id: string;
  name: string;
  /** Temperature (°C) at which half the molecules have lost their native shape. */
  tHalf: number;
  /** pH values below / above which most molecules are denatured (half-way points). */
  phLow: number;
  phHigh: number;
  /** Where it normally works. */
  home: { temp: number; pH: number; where: string };
}

export const proteins: ProteinDef[] = [
  { id: 'human', name: 'Typical human enzyme', tHalf: 55, phLow: 4.2, phHigh: 9.8, home: { temp: 37, pH: 7, where: 'body cells at 37 °C and about pH 7' } },
  { id: 'pepsin', name: 'Pepsin (stomach protease)', tHalf: 58, phLow: 0.6, phHigh: 6.4, home: { temp: 37, pH: 2, where: 'the stomach, at about pH 2' } },
  { id: 'taq', name: 'Taq polymerase (thermophile)', tHalf: 99, phLow: 4.8, phHigh: 10.2, home: { temp: 75, pH: 8, where: 'Thermus aquaticus, a bacterium of hot springs at about 70–75 °C' } },
];

const W_T = 2.6; // °C: steepness of heat unfolding
const W_PH = 0.32; // pH units

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/** Proportion of molecules (0–1) that keep their native shape at temperature `temp` (°C). */
export const heatStable = (p: ProteinDef, temp: number) => logistic((p.tHalf - temp) / W_T);
/** Proportion (0–1) that keep their native shape at this pH. */
export const phStable = (p: ProteinDef, pH: number) => logistic((pH - p.phLow) / W_PH) * logistic((p.phHigh - pH) / W_PH);
/** Equilibrium proportion of native molecules under these conditions (ignoring history). */
export const nativeFraction = (p: ProteinDef, temp: number, pH: number) => heatStable(p, temp) * phStable(p, pH);

/** A sample remembers the worst conditions it has met, because denatured molecules do not refold. */
export interface Sample { native: number; heatHit: number; phHit: number }
export const freshSample = (): Sample => ({ native: 1, heatHit: 1, phHit: 1 });

export function expose(s: Sample, p: ProteinDef, temp: number, pH: number): Sample {
  return {
    native: Math.min(s.native, nativeFraction(p, temp, pH)),
    heatHit: Math.min(s.heatHit, heatStable(p, temp)),
    phHit: Math.min(s.phHit, phStable(p, pH)),
  };
}

export type BondState = 'intact' | 'partly broken' | 'broken';
const stateOf = (f: number): BondState => (f > 0.9 ? 'intact' : f > 0.25 ? 'partly broken' : 'broken');

/** Which bonds hold or have failed in the sample, given how much heat and pH damage it has had. */
export function bonds(s: Sample) {
  return [
    { name: 'Hydrogen bonds', state: stateOf(s.native), why: 'weak; broken by the extra vibration at high temperature and by changes in charge at extreme pH' },
    { name: 'Ionic bonds between R groups', state: stateOf(Math.min(s.phHit, s.heatHit + 0.15)), why: 'H⁺ ions bind to or leave amine and carboxyl groups in R groups, so their charges change' },
    { name: 'Hydrophobic interactions', state: stateOf(s.native), why: 'lost as the chain unfolds and non-polar R groups are exposed' },
    { name: 'Disulfide bonds', state: 'intact' as BondState, why: 'covalent, so usually not broken by heating or by these pH changes' },
    { name: 'Peptide bonds (primary structure)', state: 'intact' as BondState, why: 'covalent; denaturation does not change the amino acid sequence' },
  ];
}

export function summary(p: ProteinDef, s: Sample, temp: number, pH: number): string {
  const now = nativeFraction(p, temp, pH);
  const pct = Math.round(s.native * 100);
  if (s.native > 0.9) return `${p.name}: ${pct}% of molecules have their native shape, so the protein can do its job. It normally works in ${p.home.where}.`;
  const cause = s.heatHit < s.phHit ? 'heat' : 'the pH';
  const permanent = now > s.native + 0.2 ? ' Conditions are back in range, but the unfolded molecules have not refolded: the denaturation is permanent.' : '';
  if (s.native > 0.25) return `${p.name}: only ${pct}% of molecules keep their native shape — ${cause} has started to denature the protein.${permanent}`;
  return `${p.name}: denatured by ${cause}. Only ${pct}% of molecules keep their native shape, so the protein can no longer work.${permanent}`;
}

// ---------- the schematic chain drawn in the simulation ----------

const N_PTS = 36;
/**
 * Points of the folded (u = 0) or unfolded (u = 1) chain in a 300 × 170 box. Folded: three rows of 12
 * folded back on each other into a compact shape, so point i lies next to point 23 − i (rows 1–2) and
 * point k next to 47 − k (rows 2–3). Points 5 and 18 are the two cysteines joined by a disulfide bond,
 * which stays intact, so in the unfolded chain that stretch forms a loop.
 */
export function chainPoints(u: number): [number, number][] {
  const folded: [number, number][] = [];
  for (let i = 0; i < N_PTS; i++) {
    const row = Math.floor(i / 12);
    const k = row === 1 ? 11 - (i % 12) : i % 12;
    const x = 96 + k * 10;
    const bow = 9 * Math.sin((k / 11) * Math.PI); // rounded, globule-like outline
    const y = 52 + row * 32 + (row === 0 ? -bow : row === 2 ? bow : 0);
    folded.push([x, y]);
  }
  const open: [number, number][] = [];
  for (let i = 0; i < N_PTS; i++) {
    if (i === 5) open.push([63, 104]);
    else if (i === 18) open.push([75, 104]);
    else if (i < 5) open.push([12 + i * 11, 122 + 8 * Math.sin(i * 1.4)]);
    else if (i < 18) {
      const a = ((i - 5) / 13) * Math.PI * 2;
      open.push([69 - 24 * Math.sin(a), 74 + 24 * Math.cos(a)]);
    } else open.push([75 + (i - 18) * 12.6, 122 + 10 * Math.sin(i * 1.3)]);
  }
  return folded.map(([x, y], i) => [x + (open[i]![0] - x) * u, y + (open[i]![1] - y) * u]);
}
export const CYS = [5, 18] as const;
/** Pairs of chain points joined by weak bonds in the folded shape (hydrogen bonds and one ionic bond). */
export const WEAK = { hbonds: [[2, 21], [8, 15], [13, 34], [20, 27]] as [number, number][], ionic: [[16, 31]] as [number, number][] };
