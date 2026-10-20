import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';

/*
 * C2.2.5–C2.2.7: a cholinergic synapse (e.g. a neuromuscular junction), presynaptic knob above,
 * postsynaptic membrane below, synaptic cleft between. The knob is cut open at the front.
 * Steps (each render draws the complete state of that step):
 *   0 action potential arrives      1 voltage-gated Ca²⁺ channels open, Ca²⁺ diffuses in
 *   2 vesicles fuse, ACh released    3 ACh diffuses across and binds to receptors
 *   4 receptor channels open, Na⁺ in → EPSP     5 AChE hydrolyses ACh; choline reabsorbed
 */
const BOTTOM = 0.85; // presynaptic membrane (bottom of the knob)
const POST = -0.85; // top of the postsynaptic membrane
const POST_T = 0.36; // membrane thickness
const RECEPTOR_X = [-1.5, -0.5, 0.5, 1.5];
const RECEPTOR_Z = 0.9;
const CA_CH = [new THREE.Vector3(-2.35, BOTTOM + 0.02, 0.55), new THREE.Vector3(2.35, BOTTOM + 0.02, 0.55), new THREE.Vector3(-2.2, BOTTOM + 0.02, -0.9)];
const TRANSPORTER = [new THREE.Vector3(-1.75, BOTTOM + 0.02, 1.15), new THREE.Vector3(1.75, BOTTOM + 0.02, 1.15)];
const ACHE = [new THREE.Vector3(-1.0, POST + 0.12, 1.75), new THREE.Vector3(1.0, POST + 0.12, 1.75), new THREE.Vector3(0, POST + 0.12, 0.0)];

