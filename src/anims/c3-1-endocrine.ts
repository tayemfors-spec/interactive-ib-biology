import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
/** Epinephrine leaves the adrenal glands (first point) and is carried in the blood to these destinations. */
export const EP: XY[] = [[60, 228], [94, 172], [50, 160], [72, 206], [80, 330]];

const POST = [
  'M472 64 C 466 90, 440 106, 436 130 C 434 160, 452 180, 462 204 L466 250 L466 308 L452 308',
  'M504 76 C 494 100, 448 112, 442 134 C 440 160, 456 182, 472 210 L466 250 L466 308 L486 308',
];
const REL = [
  'M300 66 C 310 96, 352 108, 382 122 L386 124 C 386 150, 374 172, 362 200 L 352 204',
  'M334 80 C 344 100, 366 110, 388 124 L386 126 C 386 150, 374 172, 362 200 L 370 206',
];
const ANT = ['M346 252 L360 262 L360 308 L332 308', 'M374 252 L360 262 L360 308 L392 308'];

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const NS = 'http://www.w3.org/2000/svg';
  const guide = (d: string) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'none');
    svg.appendChild(p);
    return { p, len: p.getTotalLength() };
  };
  const post = POST.map(guide), rel = REL.map(guide), ant = ANT.map(guide);
  const place = (k: string, g: { p: SVGPathElement; len: number }, u: number, op: number) => {
    const c = el<SVGCircleElement>(k);
    const pt = g.p.getPointAtLength(g.len * Math.max(0, Math.min(1, u)));
    c.setAttribute('cx', pt.x.toFixed(1)); c.setAttribute('cy', pt.y.toFixed(1));
    c.style.opacity = String(op);
  };
  const show = (k: string, v: number) => (el(k).style.opacity = String(v));
  const hot: Record<number, string[]> = {
    0: ['hypo', 'pit'], 1: ['hypo', 'pit'], 2: ['hypo', 'pit'], 3: ['hypo', 'pit', 'thyroid'], 4: ['pineal', 'hypo'], 5: ['adrenal'],
  };

  function render(index: number, t: number) {
    for (const g of ['pineal', 'hypo', 'pit', 'thyroid', 'adrenal']) el(`g-${g}`).classList.toggle('hot', hot[index]!.includes(g));
    const fadeIn = ease(phase(t, 0, 0.25));
    show('p-hp', index <= 3 ? 1 : 0);
    show('p-mel', index === 4 ? fadeIn : 0);
    show('p-epi', index === 5 ? fadeIn : 0);

    // posterior pituitary: hormones made in the hypothalamus travel down axons and enter the blood
    const uPost = index < 1 ? 0 : index === 1 ? ease(phase(t, 0.05, 0.95)) : 1;
    post.forEach((g, i) => place(`ph${i}`, g, uPost - i * 0.04, index >= 1 && index <= 3 ? 1 : 0));
    show('l-post', index < 1 ? 0 : index === 1 ? ease(phase(t, 0.6, 1)) : 1);

    // anterior pituitary: releasing hormones in portal vessels, then pituitary hormones into the blood
    const uRel = index < 2 ? 0 : index === 2 ? ease(phase(t, 0.05, 0.55)) : 1;
    const uAnt = index < 2 ? 0 : index === 2 ? ease(phase(t, 0.6, 1)) : 1;
    rel.forEach((g, i) => place(`rh${i}`, g, uRel - i * 0.04, index >= 2 && index <= 3 ? (uAnt > 0 ? 0.45 : 1) : 0));
    ant.forEach((g, i) => place(`ah${i}`, g, uAnt, index >= 2 && index <= 3 && uAnt > 0 ? 1 : 0));
    show('l-portal', index < 2 ? 0 : index === 2 ? ease(phase(t, 0.2, 0.6)) : 1);

    // target gland and negative feedback
    const fb = index === 3 ? ease(phase(t, 0.1, 0.6)) : 0;
    show('l-fb', fb);
    show('b-tsh', fb);

    // melatonin: light reaching the eyes suppresses secretion
    show('b-light', index === 4 ? fadeIn : 0);

    // epinephrine is carried in the blood to many organs
    const uE = index === 5 ? ease(phase(t, 0.15, 0.95)) : 0;
    EP.slice(1).forEach(([x, y], i) => {
      const c = el<SVGCircleElement>(`e${i}`);
      c.setAttribute('cx', lerp(EP[0]![0], x, uE).toFixed(1));
      c.setAttribute('cy', lerp(EP[0]![1], y, uE).toFixed(1));
      c.style.opacity = index === 5 ? String(ease(phase(t, 0, 0.15))) : '0';
    });
  }
  render(0, 0);
  return { render, durations: [3, 4, 4.5, 3.5, 3.5, 3.5] };
}
