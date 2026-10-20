import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { lerp, phase } from '../lib/timeline';
import { type Base, type ForkState, type Slot, type StrandId, complementOf, drawStrands, ease, enzyme, frameAt, helicaseRing, nucleotidePools, xsFor, DNA_PAIR } from './d1-1-kit';

/*
 * D1.1 (SL) replication fork, 24 base pairs. Steps:
 *   0 helicase moves along, unwinding the helix and breaking hydrogen bonds (fork advances from the left end)
 *   1 the separated strands are templates; free nucleotides gather
 *   2 DNA polymerase links nucleotides complementary to each template (one new strand is built towards the
 *     fork and the other away from it, because both are built 5′→3′ and the strands are antiparallel)
 *   3 the fork reaches the end: two daughter molecules, each one parental (dark) + one new (red) strand, rewind
 * Geometry and directions are documented in d1-1-kit.ts.
 */
const N = 24;
const XS = xsFor(N);
const SEQ: Base[] = 'ATGCGTACCATGGCTAGTCGAATG'.split('') as Base[];
const COMP = complementOf(SEQ);
const D = 3.4;
const L = 3;
const F_START = XS[0]! - 0.6;
const F1 = XS[11]! + L; // indices 0–11 fully separated at the end of step 1
const I_SEP = 11;
const F_END = XS[N - 1]! + L + 0.8;

