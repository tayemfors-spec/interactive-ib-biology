import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';

/*
 * A2.3 bacteriophage lambda attached to the outer membrane of E. coli. 1 unit ≈ 10 nm.
 * Topology that matters: an icosahedral protein head (one vertex is the portal, where the tail joins),
 * linear dsDNA packed inside the head, a long flexible NON-contractile tail made of stacked rings,
 * a conical tail tip and a single thin tail fibre that binds the LamB receptor. No envelope, no
 * baseplate legs (those belong to T4). Part of the head is cut away to show the DNA.
 */
const HEAD_Y = 8.8; // centre of the head
const R = 3.1; // head circumradius (head ≈ 60 nm across)
const TAIL_TOP = HEAD_Y - R - 0.35; // below the portal
const TAIL_LEN = 14; // ≈ 140–150 nm
const RINGS = 32; // the tail tube is a stack of protein rings
const TAIL_R = 0.9;
const MEM_Y = -12.75; // top surface of the outer membrane

// The model is built with the tail axis along +y, then turned so it lies horizontally (head on the left),
// like the exam drawing; this fits the long phage into a 4:3 stage.
const CAM: [number, number, number] = [-4, 6.5, 40];

const tailAt = (s: number, out = new THREE.Vector3()) =>
  out.set(0.85 * Math.sin(Math.PI * s), TAIL_TOP - TAIL_LEN * s, 0.35 * Math.sin(Math.PI * s));

