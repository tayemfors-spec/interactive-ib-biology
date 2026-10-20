import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { DNA_PAIR, H_BONDS, RNA_OF_TEMPLATE, baseKit, pool, type NBase } from './d1-2-kit';

/*
 * D1.2 transcription, five steps:
 *   0 RNA polymerase binds at the promoter   1 it unwinds a short stretch of DNA (transcription bubble)
 *   2 RNA nucleotides pair with template bases (A–U, T–A, G–C, C–G) and are linked
 *   3 elongation: the polymerase moves along, the mRNA grows 5′→3′, DNA rewinds behind it
 *   4 termination: the RNA is released, the polymerase detaches and the DNA closes again
 * The gene runs left → right. The coding (sense) strand is on top and runs 5′→3′ left → right; the
 * template (antisense) strand below runs 3′→5′ left → right, so it is antiparallel and read 3′→5′.
 * The RNA is complementary to the template, so it has the coding-strand sequence with U for T.
 * Outside the bubble the two strands twist round each other as a right-handed double helix.
 * P = index of the template base the polymerase is about to copy (its active site).
 */
// 0–6 promoter, 7–29 transcribed (the same mRNA is translated in the next model), 30–32 downstream
const CODING = 'CTATAAAGACCATGGCATTCAAAGTGTAAGTTT'.split('') as NBase[];
const TEMPLATE = CODING.map((b) => DNA_PAIR[b]!);
const N = CODING.length;
const START = 7; // first transcribed base (+1)
const END = 30; // one past the last transcribed base
const S = 0.75; // rise per base pair along x
const R = 1.2; // backbone distance from the helix axis
const TWIST = (36 * Math.PI) / 180;
const LIFT = 1.7; // how far the coding strand moves away inside the bubble
const HYBRID = 8; // RNA–DNA base pairs held in the bubble
const xOf = (i: number) => (i - (N - 1) / 2) * S;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface State { P: number; bubble: number; polLift: number; rnaFly: number; incoming: boolean }
const state = (index: number, t: number): State => {
  switch (index) {
    case 0: return { P: START, bubble: 0, polLift: 1 - ease(phase(t, 0, 0.8)), rnaFly: 0, incoming: false };
    case 1: return { P: START, bubble: ease(phase(t, 0, 0.85)), polLift: 0, rnaFly: 0, incoming: false };
    case 2: return { P: START + 3 * phase(t, 0.05, 0.95), bubble: 1, polLift: 0, rnaFly: 0, incoming: true };
    case 3: return { P: lerp(START + 3, END, phase(t, 0.02, 0.96)), bubble: 1, polLift: 0, rnaFly: 0, incoming: true };
    default: return { P: END, bubble: 1 - ease(phase(t, 0.3, 0.9)), polLift: ease(phase(t, 0.35, 1)), rnaFly: ease(phase(t, 0, 0.7)), incoming: false };
  }
};

