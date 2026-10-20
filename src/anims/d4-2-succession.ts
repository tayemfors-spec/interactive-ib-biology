import { ease, lerp } from '../lib/timeline';

/**
 * Succession, seven steps: bare rock → pioneers → grasses and herbs → shrubs → climax forest →
 * secondary succession after a fire → grazing holds the community as grassland (arrested).
 * Every property has an end value per step and animates from the previous step's end value.
 */
const END = {
  soil: [0, 0.1, 0.35, 0.6, 0.9, 0.85, 0.8],
  lichen: [0, 1, 0.6, 0.3, 0.15, 0, 0],
  moss: [0, 1, 0.85, 0.55, 0.4, 0.2, 0],
  grass: [0, 0, 1, 0.75, 0.35, 1, 1],
  shrubs: [0, 0, 0, 1, 0.45, 0, 0],
  trees: [0, 0, 0, 0, 1, 0, 0],
  stumps: [0, 0, 0, 0, 0, 1, 0],
  sheep: [0, 0, 0, 0, 0, 0, 1],
  biomass: [0, 0.05, 0.2, 0.5, 1, 0.15, 0.2],
  production: [0, 0.06, 0.35, 0.6, 0.9, 0.45, 0.4],
  diversity: [0, 0.12, 0.45, 0.75, 0.85, 0.5, 0.4],
  foodweb: [0, 0.08, 0.35, 0.65, 0.9, 0.45, 0.35],
  nutrient: [0, 0.06, 0.3, 0.6, 0.9, 0.55, 0.45],
};
type Key = keyof typeof END;
const STAGES = [
  ['Bare rock', 'Time 0: no soil, no life'],
  ['Pioneer species: lichens and mosses', 'First years to decades'],
  ['Grasses and herbs', 'Decades'],
  ['Shrubs', 'Many decades'],
  ['Climax community: forest', 'Centuries: a stable community'],
  ['Secondary succession after a fire', 'Soil survives, so recovery is faster'],
  ['Arrested succession: grazing', 'Sheep eat tree and shrub seedlings'],
];
const SOIL_PX = 36;
const METERS: Key[] = ['biomass', 'production', 'diversity', 'foodweb', 'soil', 'nutrient'];
const GROW: Key[] = ['lichen', 'moss', 'grass', 'shrubs', 'trees'];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const bars = new Map(METERS.map((m) => [m, svg.querySelector<SVGRectElement>(`[data-meter="${m}"]`)!]));
  const B = 300;

  function render(index: number, t: number) {
    const e = ease(t);
    const v = (k: Key) => lerp(index === 0 ? 0 : END[k][index - 1]!, END[k][index]!, e);
    const depth = v('soil') * SOIL_PX;
    const soil = el('soil');
    soil.setAttribute('y', (B - depth).toFixed(1));
    soil.setAttribute('height', depth.toFixed(1));
    el('veg').setAttribute('transform', `translate(0 ${(-depth).toFixed(1)})`);
    for (const k of GROW) {
      const o = v(k);
      const g = el(k === 'shrubs' ? 'shrubs' : k === 'trees' ? 'trees' : k);
      g.style.opacity = Math.min(1, o * 1.4).toFixed(2);
      // plants grow up from the ground as they arrive
      const s = 0.35 + 0.65 * Math.min(1, o);
      g.setAttribute('transform', `translate(0 ${B}) scale(1 ${s.toFixed(3)}) translate(0 ${-B})`);
    }
    el('stumps').style.opacity = v('stumps').toFixed(2);
    el('sheep').style.opacity = v('sheep').toFixed(2);
    for (const m of METERS) bars.get(m)!.setAttribute('width', (v(m) * 158).toFixed(1));
    el('stage').textContent = STAGES[index]![0]!;
    el('time').textContent = STAGES[index]![1]!;
  }

  render(0, 0);
  return { render, durations: [3, 4.5, 4.5, 4.5, 5, 5, 5] };
}
