/**
 * The 20 amino acids coded for in the genetic code, grouped by the chemistry of their R groups (B1.2.6,
 * B1.2.9, B1.2.10). Classification follows the common textbook scheme (e.g. Campbell Biology) at pH 7;
 * some books place glycine, cysteine, tyrosine or histidine differently. Side-chain pKa values are
 * approximate values for free amino acids; in a folded protein they shift with the surroundings.
 * IB does not require the names of particular amino acids (except cysteine): they are here as examples.
 */
export type AAClass = 'non-polar' | 'polar' | 'acidic' | 'basic';

export interface AminoAcid {
  code: string; // three-letter
  letter: string;
  name: string;
  cls: AAClass;
  /** Condensed R group. */
  r: string;
  /** Side-chain pKa, for groups that gain or lose H⁺ near physiological pH. */
  pKa?: number;
  note?: string;
}

export const aminoAcids: AminoAcid[] = [
  { code: 'Gly', letter: 'G', name: 'Glycine', cls: 'non-polar', r: '–H', note: 'The smallest R group: just a hydrogen atom. It lets the chain bend sharply and fits where nothing else can, such as every third position in collagen.' },
  { code: 'Ala', letter: 'A', name: 'Alanine', cls: 'non-polar', r: '–CH₃' },
  { code: 'Val', letter: 'V', name: 'Valine', cls: 'non-polar', r: '–CH(CH₃)₂' },
  { code: 'Leu', letter: 'L', name: 'Leucine', cls: 'non-polar', r: '–CH₂CH(CH₃)₂' },
  { code: 'Ile', letter: 'I', name: 'Isoleucine', cls: 'non-polar', r: '–CH(CH₃)CH₂CH₃' },
  { code: 'Met', letter: 'M', name: 'Methionine', cls: 'non-polar', r: '–CH₂CH₂–S–CH₃', note: 'Contains sulfur, but cannot form disulfide bonds because its S is not in an –SH group.' },
  { code: 'Phe', letter: 'F', name: 'Phenylalanine', cls: 'non-polar', r: '–CH₂–C₆H₅ (ring)' },
  { code: 'Trp', letter: 'W', name: 'Tryptophan', cls: 'non-polar', r: '–CH₂–indole (two rings)', note: 'The largest R group.' },
  { code: 'Pro', letter: 'P', name: 'Proline', cls: 'non-polar', r: 'ring joined back to the amine N', note: 'Its R group bonds back to the backbone nitrogen, making a rigid kink. Proline breaks α-helices and is common in collagen.' },
  { code: 'Ser', letter: 'S', name: 'Serine', cls: 'polar', r: '–CH₂OH' },
  { code: 'Thr', letter: 'T', name: 'Threonine', cls: 'polar', r: '–CH(OH)CH₃' },
  { code: 'Cys', letter: 'C', name: 'Cysteine', cls: 'polar', r: '–CH₂–SH', note: 'Two cysteines brought together by folding can form a covalent disulfide bond (–S–S–) between their R groups. Some books class cysteine as non-polar.' },
  { code: 'Tyr', letter: 'Y', name: 'Tyrosine', cls: 'polar', r: '–CH₂–C₆H₄–OH (ring)' },
  { code: 'Asn', letter: 'N', name: 'Asparagine', cls: 'polar', r: '–CH₂–CONH₂' },
  { code: 'Gln', letter: 'Q', name: 'Glutamine', cls: 'polar', r: '–CH₂CH₂–CONH₂' },
  { code: 'Asp', letter: 'D', name: 'Aspartic acid', cls: 'acidic', r: '–CH₂–COOH', pKa: 3.9 },
  { code: 'Glu', letter: 'E', name: 'Glutamic acid', cls: 'acidic', r: '–CH₂CH₂–COOH', pKa: 4.1 },
  { code: 'Lys', letter: 'K', name: 'Lysine', cls: 'basic', r: '–(CH₂)₄–NH₂', pKa: 10.5 },
  { code: 'Arg', letter: 'R', name: 'Arginine', cls: 'basic', r: '–(CH₂)₃–NH–C(=NH)–NH₂', pKa: 12.5 },
  { code: 'His', letter: 'H', name: 'Histidine', cls: 'basic', r: '–CH₂–imidazole (ring)', pKa: 6.0, note: 'Its pKa is close to 7, so at pH 7 only some histidine R groups carry a positive charge.' },
];

