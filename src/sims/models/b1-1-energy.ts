/**
 * B1.1.11 energy storage and insulation.
 *
 * Storage: mass needed to store a given amount of energy as triglyceride (fat) or as glycogen.
 *  - Energy released by oxidation in respiration: triglyceride ≈ 37 kJ g⁻¹, glycogen ≈ 17 kJ g⁻¹
 *    (standard physiological fuel values; gross energies are ≈ 39 and ≈ 17.5 kJ g⁻¹).
 *  - Glycogen is hydrophilic and is stored with water: roughly 3 g of water per gram of glycogen
 *    (published estimates range from about 2 to 4 g). Fat droplets in adipocytes hold almost no water.
 *
 * Insulation (qualitative model): steady heat flow from the body core (37 °C) through a layer of
 * subcutaneous fat to the surroundings, q = ΔT / (R_tissue + d/k_fat + 1/h), per m² of skin.
 *  - k_fat ≈ 0.21 W m⁻¹ K⁻¹ (adipose tissue; muscle ≈ 0.5, water ≈ 0.6).
 *  - R_tissue: fixed resistance of skin and other tissue (0.03 m² K W⁻¹).
 *  - h: heat transfer coefficient to the surroundings, much higher in water than in still air
 *    (illustrative values 10 W m⁻² K⁻¹ for air, 200 W m⁻² K⁻¹ for water).
 */
export const KJ_PER_G = { fat: 37, glycogen: 17 } as const;
export const WATER_PER_G_GLYCOGEN = 3;

export function storageMass(energyKJ: number, waterPerGram = WATER_PER_G_GLYCOGEN) {
  const fat = energyKJ / KJ_PER_G.fat;
  const glycogenDry = energyKJ / KJ_PER_G.glycogen;
  const glycogenWet = glycogenDry * (1 + waterPerGram);
  return { fat, glycogenDry, glycogenWet, ratio: glycogenWet / fat };
}

export const K_FAT = 0.21; // W m⁻¹ K⁻¹
export const R_TISSUE = 0.03; // m² K W⁻¹
export const H = { air: 10, water: 200 } as const;
export const CORE = 37;
export type Medium = keyof typeof H;

/** Heat loss in W per m² of body surface with a fat layer `fatCm` thick, surroundings at `envC` (°C). */
export function heatLoss(fatCm: number, envC: number, medium: Medium) {
  const dT = Math.max(0, CORE - envC);
  return dT / (R_TISSUE + Math.max(0, fatCm) / 100 / K_FAT + 1 / H[medium]);
}

/** Heat loss as a percentage of the loss with no fat layer, in the same conditions. */
export const relativeLoss = (fatCm: number, envC: number, medium: Medium) => {
  const bare = heatLoss(0, envC, medium);
  return bare === 0 ? 100 : (100 * heatLoss(fatCm, envC, medium)) / bare;
};

/** Format a mass in g with sensible rounding, switching to kg above 1000 g (SI prefix kilo). */
export function formatMass(g: number) {
  if (g >= 1000) return `${(g / 1000).toFixed(g >= 10000 ? 1 : 2)} kg`;
  if (g >= 100) return `${Math.round(g)} g`;
  return `${g.toFixed(1)} g`;
}
