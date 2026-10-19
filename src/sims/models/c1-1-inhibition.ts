/**
 * Competitive and non-competitive (allosteric) inhibition, qualitative model (C1.1.14, C1.1.15).
 * Arbitrary units: Vmax = 100, Km = 2, Ki = 1 for both inhibitors.
 *
 *  - Competitive: inhibitor and substrate compete for the same active site, so at high [S] the
 *    substrate wins nearly every vacancy and the rate approaches the same Vmax as with no inhibitor.
 *    v = Vmax·S / (Km(1 + I/Ki) + S)
 *  - Non-competitive: inhibitor binds an allosteric site, so substrate cannot displace it; a fixed
 *    share of enzyme molecules is out of action at every [S], and Vmax is lowered.
 *    v = Vmax·S / ((Km + S)(1 + I/Ki))
 */
export const VMAX = 100;
export const KM = 2;
export const KI = 1;

export const none = (s: number) => (VMAX * s) / (KM + s);
export const competitive = (s: number, i: number) => (VMAX * s) / (KM * (1 + i / KI) + s);
export const nonCompetitive = (s: number, i: number) => (VMAX * s) / ((KM + s) * (1 + i / KI));

export type Mode = 'competitive' | 'noncompetitive';
export const rateFor = (mode: Mode, s: number, i: number) => (mode === 'competitive' ? competitive(s, i) : nonCompetitive(s, i));

/**
 * Share of enzyme molecules in each state at a moment, for the picture of 12 enzymes.
 * Competitive: free / substrate in active site / inhibitor in active site.
 * Non-competitive: inhibitor on the allosteric site (inactive) is independent of [S].
 */
export function states(mode: Mode, s: number, i: number) {
  const a = s / KM, b = i / KI;
  if (mode === 'competitive') {
    const d = 1 + a + b;
    return { free: 1 / d, substrate: a / d, inhibitor: b / d };
  }
  // inhibitor binding and substrate binding are independent; count inhibitor-bound as inhibited
  const inh = b / (1 + b);
  const sub = (1 - inh) * (a / (1 + a));
  return { free: 1 - inh - sub, substrate: sub, inhibitor: inh };
}
