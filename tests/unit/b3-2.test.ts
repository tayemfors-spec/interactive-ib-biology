import { describe, expect, it } from 'vitest';
import { CYCLE, STAGES, ao, crossing, la, lv, valves } from '../../src/sims/models/b3-2-cardiac';
import { beatsIn, estimate, multiplier, resolution } from '../../src/sims/models/b3-2-pulse';
import { DEMAND, areaLeft, maxSupply, outcome, supply } from '../../src/sims/models/b3-2-occlusion';

const sample = (a: number, b: number, step = 0.001) => {
  const out: number[] = [];
  for (let t = a; t <= b + 1e-9; t += step) out.push(Number(t.toFixed(4)));
  return out;
};

describe('B3.2 cardiac cycle pressures (left side, 75 bpm)', () => {
  it('one cycle lasts 0.8 s at 75 beats per minute', () => expect(CYCLE).toBeCloseTo(0.8));

  it('aortic pressure stays between about 80 (diastolic) and 120 mmHg (systolic)', () => {
    const v = sample(0, CYCLE).map(ao);
    expect(Math.min(...v)).toBeGreaterThanOrEqual(79.5);
    expect(Math.max(...v)).toBeLessThanOrEqual(121);
    expect(Math.max(...v)).toBeGreaterThan(115);
  });

  it('left ventricle peaks at about 120 mmHg and falls close to zero in diastole; atrial pressure stays low', () => {
    const v = sample(0, CYCLE).map(lv);
    expect(Math.max(...v)).toBeGreaterThan(117);
    expect(Math.max(...v)).toBeLessThan(123);
    expect(Math.min(...v)).toBeLessThan(5);
    expect(Math.max(...sample(0, CYCLE).map(la))).toBeLessThan(15);
  });

  it('valves change state where the pressure curves cross', () => {
    const avClose = crossing((t) => lv(t) - la(t), 0.08, 0.2)!;
    const slOpen = crossing((t) => lv(t) - ao(t), 0.1, 0.3)!;
    const slClose = crossing((t) => ao(t) - lv(t), 0.3, 0.45)!;
    const avOpen = crossing((t) => la(t) - lv(t), 0.42, 0.55)!;
    expect(avClose).toBeGreaterThan(0.1);
    expect(avClose).toBeLessThan(0.105);
    expect(slOpen).toBeCloseTo(0.15, 2);
    expect(slClose).toBeCloseTo(0.4, 2);
    expect(avOpen).toBeGreaterThan(0.465);
    expect(avOpen).toBeLessThan(0.47);
    // order: AV closes → SL opens → SL closes → AV opens
    expect(avClose < slOpen && slOpen < slClose && slClose < avOpen).toBe(true);
  });

  it('the two valves are never open at the same time', () => {
    for (const t of sample(0, CYCLE)) { const v = valves(t); expect(v.av && v.sl).toBe(false); }
  });

  it('each animation stage ends in the valve state its caption describes', () => {
    const end = Object.fromEntries(STAGES.map((s) => [s.id, valves(s.to - 1e-6)]));
    expect(end['atrial-systole']).toEqual({ av: true, sl: false });
    expect(end['iso-contraction']).toEqual({ av: false, sl: false });
    expect(end['ejection']).toEqual({ av: false, sl: true });
    expect(end['iso-relaxation']).toEqual({ av: false, sl: false });
    expect(end['filling']).toEqual({ av: true, sl: false });
  });

  it('during ejection the ventricle is above the aorta, and in diastole below the atrium', () => {
    for (const t of sample(0.155, 0.39)) expect(lv(t)).toBeGreaterThan(ao(t));
    for (const t of sample(0.475, 0.79)) expect(lv(t)).toBeLessThan(la(t));
  });
});

describe('B3.2 pulse counting', () => {
  it('18 beats in 15 s is 72 beats per minute (×4)', () => {
    expect(multiplier(15)).toBe(4);
    expect(estimate(18, 15)).toBe(72);
    expect(estimate(36, 30)).toBe(72);
  });

  it('a perfect count is never more than one resolution step from of the true rate', () => {
    for (const bpm of [57, 64, 72, 75, 88, 103]) {
      for (const period of [15, 30, 60]) {
        for (const phase of [0, 0.13, 0.4, 0.71]) {
          const est = estimate(beatsIn(bpm, period, phase), period);
          expect(Math.abs(est - bpm)).toBeLessThanOrEqual(resolution(period));
        }
      }
    }
  });

  it('longer counts give finer resolution (4 bpm for 15 s, 1 bpm for 60 s)', () => {
    expect(resolution(15)).toBe(4);
    expect(resolution(30)).toBe(2);
    expect(resolution(60)).toBe(1);
    expect(estimate(17, 15) % 4).toBe(0);
  });
});

describe('B3.2 coronary artery narrowing (qualitative)', () => {
  it('halving the lumen diameter leaves a quarter of its area', () => expect(areaLeft(0.5)).toBeCloseTo(0.25));

  it('a healthy artery meets demand at rest and in exercise', () => {
    expect(outcome(0, 'rest')).toBe('normal');
    expect(outcome(0, 'exercise')).toBe('normal');
  });

  it('maximum supply falls as the artery narrows', () => {
    let prev = Infinity;
    for (let n = 0; n <= 1.0001; n += 0.05) { const s = maxSupply(n); expect(s).toBeLessThanOrEqual(prev); prev = s; }
    expect(maxSupply(1)).toBe(0);
  });

  it('a moderate narrowing causes angina in exercise but not at rest', () => {
    expect(outcome(0.75, 'rest')).toBe('normal');
    expect(outcome(0.75, 'exercise')).toBe('angina');
    expect(supply(0.75, 'exercise')).toBeLessThan(DEMAND.exercise);
  });

  it('a very severe narrowing starves the muscle even at rest', () => expect(outcome(0.95, 'rest')).toBe('rest-ischaemia'));

  it('complete occlusion, or a clot on a plaque, causes a myocardial infarction', () => {
    expect(outcome(1, 'rest')).toBe('infarction');
    expect(outcome(0.4, 'rest', true)).toBe('infarction');
  });
});
