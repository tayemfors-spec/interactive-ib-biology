import { describe, expect, it } from 'vitest';
import { PARENT_GENOTYPES, genotypeKey, grid, phenotype, ratioText, simplest, tally, type Mode } from '../../src/sims/models/d3-2-punnett';
import { PEDIGREES, childGenotypes, consistent, deduced, isAffected, possibleGenotypes, type Pattern } from '../../src/sims/models/d3-2-pedigree';
import { CRITICAL_05_DF3, MENDEL_F2, breed, chiSquared, classProbs, expected, heteroGametes, punnett, recombinationFrequency, PEA, FLY } from '../../src/sims/models/d3-2-dihybrid';
import { DATA_SETS, mean, median, modes, parseData, quartiles, summarise } from '../../src/sims/models/d3-2-boxplot';
import { summary } from '../../src/sims/d3-2-punnett-view';
import { verdict } from '../../src/sims/d3-2-dihybrid-view';

const cross = (mode: Mode, a: string[], b: string[]) => grid(mode, a, b);

describe('D3.2 monohybrid Punnett grids', () => {
  it('heterozygote × heterozygote with complete dominance gives 1 : 2 : 1 genotypes and 3 : 1 phenotypes', () => {
    const cells = cross('dominant', ['S', 's'], ['S', 's']);
    expect(ratioText(tally('dominant', cells, 'genotype'))).toBe('1 : 2 : 1');
    expect(ratioText(tally('dominant', cells, 'phenotype'))).toBe('3 : 1');
  });
  it('homozygous dominant and heterozygous plants have the same phenotype', () => {
    expect(phenotype('dominant', ['S', 'S'])).toBe(phenotype('dominant', ['S', 's']));
    expect(phenotype('dominant', ['s', 's'])).not.toBe(phenotype('dominant', ['S', 's']));
  });
  it('a P cross of two homozygotes gives a uniform F1 of heterozygotes', () => {
    const cells = cross('dominant', ['S', 'S'], ['s', 's']);
    expect(new Set(cells.map((c) => genotypeKey('dominant', c.genotype)))).toEqual(new Set(['Ss']));
  });
  it('incomplete dominance: pink × pink gives 1 red : 2 pink : 1 white (phenotype ratio = genotype ratio)', () => {
    const cells = cross('incomplete', ['CR', 'CW'], ['CR', 'CW']);
    const t = tally('incomplete', cells, 'phenotype');
    expect(Object.fromEntries(t.map((x) => [x.key, x.count]))).toEqual({ 'red flowers': 1, 'pink flowers': 2, 'white flowers': 1 });
  });
  it('ABO: IAi × IBi can give all four blood groups, one each', () => {
    const t = tally('abo', cross('abo', ['IA', 'i'], ['IB', 'i']), 'phenotype');
    expect(t.map((x) => x.key).sort()).toEqual(['group A', 'group AB', 'group B', 'group O']);
    expect(t.every((x) => x.count === 1)).toBe(true);
  });
  it('ABO: IA and IB are codominant, both dominant to i', () => {
    expect(phenotype('abo', ['IA', 'IB'])).toBe('group AB');
    expect(phenotype('abo', ['IA', 'i'])).toBe('group A');
    expect(phenotype('abo', ['IB', 'i'])).toBe('group B');
    expect(phenotype('abo', ['i', 'i'])).toBe('group O');
  });
  it('every parent genotype offered has exactly two alleles (an individual inherits only two)', () => {
    for (const m of Object.keys(PARENT_GENOTYPES) as Mode[]) for (const g of [...PARENT_GENOTYPES[m].p1, ...PARENT_GENOTYPES[m].p2]) expect(g).toHaveLength(2);
  });
  it('haemophilia: carrier mother × unaffected father → half of sons affected, no affected daughters, half of daughters carriers', () => {
    const cells = cross('sexlinked', ['XH', 'Xh'], ['XH', 'Y']);
    const sons = cells.filter((c) => c.genotype.includes('Y'));
    const daughters = cells.filter((c) => !c.genotype.includes('Y'));
    expect(sons).toHaveLength(2);
    expect(sons.filter((c) => c.phenotype === 'male with haemophilia')).toHaveLength(1);
    expect(daughters.filter((c) => c.phenotype === 'female with haemophilia')).toHaveLength(0);
    expect(daughters.filter((c) => c.phenotype.startsWith('carrier'))).toHaveLength(1);
    expect(summary('sexlinked', ['XH', 'Xh'], ['XH', 'Y'])).toContain('1 in 2 would have haemophilia');
  });
  it('haemophilia: an affected father never passes the allele to his sons, but all daughters are carriers', () => {
    const cells = cross('sexlinked', ['XH', 'XH'], ['Xh', 'Y']);
    expect(cells.filter((c) => c.genotype.includes('Y')).every((c) => c.phenotype === 'unaffected male')).toBe(true);
    expect(cells.filter((c) => !c.genotype.includes('Y')).every((c) => c.phenotype.startsWith('carrier'))).toBe(true);
  });
  it('simplifies ratios to lowest terms', () => {
    expect(simplest([2, 2])).toEqual([1, 1]);
    expect(simplest([4])).toEqual([1]);
    expect(simplest([3, 1])).toEqual([3, 1]);
  });
});

