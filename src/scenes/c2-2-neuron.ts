import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng, setInstance } from '../viewer3d/kit';

/*
 * C2.2.1 / C2.2.11: a vertebrate motor neuron, drawn along the x-axis (impulse travels left → right).
 * Dendrites → cell body (nucleus) → axon hillock → myelinated axon (Schwann cells separated by
 * nodes of Ranvier; one sheath cut open to show the wrapped layers) → branched axon terminals ending
 * in synaptic knobs on a muscle fibre (neuromuscular junctions). The axon is drawn much shortened.
 */
const BODY: [number, number, number] = [-7.3, 0, 0];
const AXON_R = 0.22;
const AXON_START = -4.7;
const AXON_END = 6.9;
const SHEATH_R = 0.5;
const SHEATH_LEN = 2.55;
const GAP = 0.3; // node of Ranvier
const FIRST_SHEATH = -4.25;
const N_SHEATHS = 4;
const CUT = 2; // index of the sheath drawn cut open

const scene: SceneModule = {
  camera: { position: [-0.3, 3.2, 25], target: [-0.3, 0, 0], fov: 40, minDistance: 8, maxDistance: 45 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(22);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    const mNeuron = ctx.material('protein', { roughness: 0.55 });
    const mBody = ctx.material('protein', { roughness: 0.5, transparent: true, opacity: 0.5, depthWrite: false });
    const mNucleus = ctx.material('protein2', { roughness: 0.45 });
    const mMyelin = ctx.material('tail', { roughness: 0.6 });
    const mMyelinCut = ctx.material('tail', { roughness: 0.6, side: THREE.DoubleSide });
    const mMyelinCut2 = ctx.material('head', { roughness: 0.6, side: THREE.DoubleSide });
    const mSchwannNuc = ctx.material('protein2', { roughness: 0.45 });
    const mMuscle = ctx.material('chol', { roughness: 0.6 });
    const mBand = ctx.material('k', { roughness: 0.7 });
    const mArrow = ctx.material('head', { roughness: 0.4 });

    // ---------- cell body and nucleus ----------
    const bodyGeo = ctx.track(new THREE.SphereGeometry(1, 40, 28));
    const body = new THREE.Mesh(bodyGeo, mBody);
    body.position.set(...BODY);
    body.scale.set(1.85, 1.6, 1.5);
    const nucleus = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.72, 28, 20)), mNucleus);
    nucleus.position.set(BODY[0] - 0.15, BODY[1] + 0.1, BODY[2] + 0.2);
    root.add(nucleus, body);

    // ---------- dendrites: tapering primary branches, each splitting twice ----------
    const dendrites = new THREE.Group();
    root.add(dendrites);
    const tube = (pts: THREE.Vector3[], r: number) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.Mesh(ctx.track(new THREE.TubeGeometry(curve, 16, r, 7, false)), mNeuron);
      dendrites.add(m);
      const cap = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(r, 8, 6)), mNeuron);
      cap.position.copy(pts[pts.length - 1]!);
      dendrites.add(cap);
    };
    const angles = [62, 100, 138, 172, 205, 240, 282];
    let dendriteTip = v(0, 0, 0);
    angles.forEach((deg, i) => {
      const a = (deg * Math.PI) / 180;
      const dz = (rand() - 0.5) * 1.6;
      const dir = v(Math.cos(a), Math.sin(a), dz * 0.35).normalize();
      const start = v(BODY[0] + dir.x * 1.5, BODY[1] + dir.y * 1.3, BODY[2] + dir.z * 1.2);
      const len = 1.5 + rand() * 0.6;
      const mid = start.clone().addScaledVector(dir, len * 0.55).add(v(0, (rand() - 0.5) * 0.4, 0));
      const end = start.clone().addScaledVector(dir, len);
      tube([start, mid, end], 0.17);
      for (const turn of [-0.55, 0.5]) {
        const d2 = dir.clone().applyAxisAngle(v(0, 0, 1), turn + (rand() - 0.5) * 0.2);
        const e2 = end.clone().addScaledVector(d2, 0.8 + rand() * 0.4).add(v(0, 0, (rand() - 0.5) * 0.6));
        tube([end, end.clone().lerp(e2, 0.5).add(v(0, 0.08, 0)), e2], 0.1);
        const d3 = d2.clone().applyAxisAngle(v(0, 0, 1), -turn * 0.8);
        const e3 = e2.clone().addScaledVector(d3, 0.5 + rand() * 0.2);
        tube([e2, e3], 0.06);
        if (i === 2 && turn > 0) dendriteTip = e2.clone();
      }
    });

    // ---------- axon hillock (cone narrowing into the axon) ----------
    const hillock = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(AXON_R, 0.75, 1.3, 24, 1, true)), mNeuron);
    hillock.rotation.z = -Math.PI / 2; // narrow (top) end → +x
    hillock.position.set(AXON_START - 0.55, 0, 0);
    root.add(hillock);

    // ---------- axon ----------
    const axonLen = AXON_END - (AXON_START - 0.1);
    const axon = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(AXON_R, AXON_R, axonLen, 20)), mNeuron);
    axon.rotation.z = Math.PI / 2;
    axon.position.set((AXON_END + AXON_START - 0.1) / 2, 0, 0);
    root.add(axon);

    // ---------- myelin sheath: Schwann cells with nodes of Ranvier between them ----------
    const myelin = new THREE.Group();
    const schwannNuclei = new THREE.Group();
    root.add(myelin, schwannNuclei);
    const sheathGeo = ctx.track(new THREE.CapsuleGeometry(SHEATH_R, SHEATH_LEN - 2 * SHEATH_R - 0.08, 6, 24));
    const nucGeo = ctx.track(new THREE.SphereGeometry(1, 16, 10));
    const sheathX: number[] = [];
    for (let i = 0; i < N_SHEATHS; i++) {
      const x0 = FIRST_SHEATH + i * (SHEATH_LEN + GAP);
      const cx = x0 + SHEATH_LEN / 2;
      sheathX.push(cx);
      if (i === CUT) {
        // cut-away sheath: concentric layers of Schwann cell membrane wrapped round the axon
        const layers = new THREE.Group();
        layers.position.set(cx, 0, 0);
        layers.rotation.z = Math.PI / 2;
        [0.29, 0.36, 0.43, SHEATH_R].forEach((r, k) => {
          const g = ctx.track(new THREE.CylinderGeometry(r, r, SHEATH_LEN * 0.92, 32, 1, true, Math.PI / 3.2, Math.PI * 2 - (2 * Math.PI) / 3.2));
          layers.add(new THREE.Mesh(g, k % 2 ? mMyelinCut2 : mMyelinCut));
        });
        myelin.add(layers);
      } else {
        const s = new THREE.Mesh(sheathGeo, mMyelin);
        s.position.set(cx, 0, 0);
        s.rotation.z = Math.PI / 2;
        myelin.add(s);
      }
      // Schwann cell nucleus bulging on the outside of the sheath
      const n = new THREE.Mesh(nucGeo, mSchwannNuc);
      n.position.set(cx + (i % 2 ? 0.25 : -0.25), SHEATH_R + 0.02, i === CUT ? -0.25 : 0.05);
      n.scale.set(0.42, 0.16, 0.26);
      schwannNuclei.add(n);
    }
    const nodeX = FIRST_SHEATH + SHEATH_LEN + GAP / 2; // first node of Ranvier

    // ---------- axon terminals and synaptic knobs on a muscle fibre ----------
    const terminals = new THREE.Group();
    root.add(terminals);
    const MUSCLE_X = 10.0;
    const MUSCLE_R = 0.85;
    const ends = [v(MUSCLE_X - MUSCLE_R - 0.22, 1.9, 0.3), v(MUSCLE_X - MUSCLE_R - 0.25, 0.55, -0.4), v(MUSCLE_X - MUSCLE_R - 0.22, -0.8, 0.4), v(MUSCLE_X - MUSCLE_R - 0.24, -2.1, -0.2)];
    const knobGeo = ctx.track(new THREE.SphereGeometry(0.3, 14, 10));
    const tStart = v(AXON_END, 0, 0);
    ends.forEach((e) => {
      const mid = v(AXON_END + 1.1, e.y * 0.55, e.z * 0.5);
      const curve = new THREE.CatmullRomCurve3([tStart, mid, e]);
      terminals.add(new THREE.Mesh(ctx.track(new THREE.TubeGeometry(curve, 16, 0.11, 7, false)), mNeuron));
      const k = new THREE.Mesh(knobGeo, mNeuron);
      k.position.copy(e);
      k.scale.set(0.8, 1.15, 1.15);
      terminals.add(k);
    });
    const muscle = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(MUSCLE_R, MUSCLE_R, 7.5, 32)), mMuscle);
    muscle.position.set(MUSCLE_X, -0.1, 0);
    root.add(muscle);
    // faint striations (bands) on the muscle fibre
    const bands = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(MUSCLE_R + 0.012, MUSCLE_R + 0.012, 0.07, 32, 1, true)), mBand, 20);
    for (let i = 0; i < 20; i++) setInstance(bands, i, v(MUSCLE_X, -3.6 + i * 0.37, 0));
    root.add(bands);

    // ---------- direction of the impulse ----------
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 10)), mArrow);
    shaft.rotation.z = Math.PI / 2;
    const head = new THREE.Mesh(ctx.track(new THREE.ConeGeometry(0.22, 0.6, 14)), mArrow);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 2.05;
    arrow.add(shaft, head);
    arrow.position.set(-1.0, 1.75, 0);
    root.add(arrow);

    const cutX = sheathX[CUT]!;
    const anchors = {
      dendrites: { object: anchorAt(root, dendriteTip.x, dendriteTip.y, dendriteTip.z + 0.1, 'dendrites'), highlight: [dendrites] },
      'cell-body': { object: anchorAt(root, BODY[0] + 0.6, BODY[1] - 1.25, BODY[2] + 0.9, 'cell-body'), highlight: [body] },
      nucleus: { object: anchorAt(root, nucleus.position.x - 0.2, nucleus.position.y + 0.25, nucleus.position.z + 0.65, 'nucleus'), highlight: [nucleus] },
      hillock: { object: anchorAt(root, AXON_START - 0.6, 0.45, 0.35, 'hillock'), highlight: [hillock] },
      axon: { object: anchorAt(root, cutX - 0.4, -0.1, AXON_R, 'axon'), highlight: [axon] },
      myelin: { object: anchorAt(root, sheathX[3]!, -SHEATH_R * 0.7, SHEATH_R * 0.7, 'myelin'), highlight: [myelin] },
      schwann: { object: anchorAt(root, sheathX[1]! + 0.25, SHEATH_R + 0.18, 0.05, 'schwann'), highlight: [schwannNuclei] },
      node: { object: anchorAt(root, nodeX, -0.15, AXON_R, 'node'), highlight: [axon] },
      terminals: { object: anchorAt(root, AXON_END + 1.0, 0.9, 0.2, 'terminals'), highlight: [terminals] },
      knob: { object: anchorAt(root, ends[3]!.x, ends[3]!.y - 0.25, ends[3]!.z + 0.3, 'knob'), highlight: [terminals] },
      muscle: { object: anchorAt(root, MUSCLE_X + 0.3, 2.9, MUSCLE_R * 0.9, 'muscle'), highlight: [muscle] },
      impulse: { object: anchorAt(root, 0.2, 1.75, 0.1, 'impulse'), highlight: [arrow] },
    };

    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
