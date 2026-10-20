import { ease, lerp, phase } from '../lib/timeline';

/**
 * Eutrophication, five steps: leaching → bloom → shading and death → decomposition (BOD) → hypoxia.
 * Each property has an end value per step; a step animates from the previous step's end value,
 * so render(index, t) is absolute.
 */
const END = {
  rain: [1, 0, 0, 0, 0],
  granules: [0.25, 0, 0, 0, 0],
  ions: [1, 1, 1, 1, 1], // progress of the leaching movement
  ionOpacity: [1, 1, 0.45, 0.25, 0],
  bloom: [0, 16, 18, 16, 14],
  rayEnd: [356, 356, 216, 216, 216],
  plantsLive: [1, 1, 0, 0, 0],
  detritus: [0, 0, 0.55, 0.8, 1],
  bacteria: [3, 3, 6, 30, 32],
  fishLive: [1, 1, 1, 1, 0],
  o2: [0.9, 0.9, 0.72, 0.32, 0.07],
  bod: [0.1, 0.14, 0.35, 0.86, 0.92],
  labBloom: [0, 1, 1, 1, 1],
  labDead: [0, 0, 1, 1, 1],
  labBact: [0, 0, 0, 1, 1],
  labFish: [0, 0, 0, 0, 1],
};
const START: { [K in keyof typeof END]: number } = {
  rain: 1, granules: 1, ions: 0, ionOpacity: 1, bloom: 0, rayEnd: 356, plantsLive: 1, detritus: 0, bacteria: 3,
  fishLive: 1, o2: 0.9, bod: 0.1, labBloom: 0, labDead: 0, labBact: 0, labFish: 0,
};
const O2_WORDS = ['high', 'high', 'falling', 'low', 'very low'];
const BOD_WORDS = ['low', 'low', 'rising', 'high', 'very high'];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const ions = [...svg.querySelectorAll<SVGGElement>('[data-ion]')];
  const rays = [...svg.querySelectorAll<SVGLineElement>('[data-ray]')];
  const bacteria = [...svg.querySelectorAll<SVGCircleElement>('[data-b]')];
  const fish = [...svg.querySelectorAll<SVGGElement>('[data-fish]')];
  const fishBase = fish.map((f) => f.getAttribute('transform')!);
  const TRACK = 132;

  function render(index: number, t: number) {
    const e = ease(t);
    const v = (k: keyof typeof END) => lerp(index === 0 ? START[k] : END[k][index - 1]!, END[k][index]!, e);
    el('rain').style.opacity = v('rain').toFixed(2);
    el('granules').style.opacity = v('granules').toFixed(2);
    const pIon = index === 0 ? ease(phase(t, 0.15, 0.95)) : 1;
    ions.forEach((g, i) => {
      const d = g.dataset;
      const p = Math.max(0, Math.min(1, pIon * 1.15 - i * 0.05));
      const x = lerp(Number(d.sx), Number(d.ex), p), y = lerp(Number(d.sy), Number(d.ey), p);
      g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      g.style.opacity = v('ionOpacity').toFixed(2);
    });
    el('bloom').setAttribute('height', v('bloom').toFixed(1));
    const yEnd = v('rayEnd');
    rays.forEach((r) => {
      const x1 = Number(r.getAttribute('x1')), y1 = 62;
      // keep each ray on its original line while shortening it
      const x2full = Number(r.dataset.x2 ?? r.getAttribute('x2'));
      r.dataset.x2 = String(x2full);
      const f = (yEnd - y1) / (356 - y1);
      r.setAttribute('x2', (x1 + (x2full - x1) * f).toFixed(1));
      r.setAttribute('y2', yEnd.toFixed(1));
    });
    const live = v('plantsLive');
    el('plants-live').style.opacity = live.toFixed(2);
    el('plants-dead').style.opacity = (1 - live).toFixed(2);
    el('detritus').style.opacity = v('detritus').toFixed(2);
    const n = v('bacteria');
    bacteria.forEach((b, i) => { b.style.opacity = Math.max(0, Math.min(1, n - i)).toFixed(2); });
    const fl = v('fishLive');
    el('fish-live').style.opacity = fl.toFixed(2);
    el('fish-dead').style.opacity = (1 - fl).toFixed(2);
    // gentle swimming while fish are alive (absolute in t)
    fish.forEach((f, i) => {
      const dx = Math.sin((t + i * 0.3) * Math.PI * 2) * 5;
      f.setAttribute('transform', `translate(${dx.toFixed(1)} 0) ${fishBase[i]}`);
    });
    el('o2').setAttribute('width', Math.max(8, v('o2') * TRACK).toFixed(1));
    el('bod').setAttribute('width', Math.max(8, v('bod') * TRACK).toFixed(1));
    el('o2-t').textContent = O2_WORDS[index]!;
    el('bod-t').textContent = BOD_WORDS[index]!;
    el('lab-bloom').style.opacity = v('labBloom').toFixed(2);
    el('lab-dead').style.opacity = v('labDead').toFixed(2);
    el('lab-bact').style.opacity = v('labBact').toFixed(2);
    el('lab-fish').style.opacity = v('labFish').toFixed(2);
  }

  render(0, 0);
  return { render, durations: [4.5, 4, 4.5, 4.5, 4.5] };
}