describe('D3.2 pedigree analysis', () => {
  const patterns: Pattern[] = ['autosomal-recessive', 'autosomal-dominant', 'x-linked-recessive'];
  it('child genotypes follow segregation; sons get their X from the mother', () => {
    expect(childGenotypes('autosomal-recessive', 'Aa', 'Aa', 'F')).toEqual(new Set(['AA', 'Aa', 'aa']));
    expect(childGenotypes('x-linked-recessive', 'XHXh', 'XHY', 'M')).toEqual(new Set(['XHY', 'XhY']));
    expect(childGenotypes('x-linked-recessive', 'XHXH', 'XhY', 'F')).toEqual(new Set(['XHXh']));
    expect(isAffected('autosomal-dominant', 'Dd')).toBe(true);
    expect(isAffected('x-linked-recessive', 'XHXh')).toBe(false);
  });
  it('each example chart is consistent with its own pattern', () => {
    for (const p of PEDIGREES) expect(consistent(p, p.pattern)).toBe(true);
  });
  it('the PKU chart rules out dominance and X-linkage; the Huntington chart rules out both recessive patterns', () => {
    const pku = PEDIGREES.find((p) => p.id === 'pku')!;
    expect(consistent(pku, 'autosomal-dominant')).toBe(false);
    expect(consistent(pku, 'x-linked-recessive')).toBe(false);
    const hd = PEDIGREES.find((p) => p.id === 'huntington')!;
    expect(consistent(hd, 'autosomal-recessive')).toBe(false);
    expect(consistent(hd, 'x-linked-recessive')).toBe(false);
  });
  it('the haemophilia chart excludes dominance; autosomal recessive is possible only with a carrier marrying in', () => {
    const h = PEDIGREES.find((p) => p.id === 'haemophilia')!;
    expect(consistent(h, 'autosomal-dominant')).toBe(false);
    expect(consistent(h, 'autosomal-recessive')).toBe(true);
    expect(possibleGenotypes(h, 'autosomal-recessive').get('II-4')).toEqual(new Set(['Aa']));
    expect(h.people.filter((x) => x.affected).every((x) => x.sex === 'M')).toBe(true);
  });
  it('every genotype question has the answer that exhaustive deduction gives', () => {
    for (const p of PEDIGREES) for (const q of p.questions) {
      if (!/^[ADXad]/.test(q.answer)) continue;
      expect(deduced(p, q.person).join(' or '), `${p.id} ${q.id}`).toBe(q.answer);
      expect(q.options).toContain(q.answer);
    }
  });
  it('feedback is given for every pattern and people/couples refer to real individuals', () => {
    for (const p of PEDIGREES) {
      for (const pat of patterns) expect(p.feedback[pat].length).toBeGreaterThan(40);
      const ids = new Set(p.people.map((x) => x.id));
      expect(ids.size).toBe(p.people.length);
      for (const c of p.couples) {
        expect(ids.has(c.a) && ids.has(c.b)).toBe(true);
        const sexes = new Set([c.a, c.b].map((id) => p.people.find((x) => x.id === id)!.sex));
        expect(sexes).toEqual(new Set(['M', 'F']));
        for (const ch of c.children) expect(ids.has(ch)).toBe(true);
      }
    }
  });
  it('PKU probability question: two carriers have a 1 in 4 chance of an affected child', () => {
    const cells = cross('dominant', ['S', 's'], ['S', 's']);
    expect(cells.filter((c) => c.phenotype === 'wrinkled seeds').length / cells.length).toBe(0.25);
    const pku = PEDIGREES.find((p) => p.id === 'pku')!;
    expect(deduced(pku, 'III-1')).toEqual(['Aa']);
    expect(deduced(pku, 'III-3')).toEqual(['Aa']);
  });
});

