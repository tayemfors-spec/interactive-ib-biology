import { ease, lerp, phase } from '../lib/timeline';

/** Elbow joint: the forearm rotates about this point when the biceps contracts. */
export const ELBOW: [number, number] = [110, 262];
const FINGER: [number, number] = [268, 270];
const RECEPTOR_LEAD: [number, number] = [262, 274];
const LIFT = -35; // degrees; negative = anticlockwise (hand moves up, away from the flame)

const toCord = 'C104 118, 120 104, 146 104 C 202 106, 262 178, 300 196 C 308 172, 314 150, 330 143 L 362 141 L 396 146';
export const PATHS = {
  trunk: 'M110 134 C110 114, 124 104, 148 104 C 204 106, 262 176, 300 196',
  sensoryFixed: `M112 270 L104 260 L104 140 ${toCord}`,
  sensoryFull: `M${FINGER[0]} ${FINGER[1]} L112 270 L104 260 L104 140 ${toCord}`,
  relay: 'M396 146 C 410 158, 412 186, 392 208',
  motor: 'M392 208 L 356 210 C 334 210, 312 204, 300 196 C 262 176, 204 106, 148 106 C 128 106, 118 114, 118 132 L 118 160 L 124 166',
  ascending: 'M403 140 C 410 136, 414 134, 420 131 C 440 122, 452 110, 458 96 L 470 70',
};

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const NS = 'http://www.w3.org/2000/svg';
  // invisible guide paths along which the impulse travels
  const guide = (d: string) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'none');
    svg.appendChild(p);
    return p;
  };
  const route = [guide(PATHS.sensoryFull), guide(PATHS.relay), guide(PATHS.motor), guide(PATHS.ascending)];
  const lengths = route.map((p) => p.getTotalLength());
  const dot = el<SVGCircleElement>('impulse');
  const ring = el<SVGCircleElement>('ring');
  const moveDot = (r: number, u: number) => {
    const pt = route[r]!.getPointAtLength(lengths[r]! * u);
    dot.setAttribute('cx', pt.x.toFixed(1));
    dot.setAttribute('cy', pt.y.toFixed(1));
  };
  const rot = ([x, y]: [number, number], deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180, dx = x - ELBOW[0], dy = y - ELBOW[1];
    return [ELBOW[0] + dx * Math.cos(a) - dy * Math.sin(a), ELBOW[1] + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  const active = { 1: 'sensory', 2: 'relay', 3: 'motor', 5: 'ascending' } as Record<number, string>;

  function render(index: number, t: number) {
    // labels: each step reveals its own group, and earlier groups stay visible
    for (let k = 1; k <= 5; k++) {
      el(`lab-${k}`).style.opacity = String(index > k ? 1 : index === k ? ease(phase(t, 0, 0.3)) : 0);
    }
    for (const k of ['sensory', 'relay', 'motor', 'ascending']) el(k).classList.toggle('active', Object.values(active).includes(k) && active[index] === k);

    // stimulus: a pulse at the free nerve endings
    ring.style.opacity = index === 0 ? String(0.9 * (1 - phase(t, 0.6, 1)) * ease(phase(t, 0, 0.3))) : '0';
    ring.setAttribute('r', (8 + 10 * (index === 0 ? t : 0)).toFixed(1));

    // the impulse travels along one neuron per step
    const u = ease(phase(t, 0.05, 0.95));
    if (index === 0) { moveDot(0, 0); dot.style.opacity = String(ease(phase(t, 0.3, 0.7))); }
    else if (index === 1) { moveDot(0, u); dot.style.opacity = '1'; }
    else if (index === 2) { moveDot(1, u); dot.style.opacity = '1'; }
    else if (index === 3) { moveDot(2, u); dot.style.opacity = '1'; }
    else if (index === 4) { moveDot(2, 1); dot.style.opacity = String(1 - phase(t, 0, 0.3)); }
    else { moveDot(3, u); dot.style.opacity = '1'; }

    // effector: the biceps contracts and the forearm flexes at the elbow, lifting the hand away
    const lift = index < 4 ? 0 : index === 4 ? ease(phase(t, 0.2, 0.9)) : 1;
    const ang = lerp(0, LIFT, lift);
    el('forearm').setAttribute('transform', `rotate(${ang.toFixed(2)} ${ELBOW[0]} ${ELBOW[1]})`);
    el('biceps').setAttribute('transform', `translate(120 194) scale(${(1 + 0.6 * lift).toFixed(3)} ${(1 - 0.12 * lift).toFixed(3)}) translate(-120 -194)`);
    const tip = rot(RECEPTOR_LEAD, ang);
    el('lead-receptor').setAttribute('d', `M226 318 L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`);

    // conscious awareness: the brain receives the signal last
    el('brain').classList.toggle('lit', index === 5 && t > 0.9);
  }
  render(0, 0);
  return { render, durations: [2.5, 3.5, 2.5, 3.5, 3, 3.5] };
}