const scene: SceneModule = {
  camera: { position: [0, 4, 31.5], target: [-0.6, 0, 0], fov: 38, minDistance: 8, maxDistance: 48 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const pools = nucleotidePools(ctx, root, 260);
    const helicase = helicaseRing(ctx, root);
    const polUp = enzyme(ctx, root, 'water', 1.0, 2.6, 11);
    const polDown = enzyme(ctx, root, 'water', 1.0, 2.6, 12);

    // free nucleotides between and around the arms (deterministic)
    const rand = rng(41);
    const free = Array.from({ length: 12 }, (_, i) => ({
      base: (['A', 'T', 'G', 'C'] as Base[])[i % 4]!,
      // spread along the gap between the arms, alternately pointing up and down
      p: new THREE.Vector3(XS[0]! + 0.4 + i * 0.95 + rand() * 0.3, (i % 2 ? 0.55 : -0.55) + (rand() - 0.5) * 0.3, 0.6 + (rand() - 0.5) * 1.2),
      dir: new THREE.Vector3(0, i % 2 ? -1 : 1, (rand() - 0.5) * 0.8).normalize(),
      ph: rand() * 6.28,
      used: rand(),
    }));

    const A = (name: string) => anchorAt(root, 0, 0, 0, name);
    const anchorObj = {
      helicase: anchorAt(helicase, 0, 1.6, 0, 'helicase'),
      fork: A('fork'),
      parent: A('parent'),
      hbonds: A('hbonds'),
      template: A('template'),
      'free-nucleotides': A('free-nucleotides'),
      polymerase: anchorAt(polUp, 0, 1.2, 0.6, 'polymerase'),
      'new-strand': A('new-strand'),
      'old-strand': A('old-strand'),
      daughter: A('daughter'),
      'at-pair': A('at-pair'),
      'gc-pair': A('gc-pair'),
    };
    const m = pools.meshes;
    const anchors = {
      helicase: { object: anchorObj.helicase, highlight: [helicase] },
      fork: { object: anchorObj.fork, highlight: [] },
      parent: { object: anchorObj.parent, highlight: [m.phos.parent, m.stick.parent] },
      hbonds: { object: anchorObj.hbonds, highlight: [m.hb] },
      template: { object: anchorObj.template, highlight: [m.phos.parent, m.stick.parent] },
      'free-nucleotides': { object: anchorObj['free-nucleotides'], highlight: [] },
      polymerase: { object: anchorObj.polymerase, highlight: [polUp, polDown] },
      'new-strand': { object: anchorObj['new-strand'], highlight: [m.phos.new, m.stick.new] },
      'old-strand': { object: anchorObj['old-strand'], highlight: [m.phos.parent, m.stick.parent] },
      daughter: { object: anchorObj.daughter, highlight: [] },
      'at-pair': { object: anchorObj['at-pair'], highlight: [m.base.A, m.base.T] },
      'gc-pair': { object: anchorObj['gc-pair'], highlight: [m.base.G, m.base.C] },
    };

    const empty = (): (Slot | null)[] => XS.map(() => null);
    const parentSlots = (seq: Base[]): Slot[] => seq.map((base) => ({ base, role: 'parent', k: 1, linkNext: true }));
    const setAt = (o: THREE.Object3D, v: THREE.Vector3) => o.position.copy(v);

    function render(index: number, t: number) {
      const st: ForkState = { F: F1, tau: 0, D, L };
      const slots: Record<StrandId, (Slot | null)[]> = { A: parentSlots(SEQ), B: parentSlots(COMP), A2: empty(), B2: empty() };
      let freeK = 0; // how much of the free-nucleotide pool is shown
      let pol = { on: false, up: 0, down: 0 };
      // new nucleotides: A2 pairs with A (same bases as B), B2 pairs with B (same bases as A)
      const put = (id: 'A2' | 'B2', i: number, k: number) => {
        const tmpl = id === 'A2' ? SEQ[i]! : COMP[i]!;
        slots[id][i] = { base: DNA_PAIR[tmpl], role: 'new', k, linkNext: true };
      };
      switch (index) {
        case 0:
          st.F = lerp(F_START, F1, ease(phase(t, 0.05, 0.95)));
          break;
        case 1:
          freeK = ease(phase(t, 0, 0.6));
          break;
        case 2: {
          freeK = 1 - 0.5 * t;
          pol = { on: true, down: lerp(XS[0]! - 0.4, XS[I_SEP]! + 0.4, ease(t)), up: lerp(XS[I_SEP]! + 0.4, XS[0]! - 0.4, ease(t)) };
          for (let i = 0; i <= I_SEP; i++) {
            // lower arm: built 5′→3′ towards the fork; upper arm: built 5′→3′ away from it
            put('B2', i, ease((pol.down - XS[i]!) / 0.8 + 0.5));
            put('A2', i, ease((XS[i]! - pol.up) / 0.8 + 0.5));
          }
          break;
        }
        default: {
          st.F = lerp(F1, F_END, ease(phase(t, 0, 0.45)));
          st.tau = ease(phase(t, 0.55, 1));
          st.D = lerp(D, D + 0.5, ease(phase(t, 0.55, 1)));
          for (let i = 0; i < N; i++) {
            const done = i <= I_SEP ? 1 : ease(phase(t, 0.3, 0.55));
            const sep = frameAt('A', XS[i]!, st).s;
            const k = i <= I_SEP ? 1 : sep > 0.98 ? done : 0;
            put('A2', i, k);
            put('B2', i, k);
          }
        }
      }
      // the strand ends: last slot of each strand has no next link
      for (const id of ['A', 'B', 'A2', 'B2'] as StrandId[]) { const last = slots[id][N - 1]; if (last) last.linkNext = false; }
      // a new strand is only bonded to its neighbour once both are fully in place
      for (const id of ['A2', 'B2'] as StrandId[]) slots[id].forEach((s, i) => { if (s) s.linkNext = s.k >= 0.999 && (slots[id][i + 1]?.k ?? 0) >= 0.999; });

      pools.begin();
      const { frames } = drawStrands(pools, XS, st, slots);

      // free nucleotides
      const shown = Math.round(free.length * freeK);
      // (in step 3 the pool shrinks as nucleotides are used)
      free.forEach((f, i) => {
        if (i >= shown) return;
        const p = f.p.clone().add(new THREE.Vector3(0.2 * Math.sin(t * 4 + f.ph), 0.2 * Math.cos(t * 3 + f.ph), 0));
        pools.nucleotide(f.base, p, f.dir, 0.85);
        pools.loosePhosphate('new', p, -1, f.dir.clone().negate(), 0.85);
      });
      pools.end();

      // enzymes
      const fx = Math.min(st.F, XS[N - 1]! + 1.2);
      helicase.position.set(fx, Math.max(0.6, frameAt('A', fx, st).sugar.y), 0);
      helicase.visible = index < 3 || t < 0.4;
      helicase.scale.setScalar(index === 3 ? 1 - phase(t, 0.2, 0.4) * 0.999 : 1);
      polUp.visible = polDown.visible = pol.on;
      polDown.position.set(pol.down + 0.3, -D + R_IN, 0.8);
      polUp.position.set(pol.up - 0.3, D - R_IN, 0.8);

      // anchors
      const xPar = (Math.max(st.F, XS[0]!) + XS[N - 1]!) / 2 + 1;
      setAt(anchorObj.fork, new THREE.Vector3(st.F - 2.6, 0, 0.6));
      setAt(anchorObj.parent, new THREE.Vector3(Math.min(xPar, XS[N - 1]!), -2.1, 0.5));
      const hbI = XS.findIndex((x) => x >= st.F + 4);
      setAt(anchorObj.hbonds, new THREE.Vector3(XS[Math.max(0, hbI)]!, 0, 0.3));
      setAt(anchorObj.template, frames.A[3]!.sugar.clone().add(new THREE.Vector3(0, 0.5, 0)));
      setAt(anchorObj['free-nucleotides'], free[1]!.p.clone());
      setAt(anchorObj['new-strand'], frames.B2[3]!.sugar.clone());
      setAt(anchorObj['old-strand'], frames.B[7]!.sugar.clone());
      setAt(anchorObj.daughter, frames.A[N - 1]!.axis.clone().add(new THREE.Vector3(1.6, 0, 0)));
      // first A–T and G–C pair on the upper daughter (template A + new A2)
      const pairMid = (i: number) => frames.A[i]!.sugar.clone().lerp(frames.A2[i]!.sugar, 0.5);
      setAt(anchorObj['at-pair'], pairMid(SEQ.indexOf('T', 14)));
      setAt(anchorObj['gc-pair'], pairMid(SEQ.indexOf('G', 18)));
    }

    return { anchors, durations: [6, 4, 6, 7], render, dispose() { root.removeFromParent(); } };
  },
};

const R_IN = 0.55; // polymerase centre, measured from the arm axis towards the gap

export default scene;
