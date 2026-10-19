/**
 * Pure tree logic for the A3.2 cladogram reader: clades, most recent common ancestors, rotation and
 * layout. The vertebrate tree is a well-established phylogeny (lamprey as the jawless outgroup; birds
 * nested within the reptiles as the sister group of crocodilians).
 */
export interface Tip { kind: 'tip'; id: string; name: string }
export interface Node { kind: 'node'; id: string; name: string; traits: string; children: [Tree, Tree] }
export type Tree = Tip | Node;

const tip = (id: string, name: string): Tip => ({ kind: 'tip', id, name });
const node = (id: string, name: string, traits: string, a: Tree, b: Tree): Node => ({ kind: 'node', id, name, traits, children: [a, b] });

/** Node ids n1…n8 are numbered in pre-order on the original tree and keep their numbers when rotated. */
export const vertebrates: Tree = node('n1', 'Vertebrates', 'a cranium (skull) and vertebrae (simple cartilage elements in lampreys)',
  tip('lamprey', 'Lamprey'),
  node('n2', 'Jawed vertebrates', 'jaws and paired fins or limbs',
    tip('shark', 'Shark'),
    node('n3', 'Bony vertebrates', 'a skeleton made of bone, and lungs or a swim bladder that evolved from lungs',
      tip('salmon', 'Salmon'),
      node('n4', 'Tetrapods', 'four limbs with digits (fingers and toes)',
        tip('frog', 'Frog'),
        node('n5', 'Amniotes', 'an amniotic egg, with a membrane (the amnion) enclosing the embryo in fluid',
          node('n6', 'Mammals', 'hair and mammary glands that secrete milk', tip('human', 'Human'), tip('mouse', 'Mouse')),
          node('n7', 'Reptiles (including birds)', 'scales containing beta-keratin, a hard protein that also makes up the feathers of birds',
            tip('lizard', 'Lizard'),
            node('n8', 'Archosaurs', 'a four-chambered heart and a muscular gizzard', tip('crocodile', 'Crocodile'), tip('pigeon', 'Pigeon')))))))
);

/** Every internal node, in pre-order of the tree as currently drawn. */
export function nodes(t: Tree): Node[] {
  return t.kind === 'tip' ? [] : [t, ...nodes(t.children[0]), ...nodes(t.children[1])];
}

/** Terminal taxa in drawing order (top to bottom). */
export function tips(t: Tree): Tip[] {
  return t.kind === 'tip' ? [t] : [...tips(t.children[0]), ...tips(t.children[1])];
}

export function find(t: Tree, id: string): Tree | undefined {
  if (t.id === id) return t;
  if (t.kind === 'tip') return undefined;
  return find(t.children[0], id) ?? find(t.children[1], id);
}

/** Ids of the terminal taxa in the clade defined by a node (or a single tip), sorted. */
export function cladeOf(t: Tree, id: string): string[] {
  const n = find(t, id);
  if (!n) throw new Error(`no node ${id}`);
  return tips(n).map((x) => x.id).sort();
}

/** Every clade in the tree as a canonical key, independent of drawing order. */
export function cladeSet(t: Tree): Set<string> {
  return new Set(nodes(t).map((n) => cladeOf(n, n.id).join('+')));
}

export function sameRelationships(a: Tree, b: Tree): boolean {
  const x = cladeSet(a), y = cladeSet(b);
  return x.size === y.size && [...x].every((k) => y.has(k));
}

/** Swap the two branches of one node. Returns a new tree; the original is unchanged. */
export function rotate(t: Tree, id: string): Tree {
  if (t.kind === 'tip') return t;
  const [a, b] = t.children;
  if (t.id === id) return { ...t, children: [b, a] };
  return { ...t, children: [rotate(a, id), rotate(b, id)] };
}

/** True if the taxa form a clade: some node has exactly these taxa as its descendants. */
export function isClade(t: Tree, taxa: string[]): boolean {
  const key = [...taxa].sort().join('+');
  return taxa.length === 1 ? tips(t).some((x) => x.id === taxa[0]) : cladeSet(t).has(key);
}

