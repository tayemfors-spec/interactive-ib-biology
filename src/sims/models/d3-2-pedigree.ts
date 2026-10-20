/**
 * Pedigree chart analysis (D3.2.13). Each example family is checked against three single-gene
 * patterns by exhaustive search: is there any assignment of genotypes in which every person's phenotype
 * matches their genotype and every child's genotype can be made from one gamete of each parent?
 * The set of genotypes each person has across all consistent assignments is what can be deduced.
 */

export type Pattern = 'autosomal-recessive' | 'autosomal-dominant' | 'x-linked-recessive';
export type Sex = 'M' | 'F';

export interface Person {
  id: string;          // e.g. "II-3"
  sex: Sex;
  affected: boolean;
  /** Column position (0-based) for drawing. */
  x: number;
  gen: number;         // 1-based generation
}
export interface Couple { a: string; b: string; children: string[]; consanguineous?: boolean }

export interface Question { id: string; person: string; prompt: string; options: string[]; answer: string; why: string }

export interface Pedigree {
  id: string;
  title: string;
  condition: string;
  /** The pattern the chart is built to show. */
  pattern: Pattern;
  people: Person[];
  couples: Couple[];
  questions: Question[];
  /** Feedback when the reader picks each pattern. */
  feedback: Record<Pattern, string>;
}

export const PATTERN_NAMES: Record<Pattern, string> = {
  'autosomal-recessive': 'Autosomal recessive',
  'autosomal-dominant': 'Autosomal dominant',
  'x-linked-recessive': 'X-linked (sex-linked) recessive',
};

/** Genotypes (as plain strings) that a person of a given sex can have under a pattern. */
export function genotypesFor(pattern: Pattern, sex: Sex): string[] {
  if (pattern === 'autosomal-recessive') return ['AA', 'Aa', 'aa'];
  if (pattern === 'autosomal-dominant') return ['DD', 'Dd', 'dd'];
  return sex === 'F' ? ['XHXH', 'XHXh', 'XhXh'] : ['XHY', 'XhY'];
}

export function isAffected(pattern: Pattern, g: string): boolean {
  if (pattern === 'autosomal-recessive') return g === 'aa';
  if (pattern === 'autosomal-dominant') return g.includes('D');
  return g === 'XhXh' || g === 'XhY';
}

/** Split a genotype string into its two alleles. */
export function alleles(g: string): [string, string] {
  if (g.startsWith('X')) {
    const m = g.match(/X[Hh]|Y/g)!;
    return [m[0]!, m[1]!];
  }
  return [g[0]!, g[1]!];
}

const norm = (a: string, b: string, pattern: Pattern) => {
  const rank = pattern === 'x-linked-recessive' ? ['XH', 'Xh', 'Y'] : ['A', 'a', 'D', 'd'];
  return [a, b].sort((p, q) => rank.indexOf(p) - rank.indexOf(q)).join('');
};

/** Genotypes a child of the given sex could have, from a mother and a father genotype. */
export function childGenotypes(pattern: Pattern, mother: string, father: string, sex: Sex): Set<string> {
  const out = new Set<string>();
  for (const m of alleles(mother)) for (const f of alleles(father)) {
    if (pattern === 'x-linked-recessive') {
      if (sex === 'M' && f === 'Y') out.add(norm(m, f, pattern));
      if (sex === 'F' && f !== 'Y') out.add(norm(m, f, pattern));
    } else out.add(norm(m, f, pattern));
  }
  return out;
}

/** For each person, every genotype they have in at least one consistent assignment (empty if none). */
export function possibleGenotypes(ped: Pedigree, pattern: Pattern): Map<string, Set<string>> {
  const order = [...ped.people].sort((p, q) => p.gen - q.gen || p.x - q.x);
  const parentsOf = new Map<string, Couple>();
  for (const c of ped.couples) for (const ch of c.children) parentsOf.set(ch, c);
  const sexOf = new Map(ped.people.map((p) => [p.id, p.sex]));
  const found = new Map<string, Set<string>>(ped.people.map((p) => [p.id, new Set<string>()]));
  const current = new Map<string, string>();
  let any = false;

  const go = (i: number) => {
    if (i === order.length) {
      any = true;
      for (const [id, g] of current) found.get(id)!.add(g);
      return;
    }
    const p = order[i]!;
    let options = genotypesFor(pattern, p.sex).filter((g) => isAffected(pattern, g) === p.affected);
    const par = parentsOf.get(p.id);
    if (par) {
      const mother = sexOf.get(par.a) === 'F' ? par.a : par.b;
      const father = mother === par.a ? par.b : par.a;
      const allowed = childGenotypes(pattern, current.get(mother)!, current.get(father)!, p.sex);
      options = options.filter((g) => allowed.has(g));
    }
    for (const g of options) { current.set(p.id, g); go(i + 1); }
    current.delete(p.id);
  };
  go(0);
  if (!any) for (const s of found.values()) s.clear();
  return found;
}

