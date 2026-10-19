import { ease, lerp, phase } from '../lib/timeline';

/*
 * Hershey–Chase driver. Steps: 0 label phage · 1 infect (DNA injected) · 2 blend · 3 centrifuge ·
 * 4 measure radioactivity · 5 conclusion. render() is absolute: every element is set on every call.
 * Readings are rounded values (about 80% of ³⁵S in the supernatant; about 70% of ³²P in the pellet).
 */
const PH_X = [88, 168];
const Y_FREE = 66;
const Y_ON = 104;
const FINAL = { s: { sup: 80, pel: 20 }, p: { sup: 30, pel: 70 } } as const;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const show = (k: string, o: number) => { el(k).style.opacity = o.toFixed(3); };
  const place = (k: string, x: number, y: number, rot = 0, s = 1) =>
    el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(3)})`);

  function render(index: number, t: number) {
    for (const p of ['s', 'p'] as const) {
      // defaults for this column
      let phY = Y_FREE, drift = 0, dnaY = Y_FREE, dnaOp = 1, injOp = 0, blend = 0, cells = 1, tube = 0, pct = 0, reading = 0;
      switch (index) {
        case 0: phY = Y_FREE; break;
        case 1: {
          const a = ease(phase(t, 0, 0.4));
          phY = lerp(Y_FREE, Y_ON, a);
          const inj = ease(phase(t, 0.45, 0.95));
          dnaY = lerp(phY, 192, inj);
          dnaOp = 1 - phase(t, 0.8, 0.98);
          injOp = phase(t, 0.7, 0.95);
          break;
        }
        case 2: phY = Y_ON; dnaOp = 0; injOp = 1; blend = Math.min(1, phase(t, 0, 0.2) * 1.0); drift = ease(phase(t, 0.15, 0.85)); break;
        case 3: phY = Y_ON; dnaOp = 0; injOp = 1; drift = 1; cells = 1 - ease(phase(t, 0, 0.45)); tube = ease(phase(t, 0.4, 0.9)); break;
        case 4: cells = 0; tube = 1; pct = ease(phase(t, 0, 0.25)); reading = ease(phase(t, 0.15, 0.85)); break;
        default: cells = 0; tube = 1; pct = 1; reading = 1;
      }
      PH_X.forEach((x, i) => {
        const dir = i === 0 ? -1 : 1;
        place(`${p}-ph${i + 1}`, x + dir * 44 * drift, phY - 26 * drift, dir * 30 * drift);
        place(`${p}-d${i + 1}`, x, index === 0 ? Y_FREE : dnaY, 0, index === 1 ? lerp(1, 0.55, phase(t, 0.45, 0.95)) : 1);
        show(`${p}-d${i + 1}`, index === 0 ? 1 : dnaOp);
        show(`${p}-i${i + 1}`, injOp);
      });
      show(`${p}-blend`, index === 2 ? blend : index === 3 ? 1 - phase(t, 0, 0.3) : 0);
      show(`${p}-cells`, cells);
      show(`${p}-tube`, tube);
      show(`${p}-pct`, pct);
      const f = FINAL[p];
      el(`${p}-sup`).textContent = `supernatant ≈ ${Math.round(f.sup * reading)}%`;
      el(`${p}-pel`).textContent = `pellet ≈ ${Math.round(f.pel * reading)}%`;
    }
    show('concl', index === 5 ? ease(phase(t, 0, 0.5)) : 0);
  }
  render(0, 0);
  return { render, durations: [3, 5, 4, 4, 4, 4] };
}
