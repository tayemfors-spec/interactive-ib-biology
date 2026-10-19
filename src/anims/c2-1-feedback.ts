import { ease, lerp, phase } from '../lib/timeline';

/*
 * Steps 0–2: negative feedback (thyroxine). Steps 3–5: positive feedback (oestradiol and the LH surge).
 * The graph is drawn up to the current point; arrow widths show how much of each hormone is secreted.
 */
const GX = 312, GY = 252, GW = 192, GH = 176;

/** Thyroxine level (0–1, set point 0.5) through the negative-feedback episode, u ∈ [0, 1]. */
const negLevel = (u: number) => {
  if (u < 1 / 3) return 0.5 + 0.02 * Math.sin(u * 40);
  if (u < 2 / 3) { const v = (u - 1 / 3) * 3; return 0.5 + 0.3 * Math.sin(Math.PI * Math.min(1, v * 1.15)); }
  const v = (u - 2 / 3) * 3;
  return 0.5 - 0.3 * Math.sin(Math.PI * Math.min(1, v * 1.15));
};
/** LH level (0–1) through the positive-feedback episode, u ∈ [0, 1]. */
const posLevel = (u: number) => {
  if (u < 1 / 3) return 0.1 + 0.12 * (u * 3);
  if (u < 2 / 3) { const v = (u - 1 / 3) * 3; return 0.22 + 0.73 * v ** 2.6; }
  const v = (u - 2 / 3) * 3;
  return v < 0.12 ? 0.95 : 0.95 - 0.8 * ease((v - 0.12) / 0.6);
};

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const text = (k: string, s: string) => { if (el(k).textContent !== s) el(k).textContent = s; };
  const width = (k: string, w: number) => el(k).setAttribute('stroke-width', w.toFixed(1));
  const px = (u: number) => GX + u * GW;
  const py = (l: number) => GY - l * GH;

  function render(index: number, t: number) {
    const neg = index < 3;
    const local = index % 3;
    const u = (local + t) / 3;
    const level = neg ? negLevel : posLevel;

    text('title', neg ? 'Negative feedback: thyroxine' : 'Positive feedback: oestradiol and LH');
    text('l1', neg ? 'TRH' : 'GnRH');
    text('l2', neg ? 'TSH' : 'LH');
    text('g3', neg ? 'Thyroid gland' : 'Ovary (follicles)');
    text('prod', neg ? 'Thyroxine' : 'Oestradiol');
    text('sign', neg ? '−' : '+');
    text('fbt', neg ? 'inhibits' : 'stimulates');
    text('ylab', neg ? 'thyroxine level →' : 'LH level →');
    text('rule', neg
      ? 'More product → less production; less product → more production'
      : 'More product → more production: a rapid rise to a peak');
    el('fbk').setAttribute('class', `fbk ${neg ? 'neg' : 'pos'}`);
    el('setp').style.opacity = neg ? '1' : '0';
    el('setpt').style.opacity = neg ? '1' : '0';

    // graph, drawn up to the current point
    let d = '';
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const uu = (u * i) / n;
      d += `${i ? 'L' : 'M'}${px(uu).toFixed(1)} ${py(level(uu)).toFixed(1)}`;
    }
    el('curve').setAttribute('d', d);
    el('dot').setAttribute('cx', px(u).toFixed(1));
    el('dot').setAttribute('cy', py(level(u)).toFixed(1));

    // arrow widths: how much of each hormone is being secreted (the key state is held to the end of the step)
    const k = ease(phase(t, 0, 0.45));
    let w1 = 5, w3 = 5, fb = 0.9;
    if (neg) {
      // high thyroxine: less TRH and TSH, so less thyroxine; low thyroxine: the reverse
      if (local === 1) { w1 = lerp(5, 1.6, k); w3 = w1; }
      if (local === 2) { w1 = lerp(5, 9, k); w3 = w1; }
      fb = local === 1 ? 1 : local === 2 ? 0.35 : 0.7;
    } else {
      if (local === 0) { w1 = lerp(3, 5, k); w3 = lerp(3, 5, k); fb = 0.7; }
      if (local === 1) { w1 = lerp(5, 10, k); w3 = lerp(5, 10, k); fb = 1; }
      if (local === 2) { const off = ease(phase(t, 0.15, 0.7)); w1 = lerp(10, 2, off); w3 = lerp(10, 2, off); fb = lerp(1, 0.12, off); }
    }
    width('a1', w1);
    width('a2', w1);
    width('a3', w3);
    el('fbk').style.opacity = fb.toFixed(2);
    el('ovu').style.opacity = !neg && local === 2 ? String(ease(phase(t, 0, 0.25))) : '0';
  }
  render(0, 0);
  return { render, durations: [4, 6, 6, 5, 6, 6] };
}