/** Average charge (−1 to +1) of an R group at a given pH (Henderson–Hasselbalch). */
export function charge(aa: AminoAcid, pH: number): number {
  if (aa.pKa === undefined) return 0;
  if (aa.cls === 'acidic') return -1 / (1 + 10 ** (aa.pKa - pH)); // –COOH ⇌ –COO⁻ + H⁺
  return 1 / (1 + 10 ** (pH - aa.pKa)); // –NH₂ + H⁺ ⇌ –NH₃⁺
}

/**
 * Short charge marker for a button: '+' or '−' when at least 95% of these R groups carry the charge,
 * '(+)' or '(−)' when only some do (5–95%), '' when almost none do. Uses the same bands as chargeText.
 */
export function chargeSign(aa: AminoAcid, pH: number): string {
  if (aa.pKa === undefined) return '';
  const pct = Math.round(Math.abs(charge(aa, pH)) * 100);
  const s = aa.cls === 'acidic' ? '−' : '+';
  return pct >= 95 ? s : pct <= 5 ? '' : `(${s})`;
}

export function chargeText(aa: AminoAcid, pH: number): string {
  const q = charge(aa, pH);
  if (aa.pKa === undefined) return 'uncharged';
  const pct = Math.round(Math.abs(q) * 100);
  if (aa.cls === 'acidic') {
    if (pct >= 95) return 'negative (–COO⁻): it has lost H⁺';
    if (pct <= 5) return 'uncharged (–COOH): the low pH keeps H⁺ on the group';
    return `partly negative (about ${pct}% of these R groups have lost H⁺)`;
  }
  if (pct >= 95) return 'positive (–NH₃⁺ or similar): it has gained H⁺';
  if (pct <= 5) return 'uncharged: at this high pH it has lost its extra H⁺';
  return `partly positive (about ${pct}% of these R groups have gained H⁺)`;
}

export const classInfo: Record<AAClass, { label: string; short: string; summary: string }> = {
  'non-polar': { label: 'Non-polar (hydrophobic)', short: 'non-polar', summary: 'Mostly C and H, so it cannot form hydrogen bonds with water. Hydrophobic R groups cluster together away from water (hydrophobic interactions).' },
  polar: { label: 'Polar, uncharged (hydrophilic)', short: 'polar', summary: 'Contains –OH, –SH or –CONH₂ groups that form hydrogen bonds with water and with other polar R groups.' },
  acidic: { label: 'Acidic (hydrophilic, charged)', short: 'acidic', summary: 'Its –COOH group gives up H⁺ to become –COO⁻, so at pH 7 the R group is negatively charged and can form ionic bonds with positively charged R groups.' },
  basic: { label: 'Basic (hydrophilic, charged)', short: 'basic', summary: 'Its amine group accepts H⁺ (for example –NH₂ → –NH₃⁺), so at pH 7 the R group is usually positively charged and can form ionic bonds with negatively charged R groups.' },
};

/** Bonds and interactions an R group of this kind can take part in, within a folded protein. */
export function interactions(aa: AminoAcid): string[] {
  const out: string[] = [];
  if (aa.cls === 'non-polar') out.push('hydrophobic interactions with other non-polar R groups');
  if (aa.cls === 'polar') out.push('hydrogen bonds with water and other polar R groups');
  if (aa.cls === 'acidic' || aa.cls === 'basic') out.push(`ionic bonds with ${aa.cls === 'acidic' ? 'positively' : 'negatively'} charged R groups`, 'hydrogen bonds with water and polar R groups');
  if (aa.code === 'Cys') out.push('disulfide bonds (covalent) with another cysteine');
  if (aa.code === 'Gly') out.splice(0, 1, 'too small to interact much: gives the chain flexibility');
  return out;
}

export type Place = 'buried' | 'exposed' | 'either';
/** Where an R group of this kind tends to be in a water-soluble globular protein and in an integral membrane protein. */
export function whereFound(aa: AminoAcid): { globular: Place; membrane: Place; text: string } {
  if (aa.code === 'Gly' || aa.code === 'Pro') {
    return { globular: 'either', membrane: 'either', text: 'Found in many positions, often in tight turns at the surface; being small (glycine) or rigid (proline) matters more than polarity.' };
  }
  if (aa.cls === 'non-polar') {
    return { globular: 'buried', membrane: 'buried', text: 'In a water-soluble globular protein it is usually buried in the hydrophobic core. In an integral membrane protein it is common in the parts that sit in the bilayer, facing the fatty acid tails.' };
  }
  return { globular: 'exposed', membrane: 'exposed', text: 'Usually on the surface of a globular protein, in contact with water, which helps the protein dissolve. In a membrane protein it is found in the parts that project into the water on either side, or lining a water-filled channel.' };
}
