import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng, setInstance } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { instanced, scatter } from './b2-2-kit';

/*
 * B2.2 secretory pathway (AHL): rough ER → transport vesicle → Golgi (cis to trans) → secretory vesicle →
 * exocytosis at the plasma membrane. Schematic, not to scale; the organelles are drawn translucent so the
 * protein can be followed inside them.
 * Steps: 0 synthesis by bound and free ribosomes   1 folding in the ER lumen and budding of a transport
 * vesicle   2 transport to the cis face and fusion   3 modification, cis → trans   4 secretory vesicle and
 * exocytosis.
 * Topology that matters: bound ribosomes sit on the cytoplasmic face of the ER and feed the polypeptide
 * into the lumen; the protein stays inside membrane-bound compartments (lumen → vesicle → cisternae →
 * vesicle) until exocytosis releases it outside the cell; the cis face of the Golgi (convex) faces the ER
 * and the trans face (concave) faces the plasma membrane. The free ribosome's protein stays in the cytosol.
 */
const ER = [
  { c: new THREE.Vector3(-3.8, 1.5, -0.4), r: new THREE.Vector3(1.6, 0.2, 1.2) },
  { c: new THREE.Vector3(-3.6, 0.45, -0.4), r: new THREE.Vector3(1.6, 0.2, 1.2) },
  { c: new THREE.Vector3(-3.9, -0.6, -0.4), r: new THREE.Vector3(1.5, 0.2, 1.15) },
];
const TOP = ER[0]!;
const ACTIVE = [-4.5, -3.95, -3.4].map((x) => {
  // sit each ribosome on the sac's upper surface (an ellipsoid), at z = −0.1
  const f = 1 - ((x - TOP.c.x) / TOP.r.x) ** 2 - ((-0.1 - TOP.c.z) / TOP.r.z) ** 2;
  return new THREE.Vector3(x, TOP.c.y + TOP.r.y * Math.sqrt(f) + 0.085, -0.1);
});
const FREE = new THREE.Vector3(-1.5, 2.8, 0.4);
// Golgi stack, built in its own frame: cisternae are curved discs whose normal is local x;
// each bends towards +x at its rim, so the stack is convex on the −x (cis) side.
const G = { at: new THREE.Vector3(0.6, 0.35, -0.2), rotY: -0.12, n: 5, x0: -0.75, dx: 0.38, k: 0.13, half: 0.12 };
const ZR = 0.55; // cisternae are oval: their depth (z) radius is this fraction of their height radius
const cisX = (i: number, y: number, z: number) => G.x0 + G.dx * i + G.k * (y * y + z * z);
const PM_X = 4.0;
const VR = 0.32; // vesicle radius
const OFF = [new THREE.Vector3(-0.1, 0.06, 0), new THREE.Vector3(0.11, 0.05, 0.02), new THREE.Vector3(0, -0.1, 0.04)];
const CY = 0.3, CZ = 0.42; // where the protein travels inside each cisterna (local y, z)

// a folded protein: its 8 residues packed into a small cluster
const FOLD = Array.from({ length: 8 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 8, r = Math.sqrt(1 - y * y), a = i * 2.4;
  return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).multiplyScalar(0.1);
});
/** Slots for an extended chain leaving a ribosome: down into the lumen, then along it. */
const chainSlot = (rib: THREE.Vector3, s: number, dx = 0.15, down = 0.32) =>
  s < 2 ? rib.clone().add(new THREE.Vector3(0.02 * s, -0.17 - s * (down - 0.17), 0)) : rib.clone().add(new THREE.Vector3((s - 1.5) * dx, -down + (s % 2 ? 0.035 : -0.035), 0));
const freeSlot = (s: number) => FREE.clone().add(new THREE.Vector3(0.15 + s * 0.15, -0.12 - s * 0.035, (s % 2 ? 0.03 : -0.03)));

