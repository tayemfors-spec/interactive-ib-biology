/**
 * C1.3 chromatography of photosynthetic pigments.
 *
 * Rf = distance moved by the spot ÷ distance moved by the solvent (both measured from the origin line).
 * The Rf values below are typical for thin-layer chromatography of a leaf extract in a non-polar running
 * solvent (for example petroleum ether with a little propanone). They are approximate: they change with
 * the solvent, the paper or TLC plate, the temperature and how far the solvent runs, so pigments are
 * identified by colour and by the order of the spots as well as by Rf.
 */
export interface PigmentSpot { id: string; name: string; colour: string; rf: number; note: string }

export const pigments: PigmentSpot[] = [
  { id: 'carotene', name: 'β-carotene', colour: 'orange-yellow', rf: 0.92, note: 'A carotenoid. Least polar, so it stays dissolved in the running solvent and travels furthest.' },
  { id: 'phaeophytin', name: 'Phaeophytin', colour: 'grey', rf: 0.78, note: 'Chlorophyll that has lost its magnesium ion, usually a breakdown product formed during extraction. Often faint.' },
  { id: 'chla', name: 'Chlorophyll a', colour: 'blue-green', rf: 0.62, note: 'The main photosynthetic pigment, including the reaction-centre chlorophylls.' },
  { id: 'chlb', name: 'Chlorophyll b', colour: 'yellow-green', rf: 0.5, note: 'An accessory pigment. Slightly more polar than chlorophyll a, so it moves a little less far.' },
  { id: 'xanthophyll1', name: 'Xanthophyll (e.g. lutein)', colour: 'yellow', rf: 0.38, note: 'Xanthophylls are carotenoids that contain oxygen, so they are more polar than carotene and move less far.' },
  { id: 'xanthophyll2', name: 'Xanthophyll (e.g. violaxanthin)', colour: 'yellow', rf: 0.27, note: 'A more polar xanthophyll; it is attracted to the stationary phase and moves least far.' },
];

/** Rf from measured distances (same units, both from the origin). */
export function rf(spotDistance: number, solventDistance: number): number {
  if (!(solventDistance > 0)) throw new RangeError('The solvent must have moved a positive distance');
  if (spotDistance < 0 || spotDistance > solventDistance) throw new RangeError('A spot cannot move further than the solvent front');
  return spotDistance / solventDistance;
}

/** How far a pigment's spot has moved when the solvent front has moved `solventDistance`. */
export const spotDistance = (rfValue: number, solventDistance: number) => rfValue * solventDistance;

/** The reference pigment with the nearest Rf, or null if none lies within `tolerance`. */
export function identify(rfValue: number, tolerance = 0.06): PigmentSpot | null {
  let best: PigmentSpot | null = null;
  for (const p of pigments) if (!best || Math.abs(p.rf - rfValue) < Math.abs(best.rf - rfValue)) best = p;
  return best && Math.abs(best.rf - rfValue) <= tolerance ? best : null;
}

/** Round to 2 decimal places, as Rf values are usually quoted. */
export const round2 = (v: number) => Math.round(v * 100) / 100;
