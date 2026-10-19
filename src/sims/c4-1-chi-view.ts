/** Quadrat grid, tables and verdict text for the chi-squared sim, shared by server and browser. */
import { CRITICAL_05_DF1, chiSquared, contributions, expected, smallExpected, totals, verdict, type Table } from './models/c4-1-chi';
import { mulberry32, sampleIndices } from './models/c4-1-rng';

export const COLS = 10, CELL = 50;

/** Quadrats drawn as a grid; which quadrat holds which combination is shuffled with a seed. */
export function gridSvg(o: Table, seed: number): { svg: string; h: number } {
  const kinds: string[] = [
    ...Array<string>(o.both).fill('AB'), ...Array<string>(o.aOnly).fill('A'),
    ...Array<string>(o.bOnly).fill('B'), ...Array<string>(o.neither).fill(''),
  ];
  const order = sampleIndices(mulberry32(seed), kinds.length, kinds.length);
  const rows = Math.max(1, Math.ceil(kinds.length / COLS));
  let s = '';
  order.forEach((k, i) => {
    const x = (i % COLS) * CELL + 2, y = Math.floor(i / COLS) * CELL + 2;
    const kind = kinds[k]!;
    s += `<rect class="cell" x="${x}" y="${y}" width="${CELL - 4}" height="${CELL - 4}" rx="4"/>`;
    if (kind.includes('A')) s += `<circle class="sa" cx="${x + 14}" cy="${y + 14}" r="10"/><text class="lt" x="${x + 14}" y="${y + 14}" dy="0.35em" text-anchor="middle">A</text>`;
    if (kind.includes('B')) s += `<rect class="sb" x="${x + 25}" y="${y + 25}" width="19" height="19" rx="3"/><text class="lt" x="${x + 34.5}" y="${y + 34.5}" dy="0.35em" text-anchor="middle">B</text>`;
  });
  return { svg: s, h: rows * CELL + 4 };
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

export function expectedRows(o: Table): string {
  const e = expected(o), c = contributions(o), t = totals(o);
  return `<tr><th scope="row">B present</th><td>${f2(e.both)}</td><td>${f2(e.bOnly)}</td><td>${t.bPresent}</td></tr>`
    + `<tr><th scope="row">B absent</th><td>${f2(e.aOnly)}</td><td>${f2(e.neither)}</td><td>${t.bAbsent}</td></tr>`
    + `<tr class="tot"><th scope="row">Column total</th><td>${t.aPresent}</td><td>${t.aAbsent}</td><td>${t.grand}</td></tr>`
    + `<tr class="contrib"><th scope="row">(O − E)² ÷ E</th><td colspan="3">${f2(c.both)} + ${f2(c.bOnly)} + ${f2(c.aOnly)} + ${f2(c.neither)}</td></tr>`;
}

export function verdictText(o: Table): string {
  const t = totals(o);
  if (t.grand === 0) return 'Enter the numbers of quadrats in each category.';
  if (t.aPresent === 0 || t.aAbsent === 0 || t.bPresent === 0 || t.bAbsent === 0) return 'A row or column total is zero, so expected values cannot be calculated. Every row and column needs at least one quadrat.';
  const x2 = chiSquared(o), v = verdict(o);
  let s = `χ² = ${f2(x2)}, degrees of freedom = (2 − 1)(2 − 1) = 1, critical value at p = 0.05 = 3.84. `;
  if (v === 'none') s += `${f2(x2)} is not greater than 3.84, so the null hypothesis (the species are distributed independently) is not rejected: there is no significant association.`;
  else if (v === 'negative') s += `${f2(x2)} > 3.84, so the null hypothesis is rejected (p < 0.05). The species occur together in ${o.both} quadrats, fewer than the ${f1(expected(o).both)} expected: a negative association. This is consistent with interspecific competition, but the species might simply need different habitats.`;
  else s += `${f2(x2)} > 3.84, so the null hypothesis is rejected (p < 0.05). The species occur together in ${o.both} quadrats, more than the ${f1(expected(o).both)} expected: a positive association. They may share habitat requirements or benefit from each other.`;
  if (smallExpected(o)) s += ' Caution: at least one expected value is below 5, so the test is unreliable; sample more quadrats.';
  return s;
}

export { CRITICAL_05_DF1 };