const scene: SceneModule = {
  camera: { position: CAM, target: [3, 0, 0], fov: 38, minDistance: 10, maxDistance: 70 },

  build(ctx) {
    const root = new THREE.Group();
    root.rotation.z = Math.PI / 2;
    ctx.scene.add(root);
    root.updateMatrixWorld(true);
    const rand = rng(48);

    const mCapsid = ctx.material('protein', { roughness: 0.45, side: THREE.DoubleSide, flatShading: true });
    const mPenta = ctx.material('water', { roughness: 0.45 });
    const mTail = ctx.material('protein2', { roughness: 0.5 });
    const mPortal = ctx.material('chol', { roughness: 0.5 });
    const mFibre = ctx.material('glucose', { roughness: 0.45 });
    const mDNA = ctx.material('k', { roughness: 0.4 });
    const mHead = ctx.material('head', { roughness: 0.6 });
    const mCore = ctx.material('tail', { roughness: 0.75 });
    const mLamB = ctx.material('carb', { roughness: 0.5 });

    // ---------- icosahedral head ----------
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const pos = ico.attributes.position as THREE.BufferAttribute;
    const v0 = new THREE.Vector3().fromBufferAttribute(pos, 0).normalize();
    // turn the solid so one vertex (the portal) points straight down the tail axis
    const q = new THREE.Quaternion().setFromUnitVectors(v0, new THREE.Vector3(0, -1, 0));
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.35);
    q.premultiply(spin);
    const faces: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];
    for (let f = 0; f < pos.count / 3; f++) {
      const tri = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, f * 3 + k).applyQuaternion(q)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
      faces.push(tri);
    }
    ico.dispose();
    const centre = new THREE.Vector3(0, HEAD_Y, 0);
    // cut away the faces looking most directly at the default camera, to reveal the DNA
    const view = root.worldToLocal(new THREE.Vector3(...CAM)).sub(centre).normalize();
    const faceDot = faces.map((t) => t[0].clone().add(t[1]).add(t[2]).normalize().dot(view));
    const cutOrder = faceDot.map((d, i) => [d, i] as const).sort((a, b) => b[0] - a[0]);
    const cut = new Set(cutOrder.slice(0, 3).map(([, i]) => i));
    const kept = faces.filter((_, i) => !cut.has(i));

    const shellPos: number[] = [];
    for (const t of kept) for (const v of t) shellPos.push(...v.clone().multiplyScalar(R * 0.96).add(centre).toArray());
    const shellGeo = ctx.track(new THREE.BufferGeometry());
    shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(shellPos, 3));
    shellGeo.computeVertexNormals();
    const shell = new THREE.Mesh(shellGeo, mCapsid);
    root.add(shell);

    // capsomeres: hexagonal protein units on the faces, pentamers at the vertices (one vertex is the portal)
    const n = 3;
    const seen = new Map<string, { p: THREE.Vector3; vertex: boolean; normal: THREE.Vector3 }>();
    for (const [a, b, c] of kept) {
      const normal = a.clone().add(b).add(c).normalize();
      for (let i = 0; i <= n; i++)
        for (let j = 0; j <= n - i; j++) {
          const k = n - i - j;
          const p = a.clone().multiplyScalar(i).addScaledVector(b, j).addScaledVector(c, k).divideScalar(n);
          const key = p.toArray().map((x) => x.toFixed(2)).join(',');
          if (!seen.has(key)) seen.set(key, { p, vertex: i === n || j === n || k === n, normal });
        }
    }
    const pts = [...seen.values()].filter((s) => !(s.vertex && s.p.y < -0.99)); // the portal replaces one pentamer
    const hexGeo = ctx.track(new THREE.CylinderGeometry(0.37, 0.41, 0.22, 6));
    const pentGeo = ctx.track(new THREE.CylinderGeometry(0.38, 0.42, 0.32, 5));
    const hexes = new THREE.InstancedMesh(hexGeo, mCapsid, pts.length);
    const pents = new THREE.InstancedMesh(pentGeo, mPenta, 12);
    let nh = 0, np = 0;
    const up = new THREE.Vector3(0, 1, 0);
    const capsomereSpots: THREE.Vector3[] = [];
    for (const s of pts) {
      // hexamers lie flat on their face; pentamers at the vertices point outwards
      const dir = s.vertex ? s.p.clone().normalize() : s.normal;
      const at = s.p.clone().multiplyScalar(R * 0.97).addScaledVector(dir, 0.1).add(centre);
      const rot = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
      if (s.vertex) setInstance(pents, np++, at, rot);
      else { setInstance(hexes, nh++, at, rot); capsomereSpots.push(at); }
    }
    hexes.count = nh;
    pents.count = np;
    root.add(hexes, pents);

    // portal (head–tail connector) at the bottom vertex
    const portal = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.75, 0.95, 0.5, 12)), mPortal);
    portal.position.set(0, HEAD_Y - R * 0.97 - 0.12, 0);
    root.add(portal);

    // ---------- linear dsDNA packed inside the head ----------
    const dnaPts: THREE.Vector3[] = [];
    // one end sits in the portal, ready to leave through the tail
    dnaPts.push(new THREE.Vector3(0, TAIL_TOP + 0.1, 0), new THREE.Vector3(0, HEAD_Y - R * 0.9, 0), new THREE.Vector3(0.3, HEAD_Y - R * 0.62, 0.2));
    const N = 900;
    const inner = R * 0.74;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = inner * (0.95 - 0.7 * t);
      const h = Math.sqrt(Math.max(0, inner * inner - r * r)) * 0.92;
      const th = t * 46 * Math.PI * 2;
      const y = h * Math.sin(t * 7 * Math.PI * 2 + 0.6);
      dnaPts.push(new THREE.Vector3(r * Math.cos(th), HEAD_Y + y, r * Math.sin(th)));
    }
    const dnaCurve = new THREE.CatmullRomCurve3(dnaPts);
    const dna = new THREE.Mesh(ctx.track(new THREE.TubeGeometry(dnaCurve, 2600, 0.085, 5, false)), mDNA);
    root.add(dna);
    // a point on the DNA visible through the window, for the label
    let dnaSpot = dnaPts[10]!;
    for (const p of dnaPts) if (p.clone().sub(centre).dot(view) > dnaSpot.clone().sub(centre).dot(view)) dnaSpot = p;

    // ---------- flexible, non-contractile tail: stacked rings ----------
    const ringGeo = ctx.track(new THREE.CylinderGeometry(TAIL_R, TAIL_R, (TAIL_LEN / RINGS) * 0.84, 18));
    const rings = new THREE.InstancedMesh(ringGeo, mTail, RINGS);
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i < RINGS; i++) {
      const s = (i + 0.5) / RINGS;
      tailAt(s, a);
      tailAt(s + 0.01, b);
      const dir = b.sub(a).normalize();
      setInstance(rings, i, a, new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.negate())));
    }
    const tailGroup = new THREE.Group();
    tailGroup.add(rings);
    root.add(tailGroup);

    // conical tail tip
    const tipTop = tailAt(1);
    const tip = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(TAIL_R * 0.95, 0.28, 1.6, 16)), mTail);
    tip.position.set(tipTop.x, tipTop.y - 0.8, tipTop.z);
    root.add(tip);

    // the single thin tail fibre, touching the LamB receptor
    const fibreCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tipTop.x, tipTop.y - 1.5, tipTop.z),
      new THREE.Vector3(tipTop.x + 0.15, tipTop.y - 2.4, tipTop.z + 0.05),
      new THREE.Vector3(tipTop.x + 0.05, MEM_Y + 0.55, tipTop.z),
    ]);
    const fibre = new THREE.Mesh(ctx.track(new THREE.TubeGeometry(fibreCurve, 24, 0.13, 8, false)), mFibre);
    const fibreEnd = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.2, 12, 8)), mFibre);
    fibreEnd.position.copy(fibreCurve.getPoint(1));
    const fibreGroup = new THREE.Group();
    fibreGroup.add(fibre, fibreEnd);
    root.add(fibreGroup);

    // ---------- E. coli outer membrane with the LamB receptor ----------
    const W = 19, D = 12;
    const lamb = new THREE.Group();
    lamb.position.set(tipTop.x + 0.05, MEM_Y - 0.35, tipTop.z);
    for (let k = 0; k < 3; k++) {
      const ang = (k / 3) * Math.PI * 2 + 0.4;
      const m = new THREE.Mesh(ctx.track(blobGeometry(0.5, 1.5, 60 + k, 0.1, 14)), mLamB);
      m.position.set(Math.cos(ang) * 0.48, 0, Math.sin(ang) * 0.48);
      lamb.add(m);
    }
    root.add(lamb);

    const bumpGeo = ctx.track(new THREE.SphereGeometry(0.27, 7, 5));
    const spots: THREE.Vector3[] = [];
    for (let x = -W / 2; x <= W / 2; x += 0.6)
      for (let z = -D / 2; z <= D / 2; z += 0.6) {
        const px = x + (rand() - 0.5) * 0.1, pz = z + (rand() - 0.5) * 0.1;
        if (Math.hypot(px - lamb.position.x, pz - lamb.position.z) < 1.15) continue;
        spots.push(new THREE.Vector3(px, MEM_Y, pz));
      }
    const bumps = new THREE.InstancedMesh(bumpGeo, mHead, spots.length);
    spots.forEach((p, i) => setInstance(bumps, i, p));
    const slabTop = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(W + 0.5, 0.18, D + 0.5)), mHead);
    slabTop.position.y = MEM_Y - 0.12;
    const slabCore = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(W + 0.5, 0.55, D + 0.5)), mCore);
    slabCore.position.y = MEM_Y - 0.48;
    const slabBot = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(W + 0.5, 0.2, D + 0.5)), mHead);
    slabBot.position.y = MEM_Y - 0.85;
    const membrane = new THREE.Group();
    membrane.add(bumps, slabTop, slabCore, slabBot);
    root.add(membrane);

    for (const im of [hexes, pents, rings, bumps]) im.instanceMatrix.needsUpdate = true;

    // ---------- label anchors ----------
    const toward = (dir: THREE.Vector3) => {
      let best = capsomereSpots[0]!;
      const d = dir.clone().normalize();
      for (const p of capsomereSpots) if (p.clone().sub(centre).normalize().dot(d) > best.clone().sub(centre).normalize().dot(d)) best = p;
      return best;
    };
    // directions are in the model's own frame (local +y points left on screen, local +x points up)
    const capsomereAt = toward(new THREE.Vector3(-0.8, 0.25, 0.55));
    const capsidAt = toward(new THREE.Vector3(0.7, 0.5, 0.5));
    const tailMid = tailAt(0.42);
    const fibreMid = fibreCurve.getPoint(0.45);
    const anchors = {
      capsid: { object: anchorAt(root, capsidAt.x, capsidAt.y, capsidAt.z, 'capsid'), highlight: [shell, hexes, pents] },
      capsomere: { object: anchorAt(root, capsomereAt.x, capsomereAt.y, capsomereAt.z, 'capsomere'), highlight: [hexes, pents] },
      dna: { object: anchorAt(root, dnaSpot.x, dnaSpot.y, dnaSpot.z, 'dna'), highlight: [dna] },
      portal: { object: anchorAt(root, 0.2, portal.position.y, 0.9, 'portal'), highlight: [portal] },
      tail: { object: anchorAt(root, tailMid.x + 0.3, tailMid.y, tailMid.z + TAIL_R, 'tail'), highlight: [rings] },
      tip: { object: anchorAt(root, tip.position.x + 0.3, tip.position.y, tip.position.z + 0.6, 'tip'), highlight: [tip] },
      fibre: { object: anchorAt(root, fibreMid.x + 0.1, fibreMid.y, fibreMid.z + 0.15, 'fibre'), highlight: [fibreGroup] },
      lamb: { object: anchorAt(root, lamb.position.x + 0.3, MEM_Y + 0.2, lamb.position.z + 0.9, 'lamb'), highlight: [lamb] },
      membrane: { object: anchorAt(root, -7, MEM_Y + 0.2, -4.5, 'membrane'), highlight: [membrane] },
    };

    return {
      anchors,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
