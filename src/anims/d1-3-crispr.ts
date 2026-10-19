import { ease, lerp, phase } from '../lib/timeline';

export const TOP_Y = 196; // upper (non-target) strand, 5′→3′ left to right
export const BOT_Y = 236; // lower (target) strand, 3′→5′ left to right
export const X0 = 28;
export const X1 = 492;
export const T0 = 180; // start of the 20-base target sequence
export const T1 = 340; // end of the target; the PAM follows on the upper strand
export const PAM_END = 364;
export const CUT = 316; // Cas9 cuts both strands 3 bases before the PAM
export const SPACER_Y = 218; // gRNA spacer when paired with the target strand
export const UNDOCK = -105; // vertical offset of the Cas9–gRNA complex before it binds
export const RUNGS: number[] = Array.from({ length: Math.floor((X1 - X0 - 8) / 8) + 1 }, (_, i) => X0 + 4 + i * 8);

const BULGE_A = T0 - 12;
const BULGE_B = T1 + 2;
/** Height of the displaced upper strand at x when the DNA is unwound by an amount b ∈ [0, 1]. */
export function topY(x: number, b: number): number {
  if (b <= 0 || x <= BULGE_A || x >= BULGE_B) return TOP_Y;
  const s = Math.sin((Math.PI * (x - BULGE_A)) / (BULGE_B - BULGE_A));
  return TOP_Y - 24 * b * Math.pow(s, 0.5);
}
export function strandPath(xa: number, xb: number, b: number, top: boolean): string {
  const pts: string[] = [];
  for (let x = xa; x < xb; x += 4) pts.push(`${x} ${(top ? topY(x, b) : BOT_Y).toFixed(1)}`);
  pts.push(`${xb} ${(top ? topY(xb, b) : BOT_Y).toFixed(1)}`);
  return `M${pts.join(' L')}`;
}

/**
 * Steps: 0 Cas9–gRNA complex; 1 binding at a PAM and base pairing; 2 double-strand cut;
 * 3 repair by NHEJ (knockout); 4 repair by HDR with a template (precise edit); 5 exa-cel example.
 */
export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const show = (el: SVGElement, o: number) => { el.style.opacity = o.toFixed(2); };
  const dna = q<SVGGElement>('dna');
  const left = q<SVGGElement>('left');
  const right = q<SVGGElement>('right');
  const paths = {
    lt: q<SVGPathElement>('lt'), lb: q<SVGPathElement>('lb'),
    rt: q<SVGPathElement>('rt'), rb: q<SVGPathElement>('rb'),
  };
  const rungs = [...svg.querySelectorAll<SVGLineElement>('[data-rung]')];
  const complex = q<SVGGElement>('complex');
  const spacerLbl = q<SVGGElement>('spacer-lbl');
  const pamLbl = q<SVGGElement>('pam-lbl');
  const cut = q<SVGGElement>('cut');
  const nhej = q<SVGGElement>('nhej');
  const hdr = q<SVGGElement>('hdr');
  const donor = q<SVGGElement>('donor');
  const edit = q<SVGGElement>('edit');
  const indel = q<SVGGElement>('indel');
  const app = q<SVGGElement>('app');

  /** b = how far the DNA is unwound; gap = how far the cut ends are pulled apart. */
  const drawDna = (b: number, gap: number) => {
    paths.lt.setAttribute('d', strandPath(X0, CUT, b, true));
    paths.lb.setAttribute('d', strandPath(X0, CUT, b, false));
    paths.rt.setAttribute('d', strandPath(CUT, X1, b, true));
    paths.rb.setAttribute('d', strandPath(CUT, X1, b, false));
    rungs.forEach((r) => {
      const x = Number(r.dataset.rung);
      const inTarget = x > T0 && x < T1;
      r.setAttribute('y1', (inTarget ? lerp(TOP_Y, SPACER_Y + 2, b) : topY(x, b)).toFixed(1));
    });
    left.setAttribute('transform', `translate(${(-gap).toFixed(1)} 0)`);
    right.setAttribute('transform', `translate(${gap.toFixed(1)} 0)`);
  };
  const place = (dock: number, o = 1) => {
    complex.setAttribute('transform', `translate(0 ${lerp(UNDOCK, 0, dock).toFixed(1)})`);
    show(complex, o);
  };

  function render(index: number, t: number) {
    [cut, nhej, hdr, donor, edit, indel].forEach((g) => show(g, 0));
    show(app, 0);
    show(dna, 1);
    show(spacerLbl, 0);
    show(pamLbl, 1);
    switch (index) {
      case 0: { // guide RNA and Cas9 form a complex, above the DNA
        place(0, 1);
        show(spacerLbl, ease(phase(t, 0.3, 0.6)));
        drawDna(0, 0);
        break;
      }
      case 1: { // Cas9 binds the PAM, unwinds the DNA; the spacer pairs with the target strand
        const d = ease(phase(t, 0, 0.45));
        const b = ease(phase(t, 0.4, 0.8));
        place(d);
        drawDna(b, 0);
        break;
      }
      case 2: { // both strands cut, 3 bases upstream of the PAM
        place(1);
        drawDna(1, lerp(0, 6, ease(phase(t, 0.3, 0.7))));
        show(cut, ease(phase(t, 0.25, 0.5)));
        break;
      }
      case 3: { // NHEJ: Cas9 leaves; the ends are rejoined, often with a small insertion or deletion
        const leave = ease(phase(t, 0, 0.3));
        place(1 - leave, 1 - leave);
        const b = 1 - ease(phase(t, 0.1, 0.4));
        const gap = t < 0.55 ? lerp(6, 10, ease(phase(t, 0.2, 0.45))) : lerp(10, 0, ease(phase(t, 0.55, 0.8)));
        drawDna(b, gap);
        show(indel, ease(phase(t, 0.75, 0.9)));
        show(nhej, ease(phase(t, 0.3, 0.6)));
        show(pamLbl, 1 - leave);
        break;
      }
      case 4: { // HDR: a template with the desired sequence is copied, giving a precise edit
        place(0, 0);
        show(pamLbl, 0);
        show(hdr, ease(phase(t, 0, 0.25)));
        const dn = ease(phase(t, 0.1, 0.4));
        donor.setAttribute('transform', `translate(0 ${lerp(-30, 0, dn).toFixed(1)})`);
        show(donor, t < 0.85 ? dn : lerp(1, 0.35, ease(phase(t, 0.85, 1))));
        drawDna(0, lerp(10, 0, ease(phase(t, 0.45, 0.75))));
        show(edit, ease(phase(t, 0.6, 0.85)));
        break;
      }
      default: { // application: exa-cel
        place(0, 0);
        show(dna, 0);
        drawDna(0, 0);
        show(app, 1);
        show(pamLbl, 0);
        const boxes = [...app.querySelectorAll<SVGGElement>('[data-box]')];
        boxes.forEach((g, i) => show(g, ease(phase(t, i * 0.18, i * 0.18 + 0.2))));
      }
    }
  }

  render(0, 0);
  return { render, durations: [4.5, 6, 4.5, 6.5, 6.5, 7] };
}
