/**
 * Genome sizes and diploid chromosome numbers for the A3.1 comparison charts.
 * Genome size = total DNA in one (haploid) genome, in megabase pairs (Mb). Sources are listed in
 * src/content/topics/a3-1/facts.yaml; values are rounded and published estimates vary by a few per cent.
 */

export type Group = 'bacterium' | 'fungus' | 'plant' | 'animal';
export const groupLabel: Record<Group, string> = { bacterium: 'bacterium', fungus: 'fungus (yeast)', plant: 'plant', animal: 'animal' };

export interface GenomeEntry { id: string; common: string; binomial: string; group: Group; mb: number; note: string }

export const genomes: GenomeEntry[] = [
  { id: 'mycoplasma', common: 'Mycoplasma', binomial: 'Mycoplasma genitalium', group: 'bacterium', mb: 0.58, note: 'one of the smallest genomes of any cell that can be grown on its own in culture' },
  { id: 'ecoli', common: 'E. coli', binomial: 'Escherichia coli', group: 'bacterium', mb: 4.6, note: 'a typical bacterial genome: one circular chromosome' },
  { id: 'yeast', common: "Baker's yeast", binomial: 'Saccharomyces cerevisiae', group: 'fungus', mb: 12.1, note: 'a single-celled eukaryote with about 2.6 times the DNA of E. coli' },
  { id: 'arabidopsis', common: 'Thale cress', binomial: 'Arabidopsis thaliana', group: 'plant', mb: 135, note: 'a flowering plant with an unusually small genome, chosen as the first plant to have its genome sequenced' },
  { id: 'nematode', common: 'Nematode worm', binomial: 'Caenorhabditis elegans', group: 'animal', mb: 100, note: 'a 1 mm worm made of about 1000 body cells' },
  { id: 'fly', common: 'Fruit fly', binomial: 'Drosophila melanogaster', group: 'animal', mb: 175, note: 'a complex insect with a genome only about 6% of the size of ours' },
  { id: 'rice', common: 'Rice', binomial: 'Oryza sativa', group: 'plant', mb: 390, note: 'one of the smallest genomes among cereal crops' },
  { id: 'pufferfish', common: 'Pufferfish', binomial: 'Takifugu rubripes', group: 'animal', mb: 390, note: 'a vertebrate with a compact genome, about one-eighth the size of ours, with little non-coding DNA' },
  { id: 'chicken', common: 'Chicken', binomial: 'Gallus gallus', group: 'animal', mb: 1050, note: 'bird genomes are small for vertebrates' },
  { id: 'maize', common: 'Maize', binomial: 'Zea mays', group: 'plant', mb: 2300, note: 'most of its genome is repeated sequences (transposable elements)' },
  { id: 'mouse', common: 'Mouse', binomial: 'Mus musculus', group: 'animal', mb: 2700, note: 'a mammal with almost the same number of genes as us' },
  { id: 'human', common: 'Human', binomial: 'Homo sapiens', group: 'animal', mb: 3100, note: 'about 3.1 billion base pairs in one set of 23 chromosomes' },
  { id: 'onion', common: 'Onion', binomial: 'Allium cepa', group: 'plant', mb: 16000, note: 'the classic "onion test": no one thinks an onion is five times as complex as a human' },
  { id: 'axolotl', common: 'Axolotl', binomial: 'Ambystoma mexicanum', group: 'animal', mb: 32000, note: 'a salamander that can regrow lost limbs; most of its genome is repeated sequences' },
  { id: 'lungfish', common: 'Marbled lungfish', binomial: 'Protopterus aethiopicus', group: 'animal', mb: 130000, note: 'one of the largest known animal genomes' },
  { id: 'paris', common: 'Japanese canopy plant', binomial: 'Paris japonica', group: 'plant', mb: 149000, note: 'a slow-growing woodland herb from Japan, for years the record holder' },
  { id: 'tmesipteris', common: 'Fork fern', binomial: 'Tmesipteris oblanceolata', group: 'plant', mb: 160000, note: 'the largest genome measured so far (reported in 2024)' },
];

