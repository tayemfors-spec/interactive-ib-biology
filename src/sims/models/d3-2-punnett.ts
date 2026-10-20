/**
 * Monohybrid Punnett grids (D3.2.2, D3.2.5, D3.2.9, D3.2.10, D3.2.12).
 * Four inheritance patterns: complete dominance (pea seed shape), incomplete dominance (Mirabilis jalapa
 * flower colour), multiple alleles with codominance (ABO blood groups) and sex linkage (haemophilia).
 * Each parent passes one of its two alleles to each gamete with equal probability (segregation), so a
 * 2 × 2 grid of equally likely fertilizations gives the expected offspring ratios.
 */

export type Mode = 'dominant' | 'incomplete' | 'abo' | 'sexlinked';

/** An allele: `id` is plain text (used in code and tests); `html` is how it is printed. */
export interface Allele { id: string; html: string; text: string }

const A = (id: string, html: string, text: string): Allele => ({ id, html, text });

export const ALLELES: Record<Mode, Allele[]> = {
  dominant: [A('S', 'S', 'S'), A('s', 's', 's')],
  incomplete: [A('CR', 'C<sup>R</sup>', 'Cᴿ'), A('CW', 'C<sup>W</sup>', 'Cᵂ')],
  abo: [A('IA', 'I<sup>A</sup>', 'Iᴬ'), A('IB', 'I<sup>B</sup>', 'Iᴮ'), A('i', 'i', 'i')],
  sexlinked: [A('XH', 'X<sup>H</sup>', 'Xᴴ'), A('Xh', 'X<sup>h</sup>', 'Xʰ'), A('Y', 'Y', 'Y')],
};

/** Genotypes a parent can be given, as pairs of allele ids. Parent 1 is the female (ovules/eggs). */
export const PARENT_GENOTYPES: Record<Mode, { p1: string[][]; p2: string[][] }> = {
  dominant: { p1: [['S', 'S'], ['S', 's'], ['s', 's']], p2: [['S', 'S'], ['S', 's'], ['s', 's']] },
  incomplete: { p1: [['CR', 'CR'], ['CR', 'CW'], ['CW', 'CW']], p2: [['CR', 'CR'], ['CR', 'CW'], ['CW', 'CW']] },
  abo: {
    p1: [['IA', 'IA'], ['IA', 'i'], ['IB', 'IB'], ['IB', 'i'], ['IA', 'IB'], ['i', 'i']],
    p2: [['IA', 'IA'], ['IA', 'i'], ['IB', 'IB'], ['IB', 'i'], ['IA', 'IB'], ['i', 'i']],
  },
  sexlinked: { p1: [['XH', 'XH'], ['XH', 'Xh'], ['Xh', 'Xh']], p2: [['XH', 'Y'], ['Xh', 'Y']] },
};

export const MODE_INFO: Record<Mode, { title: string; organism: string; p1: string; p2: string; key: string }> = {
  dominant: {
    title: 'Dominant and recessive',
    organism: 'Pea plant (Pisum sativum), seed shape',
    p1: 'Female parent (ovules)',
    p2: 'Male parent (pollen)',
    key: 'S = allele for smooth (round) seeds, dominant; s = allele for wrinkled seeds, recessive.',
  },
  incomplete: {
    title: 'Incomplete dominance',
    organism: 'Four o’clock flower (Mirabilis jalapa), flower colour',
    p1: 'Female parent (ovules)',
    p2: 'Male parent (pollen)',
    key: 'C<sup>R</sup> = allele for red flowers; C<sup>W</sup> = allele for white flowers. Neither is dominant: C<sup>R</sup>C<sup>W</sup> flowers are pink.',
  },
  abo: {
    title: 'Multiple alleles and codominance',
    organism: 'Humans, ABO blood group',
    p1: 'Mother',
    p2: 'Father',
    key: 'I<sup>A</sup> and I<sup>B</sup> are codominant and both are dominant to i. Three alleles exist in the gene pool, but each person has only two.',
  },
  sexlinked: {
    title: 'Sex linkage',
    organism: 'Humans, haemophilia (gene on the X chromosome)',
    p1: 'Mother',
    p2: 'Father',
    key: 'X<sup>H</sup> = X chromosome with the allele for normal blood clotting (dominant); X<sup>h</sup> = X with the allele for haemophilia (recessive). Y carries no allele of this gene.',
  },
};

