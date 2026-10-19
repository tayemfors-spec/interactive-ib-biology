/**
 * SVG markup for the B3.1 stomatal-density sim: a circular field of view of leaf epidermis, and a
 * small chart of the density estimates. Shared by the server render and the browser update.
 * Colours come from global classes styled by src/sims/b3-1-stomata.astro.
 */
import { STOMA_LENGTH_MM, density, fieldArea, mean, type Stoma } from './models/b3-1-stomata';

export const FIELD = { size: 360, r: 168 };
const C = FIELD.size / 2;
const f1 = (n: number) => n.toFixed(1);

/** The field of view at diameter `d` mm. Stomata carry data-i so the reader can tick them off. */
export function fieldMarkup(stomata: Stoma[], d: number, ticked: Set<number> = new Set()): string {
  const k = (2 * FIELD.r) / d; // px per mm
  const L = STOMA_LENGTH_MM * k;
  const tile = 0.08 * k; // pavement cells ≈ 80 µm × 40 µm
  const s = tile / 100;
  const cells =
    `<defs><pattern id="sd-cells" patternUnits="userSpaceOnUse" width="${f1(tile)}" height="${f1(tile)}" patternTransform="translate(${C} ${C})">` +
    `<g transform="scale(${s.toFixed(4)})"><path class="cellwall" d="M0 0 C12 -8 25 8 37 0 S62 -8 75 0 S100 8 100 0 M0 50 C12 40 25 60 37 50 S62 40 75 50 S100 60 100 50 M0 100 C12 92 25 108 37 100 S62 92 75 100 S100 108 100 100 ` +
    `M25 0 C17 12 33 25 25 37 S30 45 25 50 M75 50 C67 62 83 75 75 87 S80 95 75 100" /></g></pattern>` +
    `<clipPath id="sd-clip"><circle cx="${C}" cy="${C}" r="${FIELD.r}" /></clipPath></defs>`;
  const stomataSvg = stomata.map((st, i) => {
    const x = C + st.x * k, y = C + st.y * k;
    return `<g class="stoma${ticked.has(i) ? ' ticked' : ''}" data-i="${i}" transform="translate(${f1(x)} ${f1(y)}) rotate(${st.angle.toFixed(0)})">` +
      `<ellipse class="guard" cx="0" cy="${f1(-L * 0.16)}" rx="${f1(L / 2)}" ry="${f1(L * 0.2)}" />` +
      `<ellipse class="guard" cx="0" cy="${f1(L * 0.16)}" rx="${f1(L / 2)}" ry="${f1(L * 0.2)}" />` +
      `<ellipse class="pore" cx="0" cy="0" rx="${f1(L * 0.3)}" ry="${f1(L * 0.055)}" />` +
      `<circle class="tick" cx="0" cy="0" r="${f1(L * 0.62)}" /></g>`;
  }).join('');
  const bar = 0.05 * k;
  return cells +
    `<circle class="field-bg" cx="${C}" cy="${C}" r="${FIELD.r}" />` +
    `<g clip-path="url(#sd-clip)"><rect x="0" y="0" width="${FIELD.size}" height="${FIELD.size}" fill="url(#sd-cells)" />${stomataSvg}</g>` +
    `<circle class="field-edge" cx="${C}" cy="${C}" r="${FIELD.r}" />` +
    `<g class="bar"><path d="M${f1(FIELD.size - 8 - bar)} ${FIELD.size - 14} h${f1(bar)}" /><text x="${FIELD.size - 8}" y="${FIELD.size - 22}" text-anchor="end">50 µm</text></g>` +
    `<text class="diam" x="4" y="16">field diameter</text><text class="diam" x="4" y="34">${d.toFixed(2)} mm</text>`;
}

/** Chart of the density from each single field (dots) and the running mean (line). */
export function resultsMarkup(counts: number[], d: number, leafAverage: number): string {
  const W = 360, H = 200, l = 50, r = 12, t = 14, b = 40;
  const area = fieldArea(d);
  const each = counts.map((c) => density(c, area));
  const maxN = Math.max(10, counts.length);
  const yMax = Math.ceil(Math.max(leafAverage * 1.8, ...each, 1) / 50) * 50;
  const X = (i: number) => l + ((i - 0.5) / maxN) * (W - l - r);
  const Y = (v: number) => H - b - (v / yMax) * (H - t - b);
  const ticks = [0, yMax / 2, yMax];
  const run = each.map((_, i) => mean(each.slice(0, i + 1)));
  const parts = [
    `<g class="r-grid">${ticks.map((v) => `<line x1="${l}" x2="${W - r}" y1="${f1(Y(v))}" y2="${f1(Y(v))}" /><text x="${l - 6}" y="${f1(Y(v))}" dy="0.35em" text-anchor="end">${v}</text>`).join('')}</g>`,
    `<text class="r-axis" x="${(l + W - r) / 2}" y="${H - 8}" text-anchor="middle">Field of view number →</text>`,
    `<text class="r-axis" transform="translate(13 ${(t + H - b) / 2}) rotate(-90)" text-anchor="middle">Stomata per mm²</text>`,
    `<line class="r-true" x1="${l}" x2="${W - r}" y1="${f1(Y(leafAverage))}" y2="${f1(Y(leafAverage))}" />`,
    `<text class="r-note" x="${W - r - 2}" y="${f1(Y(leafAverage) - 6)}" text-anchor="end">leaf average (unknown in a real investigation)</text>`,
  ];
  if (run.length > 1) parts.push(`<path class="r-run" d="${run.map((v, i) => `${i ? 'L' : 'M'}${f1(X(i + 1))} ${f1(Y(v))}`).join('')}" />`);
  parts.push(each.map((v, i) => `<circle class="r-dot" cx="${f1(X(i + 1))}" cy="${f1(Y(v))}" r="4.5" />`).join(''));
  if (!counts.length) parts.push(`<text class="r-note" x="${(l + W - r) / 2}" y="${H - b - 12}" text-anchor="middle">Record some fields to see how the estimate changes</text>`);
  return parts.join('');
}
