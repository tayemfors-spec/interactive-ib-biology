/**
 * Qualitative model of transport rate across a membrane (arbitrary units).
 * x = concentration outside minus inside; positive rate = net movement into the cell.
 *  - Simple diffusion: rate ∝ concentration difference (Fick's law, fixed area and thickness).
 *  - Facilitated diffusion: also passive, so it follows the gradient, but saturates when every
 *    channel/carrier is in use (hyperbolic in the difference; plateau ∝ number of proteins).
 *  - Active transport: moves particles in regardless of the gradient; rate set by the number of pumps
 *    and the ATP supply (which depends on aerobic respiration, hence oxygen).
 */
export interface TransportParams { channels: number; pumps: number; atp: number }

export const simpleRate = (dc: number) => 0.45 * dc;

export function facilitatedRate(dc: number, channels: number): number {
  const vmax = 0.9 * channels;
  const km = 2;
  return (vmax * dc) / (km + Math.abs(dc));
}

/** `atp` is 0–1 (fraction of normal ATP supply). */
export const activeRate = (_dc: number, pumps: number, atp: number) => 0.7 * pumps * Math.max(0, Math.min(1, atp));