const order = (mode: Mode, id: string) => ALLELES[mode].findIndex((a) => a.id === id);
export const allele = (mode: Mode, id: string): Allele => {
  const a = ALLELES[mode].find((x) => x.id === id);
  if (!a) throw new Error(`unknown allele ${id} for ${mode}`);
  return a;
};

/** Writes a genotype in the conventional order (dominant first; X before Y). */
export function normalise(mode: Mode, g: string[]): string[] {
  return [...g].sort((a, b) => order(mode, a) - order(mode, b));
}
export const genotypeKey = (mode: Mode, g: string[]) => normalise(mode, g).join('');
export const genotypeHtml = (mode: Mode, g: string[]) => normalise(mode, g).map((id) => allele(mode, id).html).join('');
export const genotypeText = (mode: Mode, g: string[]) => normalise(mode, g).map((id) => allele(mode, id).text).join(' ');

/** Observable phenotype for a genotype. */
export function phenotype(mode: Mode, g: string[]): string {
  const has = (id: string) => g.includes(id);
  switch (mode) {
    case 'dominant': return has('S') ? 'smooth seeds' : 'wrinkled seeds';
    case 'incomplete': return has('CR') && has('CW') ? 'pink flowers' : has('CR') ? 'red flowers' : 'white flowers';
    case 'abo': return has('IA') && has('IB') ? 'group AB' : has('IA') ? 'group A' : has('IB') ? 'group B' : 'group O';
    case 'sexlinked': {
      if (has('Y')) return has('XH') ? 'unaffected male' : 'male with haemophilia';
      const n = g.filter((x) => x === 'Xh').length;
      return n === 0 ? 'unaffected female' : n === 1 ? 'carrier female (unaffected)' : 'female with haemophilia';
    }
  }
}

/** Gametes made by a parent: one of each of its two alleles, each in half of the gametes. */
export const gametes = (g: string[]) => [g[0]!, g[1]!];

export interface Cell { row: number; col: number; genotype: string[]; phenotype: string }

/** The 2 × 2 grid: rows are parent 1's gametes, columns parent 2's. */
export function grid(mode: Mode, p1: string[], p2: string[]): Cell[] {
  const cells: Cell[] = [];
  gametes(p1).forEach((a, row) => gametes(p2).forEach((b, col) => {
    const genotype = normalise(mode, [a, b]);
    cells.push({ row, col, genotype, phenotype: phenotype(mode, genotype) });
  }));
  return cells;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export interface Tally { key: string; label: string; count: number }

/** Counts grouped by genotype or phenotype, in a stable order (first appearance in the grid). */
export function tally(mode: Mode, cells: Cell[], by: 'genotype' | 'phenotype'): Tally[] {
  const out: Tally[] = [];
  for (const c of cells) {
    const key = by === 'genotype' ? genotypeKey(mode, c.genotype) : c.phenotype;
    const label = by === 'genotype' ? genotypeHtml(mode, c.genotype) : c.phenotype;
    const t = out.find((x) => x.key === key);
    if (t) t.count++; else out.push({ key, label, count: 1 });
  }
  return out;
}

/** Ratio in lowest terms, e.g. [1, 2, 1] or [3, 1]. */
export function simplest(counts: number[]): number[] {
  const g = counts.reduce((a, b) => gcd(a, b), 0) || 1;
  return counts.map((c) => c / g);
}

export const ratioText = (t: Tally[]) => simplest(t.map((x) => x.count)).join(' : ');

/** Probability (out of 4 equally likely fertilizations) of each phenotype. */
export function probability(cells: Cell[], test: (c: Cell) => boolean) {
  return cells.filter(test).length / cells.length;
}
