import { describe, expect, it } from 'vitest';
import { CYCLE, OVULATION_DAY, endometrium, levels, ovary, peakDay, phaseAt } from '../../src/sims/models/d3-1-menstrual';

describe('D3.1 menstrual cycle model', () => {
  it('LH peaks sharply at ovulation (about day 14) and is the highest hormone there', () => {
    expect(peakDay('lh')).toBeCloseTo(OVULATION_DAY, 0);
    const at = levels(OVULATION_DAY);
    expect(at.lh).toBeGreaterThan(at.fsh);
    expect(at.lh).toBeGreaterThan(3 * levels(8).lh);
    expect(at.lh).toBeGreaterThan(3 * levels(21).lh);
  });

  it('oestradiol peaks just before the LH surge, and falls after ovulation', () => {
    const p = peakDay('oestradiol');
    expect(p).toBeLessThan(OVULATION_DAY);
    expect(p).toBeGreaterThan(OVULATION_DAY - 3);
    expect(levels(15).oestradiol).toBeLessThan(0.5 * levels(p).oestradiol);
    // a smaller second rise from the corpus luteum
    expect(levels(21).oestradiol).toBeGreaterThan(levels(16).oestradiol);
    expect(levels(21).oestradiol).toBeLessThan(levels(p).oestradiol);
  });

  it('progesterone is low before ovulation and peaks in the luteal phase', () => {
    const p = peakDay('progesterone');
    expect(p).toBeGreaterThan(18);
    expect(p).toBeLessThan(24);
    for (const d of [2, 6, 10, 13]) expect(levels(d).progesterone).toBeLessThan(0.15 * levels(p).progesterone);
  });

  it('without pregnancy, progesterone falls before menstruation and FSH rises again', () => {
    expect(levels(28).progesterone).toBeLessThan(0.2 * levels(21).progesterone);
    expect(levels(28).fsh).toBeGreaterThan(levels(21).fsh);
    expect(levels(3).fsh).toBeGreaterThan(levels(10).fsh); // early FSH rise, then negative feedback
  });

  it('FSH and LH are kept low in the luteal phase by negative feedback', () => {
    const lut = levels(21);
    expect(lut.fsh).toBeLessThan(levels(3).fsh);
    expect(lut.lh).toBeLessThan(0.25 * levels(OVULATION_DAY).lh);
  });

  it('is continuous across the end of one cycle and the start of the next', () => {
    const a = levels(CYCLE), b = levels(1);
    for (const k of ['fsh', 'lh', 'oestradiol', 'progesterone'] as const) expect(Math.abs(a[k] - b[k])).toBeLessThan(8);
  });

  it('the endometrium is shed during menstruation, thickens under oestradiol and is thickest in the luteal phase', () => {
    expect(endometrium(5)).toBeLessThan(endometrium(1));
    expect(endometrium(12)).toBeGreaterThan(endometrium(6));
    expect(endometrium(22)).toBeGreaterThan(endometrium(OVULATION_DAY));
    expect(endometrium(22)).toBeCloseTo(1);
  });

  it('the follicle grows until ovulation, then the corpus luteum forms', () => {
    expect(ovary(12).follicle).toBeGreaterThan(ovary(5).follicle);
    expect(ovary(16).follicle).toBe(0);
    expect(ovary(OVULATION_DAY).state).toBe('ovulation');
    expect(ovary(20).state).toBe('corpus-luteum');
    expect(ovary(27).corpusLuteum).toBeLessThan(ovary(21).corpusLuteum);
  });

  it('phases follow the textbook order', () => {
    expect(phaseAt(2).id).toBe('menstruation');
    expect(phaseAt(9).id).toBe('follicular');
    expect(phaseAt(12.5).id).toBe('pre-ovulation');
    expect(phaseAt(14).id).toBe('ovulation');
    expect(phaseAt(19).id).toBe('luteal');
    expect(phaseAt(26).id).toBe('late-luteal');
    expect(phaseAt(19).feedback).toMatch(/negative feedback/i);
    expect(phaseAt(12.5).feedback).toMatch(/positive feedback/i);
  });

  it('if an embryo implants, progesterone stays high, FSH/LH stay low and the endometrium is kept', () => {
    const preg = { pregnant: true };
    expect(levels(28, preg).progesterone).toBeGreaterThan(4 * levels(28).progesterone);
    expect(levels(28, preg).fsh).toBeLessThan(levels(28).fsh);
    expect(endometrium(28, preg)).toBe(1);
    expect(ovary(27, preg).state).toBe('corpus-luteum-maintained');
    expect(phaseAt(26, preg).id).toBe('pregnant');
    // before implantation the two cycles are identical
    expect(levels(14, preg)).toEqual(levels(14));
  });
});
