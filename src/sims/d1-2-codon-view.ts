/**
 * HTML for the D1.2 codon-table simulation, shared by the server render and the browser script so the
 * first paint and every update look the same. All text comes from fixed strings and validated bases.
 */
import {
  AMINO_ACIDS, HBB_NORMAL, HBB_SICKLE, SICKLE_BASE, anticodonOf, codingStrand, templateStrand, threeLetter, translate,
  type Frame, type RnaBase, type Translation,
} from './models/d1-2-codon-table';

export interface View { strands: string; chips: string; summary: string; compare: string; used: string[] }

const groups = (seq: string, tr: Translation, mark: Set<number>) => {
  // split into: bases before the reading frame, codons read, bases after
  const parts: string[] = [];
  const span = (from: number, to: number, cls: string) => {
    if (to <= from) return;
    const letters = [...seq.slice(from, to)].map((b, k) => (mark.has(from + k) ? `<mark>${b}</mark>` : b)).join('');
    parts.push(`<span class="${cls}">${letters}</span>`);
  };
  const begin = tr.start < 0 ? seq.length : tr.start;
  span(0, begin, 'off');
  for (const c of tr.codons) span(c.at, c.at + 3, `cd ${c.role}`);
  const end = tr.codons.length ? tr.codons.at(-1)!.at + 3 : begin;
  span(end, seq.length, 'off');
  return parts.join('');
};

export function render(mrna: RnaBase[], frame: Frame): View {
  const seq = mrna.join('');
  const tr = translate(mrna, frame);
  const isHbb = seq === HBB_NORMAL || seq === HBB_SICKLE;
  const mark = new Set<number>(seq === HBB_SICKLE ? [SICKLE_BASE] : []);
  const row = (name: string, a: string, text: string, b: string) =>
    `<p><span class="nm">${name}</span><code><b>${a}</b>${text}<b>${b}</b></code></p>`;
  const strands = seq.length
    ? row('DNA coding strand', '5′ ', groups(codingStrand(mrna), tr, mark), ' 3′') +
      row('DNA template strand', '3′ ', groups(templateStrand(mrna), tr, mark), ' 5′') +
      row('mRNA', '5′ ', groups(seq, tr, mark), ' 3′')
    : '<p class="muted">No bases yet.</p>';

  const chips = tr.codons.length
    ? tr.codons.map((c, i) => {
        const aa = AMINO_ACIDS[c.aa]!;
        const hit = mark.has(c.at) || mark.has(c.at + 1) || mark.has(c.at + 2);
        return `<li class="chip ${c.role}${hit ? ' hit' : ''}"><span class="n">${i + 1}</span><span class="codon">${c.codon}</span><span class="anti" title="tRNA anticodon">${anticodonOf(c.codon)}</span><span class="aa">${c.role === 'stop' ? 'STOP' : aa.three}</span></li>`;
      }).join('')
    : `<li class="none">${tr.start < 0 ? 'No start codon (AUG) found, so a ribosome would not start translating. Choose another reading frame to read the codons anyway.' : 'Fewer than three bases in this reading frame.'}</li>`;

  let summary: string;
  if (!seq.length) summary = 'Type a sequence, pick codons from the table, or load an example.';
  else if (tr.start < 0) summary = `${seq.length} bases of mRNA, but no AUG start codon.`;
  else {
    const pep = tr.protein.length ? threeLetter(tr.protein) : 'no amino acids';
    const from = frame === 'aug' ? `the start codon at base ${tr.start + 1}` : `base ${tr.start + 1}`;
    summary = `Reading from ${from}: ${tr.codons.length} codon${tr.codons.length === 1 ? '' : 's'} → ${pep}` +
      (tr.stopped ? ` (${tr.protein.length} amino acid${tr.protein.length === 1 ? '' : 's'}; the stop codon ${tr.codons.at(-1)!.codon} ends translation).` : tr.after ? ` (no stop codon yet; ${tr.after} base${tr.after === 1 ? '' : 's'} left over).` : ' (no stop codon yet).');
  }

  let compare = '';
  if (isHbb) {
    const n = translate([...HBB_NORMAL] as RnaBase[]).protein.slice(1);
    const s = translate([...HBB_SICKLE] as RnaBase[]).protein.slice(1);
    const line = (p: string, other: string) => [...p].map((a, i) => (a !== other[i] ? `<mark>${AMINO_ACIDS[a]!.three}</mark>` : AMINO_ACIDS[a]!.three)).join('–');
    compare = `<p><span class="nm">Normal β-globin (HbA)</span> ${line(n, s)}…</p><p><span class="nm">Sickle-cell β-globin (HbS)</span> ${line(s, n)}…</p>` +
      `<p class="muted">Amino acids numbered from the first one after Met, which is removed from mature β-globin: the 6th is glutamic acid in HbA and valine in HbS.</p>`;
  }
  return { strands, chips, summary, compare, used: tr.codons.map((c) => c.codon) };
}
