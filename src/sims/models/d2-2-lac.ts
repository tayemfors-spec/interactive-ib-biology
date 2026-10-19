/**
 * Qualitative model of the lac genes of E. coli responding to lactose (D2.2.11).
 *
 *  - Without lactose, the lac repressor protein binds the operator next to the promoter and
 *    blocks RNA polymerase, so the lac genes are hardly transcribed (a low basal level remains).
 *  - Lactose that enters is converted to allolactose, which binds the repressor and changes its
 *    shape so it can no longer bind the operator. RNA polymerase can then transcribe the genes.
 *  - The model assumes no glucose is available (glucose lowers lac expression even when lactose is present).
 *
 * Lactose is on an arbitrary scale 0–4 (none, trace, low, medium, high).
 */
export const LACTOSE_LEVELS = ['none', 'a trace', 'low', 'medium', 'high'] as const;
const K = 1.5; // lactose level at which half the repressor molecules are inactivated
const BASAL = 0.02;

/** Fraction of repressor molecules inactivated by allolactose (0–1). */
export function repressorInactive(lactose: number): number {
  const L = Math.max(0, lactose);
  return (L * L) / (K * K + L * L);
}

/** Fraction of the time the operator is occupied by an active repressor (0–1). */
export const operatorBlocked = (lactose: number) => 1 - repressorInactive(lactose);

/** Relative rate of transcription of the lac genes (0–1). */
export function lacExpression(lactose: number): number {
  return BASAL + (1 - BASAL) * repressorInactive(lactose);
}

export function describeLac(lactose: number): string {
  const lvl = LACTOSE_LEVELS[Math.max(0, Math.min(4, Math.round(lactose)))]!;
  const e = lacExpression(lactose);
  if (lactose <= 0)
    return 'No lactose: the repressor is bound to the operator, so RNA polymerase cannot transcribe the lac genes. Only a very low, basal level of the proteins is made.';
  const pct = Math.round(repressorInactive(lactose) * 100);
  return `Lactose ${lvl}: allolactose has inactivated about ${pct}% of the repressor molecules, so the operator is free more of the time and the lac genes are transcribed ${e > 0.7 ? 'at a high rate' : e > 0.3 ? 'at a moderate rate' : 'slowly'}. β-galactosidase (lactase) made from them hydrolyses lactose to glucose and galactose.`;
}
