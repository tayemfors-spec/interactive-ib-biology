import { describe, expect, it } from 'vitest';
import { EARTH_AGE, GOE, clock, events, eventsBy, formatAge, latestEvent, lifeEvidence, oxygen } from '../../src/sims/models/a2-1-timeline';

const ga = (id: string) => events.find((e) => e.id === id)!.ga;

describe('A2.1 early-Earth timeline model', () => {
  it('lists events from oldest to youngest, starting with the formation of the Earth', () => {
    for (let i = 1; i < events.length; i++) expect(events[i]!.ga).toBeLessThanOrEqual(events[i - 1]!.ga);
    expect(events[0]!.id).toBe('earth');
    expect(events[0]!.ga).toBe(EARTH_AGE);
  });

  it('uses well-established anchor dates', () => {
    expect(EARTH_AGE).toBeCloseTo(4.54, 2);
    expect(ga('goe')).toBeCloseTo(2.4, 1);
    expect(ga('stromatolites')).toBeGreaterThanOrEqual(3.4);
    expect(ga('stromatolites')).toBeLessThanOrEqual(3.5);
    // Dresser Formation stromatolites, the older Pilbara date quoted on the page
    expect(ga('stromatolites')).toBeCloseTo(3.48, 2);
  });

  it('keeps the biological order: LUCA before the oldest accepted fossils, which come before oxygenation and eukaryotes', () => {
    expect(ga('luca')).toBeGreaterThan(ga('stromatolites'));
    expect(ga('stromatolites')).toBeGreaterThan(GOE);
    expect(GOE).toBeGreaterThan(ga('eukaryotes'));
    expect(ga('eukaryotes')).toBeGreaterThan(ga('cambrian'));
  });

  it('gives every debated date a range of estimates that contains the best estimate', () => {
    for (const e of events.filter((x) => x.certainty === 'debated' && x.range)) {
      expect(e.range![0]).toBeGreaterThanOrEqual(e.ga);
      expect(e.range![1]).toBeLessThanOrEqual(e.ga);
    }
    expect(events.find((e) => e.id === 'luca')!.certainty).toBe('debated');
  });

  it('maps Earth history onto a 24-hour clock', () => {
    expect(clock(EARTH_AGE)).toBe('00:00:00');
    expect(clock(0)).toBe('24:00:00');
    expect(clock(EARTH_AGE / 2)).toBe('12:00:00');
    // modern humans appear in the last few seconds before midnight
    const [h, m] = clock(ga('humans')).split(':').map(Number);
    expect(h).toBe(23);
    expect(m).toBe(59);
  });

  it('has no free oxygen before the Great Oxidation Event', () => {
    expect(oxygen(3.5)).toBe('none');
    expect(oxygen(2.0)).toBe('present');
  });

  it('only reports evidence of life once rocks of that age carry it', () => {
    expect(lifeEvidence(4.5)).toBe('none');
    expect(lifeEvidence(3.9)).toBe('disputed');
    expect(lifeEvidence(3.6)).toBe('isotopic');
    expect(lifeEvidence(3.0)).toBe('fossil');
    // fossil evidence starts with the 3.48 Ga Dresser stromatolites
    expect(lifeEvidence(3.48)).toBe('fossil');
    expect(lifeEvidence(3.5)).toBe('isotopic');
  });

  it('finds the most recent event by a given time', () => {
    expect(latestEvent(EARTH_AGE)!.id).toBe('earth');
    expect(latestEvent(3.0)!.id).toBe('stromatolites');
    expect(latestEvent(0)!.id).toBe('humans');
    expect(eventsBy(0)).toHaveLength(events.length);
  });

  it('formats ages for reading', () => {
    expect(formatAge(0)).toBe('today');
    expect(formatAge(2.4)).toBe('2.40 billion years ago');
    expect(formatAge(0.54)).toBe('540 million years ago');
  });
});
