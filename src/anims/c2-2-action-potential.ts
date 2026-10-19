import { ease, lerp, phase } from '../lib/timeline';
import { AP, apX, apY } from './c2-2-ap-geometry';
import { REGION_DELAY, STEP_WINDOWS, membranePotential, naChannel } from '../sims/models/c2-2-action-potential';

type XY = [number, number];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const { mem, ch, ions } = AP;
  const at = (k: string, [x, y]: XY) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  /** Position along a polyline at u ∈ [0, 1]. */
  const along = (pts: XY[], u: number): XY => {
    const k = Math.max(0, Math.min(0.9999, u)) * (pts.length - 1);
    const i = Math.floor(k);
    return mix(pts[i]!, pts[i + 1]!, k - i);
  };
  /** A route through a channel at x: outside → inside (dir 1) or inside → outside (dir −1). */
  const through = (from: XY, to: XY, x: number, dir: 1 | -1): XY[] =>
    dir === 1 ? [from, [x, mem.top - 14], [x, mem.bottom + 14], to] : [from, [x, mem.bottom + 14], [x, mem.top - 14], to];

  const setChannel = (key: string, cx: number, open: number) => {
    const gap = 14 * open;
    el(key).querySelectorAll<SVGRectElement>('rect').forEach((r) => {
      const i = Number(r.dataset.half);
      r.setAttribute('x', String(i === 0 ? cx - 12 - gap / 2 : cx + gap / 2));
    });
  };
  const naOpen = (tau: number) => phase(tau, 1.52, 1.6) * (1 - phase(tau, 3.4, 3.5));
  const kOpen = (tau: number) => phase(tau, 2.1, 2.2) * (1 - phase(tau, 3.5, 3.6));

  const charges = (n: number, v: number) => {
    let out = '+ + + + +', inn = '− − − − −';
    if (v < -75) { out = '+ + + + + +'; inn = '− − − − − −'; }
    else if (v >= 0) { out = '− − − − −'; inn = '+ + + + +'; }
    else if (v > -56) { out = '+ +'; inn = '− −'; }
    el(`cOut${n}`).textContent = out;
    el(`cIn${n}`).textContent = inn;
  };

  const tracePath = (until: number, shift: number) => {
    let d = '';
    for (let t = 0; t <= until + 1e-9; t += 0.02) d += `${d ? 'L' : 'M'}${apX(t).toFixed(1)} ${apY(membranePotential(t - shift)).toFixed(1)}`;
    return d || `M${apX(0)} ${apY(-70)}`;
  };

  function render(index: number, t: number) {
    const [w0, w1] = STEP_WINDOWS[index]!;
    const now = lerp(w0, w1, t);
    const t3 = now - REGION_DELAY;
    const v2 = membranePotential(now);
    const v3 = membranePotential(t3);

    // ---- membrane state ----
    setChannel('na2', ch.na2, naOpen(now));
    setChannel('na3', ch.na3, naOpen(t3));
    setChannel('k2', ch.k2, kOpen(now));
    setChannel('k3', ch.k3, kOpen(t3));
    el('inact2').style.opacity = naChannel(now) === 'inactivated' ? '1' : '0';
    el('inact3').style.opacity = naChannel(t3) === 'inactivated' ? '1' : '0';
    charges(1, -70);
    charges(2, v2);
    charges(3, v3);
    const ref = el('refractory');
    ref.textContent = index === 5 ? 'refractory period' : '';
    ref.style.opacity = index === 5 ? String(ease(phase(t, 0.3, 0.7))) : '0';
    el('lc').style.opacity = index === 3 ? String(ease(phase(t, 0, 0.25))) : '0';

    // ---- ions ----
    ions.naA.forEach((p, i) => {
      let pos: XY = p.start;
      if (index === 2) pos = along(through(p.start, p.inside, ch.na2 - 3 + i * 3, 1), ease(phase(t, 0.05 + i * 0.1, 0.65 + i * 0.1)));
      else if (index === 3) pos = mix(p.inside, p.far, ease(phase(t, 0.1, 0.95)));
      else if (index > 3) pos = p.far;
      at(`naA${i}`, pos);
    });
    ions.naO.forEach((p, i) => at(`naO${i}`, index < 3 ? p.start : index === 3 ? mix(p.start, p.end, ease(phase(t, 0.1, 0.95))) : p.end));
    ions.naB.forEach((p, i) => at(`naB${i}`, index < 4 ? p.start : index === 4 ? along(through(p.start, p.end, ch.na3 - 2 + i * 4, 1), ease(phase(t, 0.05 + i * 0.12, 0.6 + i * 0.12))) : p.end));
    ions.kA.forEach((p, i) => {
      const step = i < 3 ? 4 : 5;
      const u = i < 3 ? ease(phase(t, 0.15 + i * 0.1, 0.7 + i * 0.1)) : ease(phase(t, 0.1, 0.75));
      at(`kA${i}`, index < step ? p.start : index === step ? along(through(p.start, p.end, ch.k2 - 3 + (i % 3) * 3, -1), u) : p.end);
    });
    ions.kB.forEach((p, i) => at(`kB${i}`, index < 5 ? p.start : index === 5 ? along(through(p.start, p.end, ch.k3 - 2 + i * 4, -1), ease(phase(t, 0.2 + i * 0.1, 0.8 + i * 0.1))) : p.end));
    // Na⁺/K⁺ pump: one cycle in the resting step, another during recovery
    ions.pNa.forEach((p, i) => at(`pNa${i}`, index === 0 ? along(through(p.start, p.end, ch.pump - 6 + i * 6, -1), ease(phase(t, 0.05 + i * 0.08, 0.5 + i * 0.08))) : p.end));
    ions.pK.forEach((p, i) => at(`pK${i}`, index === 0 ? along(through(p.start, p.end, ch.pump - 4 + i * 8, 1), ease(phase(t, 0.5 + i * 0.1, 0.9 + i * 0.05))) : p.end));
    ions.qNa.forEach((p, i) => at(`qNa${i}`, index < 6 ? p.start : along(through(p.start, p.end, ch.pump - 6 + i * 6, -1), ease(phase(t, 0.3 + i * 0.07, 0.65 + i * 0.07)))));
    ions.qK.forEach((p, i) => at(`qK${i}`, index < 6 ? p.start : along(through(p.start, p.end, ch.pump - 4 + i * 8, 1), ease(phase(t, 0.62 + i * 0.08, 0.92 + i * 0.08)))));

    // ---- oscilloscope ----
    el('trace2').setAttribute('d', tracePath(now, 0));
    const tr3 = el('trace3');
    tr3.setAttribute('d', index >= 3 ? tracePath(now, REGION_DELAY) : '');
    const dot = el('dot');
    dot.setAttribute('cx', apX(now).toFixed(1));
    dot.setAttribute('cy', apY(v2).toFixed(1));
    el('readout').textContent = `region 2: ${v2 >= 0 ? '+' : '−'}${Math.abs(Math.round(v2))} mV`;
  }

  render(0, 0);
  return { render, durations: [5, 4, 3.5, 4.5, 4.5, 4.5, 5] };
}
