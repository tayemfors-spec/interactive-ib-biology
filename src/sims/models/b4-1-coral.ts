/**
 * Conditions for reef-building (hermatypic) corals: a qualitative checker with approximate
 * thresholds. Reef-building corals depend on photosynthesis by their zooxanthellae, so the light
 * reaching them matters; light is modelled with exponential attenuation, I = I0 · e^(−k·depth),
 * where the attenuation coefficient k rises as the water becomes more turbid.
 */

export type Status = 'ok' | 'stress' | 'fail';
export interface Conditions { temp: number; depth: number; turbidity: number; salinity: number; ph: number }
export interface Check { factor: keyof Conditions | 'light'; label: string; status: Status; text: string }

export const defaults: Conditions = { temp: 26, depth: 10, turbidity: 0, salinity: 35, ph: 8.1 };

/** Attenuation coefficient (per metre): about 0.045 in very clear tropical water. */
export const attenuation = (turbidity: number) => 0.045 + 0.045 * Math.max(0, turbidity);
/** Percentage of surface light reaching a given depth. */
export const lightAt = (depth: number, turbidity: number) => 100 * Math.exp(-attenuation(turbidity) * Math.max(0, depth));

export const LIMITS = {
  temp: { failLow: 18, okLow: 23, okHigh: 29, failHigh: 32 },
  salinity: { failLow: 28, okLow: 32, okHigh: 42, failHigh: 45 },
  ph: { fail: 7.8, ok: 8.0 },
  light: { fail: 10, ok: 20 },
  turbidity: { ok: 3, fail: 7 },
} as const;

const band = (v: number, l: { failLow: number; okLow: number; okHigh: number; failHigh: number }): Status =>
  v < l.failLow || v > l.failHigh ? 'fail' : v < l.okLow || v > l.okHigh ? 'stress' : 'ok';

export function check(c: Conditions): Check[] {
  const light = lightAt(c.depth, c.turbidity);
  const tS = band(c.temp, LIMITS.temp);
  const sS = band(c.salinity, LIMITS.salinity);
  const pS: Status = c.ph < LIMITS.ph.fail ? 'fail' : c.ph < LIMITS.ph.ok ? 'stress' : 'ok';
  const lS: Status = light < LIMITS.light.fail ? 'fail' : light < LIMITS.light.ok ? 'stress' : 'ok';
  const cS: Status = c.turbidity >= LIMITS.turbidity.fail ? 'fail' : c.turbidity > LIMITS.turbidity.ok ? 'stress' : 'ok';
  return [
    { factor: 'temp', label: 'Temperature', status: tS,
      text: tS === 'ok' ? 'Warm enough for fast growth and calcification, but not so hot that corals bleach.'
        : c.temp < LIMITS.temp.okLow ? (tS === 'fail' ? 'Too cold: below about 18 °C reef-building corals cannot grow fast enough to build a reef.' : 'Cool: corals grow and deposit skeleton slowly.')
        : tS === 'fail' ? 'Too hot: long periods this warm cause severe bleaching, and corals die.' : 'Hot: risk of bleaching — stressed corals expel their zooxanthellae and may starve.' },
    { factor: 'light', label: 'Light at this depth', status: lS,
      text: lS === 'ok' ? 'Enough light reaches the coral for its zooxanthellae to photosynthesize rapidly.'
        : lS === 'stress' ? 'Dim: zooxanthellae photosynthesize slowly, so the coral grows slowly.' : 'Too dark for zooxanthellae to supply enough sugar: reef-building corals cannot grow.' },
    { factor: 'turbidity', label: 'Water clarity', status: cS,
      text: cS === 'ok' ? 'Clear water lets light through, and little sediment settles on the coral.'
        : cS === 'stress' ? 'Cloudy water: less light gets through, and corals use energy clearing sediment from their polyps.' : 'Very turbid: suspended sediment blocks light and settles on the polyps, smothering them.' },
    { factor: 'salinity', label: 'Salinity', status: sS,
      text: sS === 'ok' ? 'Normal seawater salinity, so the coral\'s cells are not damaged by osmosis.'
        : c.salinity < LIMITS.salinity.okLow ? (sS === 'fail' ? 'Too fresh (for example near a river mouth): coral cells take in water by osmosis and are damaged.' : 'Diluted seawater stresses corals osmotically.')
        : sS === 'fail' ? 'Too salty: coral cells lose water by osmosis.' : 'Very salty water stresses corals osmotically.' },
    { factor: 'ph', label: 'pH', status: pS,
      text: pS === 'ok' ? 'Slightly alkaline water with plenty of carbonate ions, so calcium carbonate is deposited easily.'
        : pS === 'stress' ? 'Lower pH means fewer carbonate ions, so corals build their calcium carbonate skeletons more slowly.' : 'Too acidic: too few carbonate ions for corals to build skeletons faster than they dissolve and erode.' },
  ];
}

export type Verdict = 'reef' | 'stressed' | 'none';
export function verdict(c: Conditions): Verdict {
  const s = check(c).map((x) => x.status);
  return s.includes('fail') ? 'none' : s.includes('stress') ? 'stressed' : 'reef';
}

export const verdictText: Record<Verdict, string> = {
  reef: 'Reef-building corals can grow here: a coral reef can form.',
  stressed: 'Corals could survive, but they are stressed: reef growth is slow or the reef is at risk.',
  none: 'A coral reef could not form: at least one factor is outside the range reef-building corals tolerate.',
};

export const presets: { id: string; label: string; c: Conditions }[] = [
  { id: 'reef', label: 'Clear, shallow tropical sea', c: { ...defaults } },
  { id: 'deep', label: 'Deep water (60 m)', c: { ...defaults, depth: 60 } },
  { id: 'river', label: 'Near a river mouth', c: { temp: 27, depth: 8, turbidity: 8, salinity: 24, ph: 8.0 } },
  { id: 'heatwave', label: 'Marine heatwave', c: { ...defaults, temp: 31 } },
  { id: 'acid', label: 'More acidic ocean', c: { ...defaults, ph: 7.85 } },
  { id: 'cold', label: 'Temperate coast', c: { temp: 14, depth: 10, turbidity: 2, salinity: 35, ph: 8.1 } },
];
