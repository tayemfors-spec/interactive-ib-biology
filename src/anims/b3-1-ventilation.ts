import { ease, lerp, phase } from '../lib/timeline';

/*
 * B3.1.5 ventilation: front view of the thorax, synced to a lung-volume trace and a trace of the
 * pressure in the lungs relative to atmospheric pressure.
 *   0 inspiration (external intercostals + diaphragm contract)
 *   1 expiration at rest (muscles relax; elastic recoil — passive)
 *   2 forced breathing: a deep breath in, then forced expiration (internal intercostals + abdominal muscles)
 * Pressure in the lungs is drawn proportional to −dV/dt (airflow × airway resistance): below
 * atmospheric while air flows in, above it while air flows out, atmospheric when flow stops.
 */

export const CX = 140;
export const DURATIONS = [4, 4, 8];
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);
export const RIB_Y = [104, 132, 160, 188, 216, 244, 272];
export const RIB_W = [56, 74, 88, 96, 100, 98, 92];
export const FRC = 2.3; // dm³ in the lungs at the end of a quiet expiration

export interface Pose { w: number; lift: number; apex: number }
export const REST: Pose = { w: 1, lift: 0, apex: 262 };
const INSPIRED: Pose = { w: 1.06, lift: 8, apex: 292 };
const DEEP: Pose = { w: 1.1, lift: 13, apex: 306 };
const FORCED_OUT: Pose = { w: 0.96, lift: -6, apex: 240 };

const mixPose = (a: Pose, b: Pose, u: number): Pose => ({ w: lerp(a.w, b.w, u), lift: lerp(a.lift, b.lift, u), apex: lerp(a.apex, b.apex, u) });

/** y of the diaphragm at x for a pose: a quadratic dome between the lower edges of the rib cage. */
function diaphragmY(p: Pose, x: number) {
  const half = 100 * p.w;
  const edge = 312 - p.lift * 0.6;
  const s = (x - (CX - half)) / (2 * half);
  const c = 2 * p.apex - edge;
  return (1 - s) ** 2 * edge + 2 * (1 - s) * s * c + s ** 2 * edge;
}

export function thoraxShapes(p: Pose) {
  const half = 100 * p.w;
  const edge = 312 - p.lift * 0.6;
  const diaphragm = `M${(CX - half).toFixed(1)} ${edge.toFixed(1)} Q${CX} ${(2 * p.apex - edge).toFixed(1)} ${(CX + half).toFixed(1)} ${edge.toFixed(1)}`;
  const lung = (sign: 1 | -1) => {
    const X = (dx: number) => (CX + sign * dx).toFixed(1);
    const top = 64 - p.lift * 0.6;
    const outer = 92 * p.w;
    const pts: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const dx = outer - (i / 10) * (outer - 16);
      pts.push(`L${X(dx)} ${(diaphragmY(p, CX + sign * dx) - 7).toFixed(1)}`);
    }
    return `M${X(20)} ${(top + 8).toFixed(1)} C${X(56)} ${(top - 8).toFixed(1)} ${X(outer - 4)} ${(top + 26).toFixed(1)} ${X(outer)} ${(top + 84).toFixed(1)} ${pts.join(' ')} L${X(16)} 128 Z`;
  };
  const ribs = `translate(${(CX * (1 - p.w)).toFixed(2)} ${(-p.lift).toFixed(2)}) scale(${p.w.toFixed(4)} 1)`;
  return { diaphragm, lungL: lung(-1), lungR: lung(1), ribs };
}

const smooth = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u)));
const dsmooth = (u: number) => (u <= 0 || u >= 1 ? 0 : (Math.PI / 2) * Math.sin(Math.PI * u));

/** Lung volume (dm³) and its rate of change (dm³ s⁻¹) at global time g (s). */
export function volumeAt(g: number): { v: number; dv: number } {
  const [d0, d1, d2] = DURATIONS as [number, number, number];
  if (g <= d0) { const u = g / d0; return { v: FRC + 0.5 * smooth(u), dv: (0.5 * dsmooth(u)) / d0 }; }
  if (g <= d0 + d1) { const u = (g - d0) / d1; return { v: FRC + 0.5 - 0.5 * smooth(u), dv: (-0.5 * dsmooth(u)) / d1 }; }
  const u = (g - d0 - d1) / d2;
  if (u <= 0.5) return { v: FRC + 1.6 * smooth(2 * u), dv: (1.6 * dsmooth(2 * u) * 2) / d2 };
  return { v: FRC + 1.6 - 2.5 * smooth(2 * u - 1), dv: (-2.5 * dsmooth(2 * u - 1) * 2) / d2 };
}

