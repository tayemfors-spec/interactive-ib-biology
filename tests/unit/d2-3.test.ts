import { describe, expect, it } from 'vitest';
import {
  CONCS, TISSUES, expectedMassChange, isotonicFit, lengthFromMass, linearFit, mean, rng, runExperiment, sd, se,
} from '../../src/sims/models/d2-3-potato';
import {
  EPSILON, cellAt, cellFromPotentials, clampCell, condition, equilibrate, equilibriumVolume, fmtKPa, fmtMPa,
  kPaToMPa, netMovement, surroundings, wallPressure, waterPotential,
} from '../../src/sims/models/d2-3-water-potential';

describe('D2.3 plant tissue experiment model', () => {
  it('there is no mass change at the isotonic concentration', () => {
    for (const t of TISSUES) expect(expectedMassChange(t.cIso, t.cIso)).toBeCloseTo(0, 10);
  });

  it('tissue gains mass in hypotonic and loses mass in hypertonic solutions', () => {
    for (const t of TISSUES) {
      expect(expectedMassChange(t.cIso - 0.1, t.cIso)).toBeGreaterThan(0);
      expect(expectedMassChange(t.cIso + 0.1, t.cIso)).toBeLessThan(0);
    }
  });

  it('% mass change falls continuously as solute concentration rises', () => {
    const cIso = 0.3;
    for (let c = 0; c < 0.8; c += 0.05) expect(expectedMassChange(c + 0.05, cIso)).toBeLessThan(expectedMassChange(c, cIso));
  });

  it('mass gain is limited by the wall and loss levels off when cells are plasmolysed', () => {
    expect(expectedMassChange(-5, 0)).toBeLessThan(25);
    expect(expectedMassChange(5, 0)).toBeGreaterThan(-35);
    // the curve flattens: equal concentration steps give smaller changes far from the isotonic point
    const near = expectedMassChange(0.3, 0.3) - expectedMassChange(0.4, 0.3);
    const far = expectedMassChange(0.7, 0.3) - expectedMassChange(0.8, 0.3);
    expect(far).toBeLessThan(near);
  });

  it('length changes less than mass, with the same sign (volume ∝ length³)', () => {
    expect(lengthFromMass(0)).toBe(0);
    expect(lengthFromMass(15)).toBeGreaterThan(0);
    expect(lengthFromMass(15)).toBeLessThan(15);
    expect(lengthFromMass(-15)).toBeLessThan(0);
    expect(lengthFromMass(-15)).toBeGreaterThan(-15);
    expect(lengthFromMass(33.1)).toBeCloseTo(10, 0);
  });

  it('sample SD and SE match hand calculation; SE = SD/√n; undefined for one value', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(mean(xs)).toBe(5);
    expect(sd(xs)).toBeCloseTo(Math.sqrt(32 / 7), 10);
    expect(se(xs)).toBeCloseTo(sd(xs) / Math.sqrt(8), 10);
    expect(Number.isNaN(sd([3]))).toBe(true);
    expect(Number.isNaN(se([3]))).toBe(true);
  });

  it('the seeded generator is reproducible', () => {
    const a = rng(42), b = rng(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
    const r = rng(7);
    for (let i = 0; i < 1000; i++) { const x = r(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });

  it('an experiment gives one row per concentration with the chosen number of repeats', () => {
    const rows = runExperiment({ cIso: 0.3, repeats: 4, variability: 2, measure: 'mass', seed: 1 });
    expect(rows.map((r) => r.c)).toEqual(CONCS);
    for (const r of rows) {
      expect(r.samples).toHaveLength(4);
      for (const s of r.samples) expect(s.pct).toBeCloseTo(((s.final - s.initial) / s.initial) * 100, 8);
    }
    expect(runExperiment({ cIso: 0.3, repeats: 4, variability: 2, measure: 'mass', seed: 1 })).toEqual(rows);
  });

  it('with no variation the line of best fit crosses the x-axis at the isotonic concentration', () => {
    for (const t of TISSUES) {
      const fit = isotonicFit(runExperiment({ cIso: t.cIso, repeats: 3, variability: 0, measure: 'mass', seed: 3 }));
      expect(fit).not.toBeNull();
      expect(Math.abs(fit!.xIntercept - t.cIso)).toBeLessThan(0.03);
      expect(fit!.slope).toBeLessThan(0);
    }
  });

  it('more repeats give smaller standard errors and a better estimate on average', () => {
    const avgSE = (n: number) => mean(Array.from({ length: 30 }, (_, s) => mean(runExperiment({ cIso: 0.3, repeats: n, variability: 4, measure: 'mass', seed: s + 1 }).map((r) => r.se))));
    expect(avgSE(6)).toBeLessThan(avgSE(2));
    const err = (n: number) => mean(Array.from({ length: 40 }, (_, s) => {
      const fit = isotonicFit(runExperiment({ cIso: 0.3, repeats: n, variability: 4, measure: 'mass', seed: 100 + s }));
      return fit ? Math.abs(fit.xIntercept - 0.3) : 1;
    }));
    expect(err(6)).toBeLessThan(err(1));
    expect(err(6)).toBeLessThan(0.04);
  });

  it('a single repeat has no SD or SE', () => {
    const rows = runExperiment({ cIso: 0.3, repeats: 1, variability: 2, measure: 'mass', seed: 1 });
    for (const r of rows) { expect(Number.isNaN(r.sd)).toBe(true); expect(Number.isNaN(r.se)).toBe(true); }
  });

  it('length is read to the nearest mm, so length changes are coarser than mass changes', () => {
    const rows = runExperiment({ cIso: 0.3, repeats: 3, variability: 0, measure: 'length', seed: 1 });
    for (const r of rows) for (const s of r.samples) { expect(Number.isInteger(s.final)).toBe(true); expect(s.initial).toBe(40); }
    const lFit = isotonicFit(rows)!;
    expect(Math.abs(lFit.xIntercept - 0.3)).toBeLessThan(0.06);
  });

  it('linearFit recovers an exact line', () => {
    const f = linearFit([0, 1, 2, 3], [6, 4, 2, 0]);
    expect(f.slope).toBeCloseTo(-2);
    expect(f.intercept).toBeCloseTo(6);
    expect(f.xIntercept).toBeCloseTo(3);
  });
});

describe('D2.3 water potential model (AHL)', () => {
  it('ψw = ψs + ψp, and pure water at atmospheric pressure has ψ = 0', () => {
    expect(waterPotential(-700, 300)).toBe(-400);
    expect(waterPotential(0, 0)).toBe(0);
    expect(surroundings(0, 0)).toBe(0);
  });

  it('water moves from higher (less negative) to lower (more negative) water potential', () => {
    expect(netMovement(-400, 0)).toBe('into-cell');
    expect(netMovement(-200, -300)).toBe('out-of-cell');
    expect(netMovement(-500, -500)).toBe('none');
    expect(netMovement(-500, -500.4)).toBe('none');
  });

  it('solute potential is never positive and pressure potential in a cell is never negative', () => {
    expect(clampCell(200, -50)).toEqual({ psiS: -1, psiP: 0, clamped: false });
    // a cell's ψ cannot rise above that of pure water
    expect(clampCell(-600, 900)).toEqual({ psiS: -600, psiP: 600, clamped: true });
    expect(waterPotential(clampCell(-600, 900).psiS, clampCell(-600, 900).psiP)).toBe(0);
  });

  it('xylem sap under tension has a negative pressure potential and so a very negative ψ', () => {
    expect(surroundings(-50, -1000)).toBe(-1050);
    expect(surroundings(-50, 400)).toBe(-50); // positive values are not allowed for the surroundings
    expect(netMovement(-600, surroundings(-50, -1000))).toBe('out-of-cell');
  });

  it('the wall exerts pressure only when the protoplast is pressed against it', () => {
    expect(wallPressure(0.8)).toBe(0);
    expect(wallPressure(1)).toBe(0);
    expect(wallPressure(1.05)).toBeCloseTo(0.05 * EPSILON);
  });

  it('a cell in pure water takes up water until fully turgid: ψp = −ψs and ψ = 0', () => {
    const s = equilibrate(-1000, 0);
    expect(s.v).toBeGreaterThan(1);
    expect(s.psi).toBeCloseTo(0, 6);
    expect(s.psiP).toBeCloseTo(-s.psiS, 6);
    expect(condition(s)).toBe('fully-turgid');
    // dilution means ψs rises a little as water enters
    expect(s.psiS).toBeGreaterThan(-1000);
  });

  it('in a hypotonic solution the cell becomes turgid and its ψ equals the solution', () => {
    const s = equilibrate(-1000, -400);
    expect(s.psi).toBeCloseTo(-400, 6);
    expect(s.psiP).toBeGreaterThan(0);
    expect(condition(s)).toBe('turgid');
  });

  it('in a hypertonic solution the cell loses turgor and plasmolyses: ψp = 0, ψs = ψ of solution', () => {
    const s = equilibrate(-800, -1200);
    expect(s.v).toBeLessThan(1);
    expect(s.psiP).toBe(0);
    expect(s.psiS).toBeCloseTo(-1200, 6);
    expect(condition(s)).toBe('plasmolysed');
  });

  it('when the solution matches the cell sap the cell ends at incipient plasmolysis (flaccid)', () => {
    const s = equilibrate(-800, -800);
    expect(s.v).toBeCloseTo(1, 10);
    expect(s.psiP).toBe(0);
    expect(condition(s)).toBe('incipient');
  });

  it('the more negative the surroundings, the smaller the cell ends up', () => {
    let last = Infinity;
    for (let out = 0; out >= -2000; out -= 100) {
      const v = equilibriumVolume(-900, out);
      expect(v).toBeLessThan(last);
      last = v;
    }
  });

  it('at equilibrium there is no further net movement', () => {
    for (const [s1, out] of [[-1000, 0], [-1000, -300], [-600, -1500], [-1500, -1500]] as const) {
      const s = equilibrate(s1, out);
      expect(netMovement(s.psi, out)).toBe('none');
    }
  });

  it('a turgid cell can be reconstructed from its potentials and stays at the same ψ', () => {
    const s = cellAt(-900, 1.06);
    const back = cellFromPotentials(s.psiS, s.psiP);
    expect(back.v).toBeCloseTo(1.06, 10);
    expect(back.psiS1).toBeCloseTo(-900, 8);
    expect(equilibrate(back.psiS1, s.psi).v).toBeCloseTo(1.06, 8);
  });

  it('rejects impossible inputs', () => {
    expect(() => equilibriumVolume(0, -100)).toThrow();
    expect(() => equilibriumVolume(-500, 100)).toThrow();
  });

  it('formats kPa and MPa with a true minus sign', () => {
    expect(fmtKPa(-700)).toBe('−700 kPa');
    expect(fmtKPa(0.2)).toBe('0 kPa');
    expect(fmtKPa(-0.3)).toBe('0 kPa');
    expect(fmtKPa(250)).toBe('+250 kPa');
    expect(fmtMPa(-1500)).toBe('−1.50 MPa');
    expect(kPaToMPa(-200)).toBe(-0.2);
  });
});
