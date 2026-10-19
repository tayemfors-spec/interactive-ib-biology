/**
 * Qualitative model of membrane fluidity (0 = rigid gel, 1 = very fluid).
 *  - Unsaturated (cis-kinked) fatty acids lower the melting point of the bilayer.
 *  - Fluidity rises with temperature around that melting point (logistic curve).
 *  - Cholesterol buffers fluidity: it pulls the value towards the middle, reducing fluidity
 *    when warm and preventing the tails solidifying when cold (B2.1.12).
 */
export interface FluidityParams { temp: number; unsat: number; chol: number } // °C, % unsaturated, % cholesterol (0–40)

export const meltingPoint = (unsatPct: number) => 40 - 0.55 * unsatPct;

export function fluidity({ temp, unsat, chol }: FluidityParams): number {
  const f0 = 1 / (1 + Math.exp(-(temp - meltingPoint(unsat)) / 5));
  const c = Math.max(0, Math.min(40, chol)) / 40;
  return f0 + 0.75 * c * (0.5 - f0);
}

export type FluidState = 'rigid' | 'fluid' | 'leaky';
export const classify = (f: number): FluidState => (f < 0.25 ? 'rigid' : f > 0.8 ? 'leaky' : 'fluid');
export const stateText: Record<FluidState, string> = {
  rigid: 'Too rigid: tails pack tightly into a gel, so the membrane is stiff and could crack.',
  fluid: 'Fluid but stable: the normal working state. Lipids and proteins move sideways, and vesicles can form and fuse.',
  leaky: 'Very fluid: phospholipids move so much that the membrane becomes leaky to ions and weaker.',
};
