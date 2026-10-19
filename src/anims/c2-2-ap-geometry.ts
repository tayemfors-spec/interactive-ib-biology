/** Shared layout for the C2.2 action-potential animation (used by the .astro SVG and the driver). */
type XY = [number, number];
type Move = { start: XY; end: XY };
export const AP = {
  mem: { top: 94, bottom: 134 },
  ch: { pump: 62, leak: 140, na2: 230, k2: 305, na3: 400, k3: 475 },
  ions: {
    // enter region 2 (depolarisation), then diffuse along the inside to region 3 (local currents)
    naA: [
      { start: [212, 56], inside: [216, 182], far: [338, 180] },
      { start: [236, 44], inside: [240, 200], far: [360, 200] },
      { start: [258, 62], inside: [260, 178], far: [380, 176] },
    ] as { start: XY; inside: XY; far: XY }[],
    // outside: Na⁺ diffuses from region 3 towards region 2 (local currents)
    naO: [{ start: [446, 52], end: [334, 60] }, { start: [470, 66], end: [356, 44] }] as Move[],
    // enter region 3 when it depolarises
    naB: [{ start: [386, 46], end: [412, 184] }, { start: [410, 64], end: [432, 204] }] as Move[],
    // leave region 2 (repolarisation; the 4th during hyperpolarisation)
    kA: [{ start: [270, 190], end: [270, 50] }, { start: [292, 208], end: [292, 64] }, { start: [316, 190], end: [314, 44] }, { start: [290, 170], end: [246, 62] }] as Move[],
    // leave region 3 (repolarisation)
    kB: [{ start: [466, 186], end: [462, 50] }, { start: [490, 204], end: [490, 62] }] as Move[],
    // Na⁺/K⁺ pump in region 1: one cycle during the resting step, one during recovery
    pNa: [{ start: [30, 178], end: [24, 58] }, { start: [56, 198], end: [50, 44] }, { start: [84, 180], end: [80, 60] }] as Move[],
    pK: [{ start: [108, 46], end: [44, 210] }, { start: [118, 68], end: [70, 212] }] as Move[],
    qNa: [{ start: [108, 182], end: [100, 40] }, { start: [134, 200], end: [112, 64] }, { start: [158, 178], end: [132, 44] }] as Move[],
    qK: [{ start: [150, 64], end: [52, 186] }, { start: [166, 42], end: [80, 190] }] as Move[],
  },
};

/** Oscilloscope axes: time 0–6 ms, potential −90 to +50 mV. */
export const apX = (t: number) => 60 + (t / 6) * 444;
export const apY = (v: number) => 438 - ((v + 90) / 140) * 156;
