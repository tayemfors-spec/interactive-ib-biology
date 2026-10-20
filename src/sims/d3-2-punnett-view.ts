/** Punnett grid and ratio markup for the monohybrid sim, shared by the server render and the browser. */
import {
  MODE_INFO, PARENT_GENOTYPES, allele, gametes, genotypeHtml, genotypeKey, genotypeText, grid, phenotype, ratioText, tally, type Mode,
} from './models/d3-2-punnett';

/** CSS hook for the coloured phenotype marker. */
export const phenoClass = (p: string) => p.replace(/[^a-z]+/gi, '-').replace(/-+$/, '').toLowerCase();

export function optionsHtml(mode: Mode, which: 'p1' | 'p2', selected: string): string {
  return PARENT_GENOTYPES[mode][which]
    .map((g) => {
      const key = genotypeKey(mode, g);
      return `<option value="${key}"${key === selected ? ' selected' : ''}>${genotypeText(mode, g).replace(/ /g, '')} (${phenotype(mode, g)})</option>`;
    })
    .join('');
}

export const findGenotype = (mode: Mode, which: 'p1' | 'p2', key: string) =>
  PARENT_GENOTYPES[mode][which].find((g) => genotypeKey(mode, g) === key) ?? PARENT_GENOTYPES[mode][which][0]!;

export function gridHtml(mode: Mode, p1: string[], p2: string[]): string {
  const info = MODE_INFO[mode];
  const cells = grid(mode, p1, p2);
  const g1 = gametes(p1), g2 = gametes(p2);
  const head = `<tr><td class="corner"><span class="corner-text">${info.p1.split(' (')[0]} ↓ · ${info.p2.split(' (')[0]} →</span></td>`
    + g2.map((a) => `<th scope="col"><span class="gam"><span>${allele(mode, a).html}</span></span></th>`).join('') + '</tr>';
  const rows = g1.map((a, r) => `<tr><th scope="row"><span class="gam"><span>${allele(mode, a).html}</span></span></th>`
    + cells.filter((c) => c.row === r).map((c) => `<td><span class="geno">${genotypeHtml(mode, c.genotype)}</span>`
      + `<span class="pheno"><span class="dot ph-${phenoClass(c.phenotype)}" aria-hidden="true"></span>${c.phenotype}</span></td>`).join('')
    + '</tr>').join('');
  return `<caption>Gametes of each parent along the edges; each box is one equally likely fertilization (probability ¼).</caption><thead>${head}</thead><tbody>${rows}</tbody>`;
}

export function ratiosHtml(mode: Mode, p1: string[], p2: string[]): string {
  const cells = grid(mode, p1, p2);
  const geno = tally(mode, cells, 'genotype');
  const pheno = tally(mode, cells, 'phenotype');
  const list = (t: ReturnType<typeof tally>) => t.map((x) => `<li><span class="n">${x.count}/4</span> ${x.label}</li>`).join('');
  return `<div><p class="rt">Genotype ratio <strong>${ratioText(geno)}</strong></p><ul>${list(geno)}</ul></div>`
    + `<div><p class="rt">Phenotype ratio <strong>${ratioText(pheno)}</strong></p><ul>${list(pheno)}</ul></div>`;
}

/** A sentence for the live region and for reasoning: what the cross shows. */
export function summary(mode: Mode, p1: string[], p2: string[]): string {
  const cells = grid(mode, p1, p2);
  const pheno = tally(mode, cells, 'phenotype');
  const parts = pheno.map((x) => `${x.count} in 4 ${x.label}`).join(', ');
  const p1t = genotypeText(mode, p1).replace(/ /g, ''), p2t = genotypeText(mode, p2).replace(/ /g, '');
  let s = `${p1t} × ${p2t}: ${parts}. Phenotype ratio ${ratioText(pheno)}.`;
  const g = (k: string) => cells.filter((c) => genotypeKey(mode, c.genotype) === k).length;
  if (mode === 'dominant' && g('Ss') > 0) s += ' Ss plants have smooth seeds, just like SS plants: one S allele makes enough of the starch-branching enzyme, so the s allele has no effect on the phenotype.';
  if (mode === 'incomplete' && g('CRCW') > 0) s += ' Heterozygotes are pink, intermediate between red and white: a single allele for red does not make enough red pigment for a full red colour.';
  if (mode === 'abo' && g('IAIB') > 0) s += ' Children with both the A and the B allele are group AB: both alleles are expressed, so their red cells carry both A and B antigens (codominance).';
  if (mode === 'sexlinked') {
    const sons = cells.filter((c) => c.genotype.includes('Y'));
    const affectedSons = sons.filter((c) => c.genotype.includes('Xh')).length;
    s += ` Of the sons, ${affectedSons} in ${sons.length} would have haemophilia; a son's X chromosome always comes from his mother.`;
  }
  return s;
}
