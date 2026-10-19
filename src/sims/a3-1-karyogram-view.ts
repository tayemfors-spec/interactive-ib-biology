/** HTML for the karyogram sorter, shared by the server render and the browser re-render. */
import { chromSvg } from './a3-1-chrom-draw';
import { describeChrom, typeById, type Chromosome } from './models/a3-1-karyogram';

/** Drawing scale: px per Mb (chromosome 1 ≈ 100 px tall). */
export const PX_PER_MB = 0.4;

export const chromHeight = (c: Chromosome) => typeById.get(c.type)!.mb * PX_PER_MB;
export const pArm = (c: Chromosome) => chromHeight(c) * typeById.get(c.type)!.ci;

export function chromButton(c: Chromosome, opts: { selected: boolean; tabbable: boolean; offset?: number; where: string }): string {
  const t = typeById.get(c.type)!;
  const label = `Chromosome ${opts.where}: ${describeChrom(t)}`;
  const style = opts.offset ? ` style="margin-top:${opts.offset.toFixed(1)}px"` : '';
  return `<button type="button" class="chrom" data-uid="${c.uid}" aria-pressed="${opts.selected}" tabindex="${opts.tabbable ? 0 : -1}" aria-label="${label}"${style}>${chromSvg({ h: chromHeight(c), ci: t.ci, bands: t.bands })}</button>`;
}

/** Chromosomes in one slot, offset so their centromeres line up, as in a real karyogram. */
export function slotContents(placed: Chromosome[], selected: string | null, tabbable: string | null, slotName: string): string {
  const maxP = Math.max(0, ...placed.map(pArm));
  return placed
    .map((c) => chromButton(c, { selected: c.uid === selected, tabbable: c.uid === tabbable, offset: maxP - pArm(c), where: `in ${slotName}` }))
    .join('');
}
