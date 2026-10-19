import { describe, expect, it } from 'vitest';
import {
  AMINO_ACIDS, CODON_TABLE, HBB_START, STOP, classify, codonCounts, describe as describeChange, insert, namedVariant,
  polypeptide, remove, substitute, transcribe, translate,
} from '../../src/sims/models/d1-3-mutations';

describe('D1.3 standard genetic code', () => {
  it('has all 64 codons: 61 for amino acids and 3 stops (UAA, UAG, UGA)', () => {
    expect(Object.keys(CODON_TABLE)).toHaveLength(64);
    const stops = Object.entries(CODON_TABLE).filter(([, aa]) => aa === STOP).map(([c]) => c).sort();
    expect(stops).toEqual(['UAA', 'UAG', 'UGA']);
    for (const codon of Object.keys(CODON_TABLE)) expect(codon).toMatch(/^[UCAG]{3}$/);
  });

  it('codes for exactly the 20 amino acids', () => {
    const aas = new Set(Object.values(CODON_TABLE).filter((x) => x !== STOP));
    expect(aas.size).toBe(20);
    expect([...aas].sort()).toEqual(Object.keys(AMINO_ACIDS).sort());
  });

  it('shows the degeneracy of the code: number of codons per amino acid', () => {
    expect(codonCounts()).toEqual({
      Leu: 6, Ser: 6, Arg: 6,
      Val: 4, Pro: 4, Thr: 4, Ala: 4, Gly: 4,
      Ile: 3, [STOP]: 3,
      Phe: 2, Tyr: 2, His: 2, Gln: 2, Asn: 2, Lys: 2, Asp: 2, Glu: 2, Cys: 2,
      Met: 1, Trp: 1,
    });
  });

  it('matches the textbook table codon by codon', () => {
    const expected: Record<string, string> = {
      UUU: 'Phe', UUC: 'Phe', UUA: 'Leu', UUG: 'Leu', CUU: 'Leu', CUC: 'Leu', CUA: 'Leu', CUG: 'Leu',
      AUU: 'Ile', AUC: 'Ile', AUA: 'Ile', AUG: 'Met', GUU: 'Val', GUC: 'Val', GUA: 'Val', GUG: 'Val',
      UCU: 'Ser', UCC: 'Ser', UCA: 'Ser', UCG: 'Ser', CCU: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro',
      ACU: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr', GCU: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala',
      UAU: 'Tyr', UAC: 'Tyr', UAA: STOP, UAG: STOP, CAU: 'His', CAC: 'His', CAA: 'Gln', CAG: 'Gln',
      AAU: 'Asn', AAC: 'Asn', AAA: 'Lys', AAG: 'Lys', GAU: 'Asp', GAC: 'Asp', GAA: 'Glu', GAG: 'Glu',
      UGU: 'Cys', UGC: 'Cys', UGA: STOP, UGG: 'Trp', CGU: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg',
      AGU: 'Ser', AGC: 'Ser', AGA: 'Arg', AGG: 'Arg', GGU: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly',
    };
    expect(Object.keys(expected)).toHaveLength(64);
    expect(CODON_TABLE).toEqual(expected);
  });
});

describe('D1.3 transcription and translation', () => {
  it('mRNA has the coding-strand sequence with U in place of T', () => {
    expect(transcribe('ATGTTTTAA')).toBe('AUGUUUUAA');
  });
  it('translates the start of β-globin as Met-Val-His-Leu-Thr-Pro-Glu-Glu-Lys-Ser-Ala-Val', () => {
    const tr = translate(transcribe(HBB_START));
    expect(tr.aminoAcids).toEqual(['Met', 'Val', 'His', 'Leu', 'Thr', 'Pro', 'Glu', 'Glu', 'Lys', 'Ser', 'Ala', 'Val']);
    expect(tr.stopAt).toBe(-1);
    expect(tr.codons[6]).toBe('GAG');
  });
  it('stops at the first stop codon', () => {
    const tr = translate(transcribe('ATGAAATGAGGG'));
    expect(tr.stopAt).toBe(2);
    expect(polypeptide(tr)).toEqual(['Met', 'Lys']);
  });
});

describe('D1.3 mutation editing', () => {
  it('substitutes, inserts and deletes bases', () => {
    expect(substitute('ATGC', 1, 'G')).toBe('AGGC');
    expect(insert('ATGC', 2, 'AA')).toBe('ATAAGC');
    expect(remove('ATGC', 1)).toBe('AGC');
    expect(remove('ATGCAA', 1, 3)).toBe('AAA');
  });
});