export const consistent = (ped: Pedigree, pattern: Pattern) =>
  [...possibleGenotypes(ped, pattern).values()].every((s) => s.size > 0);

/** HTML for a genotype, with X-linked alleles as superscripts on a capital X. */
export function genotypeHtml(g: string): string {
  return alleles(g).map((a) => (a.startsWith('X') ? `X<sup>${a[1]}</sup>` : a)).join('');
}

const P = (id: string, sex: Sex, affected: boolean, x: number): Person => ({ id, sex, affected, x, gen: romanToInt(id.split('-')[0]!) });

function romanToInt(r: string): number {
  return { I: 1, II: 2, III: 3, IV: 4 }[r as 'I' | 'II' | 'III' | 'IV'];
}

export const PEDIGREES: Pedigree[] = [
  {
    id: 'pku',
    title: 'Family A',
    condition: 'phenylketonuria (PKU)',
    pattern: 'autosomal-recessive',
    people: [
      P('I-1', 'M', false, 1.5), P('I-2', 'F', false, 2.5),
      P('II-1', 'F', false, 0), P('II-2', 'M', false, 1), P('II-3', 'F', false, 3), P('II-4', 'M', false, 4),
      P('III-1', 'M', false, 1), P('III-2', 'F', false, 0), P('III-3', 'F', false, 3), P('III-4', 'M', false, 4),
      P('IV-1', 'F', true, 1.5), P('IV-2', 'M', false, 2.5), P('IV-3', 'M', true, 3.5),
    ],
    couples: [
      { a: 'I-1', b: 'I-2', children: ['II-2', 'II-3'] },
      { a: 'II-1', b: 'II-2', children: ['III-2', 'III-1'] },
      { a: 'II-3', b: 'II-4', children: ['III-3', 'III-4'] },
      { a: 'III-1', b: 'III-3', children: ['IV-1', 'IV-2', 'IV-3'], consanguineous: true },
    ],
    questions: [
      { id: 'q1', person: 'III-1', prompt: 'What is the genotype of III-1?', options: ['AA', 'Aa', 'aa'], answer: 'Aa',
        why: 'III-1 is unaffected, so he has at least one A. His daughter IV-1 is aa and received one a from him, so he must be Aa: a carrier.' },
      { id: 'q2', person: 'IV-2', prompt: 'What can be deduced about the genotype of IV-2?', options: ['AA', 'Aa', 'AA or Aa'], answer: 'AA or Aa',
        why: 'IV-2 is unaffected, so he is AA or Aa. Both parents are Aa, so among unaffected children 2 in 3 are expected to be carriers, but his genotype cannot be decided from the chart.' },
      { id: 'q3', person: 'III-3', prompt: 'III-1 and III-3 have another child. What is the probability that this child has PKU?', options: ['0', '1 in 4', '1 in 2', '2 in 3'], answer: '1 in 4',
        why: 'Both parents are Aa. Each passes a to half of their gametes, so ½ × ½ = ¼ of their children are expected to be aa. Each child has the same 1 in 4 chance, whatever happened to earlier children.' },
    ],
    feedback: {
      'autosomal-recessive': 'Correct. IV-1 and IV-3 are affected but their parents are not, so the allele must be recessive and both parents are carriers. IV-1 is an affected daughter of an unaffected father, which rules out X-linked recessive inheritance (her father would have to pass her an Xʰ, and he would then be affected). The parents are first cousins (double line), so they could both have inherited the same recessive allele from a shared grandparent.',
      'autosomal-dominant': 'Not possible. Two unaffected parents (III-1 and III-3) have affected children. With a dominant allele at least one parent of each affected child would also be affected.',
      'x-linked-recessive': 'Not possible. IV-1 is an affected female, so she would be XʰXʰ and would need an Xʰ from her father. Her father III-1 would then be XʰY and affected, but he is not.',
    },
  },
  {
    id: 'huntington',
    title: 'Family B',
    condition: 'Huntington’s disease',
    pattern: 'autosomal-dominant',
    people: [
      P('I-1', 'M', true, 1.5), P('I-2', 'F', false, 2.5),
      P('II-1', 'F', true, 0.5), P('II-2', 'M', true, -0.5), P('II-5', 'F', false, 1.5), P('II-3', 'M', true, 2.5), P('II-4', 'F', false, 3.5),
      P('III-1', 'M', false, -0.5), P('III-2', 'F', true, 0.5), P('III-3', 'M', true, 2.5), P('III-4', 'F', false, 3.5),
    ],
    couples: [
      { a: 'I-1', b: 'I-2', children: ['II-1', 'II-5', 'II-3'] },
      { a: 'II-2', b: 'II-1', children: ['III-1', 'III-2'] },
      { a: 'II-3', b: 'II-4', children: ['III-3', 'III-4'] },
    ],
    questions: [
      { id: 'q1', person: 'I-1', prompt: 'What is the genotype of I-1?', options: ['DD', 'Dd', 'dd'], answer: 'Dd',
        why: 'I-1 is affected, so he has at least one D. His daughter II-5 is unaffected (dd) and received a d from him, so he is Dd.' },
      { id: 'q2', person: 'II-1', prompt: 'What is the genotype of II-1?', options: ['DD', 'Dd', 'dd'], answer: 'Dd',
        why: 'II-1 is affected, so she has a D. Her mother I-2 is unaffected (dd) and must have given her a d, so she is Dd. Her unaffected son III-1 confirms it.' },
      { id: 'q3', person: 'III-1', prompt: 'What is the genotype of III-1?', options: ['DD', 'Dd', 'dd'], answer: 'dd',
        why: 'With a dominant allele, anyone who is unaffected must be homozygous recessive. Two Dd parents have a 1 in 4 chance of a dd child.' },
    ],
    feedback: {
      'autosomal-dominant': 'Correct. Two affected parents (II-1 and II-2) have an unaffected son, III-1, which can only happen if the allele is dominant and both parents are heterozygous. Every affected person has an affected parent, and the condition appears in every generation. Father-to-son transmission (II-3 to III-3) rules out X-linkage.',
      'autosomal-recessive': 'Not possible. II-1 and II-2 are both affected, so with a recessive allele both would be aa and every child would be aa and affected. Their son III-1 is unaffected.',
      'x-linked-recessive': 'Not possible. An affected mother (II-1) would be XʰXʰ, so every son would receive Xʰ and be affected, but III-1 is unaffected. Also, II-3 passes the condition to his son III-3, and fathers pass a Y, not an X, to sons.',
    },
  },
  {
    id: 'haemophilia',
    title: 'Family C',
    condition: 'haemophilia',
    pattern: 'x-linked-recessive',
    people: [
      P('I-1', 'M', false, 1.5), P('I-2', 'F', false, 2.5),
      P('II-1', 'F', false, 0), P('II-2', 'M', true, 1), P('II-5', 'M', false, 2), P('II-3', 'F', false, 3), P('II-4', 'M', false, 4),
      P('III-1', 'F', false, 0), P('III-2', 'M', false, 1), P('III-3', 'M', true, 2.5), P('III-4', 'F', false, 3.5), P('III-5', 'M', false, 4.5),
    ],
    couples: [
      { a: 'I-1', b: 'I-2', children: ['II-2', 'II-5', 'II-3'] },
      { a: 'II-1', b: 'II-2', children: ['III-1', 'III-2'] },
      { a: 'II-3', b: 'II-4', children: ['III-3', 'III-4', 'III-5'] },
    ],
    questions: [
      { id: 'q1', person: 'I-2', prompt: 'What is the genotype of I-2?', options: ['XHXH', 'XHXh', 'XhXh'], answer: 'XHXh',
        why: 'Her son II-2 is XʰY. A son receives his X chromosome from his mother, so I-2 has an Xʰ; she is unaffected, so she is a carrier, XᴴXʰ.' },
      { id: 'q2', person: 'III-1', prompt: 'What is the genotype of III-1?', options: ['XHXH', 'XHXh', 'XhXh'], answer: 'XHXh',
        why: 'Every daughter receives her father’s only X chromosome. Her father II-2 has haemophilia (XʰY), so she must carry Xʰ. She is unaffected, so she is XᴴXʰ: an obligate carrier.' },
      { id: 'q3', person: 'III-2', prompt: 'What is the genotype of III-2?', options: ['XHY', 'XhY'], answer: 'XHY',
        why: 'III-2 is unaffected, so his only X carries Xᴴ. He received his Y from his affected father, which is why haemophilia is never passed from father to son.' },
    ],
    feedback: {
      'x-linked-recessive': 'The best explanation. Only males are affected, and they have unaffected parents, so the allele is recessive; it passes through unaffected carrier females (I-2, II-3). The affected father II-2 has no affected sons, and all his daughters are carriers. Strictly, autosomal recessive inheritance cannot be ruled out, but it would need II-4, who married into the family, to carry the same rare allele as his wife II-3.',
      'autosomal-recessive': 'Possible but unlikely. It would need II-4, who married into the family, to be a carrier of the same rare allele, and it would not explain why only males are affected. By inductive reasoning, the pattern of affected males and carrier mothers suggests an X-linked recessive allele.',
      'autosomal-dominant': 'Not possible. II-2 and III-3 are affected but none of their parents is. With a dominant allele, every affected person must have at least one affected parent.',
    },
  },
];

/** The genotypes deduced for a person under the chart's own pattern, e.g. ["Aa"] or ["AA", "Aa"]. */
export function deduced(ped: Pedigree, id: string): string[] {
  const rank = [...genotypesFor(ped.pattern, 'F'), ...genotypesFor(ped.pattern, 'M')];
  return [...(possibleGenotypes(ped, ped.pattern).get(id) ?? [])].sort((a, b) => rank.indexOf(a) - rank.indexOf(b));
}
