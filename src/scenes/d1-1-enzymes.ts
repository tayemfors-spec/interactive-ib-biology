import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { lerp, phase } from '../lib/timeline';
import { type Base, type ForkState, type Slot, type StrandId, complementOf, drawStrands, ease, enzyme, frameAt, helicaseRing, nucleotidePools, xsFor, DNA_PAIR, RNA_PAIR } from './d1-1-kit';

/*
 * D1.1 (AHL) the prokaryotic replication fork, 30 base pairs. The fork moves towards +x.
 * Lower arm: template B (runs 3′→5′ towards the fork), so the new strand B2 is built 5′→3′ towards the
 * fork — the LEADING strand, made continuously from one RNA primer (slots 0–2).
 * Upper arm: template A (runs 5′→3′ towards the fork), so the new strand A2 is built 5′→3′ away from the
 * fork — the LAGGING strand, made as Okazaki fragments: fragment 1 = primer 7–9 + DNA 0–6,
 * fragment 2 = primer 18–20 + DNA 10–17.
 * Steps: 0 primase lays primers · 1 Pol III extends the leading strand continuously (and fragment 1)
 *        2 new primer + Okazaki fragment 2 · 3 Pol I replaces primer 1 with DNA, leaving a nick between 6 and 7
 *        4 ligase seals the nick · 5 proofreading: Pol III removes a mismatched nucleotide at slot 19 of the
 *        leading strand and inserts the correct one.
 */
const N = 30;
const XS = xsFor(N);
// strand A, 5′→3′ left → right. Slot 19 of A is 'A', so the leading-strand template (B) has T there.
const SEQ: Base[] = 'GATCCTAGCATGCGTACAGAAGCTTACGGA'.split('') as Base[];
const COMP = complementOf(SEQ);
const D = 3.4;
const L = 3;
const F0 = XS[0]! - 0.6;
const F1 = XS[9]! + L;
const F2 = XS[20]! + L;
const LEAD_PRIMER = [0, 1, 2];
const LAG1 = [7, 8, 9]; // primer 1 (5′ end at 9)
const LAG2 = [18, 19, 20]; // primer 2 (5′ end at 20)
const LEAD_END = 18; // 3′ end of the leading strand after step 1
const MIS = 19; // proofreading slot
const WRONG: Base = 'G'; // G opposite template T: a mismatch

