/**
 * Physical properties of water, air and methane used by the A1.1 properties simulation.
 * Values are standard reference values at 20 °C and 1 atm (sea-level pressure) unless stated; see
 * src/content/topics/a1-1/facts.yaml for sources. The derived quantities use simple textbook physics:
 *  - buoyancy (Archimedes): a fully immersed body is pushed up by the weight of fluid it displaces,
 *    so the share of its weight supported = fluid density ÷ body density;
 *  - heat conduction (Fourier's law) through a still layer: flux = k × ΔT ÷ thickness;
 *  - heat released on cooling: Q = mass × specific heat capacity × ΔT.
 */
export interface FluidProps {
  /** kg m⁻³ */ density: number;
  /** Pa s (= kg m⁻¹ s⁻¹) */ viscosity: number;
  /** W m⁻¹ K⁻¹ */ conductivity: number;
  /** J g⁻¹ K⁻¹ (at constant pressure) */ specificHeat: number;
}

export const WATER: FluidProps = { density: 998, viscosity: 1.0e-3, conductivity: 0.598, specificHeat: 4.18 };
export const AIR: FluidProps = { density: 1.204, viscosity: 1.81e-5, conductivity: 0.0257, specificHeat: 1.005 };
export const SEAWATER_DENSITY = 1025; // kg m⁻³, typical surface seawater (salinity ≈ 35 g kg⁻¹)

export type Property = keyof FluidProps;
/** How many times larger the value is for water than for air. */
export const ratio = (p: Property) => WATER[p] / AIR[p];

/** Heat capacity of one litre (J K⁻¹): density (kg m⁻³ = g L⁻¹) × specific heat capacity (J g⁻¹ K⁻¹). */
export const heatCapacityPerLitre = (m: FluidProps) => m.density * m.specificHeat;
/** Heat (J) released when one litre cools by dT kelvin (°C). */
export const heatReleasedPerLitre = (m: FluidProps, dT: number) => heatCapacityPerLitre(m) * dT;
/** Ratio of heat capacity per unit volume, water ÷ air (≈ 3,400–3,500). */
export const volumetricRatio = () => heatCapacityPerLitre(WATER) / heatCapacityPerLitre(AIR);

/** Conductive heat flow (W m⁻²) through a still layer `mm` millimetres thick with a temperature difference dT. */
export const conductiveFlux = (m: FluidProps, dT: number, mm = 10) => (m.conductivity * dT) / (mm / 1000);

/**
 * Fraction of a fully immersed body's weight that the fluid supports (capped at 1).
 * If the fluid is at least as dense as the body, the body floats and is fully supported.
 */
export function supportedFraction(bodyDensity: number, fluidDensity: number): number {
  return Math.min(1, fluidDensity / bodyDensity);
}
export type Buoyancy = 'floats' | 'neutral' | 'sinks';
export function buoyancy(bodyDensity: number, fluidDensity: number): Buoyancy {
  const d = (bodyDensity - fluidDensity) / fluidDensity;
  return Math.abs(d) < 0.002 ? 'neutral' : d < 0 ? 'floats' : 'sinks';
}
/** Plain-English fate of a fully immersed body (used by the sim readout). */
export function buoyancyText(bodyDensity: number, fluidDensity: number): string {
  const b = buoyancy(bodyDensity, fluidDensity);
  if (b === 'neutral') return 'it is neutrally buoyant: it neither sinks nor floats';
  if (b === 'floats') return 'it floats';
  return (bodyDensity - fluidDensity) / fluidDensity < 0.03
    ? 'it is almost neutrally buoyant and sinks very slowly'
    : 'it sinks';
}

// ---------- water versus methane ----------
export interface Substance {
  name: string;
  formula: string;
  /** g mol⁻¹ */ molarMass: number;
  /** °C at 1 atm */ meltingPoint: number;
  /** °C at 1 atm */ boilingPoint: number;
  /** J g⁻¹, at the boiling point */ latentHeatVap: number;
  /** J g⁻¹ K⁻¹, liquid */ specificHeatLiquid: number;
  hydrogenBonds: boolean;
}
export const WATER_SUB: Substance = { name: 'Water', formula: 'H₂O', molarMass: 18.02, meltingPoint: 0, boilingPoint: 100, latentHeatVap: 2257, specificHeatLiquid: 4.18, hydrogenBonds: true };
export const METHANE: Substance = { name: 'Methane', formula: 'CH₄', molarMass: 16.04, meltingPoint: -182.5, boilingPoint: -161.5, latentHeatVap: 510, specificHeatLiquid: 3.5, hydrogenBonds: false };

export type State = 'solid' | 'liquid' | 'gas';
export function stateAt(s: Substance, tempC: number): State {
  if (tempC < s.meltingPoint) return 'solid';
  if (tempC < s.boilingPoint) return 'liquid';
  return 'gas';
}
/** Width of the liquid range in °C (water ≈ 100, methane ≈ 21). */
export const liquidRange = (s: Substance) => s.boilingPoint - s.meltingPoint;

/** Round to `n` significant figures for display, with thousands separators (e.g. 3,450). */
export function sig(x: number, n = 3): string {
  if (x === 0) return '0';
  return Number(x.toPrecision(n)).toLocaleString('en-GB', { maximumFractionDigits: 6 });
}
