import { ease, phase } from '../lib/timeline';

/*
 * Steps: 0 pre-proinsulin made on the rough ER · 1 signal peptide removed → proinsulin ·
 * 2 proinsulin folds and three disulfide bonds form · 3 C peptide removed → insulin (A + B chains).
 */
export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const show = (k: string, op: number) => { el(k).style.opacity = String(op); };
  const move = (k: string, x: number, y: number) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

  function render(index: number, t: number) {
    show('loc0', index === 0 ? 1 : 0);
    show('loc1', index === 1 || index === 2 ? 1 : 0);
    show('loc3', index === 3 ? 1 : 0);

    // stage 1: signal peptide cut off and removed
    const cut = index === 0 ? 0 : index === 1 ? ease(phase(t, 0.3, 0.9)) : 1;
    move('sig', -14 * cut, 40 * cut);
    show('sig', index >= 2 ? 0 : 1 - 0.7 * cut);
    show('cut1', index === 1 ? Math.min(1, phase(t, 0, 0.25) * 2) : 0);

    // folding (step 2) replaces the linear drawing
    const fold = index < 2 ? 0 : index === 2 ? ease(phase(t, 0, 0.5)) : 1;
    show('lin', 1 - fold);
    show('fold', fold);
    show('ss', index < 2 ? 0 : index === 2 ? ease(phase(t, 0.55, 0.9)) : 1);

    // stage 2: C peptide removed
    const rem = index === 3 ? ease(phase(t, 0.3, 0.9)) : 0;
    show('cpep', index < 2 ? 0 : index === 2 ? fold : 1 - 0.75 * rem);
    move('cpep', 0, 26 * rem);
    show('cut2', index === 3 ? Math.min(1, phase(t, 0, 0.25) * 2) : 0);

    show('nPre', index === 0 ? 1 : index === 1 ? 1 - cut : 0);
    show('nPro', index === 1 ? cut : index === 2 ? 1 : index === 3 ? 1 - rem : 0);
    show('nIns', index === 3 ? rem : 0);
  }
  render(0, 0);
  return { render, durations: [3, 4, 4.5, 4.5] };
}
