import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const VES: XY[] = [[312, 238], [334, 268], [306, 298], [340, 318]];
const MEM: XY[] = [[262, 236], [262, 266], [262, 296], [262, 326]];
// ADH route: pituitary → down into the vessel → along to the kidney → out to the receptor
const ROUTE: XY[] = [[190, 124], [190, 150], [520, 150], [520, 200], [426, 262]];
const GAUGE = { low: 300, set: 405, high: 510 };

/** Point at fraction u (0–1) along a polyline. */
function along(pts: XY[], u: number): XY {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let d = Math.max(0, Math.min(1, u)) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]! || i === seg.length - 1) { const k = seg[i] ? d / seg[i]! : 0; return [lerp(pts[i]![0], pts[i + 1]![0], k), lerp(pts[i]![1], pts[i + 1]![1], k)]; }
    d -= seg[i]!;
  }
  return pts[pts.length - 1]!;
}

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const move = (k: string, [x, y]: XY, opacity = 1) => { el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); el(k).style.opacity = String(opacity); };
  const text = (k: string, s: string) => (el(k).textContent = s);

  function render(index: number, t: number) {
    const e = ease(t);
    // blood solute concentration (gauge) and osmoreceptor volume
    let g = GAUGE.set;
    if (index === 0) g = lerp(GAUGE.set, GAUGE.high, ease(phase(t, 0, 0.5)));
    else if (index === 1 || index === 2) g = GAUGE.high;
    else if (index === 3) g = lerp(GAUGE.high, GAUGE.set, ease(phase(t, 0.3, 1)));
    else if (index === 4) g = lerp(GAUGE.set, GAUGE.low, ease(phase(t, 0, 0.5)));
    else g = lerp(GAUGE.low, GAUGE.set, ease(phase(t, 0.3, 1)));
    el('needle').setAttribute('cx', g.toFixed(1));
    const r = 18 - (g - GAUGE.set) * 0.05; // water leaves the osmoreceptor when blood is concentrated
    el('osmo').setAttribute('r', r.toFixed(1));
    text('osmo-note', g > GAUGE.set + 20 ? 'loses water, shrinks' : g < GAUGE.set - 20 ? 'gains water, swells' : 'volume normal');

    // ADH: released in step 2, reaches receptors and stays bound during steps 3–4; little ADH in 5–6
    const adhOn = index >= 1 && index <= 3;
    for (let i = 0; i < 6; i++) {
      let u = 0;
      if (index === 1) u = Math.max(0, Math.min(1, e * 1.4 - i * 0.08));
      else if (index === 2 || index === 3) u = 1;
      const p = along(ROUTE, u);
      const spread: XY = u >= 1 ? [p[0] + (i % 3) * 9 - 9, p[1] + Math.floor(i / 3) * 14 - 7] : p;
      const fade = index === 4 ? 1 - ease(phase(t, 0, 0.4)) : adhOn ? (index === 1 ? Math.min(1, u * 8) : 1) : 0;
      move(`adh${i}`, index === 4 ? along(ROUTE, 1) : spread, fade);
    }
    text('adh-note', index === 1 ? 'more ADH secreted' : index === 2 || index === 3 ? 'ADH carried in blood' : index >= 4 ? 'less ADH secreted' : 'no extra ADH');

    // aquaporins: in vesicles (0) or in the membrane facing the filtrate (1)
    let inMem = 0;
    if (index === 2) inMem = e;
    else if (index === 3 || index === 4) inMem = 1;
    else if (index === 5) inMem = 1 - e;
    VES.forEach((v, i) => {
      const k = Math.max(0, Math.min(1, inMem * 1.3 - i * 0.1));
      move(`aq${i}`, [lerp(v[0], MEM[i]![0], k), lerp(v[1], MEM[i]![1], k)]);
      el(`ves${i}`).style.opacity = String(1 - ease(phase(k, 0.75, 1)));
    });
    text('aq-note', inMem > 0.9 ? 'aquaporins in membrane' : inMem > 0.05 ? (index === 5 ? 'endocytosis' : 'vesicles fusing') : 'aquaporins in vesicles');

    // water: through aquaporins into the cell and out into the medulla (step 4 a lot; step 6 very little)
    const flow = index === 3 ? 8 : index === 5 ? 1 : 0;
    for (let i = 0; i < 8; i++) {
      if (i >= flow) { el(`w${i}`).style.opacity = '0'; continue; }
      const u = (t * 2 + i / 8) % 1;
      const y = MEM[i % 4]![1] + (i > 3 ? 6 : -6);
      const x = u < 0.5 ? lerp(232, 262, u * 2) : lerp(262, 470, (u - 0.5) * 2);
      el(`w${i}`).setAttribute('cx', x.toFixed(1));
      el(`w${i}`).setAttribute('cy', y.toFixed(1));
      el(`w${i}`).style.opacity = t > 0.97 && index === 3 ? '0.9' : '1';
    }
    const [u1, u2] = index === 3 ? ['urine: small volume,', 'concentrated'] : index === 5 ? ['urine: large volume,', 'dilute'] : ['urine:', index === 2 ? 'volume falling' : index === 4 ? 'about to increase' : 'normal volume'];
    text('urine1', u1); text('urine2', u2);
  }
  render(0, 0);
  return { render, durations: [4, 4.5, 4.5, 5, 4, 5] };
}
