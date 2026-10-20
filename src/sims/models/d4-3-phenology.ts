/**
 * Phenological mismatch between great tits (Parus major) and winter moth caterpillars (D4.3.10).
 * QUALITATIVE MODEL, loosely based on the long-term study of great tits at Hoge Veluwe, the Netherlands
 * (Visser et al. 1998, 2021): warmer springs have advanced the caterpillar peak more than the birds'
 * laying date, so chicks now tend to need most food after the caterpillar peak.
 *
 * Dates are days after 31 March (day 1 = 1 April). The baseline is chosen so that, at the reference
 * spring temperature, the chicks' peak food demand coincides with the caterpillar peak. The sensitivities
 * (days earlier per °C) are illustrative, not fitted values; sources and caveats are in facts.yaml.
 */

/** Caterpillar biomass peak at the reference spring temperature: day 50 = 20 May. */
export const CATERPILLAR_PEAK_BASE = 50;
/** How much earlier the caterpillar peak comes per °C of spring warming (temperature-driven via oak budburst and egg hatching). */
export const CATERPILLAR_SHIFT = 6;
/** Mean first-egg date at the reference temperature: day 20 = 20 April. */
export const LAYING_BASE = 20;
/** First egg → hatching: about 9 eggs laid one a day, then about 12 days of incubation. */
export const HATCH_AFTER_LAYING = 21;
/** Chicks' food demand peaks about 9 days after hatching. */
export const DEMAND_AFTER_HATCH = 9;
/** Spread (standard deviation, days) of the caterpillar biomass peak and of the chicks' food demand. */
export const CATERPILLAR_SD = 7;
export const DEMAND_SD = 6;
/** Mismatch (days) at which breeding success falls to about 61% of its maximum (one s.d. of the curve). */
export const SUCCESS_SD = 8;
/** Fledglings per nest when perfectly matched (illustrative). */
export const MAX_FLEDGLINGS = 7.5;
/** Latitude of Hoge Veluwe (°N), used for day length. */
export const LATITUDE = 52;

export const TEMP_MIN = -1;
export const TEMP_MAX = 3;
export const RESPONSE_MIN = 0;
export const RESPONSE_MAX = 6;

export const caterpillarPeak = (dT: number) => CATERPILLAR_PEAK_BASE - CATERPILLAR_SHIFT * dT;
/** `response` = how many days earlier the birds lay per °C of warming (photoperiod-cued birds respond weakly). */
export const layingDate = (dT: number, response: number) => LAYING_BASE - response * dT;
export const hatchDate = (dT: number, response: number) => layingDate(dT, response) + HATCH_AFTER_LAYING;
export const demandPeak = (dT: number, response: number) => hatchDate(dT, response) + DEMAND_AFTER_HATCH;

/** Days by which the chicks' peak demand comes after the caterpillar peak (positive = birds too late). */
export const mismatch = (dT: number, response: number) => demandPeak(dT, response) - caterpillarPeak(dT);

/** Relative breeding success (0–1): 1 when the peaks coincide, falling as the mismatch grows either way. */
export const success = (mismatchDays: number) => Math.exp(-(mismatchDays ** 2) / (2 * SUCCESS_SD ** 2));
export const fledglings = (mismatchDays: number) => MAX_FLEDGLINGS * success(mismatchDays);

const bell = (x: number, mu: number, sd: number) => Math.exp(-((x - mu) ** 2) / (2 * sd ** 2));
/** Caterpillar biomass relative to its peak (0–1) on a given day. */
export const caterpillars = (day: number, dT: number) => bell(day, caterpillarPeak(dT), CATERPILLAR_SD);
/** Chicks' food demand relative to its peak (0–1) on a given day. */
export const demand = (day: number, dT: number, response: number) => bell(day, demandPeak(dT, response), DEMAND_SD);

/** Day length (hours) at latitude `lat` on day `day` after 31 March (non-leap year). */
export function dayLength(day: number, lat = LATITUDE): number {
  const doy = 90 + day;
  const decl = (23.44 * Math.PI) / 180 * Math.sin((2 * Math.PI * (284 + doy)) / 365);
  const phi = (lat * Math.PI) / 180;
  const x = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl)));
  return (24 / Math.PI) * Math.acos(x);
}

const MONTH_NAMES = ['April', 'May', 'June', 'July'];
const MONTH_LEN = [30, 31, 30, 31];
/** "20 May" for a day number after 31 March (fractional days are rounded). */
export function dateLabel(day: number): string {
  let d = Math.round(day);
  for (let m = 0; m < MONTH_LEN.length; m++) {
    if (d <= MONTH_LEN[m]!) return `${Math.max(1, d)} ${MONTH_NAMES[m]}`;
    d -= MONTH_LEN[m]!;
  }
  return `${d} August`;
}

export interface Summary {
  dT: number; response: number;
  laying: number; hatch: number; demandPeak: number; caterpillarPeak: number;
  mismatch: number; success: number; fledglings: number; dayLengthAtLaying: number;
}
export function summary(dT: number, response: number): Summary {
  const m = mismatch(dT, response);
  return {
    dT, response,
    laying: layingDate(dT, response), hatch: hatchDate(dT, response), demandPeak: demandPeak(dT, response),
    caterpillarPeak: caterpillarPeak(dT), mismatch: m, success: success(m), fledglings: fledglings(m),
    dayLengthAtLaying: dayLength(layingDate(dT, response)),
  };
}