/** The node that is the most recent common ancestor of all the given taxa. */
export function mrca(t: Tree, taxa: string[]): Node {
  let best: Node | undefined;
  for (const n of nodes(t)) {
    const c = cladeOf(n, n.id);
    if (taxa.every((x) => c.includes(x)) && (!best || c.length < cladeOf(best, best.id).length)) best = n;
  }
  if (!best) throw new Error('taxa not in tree');
  return best;
}

/** Number of nodes from the root to the node (root = 0). */
export function depth(t: Tree, id: string, d = 0): number {
  if (t.id === id) return d;
  if (t.kind === 'tip') return -1;
  const a = depth(t.children[0], id, d + 1);
  return a >= 0 ? a : depth(t.children[1], id, d + 1);
}

/**
 * Which of b and c is more closely related to a (shares a more recent common ancestor with it)?
 * Returns null when they are equally closely related.
 */
export function closerTo(t: Tree, a: string, b: string, c: string): string | null {
  const ab = cladeOf(t, mrca(t, [a, b]).id).length;
  const ac = cladeOf(t, mrca(t, [a, c]).id).length;
  return ab < ac ? b : ac < ab ? c : null;
}

export interface Prompt { focal: string; options: [string, string] }
/** Practice questions; the tests check that each has exactly one correct answer. */
export const prompts: Prompt[] = [
  { focal: 'crocodile', options: ['lizard', 'pigeon'] },
  { focal: 'salmon', options: ['shark', 'human'] },
  { focal: 'frog', options: ['salmon', 'mouse'] },
  { focal: 'mouse', options: ['frog', 'pigeon'] },
  { focal: 'shark', options: ['lamprey', 'salmon'] },
  { focal: 'lizard', options: ['human', 'crocodile'] },
  { focal: 'human', options: ['mouse', 'lizard'] },
];

export interface Layout {
  w: number; h: number;
  tips: { id: string; name: string; x: number; y: number }[];
  nodes: { id: string; x: number; y: number; top: number; bottom: number }[];
  /** Horizontal branch segments: from the parent node's x to the child's x, at the child's y. */
  branches: { id: string; parent: string; x1: number; x2: number; y: number }[];
  root: { x1: number; x2: number; y: number };
}

/** Rectangular cladogram, root on the left, tips aligned on the right. Not drawn to scale. */
export function layout(t: Tree, o = { w: 460, top: 34, gap: 38, left: 18, rootLen: 22, tipX: 336 }): Layout {
  const ts = tips(t);
  const maxDepth = Math.max(...nodes(t).map((n) => depth(t, n.id)));
  const x0 = o.left + o.rootLen;
  const step = (o.tipX - x0) / (maxDepth + 1);
  const out: Layout = { w: o.w, h: o.top + (ts.length - 1) * o.gap + 44, tips: [], nodes: [], branches: [], root: { x1: o.left, x2: x0, y: 0 } };
  const ys = new Map(ts.map((x, i) => [x.id, o.top + i * o.gap]));
  const place = (n: Tree, d: number): { x: number; y: number } => {
    if (n.kind === 'tip') {
      const p = { x: o.tipX, y: ys.get(n.id)! };
      out.tips.push({ id: n.id, name: n.name, ...p });
      return p;
    }
    const x = x0 + d * step;
    const kids = n.children.map((c) => ({ c, p: place(c, d + 1) }));
    for (const { c, p } of kids) out.branches.push({ id: c.id, parent: n.id, x1: x, x2: p.x, y: p.y });
    const top = kids[0]!.p.y, bottom = kids[1]!.p.y;
    const y = (top + bottom) / 2;
    out.nodes.push({ id: n.id, x, y, top, bottom });
    return { x, y };
  };
  const r = place(t, 0);
  out.root.y = r.y;
  return out;
}