export const HUMAN_MB = genomes.find((g) => g.id === 'human')!.mb;

export interface ChromNumber { id: string; common: string; binomial: string; group: Group; n2: number; note?: string }

/** Diploid (2n) chromosome numbers. Only human 46 and chimpanzee 48 need to be learned. */
export const chromNumbers: ChromNumber[] = [
  { id: 'ant', common: 'Jack jumper ant', binomial: 'Myrmecia pilosula', group: 'animal', n2: 2, note: 'diploid females; males develop from unfertilized eggs and have 1' },
  { id: 'fly', common: 'Fruit fly', binomial: 'Drosophila melanogaster', group: 'animal', n2: 8 },
  { id: 'arabidopsis', common: 'Thale cress', binomial: 'Arabidopsis thaliana', group: 'plant', n2: 10 },
  { id: 'maize', common: 'Maize', binomial: 'Zea mays', group: 'plant', n2: 20 },
  { id: 'rice', common: 'Rice', binomial: 'Oryza sativa', group: 'plant', n2: 24 },
  { id: 'cat', common: 'Cat', binomial: 'Felis catus', group: 'animal', n2: 38 },
  { id: 'mouse', common: 'Mouse', binomial: 'Mus musculus', group: 'animal', n2: 40 },
  { id: 'wheat', common: 'Bread wheat', binomial: 'Triticum aestivum', group: 'plant', n2: 42, note: 'hexaploid: six sets of 7' },
  { id: 'human', common: 'Human', binomial: 'Homo sapiens', group: 'animal', n2: 46 },
  { id: 'chimp', common: 'Chimpanzee', binomial: 'Pan troglodytes', group: 'animal', n2: 48 },
  { id: 'potato', common: 'Potato', binomial: 'Solanum tuberosum', group: 'plant', n2: 48, note: 'cultivated potato is tetraploid: four sets of 12' },
  { id: 'donkey', common: 'Donkey', binomial: 'Equus asinus', group: 'animal', n2: 62 },
  { id: 'horse', common: 'Horse', binomial: 'Equus caballus', group: 'animal', n2: 64 },
  { id: 'dog', common: 'Dog', binomial: 'Canis familiaris', group: 'animal', n2: 78 },
  { id: 'chicken', common: 'Chicken', binomial: 'Gallus gallus', group: 'animal', n2: 78 },
];

/** Log-scale axis: 100 kb (0.1 Mb) to 1 Tb (10⁶ Mb). */
export const LOG_MIN = -1;
export const LOG_MAX = 6;
export const logPos = (mb: number) => (Math.log10(mb) - LOG_MIN) / (LOG_MAX - LOG_MIN);
export const logTicks = [
  { v: 0.1, label: '100 kb' }, { v: 1, label: '1 Mb' }, { v: 10, label: '10 Mb' }, { v: 100, label: '100 Mb' },
  { v: 1000, label: '1 Gb' }, { v: 10000, label: '10 Gb' }, { v: 100000, label: '100 Gb' }, { v: 1000000, label: '1 Tb' },
];

/** "580 kb", "4.6 Mb", "135 Mb", "3.1 Gb", "149 Gb". */
export function formatSize(mb: number): string {
  if (mb < 1) return `${Math.round(mb * 1000)} kb`;
  if (mb < 10) return `${mb.toFixed(1)} Mb`;
  if (mb < 1000) return `${Math.round(mb)} Mb`;
  const gb = mb / 1000;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} Gb`;
}

/** How many times larger (or smaller) than the human genome, as a phrase. */
export function versusHuman(mb: number): string {
  const r = mb / HUMAN_MB;
  if (Math.abs(r - 1) < 0.05) return 'the same size as the human genome';
  if (r > 1) return `about ${r >= 10 ? Math.round(r) : r.toFixed(1)} times the size of the human genome`;
  const inv = 1 / r;
  return `about 1/${inv >= 10 ? Math.round(inv) : inv.toFixed(1)} of the size of the human genome`;
}

export const sortedBySize = <T extends { mb: number }>(list: T[]) => [...list].sort((a, b) => a.mb - b.mb);