describe('D1.3 classifying mutations', () => {
  it('sickle-cell: GAG → GTG at codon 6 is a missense mutation (Glu → Val)', () => {
    const m = substitute(HBB_START, 19, 'T');
    const c = classify(HBB_START, m);
    expect(c.effect).toBe('missense');
    expect(c.changedCodons).toEqual([6]);
    expect(translate(transcribe(m)).aminoAcids[6]).toBe('Val');
    expect(namedVariant(HBB_START, m)).toBe('HbS');
    expect(describeChange(HBB_START, m)).toMatch(/^Codon 6 changes from GAG to GUG, so glutamic acid is replaced by valine/);
  });
  it('HbC: GAG → AAG at codon 6 replaces Glu with Lys', () => {
    const m = substitute(HBB_START, 18, 'A');
    expect(classify(HBB_START, m).effect).toBe('missense');
    expect(namedVariant(HBB_START, m)).toBe('HbC');
  });
  it('a third-base change GAG → GAA is silent because both code for Glu', () => {
    const m = substitute(HBB_START, 20, 'A');
    const c = classify(HBB_START, m);
    expect(c.effect).toBe('silent');
    expect(c.changedCodons).toEqual([]);
    expect(namedVariant(HBB_START, m)).toBeNull();
  });
  it('GAG → TAG at codon 6 is a nonsense mutation (premature stop)', () => {
    const c = classify(HBB_START, substitute(HBB_START, 18, 'T'));
    expect(c.effect).toBe('nonsense');
    expect(c.prematureStop).toBe(true);
    expect(c.lengthAfter).toBe(6);
    expect(c.lengthAfter).toBeLessThan(c.lengthBefore);
  });
  it('deleting one base causes a frameshift that changes every codon from that point', () => {
    const m = remove(HBB_START, 19);
    const c = classify(HBB_START, m);
    expect(c.effect).toBe('frameshift');
    expect(c.lengthChange).toBe(-1);
    expect(Math.min(...c.changedCodons)).toBe(6);
    expect(c.changedCodons.length).toBeGreaterThan(1);
  });
  it('inserting one or two bases is a frameshift; inserting three is in-frame', () => {
    expect(classify(HBB_START, insert(HBB_START, 18, 'A')).effect).toBe('frameshift');
    expect(classify(HBB_START, insert(HBB_START, 18, 'AC')).effect).toBe('frameshift');
    const c = classify(HBB_START, insert(HBB_START, 18, 'GCC'));
    expect(c.effect).toBe('in-frame');
    expect(c.lengthAfter).toBe(c.lengthBefore + 1);
  });
  it('deleting a whole codon removes one amino acid and leaves the rest unchanged', () => {
    const m = remove(HBB_START, 18, 3);
    const c = classify(HBB_START, m);
    expect(c.effect).toBe('in-frame');
    expect(polypeptide(translate(transcribe(m)))).toEqual(['Met', 'Val', 'His', 'Leu', 'Thr', 'Pro', 'Glu', 'Lys', 'Ser', 'Ala', 'Val']);
  });
  it('a frameshift can create a premature stop codon', () => {
    // inserting a T before codon 8 (AAG) puts TAA in frame: …GAG GAG TAA …
    const c = classify(HBB_START, insert(HBB_START, 24, 'T'));
    expect(c.effect).toBe('frameshift');
    expect(c.prematureStop).toBe(true);
  });
  it('detects loss of the start codon and of a stop codon', () => {
    expect(classify(HBB_START, substitute(HBB_START, 1, 'C')).effect).toBe('start-lost');
    expect(classify('ATGAAATAA', 'ATGAAATAC').effect).toBe('stop-lost');
  });
  it('no change means no mutation', () => {
    expect(classify(HBB_START, HBB_START).effect).toBe('none');
  });
  it('every single-base substitution in the gene is classified as silent, missense, nonsense or start-lost', () => {
    const tally: Record<string, number> = {};
    for (let i = 0; i < HBB_START.length; i++) {
      for (const b of ['A', 'T', 'G', 'C'] as const) {
        if (b === HBB_START[i]) continue;
        const e = classify(HBB_START, substitute(HBB_START, i, b)).effect;
        tally[e] = (tally[e] ?? 0) + 1;
      }
    }
    expect(Object.keys(tally).sort()).toEqual(['missense', 'nonsense', 'silent', 'start-lost']);
    expect(Object.values(tally).reduce((a, b) => a + b, 0)).toBe(36 * 3);
    expect(tally['start-lost']).toBe(9);
    expect(tally.missense!).toBeGreaterThan(tally.silent!);
  });
});

describe('D1.3 conserved-sequence figure', () => {
  it('the illustrative H4 codons all translate to Ser-Gly-Arg-Gly-Lys-Gly-Gly-Lys and differ only at third bases', () => {
    const seqs = ['TCCGGCCGCGGCAAGGGCGGAAAG', 'TCCGGTCGCGGAAAGGGCGGGAAA', 'TCAGGACGTGGTAAAGGAGGTAAG'];
    for (const s of seqs) expect(translate(transcribe(s)).aminoAcids).toEqual(['Ser', 'Gly', 'Arg', 'Gly', 'Lys', 'Gly', 'Gly', 'Lys']);
    for (const s of seqs) for (let i = 0; i < s.length; i++) if (i % 3 !== 2) expect(s[i]).toBe(seqs[0]![i]);
  });
});
