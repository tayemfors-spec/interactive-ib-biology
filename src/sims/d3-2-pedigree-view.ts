/** Pedigree chart SVG and question markup, shared by the server render and the browser. */
import { PATTERN_NAMES, deduced, genotypeHtml, type Pedigree } from './models/d3-2-pedigree';

const UX = 78, GY = 100, S = 30, PAD = 34;

const isGenotype = (s: string) => /^(AA|Aa|aa|DD|Dd|dd|XHXH|XHXh|XhXh|XHY|XhY)$/.test(s);
/** Option text: genotypes get superscript X alleles. */
export const optionHtml = (s: string) => (isGenotype(s) ? genotypeHtml(s) : s);
const genoSvg = (g: string) => g.replace(/X([Hh])/g, 'X<tspan class="sup" dy="-5">$1</tspan><tspan dy="5">​</tspan>');

export function chartSvg(ped: Pedigree, reveal: boolean): { svg: string; w: number; h: number } {
  const minX = Math.min(...ped.people.map((p) => p.x));
  const maxX = Math.max(...ped.people.map((p) => p.x));
  const gens = Math.max(...ped.people.map((p) => p.gen));
  const cx = (x: number) => PAD + 26 + (x - minX) * UX;
  const cy = (g: number) => 30 + (g - 1) * GY;
  const at = new Map(ped.people.map((p) => [p.id, p]));
  let s = '';
  // generation numerals
  for (let g = 1; g <= gens; g++) s += `<text class="gen" x="4" y="${cy(g)}" dy="0.35em">${['I', 'II', 'III', 'IV'][g - 1]}</text>`;
  for (const c of ped.couples) {
    const a = at.get(c.a)!, b = at.get(c.b)!;
    const [l, r] = a.x < b.x ? [a, b] : [b, a];
    const y = cy(a.gen);
    const x1 = cx(l.x) + S / 2, x2 = cx(r.x) - S / 2;
    s += c.consanguineous
      ? `<path class="line" d="M${x1} ${y - 3} H${x2} M${x1} ${y + 3} H${x2}"/>`
      : `<path class="line" d="M${x1} ${y} H${x2}"/>`;
    if (c.children.length) {
      const mid = (cx(l.x) + cx(r.x)) / 2;
      const kids = c.children.map((k) => at.get(k)!);
      const ys = y + GY / 2;
      const xs = kids.map((k) => cx(k.x));
      const lo = Math.min(mid, ...xs), hi = Math.max(mid, ...xs);
      s += `<path class="line" d="M${mid} ${y + (c.consanguineous ? 3 : 0)} V${ys} M${lo} ${ys} H${hi}`;
      for (const x of xs) s += ` M${x} ${ys} V${cy(kids[0]!.gen) - S / 2}`;
      s += '"/>';
    }
  }
  for (const p of ped.people) {
    const x = cx(p.x), y = cy(p.gen);
    const cls = p.affected ? 'sym aff' : 'sym';
    s += p.sex === 'M'
      ? `<rect class="${cls}" x="${x - S / 2}" y="${y - S / 2}" width="${S}" height="${S}"/>`
      : `<circle class="${cls}" cx="${x}" cy="${y}" r="${S / 2}"/>`;
    const g = deduced(ped, p.id);
    const carrier = reveal && !p.affected && ped.pattern !== 'autosomal-dominant' && g.length === 1 && /Aa|XHXh/.test(g[0]!);
    if (carrier) s += `<circle class="carrier" cx="${x}" cy="${y}" r="5"/>`;
    s += `<text class="id" x="${x}" y="${y + S / 2 + 14}" text-anchor="middle">${p.id}</text>`;
    if (reveal) s += `<text class="geno" x="${x}" y="${y + S / 2 + 29}" text-anchor="middle">${g.map(genoSvg).join(' / ')}</text>`;
  }
  const w = PAD + 52 + (maxX - minX) * UX + 20;
  const h = cy(gens) + S / 2 + 40;
  return { svg: s, w, h };
}

export function describe(ped: Pedigree): string {
  const people = ped.people.map((p) => `${p.id} ${p.sex === 'M' ? 'male' : 'female'}${p.affected ? ', affected' : ''}`).join('; ');
  const couples = ped.couples.map((c) => `${c.a} and ${c.b}${c.consanguineous ? ' (first cousins)' : ''}${c.children.length ? ` have children ${c.children.join(', ')}` : ''}`).join('; ');
  return `${ped.title}, ${ped.condition}. ${people}. ${couples}.`;
}

export function questionsHtml(ped: Pedigree): string {
  return ped.questions.map((q) => `<div class="pq" data-q="${q.id}"><p class="pq-prompt" id="pq-${ped.id}-${q.id}">${q.prompt}</p>`
    + `<div class="pq-opts" role="group" aria-labelledby="pq-${ped.id}-${q.id}">`
    + q.options.map((o) => `<button type="button" class="btn small" aria-pressed="false" data-opt="${o}"><span>${optionHtml(o)}</span></button>`).join('')
    + `</div><p class="pq-fb" data-fb aria-live="polite"></p></div>`).join('');
}

export const patternButtons = () => (Object.keys(PATTERN_NAMES) as (keyof typeof PATTERN_NAMES)[])
  .map((k) => `<button type="button" class="btn small" aria-pressed="false" data-pattern="${k}">${PATTERN_NAMES[k]}</button>`).join('');