const scene: SceneModule = {
  // framed tightly (model ≈ ±4.9 wide about the target) so that after the runtime steps back for a square
  // phone stage the Golgi's cis and trans faces are still large enough to read
  camera: { position: [0.5, 2.5, 11.9], target: [-0.1, 0.3, -0.3], fov: 38, minDistance: 5, maxDistance: 36 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(83);
    const glass = (key: 'protein' | 'glucose', opacity: number) => ctx.material(key, { roughness: 0.4, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

    const mER = glass('protein', 0.36);
    const mGolgi = glass('glucose', 0.62);
    const mVes = glass('glucose', 0.45);
    const mRibo = ctx.material('text', { roughness: 0.55 });
    const mCargo = ctx.material('k', { roughness: 0.4 });
    const mFreeP = ctx.material('protein2', { roughness: 0.4 });
    const mCarb = ctx.material('carb', { roughness: 0.45 });
    const mHead = ctx.material('head', { roughness: 0.5 });
    const mTail = ctx.material('tail', { roughness: 0.7 });

    // ---------- rough ER: flattened sacs with ribosomes on their cytoplasmic faces ----------
    const rer = new THREE.Group();
    const sphere = ctx.track(new THREE.SphereGeometry(1, 40, 16));
    const riboPts: THREE.Vector3[] = [];
    for (const s of ER) {
      const m = new THREE.Mesh(sphere, mER);
      m.scale.copy(s.r);
      m.position.copy(s.c);
      rer.add(m);
      for (let i = 0, tries = 0; i < 44 && tries < 500; tries++) {
        const u = rand() * Math.PI * 2, v = Math.acos(rand() * 2 - 1);
        const n = new THREE.Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
        if (Math.abs(n.y) < 0.35) continue;
        const p = n.clone().multiply(s.r).add(s.c).add(new THREE.Vector3(0, Math.sign(n.y) * 0.08, 0));
        if ([...ACTIVE, ...riboPts].some((a) => a.distanceTo(p) < 0.24)) continue;
        riboPts.push(p);
        i++;
      }
    }
    riboPts.push(...ACTIVE);
    const riboGeo = ctx.track(new THREE.SphereGeometry(0.09, 10, 8));
    const bound = instanced(riboGeo, mRibo, riboPts);
    rer.add(bound);
    root.add(rer);

    // ---------- Golgi apparatus ----------
    const golgi = new THREE.Group();
    golgi.position.copy(G.at);
    golgi.rotation.y = G.rotY;
    const cisternae: THREE.Mesh[] = [];
    for (let i = 0; i < G.n; i++) {
      const R = 1.5 - i * 0.06;
      const g = new THREE.SphereGeometry(1, 36, 18);
      g.scale(G.half, R, R * ZR);
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) pos.setX(v, pos.getX(v) + cisX(i, pos.getY(v), pos.getZ(v)));
      g.computeVertexNormals();
      const m = new THREE.Mesh(ctx.track(g), mGolgi);
      golgi.add(m);
      cisternae.push(m);
    }
    root.add(golgi);
    golgi.updateMatrixWorld(true);
    const gw = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(golgi.matrixWorld);
    const inCis = (i: number, o = new THREE.Vector3()) => gw(cisX(i, CY + o.y * 1.6, CZ + o.x * 2), CY + o.y * 1.6, CZ + o.x * 2);
    const AT_CIS = gw(cisX(0, CY, CZ) - 0.5, CY + 0.05, CZ);
    const VES_TRANS = gw(cisX(G.n - 1, CY, CZ) + 0.5, CY, CZ);
    // vesicles budding at the rims of the cisternae
    const rimVes = new THREE.Group();
    const vSmall = ctx.track(new THREE.SphereGeometry(0.17, 14, 10));
    for (let i = 0; i < G.n; i++) {
      for (const a of [0.6 + i * 0.5, 3.4 - i * 0.4]) {
        const R = 1.5 - i * 0.06 + 0.16;
        const y = Math.cos(a) * R, z = Math.sin(a) * R * ZR;
        const v = new THREE.Mesh(vSmall, mVes);
        v.position.set(cisX(i, y, z), y, z);
        rimVes.add(v);
      }
    }
    golgi.add(rimVes);

    // free ribosomes in the cytosol
    const golgiC = G.at.clone();
    const freePts = [FREE, ...scatter(rand, 20, [new THREE.Vector3(-5.8, -2.4, -1.2), new THREE.Vector3(3.5, 3.3, 0.8)], (p) => {
      if (ER.some((s) => ((p.x - s.c.x) / (s.r.x + 0.35)) ** 2 + ((p.y - s.c.y) / (s.r.y + 0.45)) ** 2 < 1)) return false;
      if (Math.abs(p.x - golgiC.x) < 1.7 && Math.abs(p.y - golgiC.y) < 2.1) return false;
      if (Math.abs(p.y - 0.8) < 0.8 && p.x > -2.6) return false; // vesicle routes
      return p.distanceTo(FREE) > 0.9;
    }, 0.65)];
    const free = instanced(riboGeo, mRibo, freePts);
    root.add(free);

    // ---------- plasma membrane: a patch of bilayer seen edge-on ----------
    const membrane = new THREE.Group();
    const slab = (w: number, x: number, mat: THREE.Material) => {
      const b = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(w, 5.4, 2.8)), mat);
      b.position.set(x, 0.4, -0.4);
      membrane.add(b);
    };
    slab(0.08, PM_X - 0.1, mHead); slab(0.12, PM_X, mTail); slab(0.08, PM_X + 0.1, mHead);
    root.add(membrane);

    // ---------- vesicles: one that carries the protein, plus a few others on the same routes ----------
    const vesGeo = ctx.track(new THREE.SphereGeometry(VR, 24, 16));
    const ves = new THREE.Mesh(vesGeo, mVes);
    root.add(ves);
    const others = new THREE.Group();
    const transportV = new THREE.Mesh(vesGeo, mVes); transportV.position.set(-1.3, -0.9, 0.2); transportV.scale.setScalar(0.85);
    const secretoryV = new THREE.Mesh(vesGeo, mVes); secretoryV.position.set(2.5, -1.3, 0.2);
    const extra = new THREE.Mesh(vesGeo, mVes); extra.position.set(2.7, 2.1, -0.2); extra.scale.setScalar(0.9);
    others.add(transportV, secretoryV, extra);
    root.add(others);

    // ---------- proteins: three made on the ER, one made by a free ribosome ----------
    const bead = ctx.track(new THREE.SphereGeometry(0.08, 10, 8));
    const cargo = new THREE.InstancedMesh(bead, mCargo, 24);
    const freeProt = new THREE.InstancedMesh(bead, mFreeP, 8);
    const tags = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.07, 8, 6)), mCarb, 6);
    root.add(cargo, freeProt, tags);
    const tmp = new THREE.Vector3();

    /** Draw a protein either as a chain with `count` residues out of the ribosome, or folded at `centre`. */
    const drawChain = (mesh: THREE.InstancedMesh, base: number, slot: (s: number) => THREE.Vector3, count: number, fold: number, centre: THREE.Vector3) => {
      for (let j = 0; j < 8; j++) {
        tmp.copy(slot(count - 1 - j)).lerp(centre.clone().add(FOLD[j]!), fold);
        setInstance(mesh, base + j, tmp, undefined, j < count ? 1 : 0.0001);
      }
    };
    const chainCentre = (p: number) => chainSlot(ACTIVE[p]!, 4);
    const BUD_ER = new THREE.Vector3(TOP.c.x + TOP.r.x - 0.05, TOP.c.y, 0.2);
    const VES_ER = new THREE.Vector3(TOP.c.x + TOP.r.x + 0.32, TOP.c.y - 0.05, 0.2);
    const AT_PM = new THREE.Vector3(PM_X - 0.44, 0.6, 0.3);

    const transFace = gw(cisX(G.n - 1, -1.0, 0.3) + 0.12, -1.0, 0.3);
    const cisFace = gw(cisX(0, 1.0, 0.3) - 0.12, 1.0, 0.3);
    const golgiTop = gw(cisX(2, 1.45, 0), 1.45, 0);
    const anchors = {
      rer: { object: anchorAt(root, -5.0, TOP.c.y + 0.15, 0.5, 'rer'), highlight: [rer] },
      bound: { object: anchorAt(root, ACTIVE[0]!.x, ACTIVE[0]!.y + 0.06, ACTIVE[0]!.z, 'bound'), highlight: [bound] },
      lumen: { object: anchorAt(root, ER[1]!.c.x - 0.6, ER[1]!.c.y, 0.6, 'lumen'), highlight: [rer] },
      free: { object: anchorAt(root, FREE.x, FREE.y + 0.05, FREE.z, 'free'), highlight: [free] },
      transport: { object: anchorAt(root, -1.3, -0.9, 0.5, 'transport'), highlight: [transportV] },
      cis: { object: anchorAt(root, cisFace.x, cisFace.y, cisFace.z, 'cis'), highlight: [cisternae[0]!] },
      trans: { object: anchorAt(root, transFace.x, transFace.y, transFace.z, 'trans'), highlight: [cisternae[G.n - 1]!] },
      golgi: { object: anchorAt(root, golgiTop.x, golgiTop.y, golgiTop.z, 'golgi'), highlight: [golgi] },
      secretory: { object: anchorAt(root, 2.5, -1.3, 0.5, 'secretory'), highlight: [secretoryV] },
      membrane: { object: anchorAt(root, PM_X - 0.12, 2.75, 1.0, 'membrane'), highlight: [membrane] },
      outside: { object: anchorAt(root, PM_X + 0.4, -2.3, 0.4, 'outside'), highlight: [] },
    };

    function render(index: number, t: number) {
      // ----- the free ribosome's protein: made in step 0, then stays folded in the cytosol -----
      const fCount = index === 0 ? (t < 0.05 ? 0 : Math.min(8, Math.floor(1 + ease(phase(t, 0.05, 0.85)) * 7.999))) : 8;
      drawChain(freeProt, 0, freeSlot, fCount, index === 0 ? 0 : 1, FREE.clone().add(new THREE.Vector3(0.85, -0.4, 0)));

      // ----- the three secretory proteins -----
      let vesPos: THREE.Vector3 | null = null, vesScale = 0;
      let tagScale = index > 3 ? 1 : 0;
      for (let p = 0; p < 3; p++) {
        const rib = ACTIVE[p]!;
        let count = 8, fold = 1;
        const centre = new THREE.Vector3();
        if (index === 0) {
          count = t < 0.05 ? 0 : Math.min(8, Math.floor(1 + ease(phase(t, 0.05 + p * 0.04, 0.85 + p * 0.04)) * 7.999));
          fold = 0;
          centre.copy(chainCentre(p));
        } else if (index === 1) {
          fold = ease(phase(t, 0, 0.3));
          const move = ease(phase(t, 0.3, 0.75));
          centre.copy(chainCentre(p)).lerp(BUD_ER.clone().add(OFF[p]!).setY(TOP.c.y + OFF[p]!.y * 0.5), move);
          const bud = ease(phase(t, 0.65, 1));
          if (bud > 0) {
            vesPos = BUD_ER.clone().lerp(VES_ER, bud);
            vesScale = lerp(0.35, 1, bud);
            centre.lerp(vesPos.clone().add(OFF[p]!), bud);
          }
        } else if (index === 2) {
          const move = ease(phase(t, 0, 0.72));
          const fuse = ease(phase(t, 0.72, 1));
          vesPos = VES_ER.clone().lerp(AT_CIS, move);
          vesPos.y += Math.sin(move * Math.PI) * 0.3; // a gentle arc between the organelles
          vesScale = 1 - fuse;
          centre.copy(vesPos).add(OFF[p]!).lerp(inCis(0, OFF[p]!), fuse);
        } else if (index === 3) {
          // through the stack: the protein passes from cisterna to cisterna, cis → trans
          const u = ease(phase(t, 0.05, 0.95)) * (G.n - 1);
          const i0 = Math.floor(Math.min(G.n - 1.001, u));
          centre.copy(inCis(i0, OFF[p]!)).lerp(inCis(i0 + 1, OFF[p]!), ease(u - i0));
          tagScale = ease(phase(t, 0.3, 0.6));
        } else {
          const bud = ease(phase(t, 0, 0.15));
          const move = ease(phase(t, 0.15, 0.58));
          const fuse = ease(phase(t, 0.58, 0.72));
          const out = ease(phase(t, 0.62, 1));
          const start = inCis(G.n - 1);
          vesPos = start.clone().lerp(VES_TRANS, bud).lerp(AT_PM, move);
          vesScale = lerp(0.35, 1, bud) * (1 - fuse);
          centre.copy(inCis(G.n - 1, OFF[p]!)).lerp(vesPos.clone().add(OFF[p]!), bud);
          // released outside the cell: the proteins move away from the membrane and spread out
          const outside = new THREE.Vector3(PM_X + 0.8 + p * 0.4, 0.6 + (p - 1) * 0.7, 0.3 + (p - 1) * 0.3);
          if (out > 0) centre.lerp(outside, out);
        }
        drawChain(cargo, p * 8, (s) => chainSlot(rib, s), count, fold, centre);
        // carbohydrate added in the Golgi: two sugar units on each protein
        for (let k = 0; k < 2; k++) {
          tmp.copy(centre).add(new THREE.Vector3(0.12 + k * 0.11, 0.14 + k * 0.08, 0));
          setInstance(tags, p * 2 + k, tmp, undefined, Math.max(0.0001, tagScale));
        }
      }
      if (vesPos && vesScale > 0.001) { ves.visible = true; ves.position.copy(vesPos); ves.scale.setScalar(vesScale); }
      else ves.visible = false;
      cargo.instanceMatrix.needsUpdate = true;
      freeProt.instanceMatrix.needsUpdate = true;
      tags.instanceMatrix.needsUpdate = true;
    }

    return { anchors, durations: [6, 6, 5, 6, 7], render, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
