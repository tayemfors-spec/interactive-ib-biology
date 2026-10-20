/**
 * Dihybrid crosses (D3.2.16, D3.2.17, D3.2.19–D3.2.21).
 * - Unlinked genes: independent assortment gives four gamete types in equal proportions, so a
 *   double heterozygote self-cross gives 9:3:3:1 and a test cross (× double recessive) gives 1:1:1:1.
 * - Linked genes (coupling phase, AB/ab): parental gametes each (1 − r)/2, recombinant gametes each r/2,
 *   where r is the recombination frequency (0–0.5). A test cross then shows the gamete proportions directly.
 * - Chi-squared goodness of fit with 4 phenotype classes: df = 4 − 1 = 3, critical value 7.815 at p = 0.05.
 */

export type CrossKind = 'f2' | 'test' | 'linked';

/** Gene symbols: first gene uppercase/lowercase letter, second gene likewise. */
export interface Genes { g1: [string, string]; g2: [string, string]; traits: [[string, string], [string, string]] }

export const PEA: Genes = { g1: ['R', 'r'], g2: ['Y', 'y'], traits: [['round', 'wrinkled'], ['yellow', 'green']] };
/** Drosophila melanogaster: body colour and wing length genes, both on chromosome 2. */
export const FLY: Genes = { g1: ['G', 'g'], g2: ['L', 'l'], traits: [['grey body', 'black body'], ['long wings', 'vestigial wings']] };

export const genesFor = (k: CrossKind) => (k === 'linked' ? FLY : PEA);

export const CRITICAL_05_DF3 = 7.815;

/** Gamete types of a double heterozygote with their probabilities. */
export function heteroGametes(genes: Genes, linkedR: number | null): { g: string; p: number; recombinant: boolean }[] {
  const [A, a] = genes.g1, [B, b] = genes.g2;
  if (linkedR === null) return [A + B, A + b, a + B, a + b].map((g) => ({ g, p: 0.25, recombinant: g === A + b || g === a + B }));
  const r = Math.min(0.5, Math.max(0, linkedR));
  return [
    { g: A + B, p: (1 - r) / 2, recombinant: false },
    { g: A + b, p: r / 2, recombinant: true },
    { g: a + B, p: r / 2, recombinant: true },
    { g: a + b, p: (1 - r) / 2, recombinant: false },
  ];
}

/** Phenotype class index 0–3: [dom-dom, dom-rec, rec-dom, rec-rec]. */
export function phenoClass(genes: Genes, genotype: string): number {
  const d1 = genotype.includes(genes.g1[0]), d2 = genotype.includes(genes.g2[0]);
  return (d1 ? 0 : 2) + (d2 ? 0 : 1);
}
export const phenoName = (genes: Genes, i: number) =>
  `${genes.traits[0][i < 2 ? 0 : 1]}, ${genes.traits[1][i % 2 === 0 ? 0 : 1]}`;

/** Order alleles in a genotype as gene 1 pair then gene 2 pair, dominant first. */
export function zygote(genes: Genes, g1: string, g2: string): string {
  const pair = (x: string, y: string, d: string) => (x === d ? x + y : y === d ? y + x : x + y);
  return pair(g1[0]!, g2[0]!, genes.g1[0]) + pair(g1[1]!, g2[1]!, genes.g2[0]);
}

export interface GridCell { row: string; col: string; genotype: string; cls: number; p: number }

/** Punnett grid for the cross (rows: parent 1 gametes, columns: parent 2 gametes). */
export function punnett(kind: CrossKind, r = 0.17): { rows: string[]; cols: string[]; cells: GridCell[] } {
  const genes = genesFor(kind);
  const p1 = heteroGametes(genes, kind === 'linked' ? r : null);
  const p2 = kind === 'f2' ? heteroGametes(genes, null) : [{ g: genes.g1[1] + genes.g2[1], p: 1, recombinant: false }];
  const cells: GridCell[] = [];
  for (const a of p1) for (const b of p2) {
    const genotype = zygote(genes, a.g, b.g);
    cells.push({ row: a.g, col: b.g, genotype, cls: phenoClass(genes, genotype), p: a.p * b.p });
  }
  return { rows: p1.map((x) => x.g), cols: p2.map((x) => x.g), cells };
}

/** Expected proportion of each phenotype class. */
export function classProbs(kind: CrossKind, r = 0.17): number[] {
  const out = [0, 0, 0, 0];
  for (const c of punnett(kind, r).cells) out[c.cls]! += c.p;
  return out;
}

/** Ratio predicted by the null hypothesis of independent assortment (Mendel's second law). */
export const nullRatio = (kind: CrossKind) => (kind === 'f2' ? [9, 3, 3, 1] : [1, 1, 1, 1]);

export function expected(kind: CrossKind, total: number): number[] {
  const ratio = nullRatio(kind);
  const sum = ratio.reduce((a, b) => a + b, 0);
  return ratio.map((x) => (x / sum) * total);
}

export function chiSquared(observed: number[], exp: number[]): number {
  return observed.reduce((s, o, i) => s + (exp[i]! > 0 ? (o - exp[i]!) ** 2 / exp[i]! : 0), 0);
}

/** Recombination frequency from test-cross offspring counts [AB, Ab, aB, ab] (coupling phase). */
export function recombinationFrequency(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  return total ? (counts[1]! + counts[2]!) / total : 0;
}

/** Small seeded generator so simulated results are repeatable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Counts of each phenotype class among n offspring drawn at random from the true probabilities. */
export function breed(probs: number[], n: number, seed: number): number[] {
  const next = rng(seed);
  const out = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    let u = next(), k = 0;
    while (k < 3 && u >= probs[k]!) { u -= probs[k]!; k++; }
    out[k]!++;
  }
  return out;
}

/** Mendel's F2 data for seed shape and colour (556 seeds). */
export const MENDEL_F2 = [315, 108, 101, 32];
