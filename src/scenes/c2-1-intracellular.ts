import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { along, bilayer, noCull } from './c2-1-kit';

/*
 * C2.1.12 a steroid hormone (testosterone) acting through an intracellular receptor.
 * Steps: 0 diffuses through the bilayer · 1 binds the receptor in the cytoplasm · 2 complex enters the
 * nucleus through a nuclear pore · 3 two complexes bind a specific DNA sequence · 4 transcription promoted.
 * Topology that matters: no membrane receptor is involved; the nuclear envelope is a double membrane
 * with pores; the activated receptors bind DNA as a pair at a specific base sequence.
 */
const MEM_Y = 3.8; // heads at 5.5 (outer) and 2.1 (inner)
const NUC = new THREE.Vector3(1.2, -3.9, -2.2);
const NR = 4.0;
const PORE_DIR = new THREE.Vector3(-0.8, 0.55, 0.25).normalize();
const DNA_Y = -4.5;
const DNA_Z = -0.2;
const DNA_X: [number, number] = [-1.6, 4.0];

const scene: SceneModule = {
  camera: { position: [0, 1.5, 19.5], target: [0, -0.9, 0], fov: 42, minDistance: 7, maxDistance: 38 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
    const at = (d: number) => NUC.clone().addScaledVector(PORE_DIR, d);

    const mem = bilayer(ctx, root, { y: MEM_Y, x: [-7.6, 7.6], z: [-2.6, 1.0], seed: 13 });

    // ---------- nucleus: double membrane, cut away at the front, with a nuclear pore ----------
    const envMat = ctx.material('neutral', { roughness: 0.7, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
    const cut = { start: Math.PI / 2 + Math.PI / 3, len: 2 * Math.PI - (2 * Math.PI) / 3 }; // a 120° wedge facing the camera (+z) is cut away
    const envelope = new THREE.Group();
    for (const r of [NR, NR + 0.3]) {
      const s = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 40, 28, cut.start, cut.len)), envMat);
      envelope.add(s);
    }
    envelope.position.copy(NUC);
    root.add(envelope);
    const pore = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.5, 0.17, 10, 24)), ctx.material('protein2', { roughness: 0.5 }));
    pore.position.copy(at(NR + 0.15));
    pore.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), PORE_DIR);
    root.add(pore);

    // ---------- DNA: two strands of a double helix with base pairs; the response element is highlighted ----------
    const strandMat = ctx.material('text', { roughness: 0.5 });
    const mkStrand = (ph: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 120; i++) {
        const x = DNA_X[0] + ((DNA_X[1] - DNA_X[0]) * i) / 120;
        const a = (x / 1.9) * Math.PI * 2 + ph;
        pts.push(v(x, DNA_Y + Math.cos(a) * 0.5, DNA_Z + Math.sin(a) * 0.5));
      }
      return new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.08, 6)), strandMat);
    };
    const dna = new THREE.Group();
    dna.add(mkStrand(0), mkStrand(Math.PI * 0.8));
    const RE: [number, number] = [-0.05, 1.35];
    const nBp = 34;
    const rungGeo = ctx.track(new THREE.CylinderGeometry(0.06, 0.06, 0.96, 5));
    const rungs = new THREE.InstancedMesh(rungGeo, ctx.material('tail', { roughness: 0.5 }), nBp);
    const reRungs = new THREE.InstancedMesh(rungGeo, ctx.material('glucose', { roughness: 0.4, emissiveIntensity: 0.2 }), nBp);
    let nr = 0, nre = 0;
    for (let i = 0; i < nBp; i++) {
      const x = DNA_X[0] + 0.08 + ((DNA_X[1] - DNA_X[0] - 0.16) * i) / (nBp - 1);
      const a = (x / 1.9) * Math.PI * 2 + Math.PI * 0.4;
      const rot = new THREE.Euler(a, 0, 0);
      const p = v(x, DNA_Y, DNA_Z);
      if (x > RE[0] && x < RE[1]) setInstance(reRungs, nre++, p, rot, 1, 0.95);
      else setInstance(rungs, nr++, p, rot, 1, 0.95);
    }
    rungs.count = nr;
    reRungs.count = nre;
    dna.add(rungs, reRungs);
    root.add(dna);

    // ---------- steroid hormone: four fused rings (three six-membered, one five-membered) ----------
    const mSter = ctx.material('chol', { roughness: 0.4 });
    const ring6 = ctx.track(new THREE.TorusGeometry(0.2, 0.055, 4, 6));
    const ring5 = ctx.track(new THREE.TorusGeometry(0.18, 0.055, 4, 5));
    const steroid = () => {
      const g = new THREE.Group();
      const spots: [number, number, THREE.BufferGeometry][] = [[0, 0, ring6], [0.35, 0.2, ring6], [0.7, 0, ring6], [1.02, 0.22, ring5]];
      for (const [x, y, geo] of spots) { const m = new THREE.Mesh(geo, mSter); m.position.set(x - 0.5, y, 0); g.add(m); }
      return g;
    };
    const hormones = [steroid(), steroid()];
    hormones.forEach((h) => root.add(h));
    const H_OUT = [v(-4.2, 6.8, 0.9), v(-1.6, 6.6, 0.5)];
    const H_IN = [v(-4.0, 1.5, 1.0), v(-1.8, 1.2, 0.7)];

    // ---------- receptors (cytoplasmic) ----------
    const mRec = ctx.material('protein', { roughness: 0.45 });
    const receptors = [0, 1].map((i) => new THREE.Mesh(ctx.track(blobGeometry(0.55, 1.5, 130 + i, 0.14)), mRec));
    receptors.forEach((r) => root.add(r));
    const R_HOME = [v(-4.0, 0.5, 0.9), v(-1.8, 0.1, 0.7)];
    const HOFF = v(0, 0.62, 0.35); // hormone in the binding site, relative to the receptor
    const DNA_SITE = [v(0.3, DNA_Y + 0.95, DNA_Z + 0.3), v(1.0, DNA_Y + 0.95, DNA_Z + 0.3)];
    const route = (i: number) => [R_HOME[i]!, at(NR + 1.4).add(v(i * 0.4, 0.2, 0.3)), at(NR + 0.15), at(NR - 1.0), DNA_SITE[i]!.clone().add(v(0, 0.6, 0))];

    // ---------- RNA polymerase and mRNA ----------
    const pol = new THREE.Mesh(ctx.track(blobGeometry(0.55, 1.2, 140, 0.15)), ctx.material('protein2', { roughness: 0.45 }));
    pol.rotation.z = Math.PI / 2;
    root.add(pol);
    const POL_FROM = v(2.0, DNA_Y + 1.8, DNA_Z + 1.0);
    const POL_ON = v(1.9, DNA_Y + 0.2, DNA_Z + 0.65);
    const POL_END = v(3.4, DNA_Y + 0.2, DNA_Z + 0.65);
    const mrnaPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; mrnaPts.push(v(1.9 + u * 1.5, DNA_Y + 0.8 + (1 - u) * 0.7 + Math.sin(u * 9) * 0.12, DNA_Z + 0.8 + Math.sin(u * 7) * 0.2)); }
    const mrnaGeo = ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mrnaPts), 60, 0.06, 6));
    const mMrna = ctx.material('k', { roughness: 0.4 });
    const mrna = new THREE.Mesh(mrnaGeo, mMrna);
    root.add(mrna);
    const MRNA_SEGS = 60 * 6 * 6;
    // finished copies of the mRNA leave through the pore
    const copyGeo = ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(-0.5, 0, 0), v(-0.2, 0.15, 0.1), v(0.2, -0.12, 0), v(0.5, 0.1, 0.1)]), 20, 0.06, 6));
    const copies = [new THREE.Mesh(copyGeo, mMrna), new THREE.Mesh(copyGeo, mMrna)];
    copies.forEach((c) => root.add(c));
    const exitPath = [v(2.6, DNA_Y + 1.7, DNA_Z + 0.8), at(NR - 1.0), at(NR + 0.15), at(NR + 1.5), v(1.8, 1.0, 1.0)];

    noCull(root);
    const tmp = new THREE.Vector3();
    const anchors = {
      hormone: { object: anchorAt(hormones[0]!, -0.5, 0.25, 0.1, 'hormone'), highlight: hormones },
      bilayer: { object: anchorAt(root, 4.4, MEM_Y + 1.8, 1.0, 'bilayer'), highlight: [mem.heads, mem.tails] },
      receptor: { object: anchorAt(receptors[1]!, 0.5, -0.3, 0.4, 'receptor'), highlight: receptors },
      complex: { object: anchorAt(receptors[0]!, -0.5, -0.2, 0.4, 'complex'), highlight: [...receptors, ...hormones] },
      'nuclear-envelope': { object: anchorAt(root, NUC.x + 3.3, NUC.y + 2.3, NUC.z + 0.4, 'nuclear-envelope'), highlight: [envelope] },
      pore: { object: anchorAt(pore, 0, 0, 0.3, 'pore'), highlight: [pore] },
      dna: { object: anchorAt(root, DNA_X[1] - 0.2, DNA_Y + 0.5, DNA_Z + 0.4, 'dna'), highlight: [dna] },
      'response-element': { object: anchorAt(root, 0.65, DNA_Y - 0.55, DNA_Z + 0.5, 'response-element'), highlight: [reRungs] },
      'rna-polymerase': { object: anchorAt(pol, 0, -0.6, 0.4, 'rna-polymerase'), highlight: [pol] },
      mrna: { object: anchorAt(root, 3.5, DNA_Y + 1.3, DNA_Z + 0.9, 'mrna'), highlight: [mrna, ...copies] },
      outside: { object: anchorAt(root, 5.5, 6.6, -1.0, 'outside'), highlight: [] },
      cytoplasm: { object: anchorAt(root, 6.2, 0.6, -1.0, 'cytoplasm'), highlight: [] },
    };

    return {
      anchors,
      durations: [5, 4, 6, 5, 7],
      render(index, t) {
        const p = (i: number) => (index > i ? 1 : index === i ? t : 0);
        const s0 = p(0), s1 = p(1), s2 = p(2), s3 = p(3), s4 = p(4);

        // receptors: change shape when the hormone binds, then travel as complexes into the nucleus
        receptors.forEach((r, i) => {
          const travel = ease(phase(s2, 0.05 + i * 0.1, Math.min(1, 0.9 + i * 0.1)));
          along(route(i), travel, r.position);
          r.position.lerp(DNA_SITE[i]!, ease(phase(s3, 0.1, 0.7)));
          const act = ease(phase(s1, 0.4, 0.9));
          r.rotation.set(0, 0, Math.PI / 2 + act * (i ? -0.5 : 0.5));
          r.scale.set(1, 1 - 0.12 * act, 1 + 0.1 * act);
        });

        // hormones: diffuse through the bilayer, then bind and ride with their receptor
        hormones.forEach((h, i) => {
          const r = receptors[i]!;
          const inside = ease(phase(s0, 0.05 + i * 0.15, Math.min(1, 0.75 + i * 0.15)));
          const free = tmp.copy(H_OUT[i]!).lerp(H_IN[i]!, inside);
          if (index === 0) free.x += Math.sin(t * 7 + i) * 0.1;
          const bind = ease(phase(s1, 0.05, 0.5));
          h.position.copy(free).lerp(r.position.clone().add(HOFF), bind);
          h.rotation.set(0.3, 0.4 + (1 - bind) * 0.8 + i, 0);
        });

        // RNA polymerase is recruited and transcribes the target gene; mRNA copies leave the nucleus
        const polIn = ease(phase(s4, 0, 0.2));
        const elong = ease(phase(s4, 0.2, 0.65));
        pol.visible = index === 4;
        pol.position.copy(POL_FROM).lerp(POL_ON, polIn);
        pol.position.x += (POL_END.x - POL_ON.x) * elong;
        mrna.visible = index === 4 && elong > 0;
        mrnaGeo.setDrawRange(0, Math.floor(elong * MRNA_SEGS / 36) * 36);
        copies.forEach((c, i) => {
          const u = ease(phase(s4, 0.6 + i * 0.12, Math.min(1, 0.88 + i * 0.12)));
          c.visible = index === 4 && u > 0;
          along(exitPath, u, c.position);
          c.rotation.set(0.4 * i, u * 2, 0.3);
        });
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
