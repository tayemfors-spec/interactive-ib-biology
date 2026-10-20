/** Markup for the dihybrid cross and chi-squared sim, shared by the server render and the browser. */
import {
  CRITICAL_05_DF3, chiSquared, expected, genesFor, heteroGametes, nullRatio, phenoName, punnett, recombinationFrequency, type CrossKind,
} from './models/d3-2-dihybrid';

const pct = (p: number) => `${(p * 100).toFixed(p * 100 % 1 === 0 ? 0 : 1)}%`;

export const parentsText: Record<CrossKind, string> = {
  f2: 'F1 × F1: RrYy (round, yellow) × RrYy (round, yellow), genes on different chromosomes',
  test: 'Test cross: RrYy (round, yellow) × rryy (wrinkled, green), genes on different chromosomes',
  linked: 'Test cross: GgLl female (grey, long wings) × ggll male (black, vestigial), genes linked on one chromosome',
};

export function gridHtml(kind: CrossKind, r: number): string {
  const genes = genesFor(kind);
  const { rows, cols, cells } = punnett(kind, r);
  const gam = heteroGametes(genes, kind === 'linked' ? r : null);
  const hdr = `<tr><td class="corner">gametes</td>${cols.map((c) => `<th scope="col"><span class="gam">${c}</span>${kind === 'f2' ? '<span class="gp">¼</span>' : '<span class="gp">all</span>'}</th>`).join('')}</tr>`;
  const body = rows.map((rg) => {
    const g = gam.find((x) => x.g === rg)!;
    const mark = kind !== 'f2' && g.recombinant ? ' <span class="rec">recombinant</span>' : '';
    return `<tr><th scope="row"><span class="gam">${rg}</span><span class="gp">${pct(g.p)}</span>${mark}</th>`
      + cells.filter((c) => c.row === rg).map((c) => `<td class="k${c.cls}${kind !== 'f2' && g.recombinant ? ' is-rec' : ''}"><span class="geno">${c.genotype}</span><span class="ph">${phenoName(genes, c.cls)}</span></td>`).join('')
      + '</tr>';
  }).join('');
  return `<caption>Gametes of the double heterozygote down the side${kind === 'f2' ? ' and along the top' : '; the double recessive parent makes only one type of gamete'}. Percentages are the proportion of gametes of each type.</caption><thead>${hdr}</thead><tbody>${body}</tbody>`;
}

export function expectedText(kind: CrossKind, r: number): string {
  if (kind === 'f2') return 'Expected phenotype ratio 9 : 3 : 3 : 1. Each of the 16 boxes is equally likely; 9 contain at least one R and one Y.';
  if (kind === 'test') return 'Expected phenotype ratio 1 : 1 : 1 : 1, the same as the ratio of the four gamete types, because the double recessive parent contributes only r and y.';
  const parental = ((1 - r) / 2) * 100, rec = (r / 2) * 100;
  return `With ${Math.round(r * 100)}% recombination: about ${parental.toFixed(1)}% of each parental type (grey long, black vestigial) and ${rec.toFixed(1)}% of each recombinant type (grey vestigial, black long). Independent assortment would predict 25% of each.`;
}

export interface ChiRow { name: string; o: number; e: number; c: number }

export function chiRows(kind: CrossKind, observed: number[]): ChiRow[] {
  const genes = genesFor(kind);
  const total = observed.reduce((a, b) => a + b, 0);
  const e = expected(kind, total);
  return observed.map((o, i) => ({ name: phenoName(genes, i), o, e: e[i]!, c: e[i]! > 0 ? (o - e[i]!) ** 2 / e[i]! : 0 }));
}

export function chiBody(kind: CrossKind, observed: number[]): string {
  const rows = chiRows(kind, observed);
  const tot = observed.reduce((a, b) => a + b, 0);
  return rows.map((r, i) => `<tr><th scope="row">${r.name}</th><td><input type="number" min="0" max="5000" value="${r.o}" data-obs="${i}" aria-label="Observed number: ${r.name}" /></td><td>${r.e.toFixed(2)}</td><td>${r.c.toFixed(2)}</td></tr>`).join('')
    + `<tr class="tot"><th scope="row">Total</th><td data-total>${tot}</td><td>${tot}</td><td>χ² = ${chiSquared(observed, rows.map((r) => r.e)).toFixed(2)}</td></tr>`;
}

export function verdict(kind: CrossKind, observed: number[]): string {
  const total = observed.reduce((a, b) => a + b, 0);
  if (total === 0) return 'Enter the observed numbers of offspring in each phenotype class.';
  const e = expected(kind, total);
  const x2 = chiSquared(observed, e);
  const ratio = nullRatio(kind).join(' : ');
  let s = `H₀: the genes assort independently, so the offspring fit a ${ratio} ratio. χ² = ${x2.toFixed(2)}; degrees of freedom = 4 − 1 = 3; critical value at p = 0.05 = ${CRITICAL_05_DF3}. `;
  if (x2 > CRITICAL_05_DF3) {
    s += `${x2.toFixed(2)} > ${CRITICAL_05_DF3}, so H₀ is rejected: the difference from ${ratio} is statistically significant (p < 0.05).`;
    if (kind !== 'f2') s += ' Parental types are more common than recombinants, which suggests that the genes are linked.';
  } else {
    s += `${x2.toFixed(2)} ≤ ${CRITICAL_05_DF3}, so H₀ is not rejected: the differences from ${ratio} can be explained by chance.`;
  }
  if (kind !== 'f2') s += ` Recombinant frequency = recombinants ÷ total = ${(observed[1]! + observed[2]!)} ÷ ${total} = ${(recombinationFrequency(observed) * 100).toFixed(1)}%.`;
  if (e.some((x) => x < 5)) s += ' Caution: an expected value is below 5, so the test is unreliable with this sample size.';
  return s;
}