describe('D3.2 dihybrid crosses and chi-squared (AHL)', () => {
  it('unlinked genes: four gamete types in equal proportions', () => {
    const g = heteroGametes(PEA, null);
    expect(g.map((x) => x.g)).toEqual(['RY', 'Ry', 'rY', 'ry']);
    for (const x of g) expect(x.p).toBe(0.25);
  });
  it('F2 of a double heterozygote: 16 boxes and a 9 : 3 : 3 : 1 phenotype ratio', () => {
    const { cells } = punnett('f2');
    expect(cells).toHaveLength(16);
    expect(classProbs('f2').map((p) => p * 16)).toEqual([9, 3, 3, 1]);
  });
  it('test cross with unlinked genes gives 1 : 1 : 1 : 1', () => {
    expect(classProbs('test')).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(punnett('test').cells).toHaveLength(4);
  });
  it('linked genes: recombinant classes equal r/2 each; r = 0.5 is indistinguishable from independent assortment', () => {
    const p = classProbs('linked', 0.2);
    expect(p[0]).toBeCloseTo(0.4); expect(p[3]).toBeCloseTo(0.4);
    expect(p[1]).toBeCloseTo(0.1); expect(p[2]).toBeCloseTo(0.1);
    expect(classProbs('linked', 0.5).every((x) => Math.abs(x - 0.25) < 1e-12)).toBe(true);
    expect(classProbs('linked', 0).slice(1, 3)).toEqual([0, 0]);
    expect(heteroGametes(FLY, 0.17).filter((g) => g.recombinant).map((g) => g.g)).toEqual(['Gl', 'gL']);
  });
  it('recombination frequency = recombinants ÷ total', () => {
    expect(recombinationFrequency([415, 88, 92, 405])).toBeCloseTo(0.18);
  });
  it("Mendel's F2 data fit 9 : 3 : 3 : 1 (χ² ≈ 0.47, below 7.815 with df = 3)", () => {
    const e = expected('f2', 556);
    expect(e[0]).toBeCloseTo(312.75);
    const x2 = chiSquared(MENDEL_F2, e);
    expect(x2).toBeCloseTo(0.47, 2);
    expect(x2).toBeLessThan(CRITICAL_05_DF3);
    expect(verdict('f2', MENDEL_F2)).toContain('not rejected');
  });
  it('strongly linked test-cross data give a significant χ² and a rejected null hypothesis', () => {
    const obs = [415, 88, 92, 405];
    const x2 = chiSquared(obs, expected('linked', 1000));
    expect(x2).toBeGreaterThan(CRITICAL_05_DF3);
    expect(verdict('linked', obs)).toContain('H₀ is rejected');
    expect(verdict('linked', obs)).toContain('18.0%');
  });
  it('simulated samples are repeatable, sum to n and approach the true probabilities', () => {
    expect(breed(classProbs('f2'), 300, 5)).toEqual(breed(classProbs('f2'), 300, 5));
    const big = breed(classProbs('f2'), 16000, 11);
    expect(big.reduce((a, b) => a + b, 0)).toBe(16000);
    big.forEach((n, i) => expect(n / 16000).toBeCloseTo([9, 3, 3, 1][i]! / 16, 1));
  });
  it('about 5% of samples from a true 9 : 3 : 3 : 1 cross are (falsely) significant at p = 0.05', () => {
    let sig = 0;
    for (let s = 1; s <= 400; s++) if (chiSquared(breed(classProbs('f2'), 400, s), expected('f2', 400)) > CRITICAL_05_DF3) sig++;
    expect(sig / 400).toBeGreaterThan(0.01);
    expect(sig / 400).toBeLessThan(0.11);
  });
});

describe('D3.2 descriptive statistics and box plots', () => {
  it('mean, median and mode', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(modes([1, 2, 2, 3, 3])).toEqual([2, 3]);
    expect(modes([1, 2, 3])).toEqual([]);
  });
  it('quartiles are medians of the lower and upper halves', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ q1: 2.5, q2: 4.5, q3: 6.5 });
    expect(quartiles([1, 2, 3, 4, 5, 6, 7])).toEqual({ q1: 2, q2: 4, q3: 6 });
  });
  it('outliers are more than 1.5 × IQR beyond the quartiles; whiskers stop at the last non-outlier', () => {
    const s = summarise(DATA_SETS.find((d) => d.id === 'height-outlier')!.values);
    expect(s.q1).toBe(161.5); expect(s.q3).toBe(169.5); expect(s.iqr).toBe(8);
    expect(s.highFence).toBe(181.5);
    expect(s.outliers).toEqual([198]);
    expect(s.whiskerHigh).toBe(175);
    expect(s.max).toBe(198);
  });
  it('the first height set has no outliers and the skin set has one high outlier', () => {
    expect(summarise(DATA_SETS[0]!.values).outliers).toEqual([]);
    expect(summarise(DATA_SETS.find((d) => d.id === 'skin')!.values).outliers).toEqual([68]);
  });
  it('a value exactly on the fence is not an outlier', () => {
    // Q1 = 2, Q3 = 6, IQR = 4, upper fence = 12
    expect(summarise([1, 2, 3, 4, 5, 6, 12]).outliers).toEqual([]);
  });
  it('parses typed data', () => {
    expect(parseData('150, 160\n170;abc 180')).toEqual([150, 160, 170, 180]);
  });
});
