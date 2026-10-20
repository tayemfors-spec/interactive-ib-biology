import { ease, lerp, phase } from '../lib/timeline';

/*
 * Steps: 0 small subunit + initiator tRNA bind at the 5′ end · 1 move to the start codon, anticodon pairs ·
 * 2 large subunit joins (initiator tRNA in the P site) · 3 second tRNA enters the A site ·
 * 4 peptide bond: Met joined to Ala, chain now on the A-site tRNA · 5 translocation one codon towards 3′ ·
 * 6 empty tRNA leaves from the E site; the next tRNA enters the A site.
 */
const cx = (k: number) => 127 + 54 * k;
const LEADER_X = 63;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const at = (k: string, x: number, y: number, op = 1) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = String(op);
  };
  const show = (k: string, op: number) => { el(k).style.opacity = String(op); };

  function render(index: number, t: number) {
    // ribosome position (x of the P site)
    let X = cx(0);
    if (index === 0) X = LEADER_X;
    if (index === 1) X = lerp(LEADER_X, cx(0), ease(phase(t, 0, 0.6)));
    if (index === 5) X = lerp(cx(0), cx(1), ease(phase(t, 0.1, 0.9)));
    if (index === 6) X = cx(1);
    const smallIn = index === 0 ? ease(phase(t, 0, 0.7)) : 1;
    at('small', X, 70 * (1 - smallIn));
    const large = index < 2 ? 0 : index === 2 ? ease(phase(t, 0, 0.8)) : 1;
    at('large', X, -140 * (1 - large), large);
    at('sites', X, 0, large);

    // initiator tRNA: rides on the small subunit, raised, until it pairs with AUG
    const pair0 = index === 0 ? 0 : index === 1 ? ease(phase(t, 0.65, 0.9)) : 1;
    const leave0 = index === 6 ? ease(phase(t, 0, 0.5)) : 0;
    const x0 = index <= 1 ? X : cx(0);
    const y0 = (index === 0 ? 70 * (1 - smallIn) : 0) - 14 * (1 - pair0);
    at('t0', x0 - 60 * leave0, y0 - 100 * leave0, 1 - leave0);
    show('hb0', pair0 > 0.98 && leave0 === 0 ? 1 : 0);

    // second tRNA (Ala) into the A site
    const in1 = index < 3 ? 0 : index === 3 ? ease(phase(t, 0, 0.75)) : 1;
    at('t1', cx(1) + 60 * (1 - in1), -100 * (1 - in1), in1);
    show('hb1', in1 > 0.98 ? 1 : 0);
    // third tRNA (Phe) into the new A site
    const in2 = index === 6 ? ease(phase(t, 0.4, 1)) : 0;
    at('t2', cx(2) + 60 * (1 - in2), -100 * (1 - in2), in2);
    show('hb2', in2 > 0.98 ? 1 : 0);

    // methionine: on tRNA0 until the peptide bond forms, then on top of alanine
    const bond = index < 4 ? 0 : index === 4 ? ease(phase(t, 0.1, 0.7)) : 1;
    const mx = lerp(x0, cx(1), bond);
    const my = lerp(116 + y0, 78, bond);
    at('met', mx, my);
    show('metLink', 1 - bond);
    show('pb', index >= 4 && bond > 0.95 ? 1 : 0);
    show('pbt', index === 4 && bond > 0.95 ? 1 : 0);
  }
  render(0, 0);
  return { render, durations: [3, 4, 3, 3.5, 3.5, 4, 4] };
}