const scene: SceneModule = {
  camera: { position: [0, 4, 35], target: [-0.4, 0, 0], fov: 38, minDistance: 8, maxDistance: 55 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const pools = nucleotidePools(ctx, root, 300);
    const helicase = helicaseRing(ctx, root);
    const primase = enzyme(ctx, root, 'tail', 0.8, 1.9, 21);
    const pol3 = enzyme(ctx, root, 'water', 1.05, 2.7, 22);
    const pol3lag = enzyme(ctx, root, 'water', 1.05, 2.7, 23);
    const pol1 = enzyme(ctx, root, 'chol', 0.85, 2.1, 24);
    const ligase = enzyme(ctx, root, 'carb', 0.8, 1.7, 25);
    // arrow above the parental DNA showing which way the fork moves (+x)
    const arrow = new THREE.Group();
    const mArrow = ctx.material('text', { roughness: 0.6 });
    const shaft = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 10)), mArrow);
    shaft.rotation.z = -Math.PI / 2;
    const head = new THREE.Mesh(ctx.track(new THREE.ConeGeometry(0.3, 0.7, 16)), mArrow);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 1.55;
    arrow.add(shaft, head);
    arrow.position.set(XS[N - 1]! - 3, 3.0, 0);
    root.add(arrow);

    const A = (name: string) => anchorAt(root, 0, 0, 0, name);
    const ao = {
      helicase: anchorAt(helicase, 0, 1.7, 0, 'helicase'),
      primase: anchorAt(primase, 0, 0.9, 0.5, 'primase'),
      pol3: anchorAt(pol3, 0, -1.1, 0.6, 'pol3'),
      'pol3-lag': anchorAt(pol3lag, 0, 1.1, 0.6, 'pol3-lag'),
      pol1: anchorAt(pol1, 0, 0.9, 0.5, 'pol1'),
      ligase: anchorAt(ligase, 0, 0.9, 0.5, 'ligase'),
      'rna-primer': A('rna-primer'),
      leading: A('leading'),
      lagging: A('lagging'),
      okazaki: A('okazaki'),
      nick: A('nick'),
      mismatch: A('mismatch'),
      'three-end': A('three-end'),
      direction: anchorAt(arrow, 0, 0.5, 0, 'direction'),
    };
    const m = pools.meshes;
    const anchors = {
      helicase: { object: ao.helicase, highlight: [helicase] },
      primase: { object: ao.primase, highlight: [primase] },
      pol3: { object: ao.pol3, highlight: [pol3] },
      'pol3-lag': { object: ao['pol3-lag'], highlight: [pol3lag] },
      pol1: { object: ao.pol1, highlight: [pol1] },
      ligase: { object: ao.ligase, highlight: [ligase] },
      'rna-primer': { object: ao['rna-primer'], highlight: [m.phos.rna, m.stick.rna, m.base.U] },
      leading: { object: ao.leading, highlight: [m.phos.new, m.stick.new] },
      lagging: { object: ao.lagging, highlight: [m.phos.new, m.stick.new] },
      okazaki: { object: ao.okazaki, highlight: [m.phos.new, m.stick.new] },
      nick: { object: ao.nick, highlight: [] },
      mismatch: { object: ao.mismatch, highlight: [m.base.G] },
      'three-end': { object: ao['three-end'], highlight: [] },
      direction: { object: ao.direction, highlight: [arrow] },
    };

    const empty = (): (Slot | null)[] => XS.map(() => null);
    const parentSlots = (seq: Base[]): Slot[] => seq.map((base) => ({ base, role: 'parent', k: 1, linkNext: true }));
    const tmplOf = (id: 'A2' | 'B2', i: number) => (id === 'A2' ? SEQ[i]! : COMP[i]!);
    const hide = (...g: THREE.Object3D[]) => g.forEach((o) => (o.visible = false));
    const v = (x: number, y: number, z = 0.85) => new THREE.Vector3(x, y, z);
    const yLow = -D + 0.55; // enzyme centre on the lower (leading) arm
    const yUp = D - 0.55; // on the upper (lagging) arm

    function render(index: number, t: number) {
      const st: ForkState = { F: F2, tau: 0, D, L };
      const s: Record<StrandId, (Slot | null)[]> = { A: parentSlots(SEQ), B: parentSlots(COMP), A2: empty(), B2: empty() };
      const dna = (id: 'A2' | 'B2', i: number, k = 1) => { s[id][i] = { base: DNA_PAIR[tmplOf(id, i)], role: 'new', k, linkNext: true }; };
      const rna = (id: 'A2' | 'B2', i: number, k = 1) => { s[id][i] = { base: RNA_PAIR[tmplOf(id, i)], role: 'rna', k, linkNext: true }; };
      const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
      /** grow slots one by one in order, over progress u ∈ [0, 1] */
      const grow = (order: number[], u: number, put: (i: number, k: number) => void) => {
        const n = order.length;
        order.forEach((i, j) => { const k = ease(u * n - j); if (k > 0) put(i, k); });
      };
      hide(primase, pol3, pol3lag, pol1, ligase);
      let lead3 = LEAD_END; // current 3′ end of the leading strand (for the label)
      let nickOn = true;
      let wrongPos: THREE.Vector3 | null = null;

      // ---- state carried over from earlier steps ----
      const leadingPrimer = () => LEAD_PRIMER.forEach((i) => rna('B2', i));
      const lagPrimer1 = () => LAG1.forEach((i) => rna('A2', i));
      const frag1DNA = () => range(0, 6).forEach((i) => dna('A2', i));
      const leadingTo = (end: number) => range(3, end).forEach((i) => dna('B2', i));
      const frag2 = () => { LAG2.forEach((i) => rna('A2', i)); range(10, 17).forEach((i) => dna('A2', i)); };

      switch (index) {
        case 0: { // primase lays the primers
          st.F = lerp(F0, F1, ease(phase(t, 0, 0.3)));
          grow(LEAD_PRIMER, phase(t, 0.35, 0.6), (i, k) => rna('B2', i, k));
          grow([9, 8, 7], phase(t, 0.7, 0.95), (i, k) => rna('A2', i, k));
          primase.visible = t > 0.3;
          primase.position.copy(t < 0.65 ? v(lerp(XS[0]!, XS[2]!, phase(t, 0.35, 0.6)) + 0.5, yLow) : v(lerp(XS[9]!, XS[7]!, phase(t, 0.7, 0.95)) - 0.5, yUp));
          break;
        }
        case 1: { // Pol III: leading strand continuous; lagging fragment 1 away from the fork
          const u = ease(t);
          st.F = lerp(F1, F2, u);
          leadingPrimer(); lagPrimer1();
          const leadOrder = range(3, LEAD_END);
          grow(leadOrder, u, (i, k) => dna('B2', i, k));
          lead3 = Math.max(2, Math.min(LEAD_END, Math.floor(2 + u * leadOrder.length)));
          grow(range(0, 6).reverse(), phase(t, 0.05, 0.8), (i, k) => dna('A2', i, k));
          pol3.visible = pol3lag.visible = true;
          pol3.position.copy(v(lerp(XS[2]!, XS[LEAD_END]!, u) + 0.9, yLow));
          pol3lag.position.copy(v(lerp(XS[6]!, XS[0]!, ease(phase(t, 0.05, 0.8))) - 0.9, yUp));
          break;
        }
        case 2: { // a new primer near the fork, then Okazaki fragment 2
          leadingPrimer(); leadingTo(LEAD_END); lagPrimer1(); frag1DNA();
          grow([20, 19, 18], phase(t, 0.1, 0.35), (i, k) => rna('A2', i, k));
          grow(range(10, 17).reverse(), phase(t, 0.5, 0.95), (i, k) => dna('A2', i, k));
          primase.visible = true;
          primase.position.copy(v(lerp(XS[20]!, XS[18]!, phase(t, 0.1, 0.35)) - 0.5, yUp));
          pol3.visible = true;
          pol3.position.copy(v(XS[LEAD_END]! + 0.9, yLow));
          pol3lag.visible = t > 0.4;
          pol3lag.position.copy(v(lerp(XS[17]!, XS[10]!, phase(t, 0.5, 0.95)) - 0.9, yUp));
          break;
        }
        case 3: { // Pol I removes primer 1 and replaces it with DNA
          leadingPrimer(); leadingTo(LEAD_END); frag1DNA(); frag2();
          const u = phase(t, 0.1, 0.9);
          LAG1.forEach((i) => {
            const pass = (9 - i + 0.5) / 3; // Pol I reaches slot 9 first (it moves away from the fork)
            const gone = u > pass - 0.12;
            if (!gone) rna('A2', i);
            else dna('A2', i, ease((u - pass + 0.12) / 0.15));
          });
          pol3.visible = true; pol3.position.copy(v(XS[LEAD_END]! + 0.9, yLow));
          pol1.visible = true;
          pol1.position.copy(v(lerp(XS[10]!, XS[6]!, u) - 0.2, yUp));
          break;
        }
        case 4: { // ligase seals the nick
          leadingPrimer(); leadingTo(LEAD_END); frag1DNA(); frag2(); LAG1.forEach((i) => dna('A2', i));
          nickOn = t < 0.55;
          ligase.visible = true;
          ligase.position.copy(v(XS[6]! + 0.5, yUp, lerp(1.6, 0.45, ease(phase(t, 0, 0.4)))));
          pol3.visible = true; pol3.position.copy(v(XS[LEAD_END]! + 0.9, yLow));
          break;
        }
        default: { // proofreading at slot 19 of the leading strand
          leadingPrimer(); leadingTo(LEAD_END); frag1DNA(); frag2(); LAG1.forEach((i) => dna('A2', i));
          nickOn = false;
          const inW = ease(phase(t, 0.05, 0.25));
          const outW = ease(phase(t, 0.35, 0.6));
          const fr = frameAt('B2', XS[MIS]!, st);
          if (outW < 1) {
            // the wrong nucleotide sits out of line with no hydrogen bonds, then is cut out and released
            const off = new THREE.Vector3(0, -0.35, 0.35).add(new THREE.Vector3(-1.6 * outW, 2.0 * outW, 1.4 * outW));
            s.B2[MIS] = { base: WRONG, role: 'new', k: Math.max(0.01, inW), linkNext: false, offset: off, mismatch: true };
          }
          wrongPos = fr.sugar.clone().add(new THREE.Vector3(-1.6, 1.65, 1.75));
          const inR = ease(phase(t, 0.65, 0.85));
          if (inR > 0) dna('B2', MIS, inR);
          if (outW >= 1 && inR <= 0) s.B2[MIS] = null;
          lead3 = inR >= 1 ? MIS : LEAD_END;
          pol3.visible = true;
          const back = phase(t, 0.3, 0.45) - phase(t, 0.6, 0.85);
          pol3.position.copy(v(XS[LEAD_END]! + 0.9 + 1 * (phase(t, 0.05, 0.25) - back) , yLow));
        }
      }
      // links: the last slot of each strand ends; a new nucleotide is bonded only when both neighbours are in place
      for (const id of ['A', 'B'] as StrandId[]) s[id][N - 1]!.linkNext = false;
      for (const id of ['A2', 'B2'] as StrandId[]) s[id].forEach((sl, i) => { if (sl) sl.linkNext = sl.k >= 0.999 && !sl.mismatch && (s[id][i + 1]?.k ?? 0) >= 0.999 && !s[id][i + 1]?.mismatch; });
      // gaps between Okazaki fragments: 9|10 until Pol I replaces the primer, 6|7 is the nick until ligase seals it
      const a9 = s.A2[9], a6 = s.A2[6];
      if (a9 && a9.role === 'rna') a9.linkNext = false;
      if (a6 && s.A2[7]?.role === 'new' && nickOn) a6.linkNext = false;
      // A2[i].linkNext is the bond between i and i+1; for A2 (5′→3′ towards −x) the 3′ end of fragment 2 is slot 10,
      // which sits next to primer 1's 5′ end at slot 9 (no bond until Pol I extends fragment 2).

      pools.begin();
      const { frames } = drawStrands(pools, XS, st, s);
      if (wrongPos && index === 5 && phase(t, 0.35, 0.6) >= 1) {
        // the excised nucleotide drifting away
        const p = wrongPos.clone().add(new THREE.Vector3(-0.3 * phase(t, 0.6, 1), 0.3 * phase(t, 0.6, 1), 0));
        pools.nucleotide(WRONG, p, new THREE.Vector3(0, -1, 0), 1);
        pools.loosePhosphate('new', p, 1, new THREE.Vector3(0, 1, 0));
      }
      pools.end();

      // helicase encircles the lagging-strand template (A) at the fork
      helicase.position.set(st.F, frameAt('A', st.F, st).sugar.y, 0);

      // anchors
      const at = (o: THREE.Object3D, p: THREE.Vector3) => o.position.copy(p);
      at(ao['rna-primer'], frames.B2[1]!.sugar.clone().add(v(0, 0.3, 0)));
      at(ao.leading, frames.B2[10]!.sugar.clone());
      at(ao.lagging, frames.A2[3]!.sugar.clone());
      at(ao.okazaki, frames.A2[14]!.sugar.clone());
      at(ao.nick, frames.A2[6]!.sugar.clone().lerp(frames.A2[7]!.sugar, 0.5).add(v(0, -0.25, 0.2)));
      at(ao.mismatch, index === 5 && phase(t, 0.35, 0.6) >= 1 && wrongPos ? wrongPos.clone() : frames.B2[MIS]!.sugar.clone().add(v(0, -0.35, 0.35)));
      at(ao['three-end'], frames.B2[lead3]!.sugar.clone().add(v(0.4, -0.3, 0.2)));
    }

    return { anchors, durations: [7, 7, 7, 6, 5, 7], render, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
