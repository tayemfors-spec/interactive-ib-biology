import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';

/*
 * B3.3 levels of organisation in skeletal muscle, as four models of increasing magnification:
 *   whole muscle (with tendon, cut to show bundles) → one bundle (fascicle) of muscle fibres →
 *   one muscle fibre (sarcolemma, peripheral nuclei, myofibrils, mitochondria, sarcoplasmic reticulum) →
 *   one myofibril (sarcomeres end to end between Z-lines).
 * Each model is magnified relative to the one before, so sizes are not comparable between them.
 * Topology that matters: a fibre is one multinucleate cell; its many nuclei lie just under the
 * sarcolemma; myofibrils run the whole length of the fibre, parallel to each other; mitochondria lie
 * between the myofibrils; the SR is a network of membrane tubules wrapped round each myofibril.
 */
const X = new THREE.Vector3(1, 0, 0);
const along = (g: THREE.BufferGeometry) => g.rotateZ(-Math.PI / 2); // geometry built on +y → +x
const hex = (n: number, step: number): [number, number][] => {
  const pts: [number, number][] = [[0, 0]];
  for (let ring = 1; pts.length < n; ring++)
    for (let side = 0; side < 6; side++)
      for (let k = 0; k < ring; k++) {
        const a0 = (side * Math.PI) / 3, a1 = ((side + 1) * Math.PI) / 3;
        const f = k / ring;
        pts.push([ring * step * ((1 - f) * Math.cos(a0) + f * Math.cos(a1)), ring * step * ((1 - f) * Math.sin(a0) + f * Math.sin(a1))]);
      }
  return pts.slice(0, n);
};

