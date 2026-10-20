import { ease, lerp, phase } from '../lib/timeline';

/** Steps: 0 diploid parents, 1 meiosis → gametes, 2 fertilization, 3 genotype → phenotype, 4 phenotypic plasticity. */
export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const op = (k: string, v: number) => { el(k).style.opacity = String(Math.max(0, Math.min(1, v))); };
  const SPERM_TRAVEL = -118; // from x≈398 to the egg surface

  function render(index: number, t: number) {
    const e = ease(t);
    // defaults for every step; each case sets the full state
    let mom = 1, dad = 1, meio = 0, egg = 0, sperm = 0, zyg = 0, geno = 0, plast = 0, dx = 0, skin = 0;
    switch (index) {
      case 0:
        break;
      case 1:
        mom = lerp(1, 0.45, e); dad = lerp(1, 0.45, e);
        meio = ease(phase(t, 0, 0.4));
        egg = ease(phase(t, 0.3, 0.8)); sperm = ease(phase(t, 0.4, 0.9));
        break;
      case 2:
        mom = 0.45; dad = 0.45; meio = 1 - ease(phase(t, 0, 0.3));
        dx = SPERM_TRAVEL * ease(phase(t, 0, 0.55));
        sperm = 1 - ease(phase(t, 0.55, 0.75));
        egg = 1 - ease(phase(t, 0.6, 0.85));
        zyg = ease(phase(t, 0.6, 0.9));
        break;
      case 3:
        mom = 0.45; dad = 0.45; zyg = 1; geno = e;
        break;
      default:
        mom = 0.45; dad = 0.45; zyg = 1; geno = 1; plast = ease(phase(t, 0, 0.4));
        skin = ease(phase(t, 0.35, 1));
    }
    op('mom', mom); op('dad', dad); op('meio', meio); op('egg', egg); op('sperm', sperm); op('zygote', zyg);
    op('geno', geno); op('plast', plast); op('skinHigh', skin);
    el('sperm').setAttribute('transform', `translate(${dx.toFixed(1)} 0)`);
  }
  render(0, 0);
  return { render, durations: [3, 4.5, 4.5, 3.5, 4.5] };
}
