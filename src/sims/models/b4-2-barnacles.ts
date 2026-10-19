/**
 * Fundamental and realized niches of two barnacles on a rocky shore (B4.2.12), after Connell (1961,
 * Ecology 42: 710–723), Isle of Cumbrae, Scotland. Shore height is a 0–1 scale: 0 = low-tide mark,
 * 1 = high-tide mark. Zone limits are schematic; the pattern is what Connell found:
 *  - Chthamalus stellatus larvae settle in both zones and adults can survive throughout, but in the
 *    lower zone faster-growing Semibalanus balanoides (then called Balanus balanoides) smothers,
 *    undercuts and crushes them. Removing Semibalanus lets Chthamalus survive lower down.
 *  - Semibalanus cannot survive the long periods of exposure to air high on the shore (desiccation),
 *    so removing Chthamalus does not let it spread upwards.
 */
export type Scenario = 'both' | 'no-semibalanus' | 'no-chthamalus';
export type Barnacle = 'chthamalus' | 'semibalanus';

export interface Band { from: number; to: number }

/** Range each species could occupy without competitors (set by its tolerances). */
export const fundamental: Record<Barnacle, Band> = {
  chthamalus: { from: 0.2, to: 0.95 },
  semibalanus: { from: 0.12, to: 0.62 },
};

/** Boundary between the upper and lower zones on the natural shore. */
export const ZONE_EDGE = 0.62;

/** Range each species actually occupies in a scenario (null = species absent). */
export function realized(s: Scenario): Record<Barnacle, Band | null> {
  switch (s) {
    case 'both':
      return { chthamalus: { from: ZONE_EDGE, to: fundamental.chthamalus.to }, semibalanus: { ...fundamental.semibalanus } };
    case 'no-semibalanus':
      return { chthamalus: { ...fundamental.chthamalus }, semibalanus: null };
    case 'no-chthamalus':
      return { chthamalus: null, semibalanus: { ...fundamental.semibalanus } };
  }
}

export const span = (b: Band | null) => (b ? b.to - b.from : 0);

/** True when competition makes the realized niche narrower than the fundamental niche. */
export const restricted = (s: Scenario, b: Barnacle) => {
  const r = realized(s)[b];
  return r !== null && span(r) < span(fundamental[b]) - 1e-9;
};

export const scenarioLabel: Record<Scenario, string> = {
  both: 'Natural shore: both species',
  'no-semibalanus': 'Remove Semibalanus',
  'no-chthamalus': 'Remove Chthamalus',
};

export const scenarioText: Record<Scenario, string> = {
  both: 'Both species present. Chthamalus is found only on the upper shore: its realized niche is narrower than its fundamental niche, because lower down Semibalanus grows faster and smothers, undercuts or crushes it. Semibalanus occupies the middle and lower shore.',
  'no-semibalanus': 'Semibalanus removed from the rocks. Young Chthamalus that settle lower down now survive and grow, so Chthamalus spreads into the lower zone. Its fundamental niche was always larger than its realized niche: competition, not its tolerance of the conditions, was keeping it out.',
  'no-chthamalus': 'Chthamalus removed. Semibalanus does not spread up the shore, because it cannot survive the long exposure to air there (desiccation). Its upper limit is set by an abiotic factor, so its realized niche is close to its fundamental niche.',
};