/** Graph geometry (shared with the .astro file). */
export const G = { x0: 400, x1: 630, vTop: 128, vBot: 248, vMin: 1, vMax: 4.5, pMid: 330, pHalf: 44, pScale: 46 };
export const gx = (g: number) => G.x0 + (g / TOTAL) * (G.x1 - G.x0);
export const gyV = (v: number) => G.vBot - ((v - G.vMin) / (G.vMax - G.vMin)) * (G.vBot - G.vTop);
export const gyP = (dv: number) => G.pMid + Math.max(-G.pHalf, Math.min(G.pHalf, dv * G.pScale));

export function tracePaths(g: number) {
  let v = '', p = '';
  const n = Math.max(1, Math.round((g / TOTAL) * 240));
  for (let i = 0; i <= n; i++) {
    const t = (g * i) / n;
    const s = volumeAt(t);
    v += `${i ? 'L' : 'M'}${gx(t).toFixed(1)} ${gyV(s.v).toFixed(1)}`;
    // +dV/dt (air flowing in) means the pressure is BELOW atmospheric, drawn below the line
    p += `${i ? 'L' : 'M'}${gx(t).toFixed(1)} ${gyP(s.dv).toFixed(1)}`;
  }
  return { v, p };
}

type Status = [string, boolean];
const STATUS: Record<'in' | 'rest' | 'deep' | 'forced', { ext: Status; dia: Status; int: Status; abd: Status }> = {
  in: { ext: ['contracting', true], dia: ['contracting: flattens', true], int: ['relaxed', false], abd: ['relaxed', false] },
  rest: { ext: ['relaxed', false], dia: ['relaxed: domed', false], int: ['relaxed', false], abd: ['relaxed', false] },
  deep: { ext: ['contracting strongly', true], dia: ['contracting: flattens', true], int: ['relaxed', false], abd: ['relaxed', false] },
  forced: { ext: ['relaxed', false], dia: ['relaxed: pushed up', false], int: ['contracting', true], abd: ['contracting', true] },
};

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const setPose = (p: Pose) => {
    const s = thoraxShapes(p);
    el('diaphragm').setAttribute('d', s.diaphragm);
    el('lungL').setAttribute('d', s.lungL);
    el('lungR').setAttribute('d', s.lungR);
    el('ribs').setAttribute('transform', s.ribs);
  };
  const setStatus = (k: keyof typeof STATUS) => {
    const st = STATUS[k];
    for (const [key, [text, on]] of Object.entries(st) as [string, Status][]) {
      const t = el(`st-${key}`);
      t.textContent = text;
      t.classList.toggle('on', on);
    }
    el('ext').classList.toggle('on', st.ext[1]);
    el('int').classList.toggle('on', st.int[1]);
    el('diaphragm').classList.toggle('on', st.dia[1]);
    el('abd').classList.toggle('on', st.abd[1]);
  };
  const air = (dir: 'in' | 'out' | 'none') => {
    el('air-in').style.opacity = dir === 'in' ? '1' : '0';
    el('air-out').style.opacity = dir === 'out' ? '1' : '0';
  };

  function render(index: number, t: number) {
    const start = DURATIONS.slice(0, index).reduce((a, b) => a + b, 0);
    const g = start + t * DURATIONS[index]!;
    const { v, p } = tracePaths(g);
    el('vtrace').setAttribute('d', v);
    el('ptrace').setAttribute('d', p);
    const now = volumeAt(g);
    el('vdot').setAttribute('cx', gx(g).toFixed(1));
    el('vdot').setAttribute('cy', gyV(now.v).toFixed(1));
    el('pdot').setAttribute('cx', gx(g).toFixed(1));
    el('pdot').setAttribute('cy', gyP(now.dv).toFixed(1));
    el('abd-arrows').style.opacity = '0';
    switch (index) {
      case 0:
        setPose(mixPose(REST, INSPIRED, ease(t)));
        setStatus('in');
        air('in');
        break;
      case 1:
        setPose(mixPose(INSPIRED, REST, ease(t)));
        setStatus('rest');
        air('out');
        break;
      default: {
        const a = phase(t, 0, 0.5), b = phase(t, 0.5, 1);
        if (t < 0.5) {
          setPose(mixPose(REST, DEEP, ease(a)));
          setStatus('deep');
          air('in');
        } else {
          setPose(mixPose(DEEP, FORCED_OUT, ease(b)));
          setStatus('forced');
          air('out');
          el('abd-arrows').style.opacity = '1';
        }
      }
    }
  }
  render(0, 0);
  return { render, durations: DURATIONS };
}
