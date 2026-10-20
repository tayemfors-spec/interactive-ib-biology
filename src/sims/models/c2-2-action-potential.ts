/**
 * Qualitative membrane potential of one patch of axon membrane during an action potential (mV vs ms),
 * used by the C2.2 action-potential animation. Shape: resting −70 mV; a stimulus raises it to the
 * threshold (−50 mV) at 1.6 ms; voltage-gated Na⁺ channels open and it rises steeply to a peak of
 * +35 mV at 2.0 ms; K⁺ efflux repolarizes it to a −80 mV undershoot at 3.2 ms; it then relaxes back
 * to −70 mV. Values match those used in B2.1 (threshold ≈ −50, peak ≈ +30 to +40 mV).
 */
export const REST = -70;
export const THRESHOLD = -50;
export const PEAK = 35;
export const UNDERSHOOT = -80;
export const T_STIM = 1.0;
export const T_THRESHOLD = 1.6;
export const T_PEAK = 2.0;
export const T_MIN = 3.2;

export function membranePotential(t: number): number {
  if (t < T_STIM) return REST;
  if (t < T_THRESHOLD) {
    const u = (t - T_STIM) / (T_THRESHOLD - T_STIM);
    return REST + (THRESHOLD - REST) * u ** 1.6;
  }
  if (t < T_PEAK) {
    const u = (t - T_THRESHOLD) / (T_PEAK - T_THRESHOLD);
    return THRESHOLD + (PEAK - THRESHOLD) * (1 - (1 - u) ** 2.2);
  }
  if (t < T_MIN) {
    const u = (t - T_PEAK) / (T_MIN - T_PEAK);
    return UNDERSHOOT + ((PEAK - UNDERSHOOT) * (1 + Math.cos(Math.PI * u))) / 2;
  }
  return REST + (UNDERSHOOT - REST) * Math.exp(-(t - T_MIN) / 0.7);
}

/** Channel states for a patch at local time t (ms), as taught at IB level. */
export function naChannel(t: number): 'closed' | 'open' | 'inactivated' {
  if (t < T_THRESHOLD) return 'closed';
  if (t < T_PEAK) return 'open'; // inactivate at the peak, when K⁺ channels open
  if (t < 3.5) return 'inactivated';
  return 'closed';
}
export const kChannelOpen = (t: number) => t >= T_PEAK && t < 3.6;

/** Delay (ms) between region 2 and region 3 in the animation. */
export const REGION_DELAY = 0.55;

/** Trace time window (ms) covered by each animation step. */
export const STEP_WINDOWS: [number, number][] = [[0, 1], [1, 1.6], [1.6, 2.0], [2.0, 2.15], [2.15, 2.7], [2.7, 3.3], [3.3, 6.0]];

/** Impulses per second from a count of action potentials in a time window (ms). */
export const impulseFrequency = (count: number, windowMs: number) => count / (windowMs / 1000);
