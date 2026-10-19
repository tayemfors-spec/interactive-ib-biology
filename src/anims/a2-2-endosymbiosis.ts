import { ease, lerp, phase } from '../lib/timeline';

/*
 * A2.2.12 endosymbiosis. The host cell outline is drawn from an ellipse with up to two inward "pockets"
 * (endocytosis). Positions are absolute for every (step, t), so stepping backwards and seeking are exact.
 */
export const HOST = { cx: 210, cy: 182, rx: 162, ry: 122 };
export const NUC = { cx: 160, cy: 188, r: 40 };
export const A = { start: [478, 92] as const, mouth: [336, 132] as const, inside: [282, 138] as const, copy: [300, 214] as const, angle: -0.45 };
export const CY = { start: [486, 282] as const, mouth: [344, 238] as const, inside: [252, 268] as const, angle: 0.55 };

/** Host outline with inward pockets: depth is a fraction of the radius at that angle. */
export function hostPath(pockets: { angle: number; depth: number }[] = []): string {
  const n = 120;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    let k = 1;
    for (const p of pockets) {
      let dt = th - p.angle;
      dt = Math.atan2(Math.sin(dt), Math.cos(dt));
      k -= p.depth * Math.exp(-((dt / 0.26) ** 2));
    }
    const x = HOST.cx + HOST.rx * Math.cos(th) * k;
    const y = HOST.cy + HOST.ry * Math.sin(th) * k;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

type XY = readonly [number, number];
const mix = (a: XY, b: XY, u: number): [number, number] => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

export function create(svg: SVGSVGElement) {
  const q = <T extends Element>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const host = q<SVGPathElement>('host');
  const els = {
    bactA: q<SVGGElement>('bactA'), vesA: q<SVGEllipseElement>('vesA'),
    bactB: q<SVGGElement>('bactB'), vesB: q<SVGEllipseElement>('vesB'),
    cyano: q<SVGGElement>('cyano'), vesC: q<SVGEllipseElement>('vesC'),
    atp: q<SVGGElement>('atp'), genes: q<SVGGElement>('genes'), evidence: q<SVGGElement>('evidence'),
    lblA: q<SVGTextElement>('lblA'), lblC: q<SVGTextElement>('lblC'), lblMito: q<SVGTextElement>('lblMito'), lblChl: q<SVGTextElement>('lblChl'),
  };
  const cristae = [...svg.querySelectorAll<SVGElement>('[data-cristae]')];
  const grana = svg.querySelector<SVGElement>('[data-grana]')!;
  const proof = [...svg.querySelectorAll<SVGElement>('[data-proof]')];
  const place = (g: SVGGraphicsElement, p: XY, s = 1, sx = s) => g.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) scale(${sx.toFixed(3)} ${s.toFixed(3)})`);
  const show = (el: SVGElement, o: number) => { el.style.opacity = o.toFixed(3); };

  function render(i: number, t: number) {
    // ----- aerobic bacterium → mitochondrion -----
    let pa: XY = A.start, dA = 0, vA = 0, stretch = 1;
    if (i === 1) {
      const u1 = ease(phase(t, 0, 0.45));
      pa = mix(A.start, A.mouth, u1);
      dA = t < 0.45 ? 0.3 * u1 : 0.3 * (1 - ease(phase(t, 0.45, 0.72)));
      vA = ease(phase(t, 0.45, 0.72));
      if (t > 0.72) pa = mix(A.mouth, A.inside, ease(phase(t, 0.72, 1)));
    } else if (i >= 2) { pa = A.inside; vA = 1; }
    // binary fission inside the host (step 3), then both are mitochondria
    let pb: XY = A.inside, showB = 0;
    if (i === 2) {
      stretch = t < 0.45 ? 1 + 0.45 * ease(phase(t, 0.15, 0.45)) : 1 + 0.45 * (1 - ease(phase(t, 0.45, 0.7)));
      if (t > 0.45) { showB = 1; pb = mix(A.inside, A.copy, ease(phase(t, 0.45, 0.9))); }
    } else if (i > 2) { showB = 1; pb = A.copy; }
    place(els.bactA, pa, 1, stretch);
    place(els.vesA, pa, 1, stretch);
    show(els.vesA, vA);
    place(els.bactB, pb); place(els.vesB, pb);
    show(els.bactB, showB); show(els.vesB, showB);
    show(els.lblA, i === 0 ? 1 : i === 1 ? 1 - phase(t, 0, 0.3) : 0);
    show(els.atp, i === 2 ? ease(phase(t, 0, 0.25)) : i === 3 ? 1 - phase(t, 0, 0.2) : 0);
    const cr = i < 3 ? 0 : i === 3 ? ease(phase(t, 0.1, 0.55)) : 1;
    cristae.forEach((c) => show(c, cr));
    show(els.genes, i === 3 ? ease(phase(t, 0.35, 0.65)) : 0);
    show(els.lblMito, i < 3 ? 0 : i === 3 ? ease(phase(t, 0.55, 0.85)) : 1);

    // ----- cyanobacterium → chloroplast -----
    let pc: XY = CY.start, dC = 0, vC = 0, cOn = 0;
    if (i === 4) {
      cOn = ease(phase(t, 0, 0.12));
      const u1 = ease(phase(t, 0.08, 0.45));
      pc = mix(CY.start, CY.mouth, u1);
      dC = t < 0.45 ? 0.3 * u1 : 0.3 * (1 - ease(phase(t, 0.45, 0.7)));
      vC = ease(phase(t, 0.45, 0.7));
      if (t > 0.7) pc = mix(CY.mouth, CY.inside, ease(phase(t, 0.7, 1)));
    } else if (i > 4) { pc = CY.inside; vC = 1; cOn = 1; }
    place(els.cyano, pc); place(els.vesC, pc);
    show(els.cyano, cOn); show(els.vesC, vC);
    show(grana, i < 4 ? 0 : i === 4 ? ease(phase(t, 0.75, 1)) : 1);
    show(els.lblC, i === 4 ? 1 - phase(t, 0.35, 0.55) : 0);
    show(els.lblChl, i < 4 ? 0 : i === 4 ? ease(phase(t, 0.8, 1)) : 1);

    host.setAttribute('d', hostPath([{ angle: A.angle, depth: dA }, { angle: CY.angle, depth: dC }]));

    // ----- evidence -----
    const ev = i === 5 ? ease(phase(t, 0, 0.35)) : 0;
    show(els.evidence, ev);
    proof.forEach((p) => p.classList.toggle('on', i === 5 && t > 0.2));
  }
  render(0, 0);
  return { render, durations: [3.5, 5, 5, 4.5, 5.5, 5] };
}
