/**
 * A1.2.15 Base composition of DNA (mole % of each base) for several organisms: measurements from
 * Chargaff's laboratory and contemporaries, as compiled by Bansal (2003) Current Science 85: 1556–1563
 * (the same compilation appears in the Wikipedia article "Chargaff's rules"). φX174 is a virus whose
 * DNA is single-stranded, included as the instructive exception.
 */
export interface Composition {
  id: string;
  name: string;
  group: string;
  A: number;
  G: number;
  C: number;
  T: number;
  singleStranded?: boolean;
}

export const organisms: Composition[] = [
  { id: 'human', name: 'Human', group: 'mammal', A: 29.3, G: 20.7, C: 20.0, T: 30.0 },
  { id: 'chicken', name: 'Chicken', group: 'bird', A: 28.0, G: 22.0, C: 21.6, T: 28.4 },
  { id: 'octopus', name: 'Octopus', group: 'mollusc', A: 33.2, G: 17.6, C: 17.6, T: 31.6 },
  { id: 'sea-urchin', name: 'Sea urchin', group: 'echinoderm', A: 32.8, G: 17.7, C: 17.3, T: 32.1 },
  { id: 'wheat', name: 'Wheat', group: 'plant', A: 27.3, G: 22.7, C: 22.8, T: 27.1 },
  { id: 'maize', name: 'Maize', group: 'plant', A: 26.8, G: 22.8, C: 23.2, T: 27.2 },
  { id: 'yeast', name: 'Yeast', group: 'fungus', A: 31.3, G: 18.7, C: 17.1, T: 32.9 },
  { id: 'e-coli', name: 'E. coli', group: 'bacterium', A: 24.7, G: 26.0, C: 25.7, T: 23.6 },
  { id: 'phix174', name: 'φX174', group: 'virus with single-stranded DNA', A: 24.0, G: 23.3, C: 21.5, T: 31.2, singleStranded: true },
];

/** The tetranucleotide hypothesis (a repeating unit of the four bases) predicts 25% of each base. */
export const TETRANUCLEOTIDE_PREDICTION = 25;

export interface Ratios { aToT: number; gToC: number; purinesToPyrimidines: number; gcPercent: number; maxDeviationFrom25: number }

export function ratios(o: Composition): Ratios {
  return {
    aToT: o.A / o.T,
    gToC: o.G / o.C,
    purinesToPyrimidines: (o.A + o.G) / (o.C + o.T),
    gcPercent: (100 * (o.G + o.C)) / (o.A + o.G + o.C + o.T),
    maxDeviationFrom25: Math.max(...[o.A, o.G, o.C, o.T].map((v) => Math.abs(v - TETRANUCLEOTIDE_PREDICTION))),
  };
}

/** Whether a sample is consistent with equal amounts of the four bases (every base within ±tol of 25%). */
export const fitsTetranucleotide = (o: Composition, tol = 2) => ratios(o).maxDeviationFrom25 <= tol;
