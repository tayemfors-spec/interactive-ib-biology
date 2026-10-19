import { describe, expect, it } from 'vitest';
import { MASS_THRESHOLD, indexAfter, isMass, lpiRegions, lpiSystems, massExtinctions, redList, today } from '../../src/sims/models/a4-2-extinction-data';
import { categories, edgeScore, geOf, isEdge, isThreatened, species } from '../../src/sims/models/a4-2-edge';

describe('A4.2 extinction data', () => {
  it('lists the five mass extinctions in order from oldest to youngest', () => {
    expect(massExtinctions.map((e) => e.id)).toEqual(['ordovician', 'devonian', 'permian', 'triassic', 'cretaceous']);
    for (let i = 1; i < massExtinctions.length; i++) expect(massExtinctions[i]!.ma).toBeLessThan(massExtinctions[i - 1]!.ma);
    expect(massExtinctions.at(-1)!.ma).toBe(66);
  });
  it('every past event meets the mass-extinction threshold and the End-Permian is the largest', () => {
    for (const e of massExtinctions) expect(isMass(e.lost)).toBe(true);
    const max = massExtinctions.reduce((a, b) => (b.lost > a.lost ? b : a));
    expect(max.id).toBe('permian');
  });
  it('recorded modern extinctions are far below the threshold, even if all threatened mammals were lost', () => {
    expect(isMass(today.recorded)).toBe(false);
    expect(today.ifThreatenedLost).toBeLessThan(MASS_THRESHOLD);
    expect(today.ifThreatenedLost).toBe(redList.find((b) => b.id === 'mammals')!.value);
  });
  it('percentages are valid, and amphibians are the most threatened vertebrate group listed', () => {
    for (const b of [...redList, ...lpiRegions, ...lpiSystems]) { expect(b.value).toBeGreaterThan(0); expect(b.value).toBeLessThan(100); }
    const vertebrates = redList.filter((b) => ['amphibians', 'sharks', 'mammals', 'birds'].includes(b.id));
    expect(vertebrates.reduce((a, b) => (b.value > a.value ? b : a)).id).toBe('amphibians');
  });
  it('the Living Planet Index turns a decline into the index value remaining (1970 = 1)', () => {
    expect(indexAfter(73)).toBeCloseTo(0.27);
    expect(indexAfter(0)).toBe(1);
    expect(lpiSystems.find((b) => b.id === 'freshwater')!.value).toBeGreaterThan(lpiSystems.find((b) => b.id === 'marine')!.value);
  });
});

describe('A4.2 EDGE scoring', () => {
  it('codes the Red List from 0 (LC) to 4 (CR)', () => {
    expect(categories.map((c) => c.ge)).toEqual([0, 1, 2, 3, 4]);
    expect(isThreatened('VU')).toBe(true);
    expect(isThreatened('NT')).toBe(false);
  });
  it('rises with both distinctiveness and extinction risk', () => {
    expect(edgeScore(30, 3)).toBeGreaterThan(edgeScore(10, 3));
    expect(edgeScore(10, 4)).toBeGreaterThan(edgeScore(10, 3));
    expect(edgeScore(0, 0)).toBe(0);
  });
  it('one step up the Red List counts the same as doubling (1 + ED)', () => {
    const ed = 9;
    expect(edgeScore(ed, geOf('EN'))).toBeCloseTo(edgeScore(2 * (1 + ed) - 1, geOf('VU')));
  });
  it('EDGE species are both distinct and threatened; either alone is not enough', () => {
    const by = (id: string) => species.find((s) => s.id === id)!;
    expect(isEdge(by('echidna'))).toBe(true);
    expect(isEdge(by('ayeaye'))).toBe(true);
    expect(isEdge(by('tuatara'))).toBe(false); // very distinct, Least Concern
    expect(isEdge(by('mountainchicken'))).toBe(false); // Critically Endangered, many close relatives
    expect(isEdge(by('sparrow'))).toBe(false);
  });
});
