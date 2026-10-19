import { ease, lerp, phase } from '../lib/timeline';

/* Geometry shared with c3-2-clotting.astro (the SVG is drawn in its step-1 start state). */
export const GAP = [228, 292] as const; // x-range of the cut
export const SKIN = [58, 96] as const; // y-range of the skin
export const WALL = [96, 112] as const; // y-range of the vessel wall (top)
export const LUMEN = [112, 196] as const;
export const PLATELETS = [
  { home: [84, 150], edge: [226, 118] },
  { home: [150, 178], edge: [228, 98] },
  { home: [362, 140], edge: [294, 116] },
  { home: [430, 176], edge: [292, 96] },
  { home: [190, 132], edge: [232, 76] },
  { home: [470, 128], edge: [288, 72] },
] as const;
export const RBCS = [
  { home: [60, 132], trap: [60, 132] },
  { home: [120, 160], trap: [246, 84] },
  { home: [200, 182], trap: [270, 104] },
  { home: [330, 172], trap: [258, 62] },
  { home: [396, 132], trap: [278, 74] },
  { home: [480, 160], trap: [480, 160] },
  { home: [300, 136], trap: [244, 108] },
] as const;
export const FIBRINOGEN = [[110, 140], [180, 160], [250, 150], [320, 128], [372, 168], [452, 146], [266, 178], [56, 176]] as const;
// fibrin fibres crossing the cut (start, end)
export const FIBRES = [
  'M222 70 L298 104', 'M224 104 L296 62', 'M230 56 L268 116', 'M262 52 L240 116', 'M286 54 L250 116',
  'M224 84 L298 82', 'M226 112 L294 92', 'M234 62 L292 118', 'M222 96 L272 54', 'M298 74 L254 116',
] as const;
export const FACTORS = [[234, 120], [240, 104], [262, 124], [284, 120], [278, 100], [252, 90], [270, 80], [246, 68], [288, 86], [258, 108]] as const;

export function create(svg: SVGSVGElement) {
  const q = <T extends Element>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = <T extends Element>(k: string) => [...svg.querySelectorAll<T>(`[data-el="${k}"]`)];
  const leak = q<SVGPathElement>('leak');
  const platelets = all<SVGGElement>('platelet');
  const rbcs = all<SVGGElement>('rbc');
  const fibrinogen = all<SVGLineElement>('fibrinogen');
  const fibres = all<SVGPathElement>('fibre');
  const factors = all<SVGCircleElement>('factor');
  const thrombin = all<SVGPathElement>('thrombin');
  const clotLabel = q<SVGGElement>('clot-label');
  const rx = (k: string) => q<SVGGElement>(`rx-${k}`);
  const rxKeys = ['factors', 'prothrombin', 'thrombin', 'fibrinogen', 'fibrin'] as const;
  const fibreLen = fibres.map((f) => (typeof f.getTotalLength === 'function' ? f.getTotalLength() : 90) || 90);
  const move = (g: SVGGElement, x: number, y: number) => g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

  function render(index: number, t: number) {
    // blood escaping through the cut, until the clot seals it
    const leakOn = index === 0 ? ease(phase(t, 0, 0.6)) : index < 4 ? 1 : 1 - ease(phase(t, 0.3, 0.9));
    leak.style.opacity = (0.55 * leakOn).toFixed(2);

    // platelets stick to the edges of the cut
    platelets.forEach((p, i) => {
      const d = PLATELETS[i]!;
      const u = index === 0 ? 0 : index === 1 ? ease(phase(t, 0, 0.5)) : 1;
      move(p, lerp(d.home[0], d.edge[0], u), lerp(d.home[1], d.edge[1], u));
      p.classList.toggle('stuck', u > 0.95);
    });

    // clotting factors released by platelets
    factors.forEach((f, i) => {
      const src = PLATELETS[i % PLATELETS.length]!.edge;
      const u = index < 1 ? 0 : index === 1 ? ease(phase(t, 0.5 + (i % 5) * 0.04, 0.85 + (i % 5) * 0.03)) : 1;
      const fade = index >= 4 ? 1 - ease(phase(t, 0, 0.5)) : 1;
      f.setAttribute('cx', lerp(src[0], FACTORS[i]![0], u).toFixed(1));
      f.setAttribute('cy', lerp(src[1], FACTORS[i]![1], u).toFixed(1));
      f.style.opacity = index < 1 || u === 0 ? '0' : (fade).toFixed(2);
    });

    // thrombin appears at the end of the cascade
    const thr = index < 2 ? 0 : index === 2 ? ease(phase(t, 0.45, 0.85)) : index === 3 ? 1 : 1 - ease(phase(t, 0, 0.5));
    thrombin.forEach((th) => (th.style.opacity = thr.toFixed(2)));

    // soluble fibrinogen in the plasma is converted into insoluble fibrin fibres
    const conv = index < 3 ? 0 : index === 3 ? ease(phase(t, 0.1, 0.9)) : 1;
    fibrinogen.forEach((f) => (f.style.opacity = (1 - conv * 0.85).toFixed(2)));
    fibres.forEach((f, i) => {
      const u = index < 3 ? 0 : index === 3 ? ease(phase(t, 0.1 + i * 0.05, 0.5 + i * 0.05)) : 1;
      f.style.strokeDasharray = `${fibreLen[i]}`;
      f.style.strokeDashoffset = `${(fibreLen[i]! * (1 - u)).toFixed(1)}`;
      f.style.opacity = u > 0 ? '1' : '0';
    });

    // red blood cells are trapped in the mesh
    rbcs.forEach((r, i) => {
      const d = RBCS[i]!;
      const u = index < 4 ? 0 : ease(phase(t, 0.05 + i * 0.04, 0.6 + i * 0.04));
      move(r, lerp(d.home[0], d.trap[0], u), lerp(d.home[1], d.trap[1], u));
    });
    clotLabel.style.opacity = index === 4 ? ease(phase(t, 0.6, 0.9)).toFixed(2) : '0';

    // the reaction strip highlights the reactions happening in this step
    const on: Record<(typeof rxKeys)[number], boolean> = {
      factors: index === 1 || index === 2,
      prothrombin: index === 2,
      thrombin: index === 2 || index === 3,
      fibrinogen: index === 3,
      fibrin: index >= 3,
    };
    for (const k of rxKeys) rx(k).classList.toggle('on', on[k]);
    q<SVGElement>('rx-arrow1').classList.toggle('on', index === 2);
    q<SVGElement>('rx-arrow2').classList.toggle('on', index === 3);
  }
  render(0, 0);
  return { render, durations: [3, 4.5, 4.5, 5, 5] };
}
