/**
 * SVG markup for a schematic metaphase chromosome (two sister chromatids joined at the centromere,
 * with dark bands). Shared by the karyogram sim (server render and browser) and the chromosome 2 figure.
 * Colours come from CSS classes defined by the caller: .chromatid, .band, .cen (and optional .tel, .cen-off).
 */
import type { Band } from './models/a3-1-karyogram';

export interface ChromDraw {
  /** Total height in px. */
  h: number;
  /** Centromere index (short arm ÷ length). */
  ci: number;
  bands: readonly Band[];
  /** Chromatid width in px (default 6). */
  cw?: number;
}

/** Inner SVG elements (no <svg> wrapper), drawn with the p-arm tip at (x, y). Width = 2·cw + 2. */
export function chromShapes({ h, ci, bands, cw = 6 }: ChromDraw, x = 0, y = 0): string {
  const gap = 2;
  const cy = h * ci;
  const neck = Math.min(2, h * 0.04);
  const pLen = Math.max(1, cy - neck);
  const qTop = cy + neck;
  const qLen = Math.max(1, h - qTop);
  const rxP = Math.min(cw / 2, pLen / 2);
  const rxQ = Math.min(cw / 2, qLen / 2);
  const f = (v: number) => v.toFixed(1);
  let s = '';
  for (const cx of [x, x + cw + gap]) {
    s += `<rect class="chromatid" x="${f(cx)}" y="${f(y)}" width="${cw}" height="${f(pLen)}" rx="${f(rxP)}"/>`;
    s += `<rect class="chromatid" x="${f(cx)}" y="${f(y + qTop)}" width="${cw}" height="${f(qLen)}" rx="${f(rxQ)}"/>`;
    for (const [b0, b1] of bands) {
      // keep bands inside the arm they belong to, clear of the rounded tips
      const inP = b1 * h <= cy;
      const lo = inP ? rxP * 0.6 : qTop + rxQ * 0.6;
      const hi = inP ? pLen - 0.5 : h - rxQ * 0.6;
      const y0 = Math.max(lo, b0 * h);
      const y1 = Math.min(hi, b1 * h);
      if (y1 - y0 > 0.6) s += `<rect class="band" x="${f(cx + 0.6)}" y="${f(y + y0)}" width="${f(cw - 1.2)}" height="${f(y1 - y0)}"/>`;
    }
  }
  s += `<rect class="cen" x="${f(x + cw / 2)}" y="${f(y + cy - neck - 0.5)}" width="${cw + gap}" height="${f(2 * neck + 1)}" rx="1"/>`;
  return s;
}

export const chromWidth = (cw = 6) => 2 * cw + 2;

/** A complete, decorative <svg> for one chromosome. */
export function chromSvg(d: ChromDraw): string {
  const w = chromWidth(d.cw);
  return `<svg class="chrom-svg" width="${w}" height="${d.h.toFixed(1)}" viewBox="0 0 ${w} ${d.h.toFixed(1)}" aria-hidden="true" focusable="false">${chromShapes(d)}</svg>`;
}
