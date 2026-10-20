import { ease, lerp, phase } from '../lib/timeline';

/*
 * Steps: 0 pre-mRNA · 1 5′ cap added · 2 poly-A tail added · 3 introns removed, exons joined ·
 * 4 alternative splicing gives a second mature mRNA (exon 3 left out) and so a second polypeptide.
 */
const Y = 96;
const PRE = { e1: 50, e2: 180, e3: 290, e4: 390, i1: 120, i2: 240, i3: 340, tail: 450, three: 454 };
const JOIN = { e1: 50, e2: 120, e3: 180, e4: 230, tail: 290, three: 290 };

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const at = (k: string, x: number, y = Y, op = 1) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = String(op);
  };
  const show = (k: string, op: number) => { el(k).style.opacity = String(op); };
  const textAt = (k: string, x: number) => el(k).setAttribute('x', x.toFixed(1));

  function render(index: number, t: number) {
    const cap = index === 0 ? 0 : index === 1 ? ease(phase(t, 0.1, 0.7)) : 1;
    const tail = index < 2 ? 0 : index === 2 ? ease(phase(t, 0.1, 0.7)) : 1;
    const join = index < 3 ? 0 : index === 3 ? ease(phase(t, 0.35, 1)) : 1;
    const lift = index < 3 ? 0 : index === 3 ? ease(phase(t, 0, 0.45)) : 1;
    // the cap: a modified guanine nucleotide added to the 5′ end (it drops on from above)
    at('cap', 38, Y - 30 * (1 - cap), cap);
    // exons slide together once the introns have been cut out
    for (const k of ['e1', 'e2', 'e3', 'e4'] as const) at(k, lerp(PRE[k], JOIN[k], join));
    // introns lift out and fade (they are broken down in the nucleus)
    (['i1', 'i2', 'i3'] as const).forEach((k, n) => at(k, PRE[k] + 6 * lift, Y - (46 + 6 * n) * lift, 1 - phase(lift, 0.35, 1)));
    const tx = lerp(PRE.tail, JOIN.tail, join);
    at('tail', tx + 20 * (1 - tail), Y, tail);
    textAt('three', lerp(PRE.three, JOIN.three, join) + 4 + 46 * tail);
    show('lblPre', index < 3 ? 1 : index === 3 ? 1 - phase(t, 0.3, 0.6) : 0);
    show('lblMature', index === 3 ? ease(phase(t, 0.6, 1)) : 0);
    show('lblV1', index === 4 ? 1 : 0);
    show('introNote', index === 3 ? ease(phase(t, 0.2, 0.5)) : 0);
    show('v2', index === 4 ? ease(phase(t, 0, 0.5)) : 0);
    show('prot', index === 4 ? ease(phase(t, 0.45, 0.9)) : 0);
  }
  render(0, 0);
  return { render, durations: [3, 3, 3, 5, 5] };
}
