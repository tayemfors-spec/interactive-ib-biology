/**
 * Energy pyramid model for C4.2.
 *
 * Energy values are the energy gained (assimilated) per year by each trophic level, in kJ m⁻² yr⁻¹.
 * The ecological (trophic) transfer efficiency is the percentage of one level's energy that is
 * gained by the next level. Everything not passed on is lost from the food chain:
 *  - as heat from cell respiration,
 *  - in material that is never eaten (dead organisms and dead parts → decomposers),
 *  - in material that is eaten but not digested or absorbed (egested in faeces → decomposers).
 * The split between these three losses varies between ecosystems; the shares below are illustrative.
 */

export const LEVEL_NAMES = ['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers', 'Quaternary consumers'] as const;

/** Illustrative split of the energy that is NOT passed on (shares sum to 1). */
export const LOSS_SHARES = { respiration: 0.55, uneaten: 0.3, faeces: 0.15 } as const;

export interface Level { name: string; energy: number; percentOfProducers: number }
export interface Transfer { from: string; to: string; passed: number; lost: number; efficiency: number; heat: number; uneaten: number; faeces: number }

/** Energy in each trophic level for a constant transfer efficiency (percent). */
export function pyramid(producerEnergy: number, efficiencyPercent: number, levels = 5): Level[] {
  const e = Math.max(0, efficiencyPercent) / 100;
  return Array.from({ length: levels }, (_, i) => {
    const energy = producerEnergy * e ** i;
    return { name: LEVEL_NAMES[i] ?? `Level ${i + 1}`, energy, percentOfProducers: producerEnergy > 0 ? (energy / producerEnergy) * 100 : 0 };
  });
}

/** Percentage of energy passed from one level to the next. */
export const efficiency = (from: number, to: number) => (from > 0 ? (to / from) * 100 : 0);

/** Transfers between successive levels, with the illustrative breakdown of what is lost. */
export function transfers(levels: { name: string; energy: number }[]): Transfer[] {
  const out: Transfer[] = [];
  for (let i = 0; i + 1 < levels.length; i++) {
    const a = levels[i]!, b = levels[i + 1]!;
    const lost = a.energy - b.energy;
    out.push({
      from: a.name, to: b.name, passed: b.energy, lost, efficiency: efficiency(a.energy, b.energy),
      heat: lost * LOSS_SHARES.respiration, uneaten: lost * LOSS_SHARES.uneaten, faeces: lost * LOSS_SHARES.faeces,
    });
  }
  return out;
}

/**
 * Silver Springs, Florida (H. T. Odum, 1957): energy assimilated per year by each trophic level.
 * Odum's values were in kcal m⁻² yr⁻¹; converted here to kJ (× 4.184) and rounded to 3 significant figures.
 */
export const SILVER_SPRINGS_KCAL = { sunlight: 1_700_000, producers: 20_810, primary: 3_368, secondary: 383, tertiary: 21, decomposers: 5_060 } as const;
export const KCAL_TO_KJ = 4.184;
const kj = (kcal: number) => Number((kcal * KCAL_TO_KJ).toPrecision(3));
export const silverSprings = {
  sunlight: kj(SILVER_SPRINGS_KCAL.sunlight),
  decomposers: kj(SILVER_SPRINGS_KCAL.decomposers),
  levels: [
    { name: LEVEL_NAMES[0], energy: kj(SILVER_SPRINGS_KCAL.producers) },
    { name: LEVEL_NAMES[1], energy: kj(SILVER_SPRINGS_KCAL.primary) },
    { name: LEVEL_NAMES[2], energy: kj(SILVER_SPRINGS_KCAL.secondary) },
    { name: LEVEL_NAMES[3], energy: kj(SILVER_SPRINGS_KCAL.tertiary) },
  ],
};

/** Formats kJ values with thousands separators; small values keep one decimal place. */
export function fmtKJ(v: number): string {
  if (v >= 100) return Math.round(v).toLocaleString('en-GB');
  if (v >= 1) return v.toFixed(1).replace(/\.0$/, '');
  return v.toPrecision(2);
}