const scene: SceneModule = {
  camera: { position: [-0.6, 2.0, 22.5], target: [-1.0, 0.1, 0], fov: 38, minDistance: 8, maxDistance: 44 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(12);
    const mMuscle = ctx.material('k', { roughness: 0.6 });
    const mCut = ctx.material('chol', { roughness: 0.7 });
    const mTendon = ctx.material('neutral', { roughness: 0.4 });
    const mSheath = ctx.material('tail', { roughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const mLemma = ctx.material('head', { roughness: 0.5, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const mLemmaRim = ctx.material('head', { roughness: 0.5 });
    const mNuc = ctx.material('na', { roughness: 0.5 });
    const mMito = ctx.material('chol', { roughness: 0.45 });
    const mSR = ctx.material('water', { roughness: 0.4 });
    const mFibril = ctx.material('neutral', { roughness: 0.6 });
    const mA = ctx.material('protein2', { roughness: 0.5 });
    const mZ = ctx.material('text', { roughness: 0.6 });
    const mH = ctx.material('tail', { roughness: 0.5 });
    const mLink = ctx.material('text', { roughness: 0.8, transparent: true, opacity: 0.25, depthWrite: false });
    const mBracket = ctx.material('head', { roughness: 0.4 });

    const cyl = (r: number, len: number, seg = 20) => ctx.track(along(new THREE.CylinderGeometry(r, r, len, seg, 1, true)));
    const solid = (r: number, len: number, seg = 16) => ctx.track(along(new THREE.CylinderGeometry(r, r, len, seg)));

    // ---------- 1 · whole muscle, cut across to show its bundles ----------
    const muscle = new THREE.Group();
    muscle.position.set(-5.6, 3.3, 0);
    muscle.rotation.y = -0.45; // turn the cut face towards the reader
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 30; i++) {
      const y = -4.6 + (i / 30) * 6.6; // spindle from y = −4.6 (tendon end) to the cut at y = 2
      prof.push(new THREE.Vector2(Math.max(0.24, 1.3 * Math.pow(Math.max(0, 1 - (y / 4.6) ** 2), 0.6)), y));
    }
    const belly = new THREE.Mesh(ctx.track(along(new THREE.LatheGeometry(prof, 40))), mMuscle);
    const cutR = prof[prof.length - 1]!.x;
    const face = new THREE.Mesh(ctx.track(along(new THREE.CylinderGeometry(cutR, cutR, 0.02, 40))), mCut);
    face.position.x = 2;
    const fasc = new THREE.InstancedMesh(solid(0.19, 0.14, 14), mMuscle, 19);
    hex(19, 0.44).forEach(([y, z], i) => fasc.setMatrixAt(i, new THREE.Matrix4().makeTranslation(2.03, y, z)));
    const tendon = new THREE.Mesh(solid(0.24, 2.2), mTendon);
    tendon.position.x = -5.5;
    muscle.add(belly, face, fasc, tendon);
    root.add(muscle);

    // ---------- 2 · one bundle (fascicle) of muscle fibres ----------
    const bundle = new THREE.Group();
    bundle.position.set(-0.6, 3.3, 0);
    const fibreEnds: number[] = [];
    const fibres = new THREE.Group();
    hex(7, 0.52).forEach(([y, z], i) => {
      const len = i === 0 ? 5.6 : 3.6 + rand() * 0.8;
      fibreEnds.push(len);
      const f = new THREE.Mesh(solid(0.24, len, 18), mMuscle);
      f.position.set(-2 + len / 2, y, z);
      fibres.add(f);
    });
    const peri = new THREE.Mesh(cyl(0.82, 3.4, 32), mSheath);
    peri.position.x = -0.3;
    bundle.add(fibres, peri);
    root.add(bundle);

    // ---------- 3 · one muscle fibre, enlarged ----------
    const fibre = new THREE.Group();
    fibre.position.set(-2.6, -1.0, 0);
    const FR = 1.6, F0 = -5.2, F1 = 1.4; // sarcolemma radius and extent; myofibrils stick out beyond F1
    const step = 0.62, rFib = 0.22;
    const fibPts = hex(19, step);
    const fibLen = fibPts.map((_, i) => 7.2 + (i === 0 ? 1.8 : 0.3 + rand() * 1.3));
    const sarc = 0.75; // sarcomere length in this model
    const nSarc = fibLen.map((l) => Math.floor(l / sarc));
    const total = nSarc.reduce((s, n) => s + n, 0);
    const fibrils = new THREE.Group();
    const aBands = new THREE.InstancedMesh(solid(rFib + 0.012, sarc * 0.62, 14), mA, total);
    const zLines = new THREE.InstancedMesh(solid(rFib + 0.016, 0.03, 14), mZ, total);
    let k = 0;
    fibPts.forEach(([y, z], i) => {
      const len = nSarc[i]! * sarc;
      const body = new THREE.Mesh(solid(rFib, len, 14), mFibril);
      body.position.set(F0 + len / 2, y, z);
      fibrils.add(body);
      for (let s = 0; s < nSarc[i]!; s++, k++) {
        aBands.setMatrixAt(k, new THREE.Matrix4().makeTranslation(F0 + (s + 0.5) * sarc, y, z));
        zLines.setMatrixAt(k, new THREE.Matrix4().makeTranslation(F0 + s * sarc, y, z));
      }
    });
    fibrils.add(aBands, zLines);
    fibre.add(fibrils);

    const lemma = new THREE.Mesh(cyl(FR, F1 - F0, 48), mLemma);
    lemma.position.x = (F0 + F1) / 2;
    const rimGeo = ctx.track(new THREE.TorusGeometry(FR, 0.035, 6, 64).rotateY(Math.PI / 2));
    const rim0 = new THREE.Mesh(rimGeo, mLemmaRim);
    const rim1 = new THREE.Mesh(rimGeo, mLemmaRim);
    rim0.position.x = F0;
    rim1.position.x = F1;
    const sarcolemma = new THREE.Group();
    sarcolemma.add(lemma, rim0, rim1);
    fibre.add(sarcolemma);

    // many nuclei, flattened against the inside of the sarcolemma
    const nucGeo = ctx.track(new THREE.SphereGeometry(1, 16, 10));
    const nuclei = new THREE.InstancedMesh(nucGeo, mNuc, 7);
    [[-4.6, 70], [-3.5, 150], [-2.4, 40], [-1.3, 115], [-0.3, 60], [0.7, 140], [-3.9, 15]].forEach(([x, deg], i) => {
      const a = (deg! * Math.PI) / 180;
      const p = new THREE.Vector3(x!, (FR - 0.12) * Math.cos(a), (FR - 0.12) * Math.sin(a));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, Math.cos(a), Math.sin(a)));
      nuclei.setMatrixAt(i, new THREE.Matrix4().compose(p, q, new THREE.Vector3(0.36, 0.09, 0.2)));
    });
    fibre.add(nuclei);

    // mitochondria in the spaces between myofibrils (trigonal points of the packing)
    const mitoGeo = ctx.track(along(new THREE.CapsuleGeometry(0.1, 0.34, 4, 8)));
    const gaps: [number, number][] = [];
    for (let i = 0; i < fibPts.length; i++)
      for (let j = i + 1; j < fibPts.length; j++) {
        const [y1, z1] = fibPts[i]!, [y2, z2] = fibPts[j]!;
        if (Math.hypot(y1 - y2, z1 - z2) > step * 1.01) continue;
        // a gap beside each neighbouring pair, on the side away from the centre
        const my = (y1 + y2) / 2, mz = (z1 + z2) / 2;
        const ny = -(z2 - z1), nz = y2 - y1;
        const n = Math.hypot(ny, nz);
        const s = my * ny + mz * nz >= 0 ? 1 : -1;
        gaps.push([my + (s * ny / n) * step * 0.29, mz + (s * nz / n) * step * 0.29]);
      }
    const mitoXs = [-4.4, -3.1, -1.8, -0.5, 0.8, 1.9];
    const mitoList: THREE.Vector3[] = [];
    gaps.forEach(([y, z]) => { if (Math.hypot(y, z) < FR - 0.25) for (const x of mitoXs) if (rand() < 0.45) mitoList.push(new THREE.Vector3(x + rand() * 0.4, y, z)); });
    const mito = new THREE.InstancedMesh(mitoGeo, mMito, mitoList.length);
    mitoList.forEach((p, i) => mito.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    fibre.add(mito);

    // sarcoplasmic reticulum: a sleeve of tubules and rings round the myofibrils that stick out
    const sr = new THREE.Group();
    const ringGeo = ctx.track(new THREE.TorusGeometry(rFib + 0.06, 0.025, 5, 20).rotateY(Math.PI / 2));
    const tubGeo = solid(0.022, 1.0, 5);
    const srFibrils = [0, 2, 4, 6];
    for (const i of srFibrils) {
      const [y, z] = fibPts[i]!;
      const end = F0 + nSarc[i]! * sarc;
      for (let x = F1 + 0.1; x < end - 0.1; x += sarc) {
        // rings at the junctions (as the SR wraps each sarcomere), joined by longitudinal tubules
        const r = new THREE.Mesh(ringGeo, mSR);
        r.position.set(x, y, z);
        sr.add(r);
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2;
          const t = new THREE.Mesh(tubGeo, mSR);
          t.scale.x = Math.min(sarc, end - 0.1 - x);
          t.position.set(x + t.scale.x / 2, y + (rFib + 0.06) * Math.cos(a), z + (rFib + 0.06) * Math.sin(a));
          sr.add(t);
        }
      }
    }
    fibre.add(sr);
    root.add(fibre);

    // ---------- 4 · one myofibril, enlarged: sarcomeres between Z-lines ----------
    const myo = new THREE.Group();
    myo.position.set(2.4, -3.9, 0.5);
    const MR = 0.42, SL = 1.8, NS = 3;
    const myoBody = new THREE.Mesh(solid(MR, SL * NS, 28), mFibril);
    myoBody.position.x = (SL * NS) / 2;
    myo.add(myoBody);
    const aGeo = solid(MR + 0.02, SL * 0.62, 28);
    const hGeo = solid(MR + 0.03, SL * 0.14, 28);
    const zGeo = solid(MR + 0.04, 0.05, 28);
    const zs: THREE.Mesh[] = [];
    for (let s = 0; s <= NS; s++) {
      const zl = new THREE.Mesh(zGeo, mZ);
      zl.position.x = s * SL;
      myo.add(zl);
      zs.push(zl);
      if (s === NS) break;
      const aB = new THREE.Mesh(aGeo, mA);
      aB.position.x = (s + 0.5) * SL;
      const hZ = new THREE.Mesh(hGeo, mH);
      hZ.position.x = (s + 0.5) * SL;
      myo.add(aB, hZ);
    }
    // bracket over the middle sarcomere, Z-line to Z-line
    const br = new THREE.Group();
    const bar = new THREE.Mesh(solid(0.035, SL, 6), mBracket);
    bar.position.x = 1.5 * SL;
    const tickGeo = ctx.track(new THREE.BoxGeometry(0.05, 0.32, 0.05));
    const t0 = new THREE.Mesh(tickGeo, mBracket);
    const t1 = new THREE.Mesh(tickGeo, mBracket);
    t0.position.x = SL;
    t1.position.x = 2 * SL;
    br.add(bar, t0, t1);
    br.position.y = MR + 0.4;
    myo.add(br);
    root.add(myo);

    // ---------- faint "zoom" links between the levels ----------
    const link = (a: THREE.Vector3, b: THREE.Vector3) => {
      const m = new THREE.Mesh(solid(0.025, 1, 5), mLink);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(X, b.clone().sub(a).normalize());
      m.scale.x = a.distanceTo(b);
      root.add(m);
    };
    muscle.updateMatrixWorld(true);
    const cutWorld = new THREE.Vector3(2.1, 0, 0).applyMatrix4(muscle.matrixWorld);
    link(cutWorld.clone().add(new THREE.Vector3(0.1, 0, 0)), new THREE.Vector3(-2.7, 3.3, 0));
    link(new THREE.Vector3(-0.6 - 2 + fibreEnds[0]!, 3.3, 0), new THREE.Vector3(-2.6 + F1 + 1.2, -1.0 + FR, 0));
    link(new THREE.Vector3(-2.6 + F0 + fibLen[0]! - 0.6, -1.0, 0), new THREE.Vector3(2.3, -3.9 + MR, 0.5));

    const frontFib = fibPts.reduce((b, p, i) => (p[1] > fibPts[b]![1] ? i : b), 0);
    const frontSR = srFibrils.reduce((b, i) => (fibPts[i]![1] > fibPts[b]![1] ? i : b), srFibrils[0]!);
    const frontMito = mitoList.filter((p) => p.x > F1).reduce((b, p) => (p.z > b.z ? p : b), mitoList[0]!);
    return {
      anchors: {
        muscle: { object: anchorAt(muscle, -0.6, 1.25, 0.3, 'muscle'), highlight: [belly] },
        tendon: { object: anchorAt(muscle, -5.9, 0.25, 0.1, 'tendon'), highlight: [tendon] },
        fascicle: { object: anchorAt(bundle, 0.3, 0.84, 0.1, 'fascicle'), highlight: [bundle] },
        'muscle-fibre': { object: anchorAt(fibre, F0 + 0.3, -1.1, 1.1, 'muscle-fibre'), highlight: [fibre] },
        sarcolemma: { object: anchorAt(fibre, -2.0, 1.15, 1.1, 'sarcolemma'), highlight: [sarcolemma] },
        nuclei: { object: anchorAt(fibre, -4.6, 0.51, 1.44, 'nuclei'), highlight: [nuclei] },
        mitochondria: { object: anchorAt(fibre, frontMito.x, frontMito.y, frontMito.z + 0.12, 'mitochondria'), highlight: [mito] },
        sr: { object: anchorAt(fibre, F1 + 0.5, fibPts[frontSR]![0], fibPts[frontSR]![1] + rFib + 0.08, 'sr'), highlight: [sr] },
        myofibril: { object: anchorAt(fibre, F0 + nSarc[frontFib]! * sarc - 0.4, fibPts[frontFib]![0], fibPts[frontFib]![1] + rFib, 'myofibril'), highlight: [fibrils] },
        sarcomere: { object: anchorAt(myo, 1.5 * SL, MR + 0.45, 0, 'sarcomere'), highlight: [br] },
        'z-line': { object: anchorAt(myo, 2 * SL, -MR - 0.05, 0.1, 'z-line'), highlight: zs },
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