const scene: SceneModule = {
  camera: { position: [0, 3.6, 31], target: [0, 2.6, 0], fov: 38, minDistance: 8, maxDistance: 48 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(12);

    const bead = ctx.track(new THREE.SphereGeometry(0.22, 12, 8));
    const stickGeo = ctx.track(new THREE.CylinderGeometry(0.08, 0.08, 1, 6));
    const dnaBeads = pool(ctx, root, bead, 'text', N * 2, { roughness: 0.35 });
    const promBeads = pool(ctx, root, bead, 'tail', 20, { roughness: 0.35 });
    const dnaSticks = pool(ctx, root, stickGeo, 'neutral', N * 2 + 4);
    const rnaBeads = pool(ctx, root, bead, 'chol', 40, { roughness: 0.35 });
    const rnaSticks = pool(ctx, root, stickGeo, 'chol', 40);
    const ntpBeads = pool(ctx, root, bead, 'chol', 16, { roughness: 0.35 });
    const ntpTails = pool(ctx, root, ctx.track(new THREE.CylinderGeometry(0.06, 0.06, 1, 5)), 'head', 16); // the extra phosphates of a free nucleoside triphosphate
    const bases = baseKit(ctx, root, 90);

    // RNA polymerase: a large protein wrapped round the bubble (translucent so the bubble shows)
    const pol = new THREE.Mesh(ctx.track(blobGeometry(2.3, 9.6, 21, 0.1, 24)), ctx.material('protein', { roughness: 0.6, transparent: true, opacity: 0.3, depthWrite: false }));
    pol.rotation.z = Math.PI / 2;
    root.add(pol);

    // free RNA nucleotides drifting near the polymerase: fixed offsets and bases (deterministic)
    const free = Array.from({ length: 7 }, (_, k) => ({
      b: (['A', 'U', 'G', 'C'] as NBase[])[k % 4]!,
      off: new THREE.Vector3(-3 + rand() * 7.5, 2.4 + rand() * 2.2, 1.6 + rand() * 1.6),
      ph: rand() * 6.28,
    }));

    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const across = v(1, 0, 0);
    const GAP = 2 * R - 0.36;

    // anchors (moved in render)
    const A = (name: string) => anchorAt(root, 0, 0, 0, name);
    const an = {
      pol: A('rna-polymerase'), promoter: A('promoter'), coding: A('coding-strand'), template: A('template-strand'),
      free: A('free-nucleotides'), pair: A('base-pairing'), hbonds: A('hydrogen-bonds'), mrna: A('mrna'),
      five: A('five-prime'), three: A('three-prime'), rewound: A('rewound-dna'), bubble: A('bubble'), end: A('end-of-gene'),
    };

    const render = (index: number, t: number) => {
      const st = state(index, t);
      const { P, bubble } = st;
      for (const p of [dnaBeads, promBeads, dnaSticks, rnaBeads, rnaSticks, ntpBeads, ntpTails]) p.begin();
      bases.begin();

      const open = (i: number) => bubble * phase(i, P - 9.6, P - 8.2) * (1 - phase(i, P + 1.2, P + 2.6));
      const cod: THREE.Vector3[] = [];
      const tem: THREE.Vector3[] = [];
      const us: THREE.Vector3[] = [];
      const tipsT: THREE.Vector3[] = [];
      for (let i = 0; i < N; i++) {
        const s = open(i);
        const th0 = i * TWIST;
        const th = th0 - wrap(th0) * Math.min(1, s * 1.6);
        const u = v(0, Math.cos(th), Math.sin(th));
        us.push(u);
        const x = xOf(i);
        const c = v(x, 0, 0).addScaledVector(u, R + LIFT * s);
        const tp = v(x, 0, 0).addScaledVector(u, -R - 0.25 * s);
        cod.push(c); tem.push(tp);
        const prom = i < START;
        (prom ? promBeads : dnaBeads).dot(c);
        (prom ? promBeads : dnaBeads).dot(tp);
        if (i > 0) { dnaSticks.span(cod[i - 1]!, c); dnaSticks.span(tem[i - 1]!, tp); }
        const tipC = bases.base(CODING[i]!, c, u.clone().negate(), GAP);
        const tipT = bases.base(TEMPLATE[i]!, tp, u, GAP);
        tipsT.push(tipT);
        if (s < 0.08) bases.bonds(H_BONDS(CODING[i]!, TEMPLATE[i]!), tipC, tipT, across);
      }

      // ---------- RNA ----------
      const made = Math.min(END, Math.floor(P + 1e-6)); // template bases START..made-1 have been copied
      const rnaPts: THREE.Vector3[] = [];
      const exitPt = v(xOf(Math.max(START, P - HYBRID)), R, 0);
      // at termination the whole transcript is released and drifts away from the template
      const fly = v(-1.5, 2.2, 3.2).multiplyScalar(st.rnaFly);
      const peelDir = v(0.85, 0.45, 0.25).normalize();
      for (let i = START; i < made; i++) {
        const d = P - i;
        let p: THREE.Vector3;
        let dir: THREE.Vector3;
        const paired = d <= HYBRID;
        if (paired) {
          // paired with the template inside the bubble: sits where the coding strand would be
          p = v(xOf(i), 0, 0).addScaledVector(us[i]!, R);
          dir = us[i]!.clone().negate();
        } else {
          // peeled away from the template, leaving through the polymerase's exit channel, 5′ end first
          const k = d - HYBRID;
          p = exitPt.clone().add(v(-0.55 * k * S, S * k * (1 - k / 30), 0.18 * k * S));
          dir = peelDir;
        }
        p.add(fly);
        rnaPts.push(p);
        rnaBeads.dot(p);
        const rb = RNA_OF_TEMPLATE[TEMPLATE[i]!]!;
        const tip = bases.base(rb, p, dir, GAP);
        if (paired && st.rnaFly === 0) bases.bonds(H_BONDS(rb, TEMPLATE[i]!), tip, tipsT[i]!, across);
      }
      for (let k = 1; k < rnaPts.length; k++) rnaSticks.span(rnaPts[k - 1]!, rnaPts[k]!);

      // ---------- polymerase and free nucleotides ----------
      const polC = v(xOf(P - 3.6) + st.polLift * 2.5, 0.5 + st.polLift * 4.5, -st.polLift * 3);
      pol.position.copy(polC);
      (pol.material as THREE.MeshStandardMaterial).opacity = 0.3 * (1 - 0.6 * st.polLift);
      const showFree = index >= 1 && index <= 3;
      if (showFree) {
        for (const f of free) {
          const p = polC.clone().add(f.off).add(v(0.3 * Math.sin(t * 9 + f.ph), 0.25 * Math.cos(t * 7 + f.ph), 0.2 * Math.sin(t * 5 + f.ph)));
          const dir = v(Math.sin(f.ph), -0.6, Math.cos(f.ph)).normalize();
          ntpBeads.dot(p);
          ntpTails.span(p, p.clone().add(v(-0.55, 0.35, 0.1)));
          bases.base(f.b, p, dir, GAP);
        }
      }
      if (st.incoming && made < END) {
        // the next nucleotide moves into the active site and pairs with template base `made`
        const f = P - Math.floor(P + 1e-6);
        const target = v(xOf(made), 0, 0).addScaledVector(us[made]!, R);
        const startP = target.clone().add(v(1.2, 2.6, 2.4));
        const p = startP.lerp(target, ease(phase(f, 0, 0.85)));
        const rb = RNA_OF_TEMPLATE[TEMPLATE[made]!]!;
        ntpBeads.dot(p);
        if (f < 0.85) ntpTails.span(p, p.clone().add(v(-0.55, 0.35, 0.1)));
        bases.base(rb, p, us[made]!.clone().negate(), GAP);
      }

      for (const p of [dnaBeads, promBeads, dnaSticks, rnaBeads, rnaSticks, ntpBeads, ntpTails]) p.end();
      bases.end();

      // ---------- anchors ----------
      const put = (o: THREE.Object3D, p: THREE.Vector3) => o.position.copy(p);
      put(an.pol, polC.clone().add(v(1.4, 1.9, 1.2)));
      put(an.promoter, tem[3]!.clone().add(v(0, -0.5, 0.2)));
      put(an.coding, cod[N - 3]!.clone().add(v(0, 0.3, 0.2)));
      put(an.template, tem[N - 4]!.clone().add(v(0, -0.3, 0.2)));
      put(an.free, polC.clone().add(v(2.5, 3.6, 2.4)));
      const pairI = Math.max(START, Math.min(made - 1, START + 2));
      put(an.pair, v(xOf(pairI), 0.2, 2.6));
      put(an.hbonds, v(xOf(Math.max(START, made - 2)), -0.2, 2.6));
      const mid = rnaPts[Math.floor(rnaPts.length * 0.35)] ?? polC;
      put(an.mrna, mid.clone().add(v(0, 0, 0.3)));
      put(an.five, (rnaPts[0] ?? polC).clone().add(v(-0.3, 0.3, 0.2)));
      put(an.three, (rnaPts[rnaPts.length - 1] ?? polC).clone().add(v(0.2, 0.2, 2.6)));
      put(an.rewound, cod[Math.max(1, Math.floor(P - 13))]!.clone().add(v(0, 0.2, 0.3)));
      put(an.bubble, cod[Math.min(N - 1, START + 1)]!.clone().add(v(0, 0.3, 0.3)));
      put(an.end, cod[END - 1]!.clone().add(v(0, 0.3, 0.3)));
    };

    return {
      anchors: {
        'rna-polymerase': { object: an.pol, highlight: [pol] },
        promoter: { object: an.promoter, highlight: [promBeads.mesh] },
        'coding-strand': { object: an.coding, highlight: [] },
        'template-strand': { object: an.template, highlight: [] },
        'free-nucleotides': { object: an.free, highlight: [ntpBeads.mesh, ntpTails.mesh] },
        'base-pairing': { object: an.pair, highlight: [] },
        'hydrogen-bonds': { object: an.hbonds, highlight: [bases.hb.mesh] },
        mrna: { object: an.mrna, highlight: [rnaBeads.mesh, rnaSticks.mesh] },
        'five-prime': { object: an.five, highlight: [] },
        'three-prime': { object: an.three, highlight: [] },
        'rewound-dna': { object: an.rewound, highlight: [] },
        bubble: { object: an.bubble, highlight: [] },
        'end-of-gene': { object: an.end, highlight: [] },
      },
      durations: [4, 4, 6, 11, 5],
      render,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