const scene: SceneModule = {
  camera: { position: [0, 3.4, 16.5], target: [0, 2.1, 0], fov: 40, minDistance: 6, maxDistance: 34 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(41);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const tmp = new THREE.Vector3();

    // ---------- presynaptic knob (lathe, cut open at the front) and axon ----------
    const mPre = ctx.material('neutral', { roughness: 0.6, side: THREE.DoubleSide });
    const profile = [
      [0.01, BOTTOM], [1.6, BOTTOM], [2.6, BOTTOM + 0.05], [3.05, BOTTOM + 0.4], [3.3, 1.8], [3.25, 2.7], [2.9, 3.6],
      [2.2, 4.5], [1.4, 5.3], [0.95, 6.0], [0.9, 7.0], [0.9, 10.5],
    ].map(([r, y]) => new THREE.Vector2(r!, y!));
    const knob = new THREE.Mesh(ctx.track(new THREE.LatheGeometry(profile, 56, Math.PI / 4, Math.PI * 1.5)), mPre);
    root.add(knob);

    // ---------- the arriving action potential: a glowing band moving down the axon ----------
    const mWave = ctx.material('head', { roughness: 0.3, transparent: true });
    const wave = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.98, 0.12, 10, 40)), mWave);
    wave.rotation.x = Math.PI / 2;
    root.add(wave);

    // ---------- mitochondria ----------
    const mMito = ctx.material('head', { roughness: 0.55 });
    const mitoGeo = ctx.track(new THREE.CapsuleGeometry(0.32, 1.1, 6, 16));
    const mitos = new THREE.Group();
    for (const [x, y, z, rz] of [[1.75, 3.5, -0.6, 0.9], [-1.6, 3.9, -0.9, -0.7]] as const) {
      const m = new THREE.Mesh(mitoGeo, mMito);
      m.position.set(x, y, z);
      m.rotation.set(0.3, 0, rz);
      mitos.add(m);
    }
    root.add(mitos);

    // ---------- vesicles (stationary ones, plus three that fuse) ----------
    const mVes = ctx.material('tail', { roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false });
    const vesGeo = ctx.track(new THREE.SphereGeometry(0.42, 20, 14));
    const restVes = [v(-1.2, 2.2, 0.2), v(0.2, 2.5, -0.4), v(1.3, 2.1, 0.4), v(-0.5, 3.2, 0.6), v(0.9, 3.0, -1.2), v(-1.9, 2.0, -1.1), v(2.1, 1.6, -0.8), v(0.4, 3.9, 0.1)];
    const restMesh = new THREE.InstancedMesh(vesGeo, mVes, restVes.length);
    restVes.forEach((p, i) => setInstance(restMesh, i, p));
    root.add(restMesh);
    const fuseStart = [v(-0.9, 1.45, 0.55), v(0.15, 1.6, -0.15), v(1.05, 1.4, 0.65)];
    const fuseEnd = fuseStart.map((p) => v(p.x, BOTTOM + 0.05, p.z));
    const fuseMeshes = fuseStart.map(() => new THREE.Mesh(vesGeo, mVes));
    root.add(...fuseMeshes);

    // ---------- postsynaptic membrane and receptors ----------
    const mPost = ctx.material('neutral', { roughness: 0.6 });
    const post = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(13, POST_T, 5.2)), mPost);
    post.position.set(0, POST - POST_T / 2, 0.4);
    root.add(post);
    // EPSP: the depolarized patch of postsynaptic membrane under the receptors
    const mEpsp = ctx.material('na', { roughness: 0.4, transparent: true, depthWrite: false });
    const epsp = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(5.4, POST_T + 0.04, 2.6)), mEpsp);
    epsp.position.set(0, POST - POST_T / 2, RECEPTOR_Z);
    root.add(epsp);

    // nicotinic ACh receptors: five subunits around a central pore
    const mRec = ctx.material('protein', { roughness: 0.45 });
    const subGeo = ctx.track(new THREE.CylinderGeometry(0.15, 0.15, 1.0, 10));
    const subunits = new THREE.InstancedMesh(subGeo, mRec, RECEPTOR_X.length * 5);
    root.add(subunits);
    const setReceptors = (open: number) => {
      const r = lerp(0.22, 0.34, open);
      RECEPTOR_X.forEach((x, j) => {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          setInstance(subunits, j * 5 + k, v(x + Math.cos(a) * r, POST - POST_T / 2 + 0.05, RECEPTOR_Z + Math.sin(a) * r));
        }
      });
      subunits.instanceMatrix.needsUpdate = true;
    };

    // voltage-gated Ca²⁺ channels (two halves that part when open)
    const mCa = ctx.material('protein2', { roughness: 0.45 });
    const halfGeo = ctx.track(new THREE.BoxGeometry(0.22, 0.75, 0.42));
    const caHalves = new THREE.InstancedMesh(halfGeo, mCa, CA_CH.length * 2);
    root.add(caHalves);
    const setCa = (open: number) => {
      CA_CH.forEach((p, j) => {
        const g = lerp(0.11, 0.24, open);
        setInstance(caHalves, 2 * j, v(p.x - g, p.y, p.z));
        setInstance(caHalves, 2 * j + 1, v(p.x + g, p.y, p.z));
      });
      caHalves.instanceMatrix.needsUpdate = true;
    };

    // choline transporters in the presynaptic membrane
    const mTrans = ctx.material('protein2', { roughness: 0.5 });
    const transporters = new THREE.Group();
    TRANSPORTER.forEach((p, i) => {
      const m = new THREE.Mesh(ctx.track(blobGeometry(0.26, 0.8, 70 + i, 0.1, 12)), mTrans);
      m.position.copy(p);
      transporters.add(m);
    });
    root.add(transporters);

    // acetylcholinesterase on the postsynaptic surface
    const mAche = ctx.material('chol', { roughness: 0.5 });
    const ache = new THREE.Group();
    ACHE.forEach((p, i) => {
      const m = new THREE.Mesh(ctx.track(blobGeometry(0.24, 0.5, 80 + i, 0.15, 12)), mAche);
      m.position.copy(p);
      m.rotation.z = Math.PI / 2;
      ache.add(m);
    });
    root.add(ache);

    // ---------- particles ----------
    const mCaIon = ctx.material('carb', { roughness: 0.4 });
    const mNa = ctx.material('na', { roughness: 0.4 });
    const mCholine = ctx.material('glucose', { roughness: 0.4 });
    const mAcetyl = ctx.material('neutral', { roughness: 0.4 });
    const caMesh = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.15, 10, 8)), mCaIon, 20);
    const naMesh = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.13, 10, 8)), mNa, 20);
    const ACH_N = restVes.length * 4 + 18;
    const choMesh = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.11, 10, 8)), mCholine, ACH_N);
    const aceMesh = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.085, 8, 6)), mAcetyl, ACH_N);
    root.add(caMesh, naMesh, choMesh, aceMesh);

    // Ca²⁺ outside the knob (in the cleft and around the knob); the first 6 enter through channels
    const caOut = Array.from({ length: 16 }, (_, i) => {
      if (i < 6) { const c = CA_CH[i % 3]!; return v(c.x + (rand() - 0.5) * 0.9, -0.05 - rand() * 0.3, c.z + (rand() - 0.5) * 0.7 + 0.2); }
      const side = i % 2 ? 1 : -1;
      return i < 11 ? v(side * (3.2 + rand() * 1.4), -0.2 + rand() * 0.5, -1 + rand() * 2.6) : v(side * (3.6 + rand() * 0.9), 0.8 + rand() * 1.8, 0.3 + rand() * 0.9);
    });
    const caIn = Array.from({ length: 6 }, (_, i) => { const c = CA_CH[i % 3]!; return v(c.x * 0.75 + (rand() - 0.5) * 0.6, BOTTOM + 0.6 + rand() * 0.7, c.z + (rand() - 0.5) * 0.5); });

    // Na⁺ in the cleft and extracellular fluid; the first 6 enter through the receptors
    const naOut = Array.from({ length: 14 }, (_, i) => (i < 6 ? v(RECEPTOR_X[i % 4]! + (rand() - 0.5) * 0.5, -0.1 + rand() * 0.35, RECEPTOR_Z + (rand() - 0.5) * 0.6) : v((rand() - 0.5) * 9, -0.35 + rand() * 0.7, -1 + rand() * 3.2)));
    const naIn = Array.from({ length: 6 }, (_, i) => v(RECEPTOR_X[i % 4]! + (rand() - 0.5) * 0.6, POST - POST_T - 0.6 - rand() * 0.6, RECEPTOR_Z + (rand() - 0.5) * 0.8));

    // ACh: index < restVes.length*4 → inside resting vesicles (static); the rest belong to fusing vesicles
    type Mol = { inVes: THREE.Vector3; cleft: THREE.Vector3; bound?: THREE.Vector3; split: THREE.Vector3; choEnd: THREE.Vector3; reuptake?: number };
    const inVesicle = (c: THREE.Vector3) => c.clone().add(v((rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.4));
    const restAch = restVes.flatMap((c) => Array.from({ length: 4 }, () => inVesicle(c)));
    let bindSlot = 0;
    const mols: Mol[] = Array.from({ length: 18 }, (_, i) => {
      const ves = fuseStart[i % 3]!;
      const cleft = v(ves.x + (rand() - 0.5) * 1.1, 0.1 + rand() * 0.35, ves.z + (rand() - 0.5) * 0.9);
      const m: Mol = { inVes: inVesicle(ves), cleft, split: v((rand() - 0.5) * 5, -0.35 + rand() * 0.6, -0.4 + rand() * 2.4), choEnd: v(0, 0, 0) };
      if (i % 2 === 0 && bindSlot < 8) {
        const r = RECEPTOR_X[bindSlot >> 1]!;
        m.bound = v(r + (bindSlot % 2 ? 0.2 : -0.2), POST + 0.42, RECEPTOR_Z + 0.05);
        bindSlot++;
      }
      // four choline molecules are taken back into the knob through the transporters
      if (i < 4) {
        const t = TRANSPORTER[i % 2]!;
        m.reuptake = i % 2;
        m.choEnd = v(t.x * 0.8 + (rand() - 0.5) * 0.4, BOTTOM + 0.7 + rand() * 0.4, t.z - 0.1);
      } else {
        const t = TRANSPORTER[i % 2]!;
        m.choEnd = v(t.x + (rand() - 0.5) * 1.6, 0.05 + rand() * 0.3, t.z + (rand() - 0.5) * 0.8);
      }
      return m;
    });
    const diffused = mols.map((m) => m.bound ?? v((rand() - 0.5) * 5, -0.3 + rand() * 0.6, RECEPTOR_Z + (rand() - 0.5) * 2));

    const glow = (mat: THREE.MeshStandardMaterial, k: number) => { mat.emissive.copy(mat.color); mat.emissiveIntensity = k; };
    const place = (mesh: THREE.InstancedMesh, i: number, p: THREE.Vector3, s = 1) => setInstance(mesh, i, p, undefined, Math.max(0.001, s));
    const path = (pts: THREE.Vector3[], u: number) => {
      const k = Math.max(0, Math.min(0.9999, u)) * (pts.length - 1);
      const i = Math.floor(k);
      return tmp.copy(pts[i]!).lerp(pts[i + 1]!, k - i);
    };
    const jitter = (p: THREE.Vector3, t: number, seed: number, a = 0.06) => tmp.set(p.x + a * Math.sin(t * 7 + seed), p.y + a * Math.cos(t * 6 + seed * 1.7), p.z + a * Math.sin(t * 5 + seed * 0.6));

    const anchors = {
      presynaptic: { object: anchorAt(root, -3.1, 2.6, 1.1, 'presynaptic'), highlight: [knob] },
      impulse: { object: anchorAt(root, 0.7, 7.6, 0.7, 'impulse'), highlight: [wave] },
      'ca-channel': { object: anchorAt(root, 2.35, BOTTOM - 0.35, 0.8, 'ca-channel'), highlight: [caHalves] },
      calcium: { object: anchorAt(root, -1.85, BOTTOM + 1.0, 0.7, 'calcium'), highlight: [caMesh] },
      vesicle: { object: anchorAt(root, -0.5, 3.45, 1.0, 'vesicle'), highlight: [restMesh, ...fuseMeshes] },
      mitochondrion: { object: anchorAt(root, 1.75, 3.85, -0.3, 'mitochondrion'), highlight: [mitos] },
      ach: { object: anchorAt(root, 0.4, 0.15, 1.2, 'ach'), highlight: [choMesh, aceMesh] },
      cleft: { object: anchorAt(root, 4.6, 0.0, 2.2, 'cleft'), highlight: [] },
      receptor: { object: anchorAt(root, 1.5, POST + 0.1, RECEPTOR_Z + 0.4, 'receptor'), highlight: [subunits] },
      sodium: { object: anchorAt(root, -0.5, POST - POST_T - 0.9, RECEPTOR_Z + 0.4, 'sodium'), highlight: [naMesh, epsp] },
      postsynaptic: { object: anchorAt(root, -4.8, POST, 2.9, 'postsynaptic'), highlight: [post] },
      ache: { object: anchorAt(root, -1.0, POST + 0.3, 1.95, 'ache'), highlight: [ache] },
      transporter: { object: anchorAt(root, 1.75, BOTTOM + 0.3, 1.35, 'transporter'), highlight: [transporters] },
      choline: { object: anchorAt(root, -1.4, BOTTOM + 0.95, 0.95, 'choline'), highlight: [choMesh] },
    };

    return {
      anchors,
      durations: [5, 5, 6, 6, 6, 7],
      render(index, t) {
        // --- action potential band and depolarized knob ---
        const arrive = index === 0 ? ease(phase(t, 0, 0.7)) : 1;
        wave.position.set(0, lerp(10, 5.4, arrive), 0);
        wave.scale.setScalar(lerp(1, 1.35, arrive));
        mWave.opacity = index === 0 ? 1 - 0.35 * phase(t, 0.7, 1) : 0;
        wave.visible = index === 0;
        glow(mPre, index === 0 ? 0.45 * phase(t, 0.55, 1) : index <= 2 ? 0.45 : 0);

        // --- Ca²⁺ channels: open from the end of step 0 (depolarization) until after release ---
        setCa(index === 0 ? ease(phase(t, 0.75, 1)) : index <= 2 ? 1 : index === 3 ? 1 - ease(phase(t, 0, 0.4)) : 0);
        const caEnter = index === 1 ? t : index > 1 ? 1 : 0;
        caMesh.count = caOut.length;
        caOut.forEach((p, i) => {
          if (i < 6) {
            const c = CA_CH[i % 3]!;
            const u = ease(phase(caEnter, i * 0.07, 0.55 + i * 0.07));
            place(caMesh, i, u > 0 ? path([p, v(c.x, c.y - 0.45, c.z), v(c.x, c.y + 0.45, c.z), caIn[i]!], u) : jitter(p, t, i));
          } else place(caMesh, i, jitter(p, t, i));
        });
        caMesh.instanceMatrix.needsUpdate = true;

        // --- vesicles fuse (step 2) and become part of the membrane ---
        const fuse = index === 2 ? ease(phase(t, 0, 0.45)) : index > 2 ? 1 : 0;
        const flatten = index === 2 ? ease(phase(t, 0.35, 0.7)) : index > 2 ? 1 : 0;
        fuseMeshes.forEach((m, i) => {
          m.position.lerpVectors(fuseStart[i]!, fuseEnd[i]!, fuse);
          m.scale.set(1 + 0.35 * flatten, 1 - 0.75 * flatten, 1 + 0.35 * flatten);
          m.visible = index <= 2;
        });

        // --- ACh ---
        let n = 0;
        for (const p of restAch) { place(choMesh, n, p); tmp.copy(p).x += 0.17; place(aceMesh, n, tmp); n++; }
        const release = index === 2 ? ease(phase(t, 0.45, 0.95)) : index > 2 ? 1 : 0;
        const bindU = index === 3 ? ease(phase(t, 0.05, 0.85)) : index > 3 ? 1 : 0;
        mols.forEach((m, i) => {
          let cho: THREE.Vector3;
          let ace: THREE.Vector3 | null = null;
          if (index < 2 || (index === 2 && release === 0)) {
            // inside its vesicle (moving with it while it approaches the membrane)
            cho = tmp.copy(m.inVes).add(fuseEnd[i % 3]!.clone().sub(fuseStart[i % 3]!).multiplyScalar(fuse)).clone();
          } else if (index === 2) {
            cho = tmp.copy(m.inVes).add(fuseEnd[i % 3]!.clone().sub(fuseStart[i % 3]!)).lerp(m.cleft, release).clone();
          } else if (index === 3 || index === 4) {
            const p = tmp.copy(m.cleft).lerp(diffused[i]!, bindU).clone();
            cho = index === 4 && !m.bound ? jitter(p, t, i, 0.05).clone() : p;
          } else {
            // step 5: ACh leaves the receptor and is hydrolysed by AChE into choline + acetate
            const from = diffused[i]!;
            const toEnzyme = ease(phase(t, 0, 0.3));
            const enz = ACHE[i % 3]!;
            const atEnzyme = from.clone().lerp(v(enz.x + (i % 2 ? 0.3 : -0.3), enz.y + 0.25, enz.z), toEnzyme);
            const split = ease(phase(t, 0.3, 0.55));
            const away = ease(phase(t, 0.55, 1));
            if (m.reuptake !== undefined) {
              const tr = TRANSPORTER[m.reuptake]!;
              cho = path([atEnzyme, v(tr.x, tr.y - 0.5, tr.z), v(tr.x, tr.y + 0.5, tr.z), m.choEnd], away).clone();
              if (away === 0) cho = atEnzyme.clone();
            } else cho = atEnzyme.clone().lerp(m.choEnd, away);
            ace = atEnzyme.clone().add(v(0.17 + split * 0.4, 0, 0)).lerp(m.split, away);
          }
          place(choMesh, n, cho);
          place(aceMesh, n, ace ?? cho.clone().add(v(0.17, 0, 0)));
          n++;
        });
        choMesh.count = aceMesh.count = n;
        choMesh.instanceMatrix.needsUpdate = aceMesh.instanceMatrix.needsUpdate = true;

        // --- receptors open when ACh is bound; Na⁺ enters → EPSP ---
        const open = index === 3 ? ease(phase(t, 0.8, 1)) : index === 4 ? 1 : index === 5 ? 1 - ease(phase(t, 0, 0.3)) : 0;
        setReceptors(open);
        const naU = index === 4 ? ease(phase(t, 0.05, 0.8)) : index === 5 ? 1 : 0;
        naMesh.count = naOut.length;
        naOut.forEach((p, i) => {
          if (i < 6 && naU > 0) {
            const r = RECEPTOR_X[i % 4]!;
            place(naMesh, i, path([p, v(r, POST + 0.3, RECEPTOR_Z), v(r, POST - POST_T - 0.3, RECEPTOR_Z), naIn[i]!], ease(phase(naU, (i % 3) * 0.1, 0.8 + (i % 3) * 0.1))));
          } else place(naMesh, i, jitter(p, t, i + 30));
        });
        naMesh.instanceMatrix.needsUpdate = true;
        mEpsp.opacity = index === 4 ? 0.7 * ease(phase(t, 0.3, 0.9)) : index === 5 ? 0.7 * (1 - ease(phase(t, 0.2, 0.8))) : 0;
        epsp.visible = mEpsp.opacity > 0.01;
        glow(mEpsp, 0.35);
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
