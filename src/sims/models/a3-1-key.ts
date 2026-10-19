/**
 * A dichotomous key to eight common garden invertebrates (A3.1.14), with the observable traits of
 * each specimen so the key can be checked automatically: every couplet must split the specimens that
 * reach it into two non-empty groups, and every species must be reached by exactly one route.
 */

export interface Traits {
  /** Pairs of jointed legs (0 if none; 15+ for "many"). */
  legPairs: number;
  shell: boolean;
  /** Hard wing cases (elytra) covering the back. */
  wingCases: boolean;
  /** Pairs of legs on most body segments (only meaningful for long many-legged bodies). */
  legPairsPerSegment: 0 | 1 | 2;
}

export interface Specimen { id: string; common: string; binomial: string; traits: Traits }

export const specimens: Specimen[] = [
  { id: 'snail', common: 'Garden snail', binomial: 'Cornu aspersum', traits: { legPairs: 0, shell: true, wingCases: false, legPairsPerSegment: 0 } },
  { id: 'worm', common: 'Earthworm', binomial: 'Lumbricus terrestris', traits: { legPairs: 0, shell: false, wingCases: false, legPairsPerSegment: 0 } },
  { id: 'ladybird', common: 'Seven-spot ladybird', binomial: 'Coccinella septempunctata', traits: { legPairs: 3, shell: false, wingCases: true, legPairsPerSegment: 0 } },
  { id: 'ant', common: 'Black garden ant', binomial: 'Lasius niger', traits: { legPairs: 3, shell: false, wingCases: false, legPairsPerSegment: 0 } },
  { id: 'spider', common: 'Garden spider', binomial: 'Araneus diadematus', traits: { legPairs: 4, shell: false, wingCases: false, legPairsPerSegment: 0 } },
  { id: 'woodlouse', common: 'Common woodlouse', binomial: 'Oniscus asellus', traits: { legPairs: 7, shell: false, wingCases: false, legPairsPerSegment: 1 } },
  { id: 'centipede', common: 'Brown centipede', binomial: 'Lithobius forficatus', traits: { legPairs: 15, shell: false, wingCases: false, legPairsPerSegment: 1 } },
  { id: 'millipede', common: 'White-legged snake millipede', binomial: 'Tachypodoiulus niger', traits: { legPairs: 40, shell: false, wingCases: false, legPairsPerSegment: 2 } },
];

/** Where a lead goes: another couplet (number) or a species (specimen id). */
export type Target = { couplet: number } | { species: string };
export interface Lead { text: string; test: (t: Traits) => boolean; to: Target }
export interface Couplet { n: number; a: Lead; b: Lead }

export const key: Couplet[] = [
  { n: 1,
    a: { text: 'No legs', test: (t) => t.legPairs === 0, to: { couplet: 2 } },
    b: { text: 'Jointed legs present', test: (t) => t.legPairs > 0, to: { couplet: 3 } } },
  { n: 2,
    a: { text: 'Soft body with a coiled shell on its back', test: (t) => t.shell, to: { species: 'snail' } },
    b: { text: 'No shell; long body made of many ring-like segments', test: (t) => !t.shell, to: { species: 'worm' } } },
  { n: 3,
    a: { text: 'Three pairs of legs', test: (t) => t.legPairs === 3, to: { couplet: 4 } },
    b: { text: 'More than three pairs of legs', test: (t) => t.legPairs > 3, to: { couplet: 5 } } },
  { n: 4,
    a: { text: 'Hard, domed wing cases cover the back', test: (t) => t.wingCases, to: { species: 'ladybird' } },
    b: { text: 'No wing cases; narrow waist between thorax and abdomen', test: (t) => !t.wingCases, to: { species: 'ant' } } },
  { n: 5,
    a: { text: 'Four pairs of legs', test: (t) => t.legPairs === 4, to: { species: 'spider' } },
    b: { text: 'More than four pairs of legs', test: (t) => t.legPairs > 4, to: { couplet: 6 } } },
  { n: 6,
    a: { text: 'Seven pairs of legs; oval, flattened body covered by overlapping plates', test: (t) => t.legPairs === 7, to: { species: 'woodlouse' } },
    b: { text: 'Many more than seven pairs of legs; long, narrow body', test: (t) => t.legPairs > 7, to: { couplet: 7 } } },
  { n: 7,
    a: { text: 'One pair of legs on each body segment', test: (t) => t.legPairsPerSegment === 1, to: { species: 'centipede' } },
    b: { text: 'Two pairs of legs on most body segments', test: (t) => t.legPairsPerSegment === 2, to: { species: 'millipede' } } },
];

export const coupletByN = new Map(key.map((c) => [c.n, c]));
export const specimenById = new Map(specimens.map((s) => [s.id, s]));

export interface Step { couplet: number; choice: 'a' | 'b' }

/** The route a specimen takes through the key if every statement is judged correctly. */
export function correctRoute(sp: Specimen): { steps: Step[]; result: string } {
  const steps: Step[] = [];
  let c = coupletByN.get(1)!;
  for (let guard = 0; guard < 20; guard++) {
    const aTrue = c.a.test(sp.traits), bTrue = c.b.test(sp.traits);
    if (aTrue === bTrue) throw new Error(`couplet ${c.n} does not separate ${sp.id}`);
    const choice = aTrue ? 'a' : 'b';
    steps.push({ couplet: c.n, choice });
    const to = c[choice].to;
    if ('species' in to) return { steps, result: to.species };
    c = coupletByN.get(to.couplet)!;
  }
  throw new Error('key loops');
}

/** Follow a reader's choices from couplet 1. Returns the next couplet, or the species reached. */
export function follow(choices: ('a' | 'b')[]): { at: number | null; result: string | null; steps: Step[] } {
  let n = 1;
  const steps: Step[] = [];
  for (const ch of choices) {
    const to = coupletByN.get(n)![ch].to;
    steps.push({ couplet: n, choice: ch });
    if ('species' in to) return { at: null, result: to.species, steps };
    n = to.couplet;
  }
  return { at: n, result: null, steps };
}

/** The first couplet on the reader's route where they chose differently from the correct route. */
export function firstWrongStep(sp: Specimen, choices: ('a' | 'b')[]): number | null {
  const right = correctRoute(sp).steps;
  for (let i = 0; i < choices.length && i < right.length; i++) if (choices[i] !== right[i]!.choice) return right[i]!.couplet;
  return null;
}
