import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';

/*
 * B2.1 fluid mosaic membrane patch. Units are roughly nanometres: the bilayer is ~4.5 units from
 * head surface to head surface (real membranes are ~7–10 nm including proteins and the carbohydrate
 * layer; the lipid bilayer itself is ~4–5 nm). +y is the extracellular side.
 */
const HEAD_Y = 1.9;
const HEAD_R = 0.36;
const TAIL_R = 0.075;
const TAIL_LEN = 1.45;
const SPACING = 0.78;
const NX = 22;
const NZ = 14;

interface Spot { x: number; z: number; r: number; leaflets: (1 | -1)[] }

const scene: SceneModule = {
  camera: { position: [6.5, 8, 19.5], target: [0, -0.4, 0], fov: 38, minDistance: 6, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(21);

    const mHead = ctx.material('head', { roughness: 0.45 });
    const mTail = ctx.material('tail', { roughness: 0.7 });
    const mChol = ctx.material('chol', { roughness: 0.5 });
    const mProt = ctx.material('protein', { roughness: 0.5 });
    const mProt2 = ctx.material('protein2', { roughness: 0.5 });
    const mAqua = ctx.material('water', { roughness: 0.45 });
    const mCarb = ctx.material('carb', { roughness: 0.5 });

    // Positions occupied by proteins (and the glycolipid), so lipids are not drawn through them.
    const spots: Record<string, Spot> = {
      integral: { x: -1.3, z: 2.5, r: 1.25, leaflets: [1, -1] },
      glycoprotein: { x: -6.4, z: -2.4, r: 1.15, leaflets: [1, -1] },
      channel: { x: 2.4, z: -1.6, r: 1.3, leaflets: [1, -1] },
      aquaporin: { x: -0.9, z: -3.4, r: 1.25, leaflets: [1, -1] },
      pump: { x: 5.7, z: 2.2, r: 1.65, leaflets: [1, -1] },
      glycolipid: { x: -4.85, z: 4.29, r: 0.45, leaflets: [1] },
    };
    const blocked = (x: number, z: number, s: 1 | -1) =>
      Object.values(spots).some((p) => p.leaflets.includes(s) && Math.hypot(x - p.x, z - p.z) < p.r);

    // ---------- lipids ----------
    type Lipid = { x: number; z: number; s: 1 | -1; kinked: boolean; chol: boolean; ang: number };
    const lipids: Lipid[] = [];
    const frontZ = ((NZ - 1) / 2) * SPACING;
    for (const s of [1, -1] as const) {
      for (let ix = 0; ix < NX; ix++) {
        for (let iz = 0; iz < NZ; iz++) {
          const x = (ix - (NX - 1) / 2) * SPACING + (rand() - 0.5) * 0.18;
          const z = (iz - (NZ - 1) / 2) * SPACING + (rand() - 0.5) * 0.18;
          if (blocked(x, z, s)) continue;
          const onFront = iz === NZ - 1;
          // Fixed examples on the front edge for the labels; the rest are random.
          const forcedKink = onFront && s === 1 && ix === 9;
          const forcedChol = onFront && s === 1 && ix === 14;
          const chol = forcedChol || (!onFront && rand() < 0.09);
          const kinked = !chol && (forcedKink || (!(onFront && s === 1 && ix === 2) && rand() < 0.35));
          lipids.push({ x, z, s, kinked, chol, ang: rand() * Math.PI });
        }
      }
    }
    const phospho = lipids.filter((l) => !l.chol);
    const chols = lipids.filter((l) => l.chol);
    const nKinked = phospho.filter((l) => l.kinked).length;

    const headGeo = ctx.track(new THREE.SphereGeometry(HEAD_R, 14, 10));
    const tailGeo = ctx.track(new THREE.CylinderGeometry(TAIL_R, TAIL_R, TAIL_LEN, 6));
    const upperGeo = ctx.track(new THREE.CylinderGeometry(TAIL_R, TAIL_R, 0.62, 6));
    const lowerGeo = ctx.track(new THREE.CylinderGeometry(TAIL_R, TAIL_R, 0.86, 6));
    const heads = new THREE.InstancedMesh(headGeo, mHead, phospho.length + 1);
    const tails = new THREE.InstancedMesh(tailGeo, mTail, phospho.length * 2 - nKinked + 2);
    const uppers = new THREE.InstancedMesh(upperGeo, mTail, nKinked);
    const lowers = new THREE.InstancedMesh(lowerGeo, mTail, nKinked);
    const cholBodyGeo = ctx.track(new THREE.BoxGeometry(0.34, 0.95, 0.14));
    const cholTailGeo = ctx.track(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5));
    const ohGeo = ctx.track(new THREE.SphereGeometry(0.13, 8, 6));
    const cholBodies = new THREE.InstancedMesh(cholBodyGeo, mChol, chols.length);
    const cholTails = new THREE.InstancedMesh(cholTailGeo, mChol, chols.length);
    const cholOH = new THREE.InstancedMesh(ohGeo, mChol, chols.length);
    for (const im of [heads, tails, uppers, lowers, cholBodies, cholTails, cholOH]) root.add(im);

    // Each instance remembers its base transform and which lipid it belongs to (for drifting).
    type Inst = { mesh: THREE.InstancedMesh; i: number; pos: THREE.Vector3; rot: THREE.Euler; lipid: number };
    const insts: Inst[] = [];
    const add = (mesh: THREE.InstancedMesh, i: number, pos: THREE.Vector3, rot: THREE.Euler, lipid: number) => {
      setInstance(mesh, i, pos, rot);
      insts.push({ mesh, i, pos: pos.clone(), rot: rot.clone(), lipid });
    };

    let hi = 0, ti = 0, ki = 0;
    const tailTop = (s: 1 | -1) => s * (HEAD_Y - HEAD_R * 0.75);
    phospho.forEach((l) => {
      const id = lipids.indexOf(l);
      add(heads, hi++, new THREE.Vector3(l.x, l.s * HEAD_Y, l.z), new THREE.Euler(), id);
      const dx = Math.cos(l.ang) * 0.12;
      const dz = Math.sin(l.ang) * 0.12;
      add(tails, ti++, new THREE.Vector3(l.x - dx, tailTop(l.s) - l.s * TAIL_LEN / 2, l.z - dz), new THREE.Euler(), id);
      if (!l.kinked) {
        add(tails, ti++, new THREE.Vector3(l.x + dx, tailTop(l.s) - l.s * TAIL_LEN / 2, l.z + dz), new THREE.Euler(), id);
      } else {
        // cis double bond: the chain bends by ~30°, so it packs less tightly
        const top = tailTop(l.s);
        add(uppers, ki, new THREE.Vector3(l.x + dx, top - l.s * 0.31, l.z + dz), new THREE.Euler(), id);
        const tilt = 0.55;
        const tip = new THREE.Vector3(Math.cos(l.ang) * Math.sin(tilt), -l.s * Math.cos(tilt), Math.sin(l.ang) * Math.sin(tilt));
        const joint = new THREE.Vector3(l.x + dx, top - l.s * 0.62, l.z + dz);
        const rot = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip));
        add(lowers, ki++, joint.addScaledVector(tip, 0.43), rot, id);
      }
    });

    chols.forEach((l, i) => {
      const id = lipids.indexOf(l);
      const s = l.s;
      add(cholOH, i, new THREE.Vector3(l.x, s * (HEAD_Y - 0.32), l.z), new THREE.Euler(), id);
      add(cholBodies, i, new THREE.Vector3(l.x, s * (HEAD_Y - 0.95), l.z), new THREE.Euler(0, l.ang, 0), id);
      add(cholTails, i, new THREE.Vector3(l.x, s * (HEAD_Y - 1.65), l.z), new THREE.Euler(), id);
    });

    // ---------- glycolipid (outer leaflet only) ----------
    const gl = spots.glycolipid!;
    const glycolipid = new THREE.Group();
    glycolipid.position.set(gl.x, 0, gl.z);
    const glHead = new THREE.Mesh(headGeo, mHead);
    glHead.position.y = HEAD_Y;
    const glT1 = new THREE.Mesh(tailGeo, mTail);
    glT1.position.set(-0.12, tailTop(1) - TAIL_LEN / 2, 0);
    const glT2 = glT1.clone();
    glT2.position.x = 0.12;
    const sugarGeo = ctx.track(new THREE.SphereGeometry(0.2, 10, 8));
    const glChain = new THREE.Group();
    for (const [x, y] of [[0, 2.55], [0, 2.95], [-0.24, 3.3], [0.24, 3.3]] as const) {
      const m = new THREE.Mesh(sugarGeo, mCarb);
      m.position.set(x, y, 0);
      glChain.add(m);
    }
    glycolipid.add(glHead, glT1, glT2, glChain);
    root.add(glycolipid);

    // ---------- proteins ----------
    const protein = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(ctx.track(geo), mat);
      mesh.position.set(x, y, z);
      root.add(mesh);
      return mesh;
    };

    const integral = protein(blobGeometry(0.95, 5.8, 3), mProt, spots.integral!.x, 0, spots.integral!.z);

    const gp = spots.glycoprotein!;
    const glycoprotein = new THREE.Group();
    glycoprotein.add(protein(blobGeometry(0.85, 5.7, 7), mProt, gp.x, 0, gp.z));
    const gpChain = new THREE.Group();
    gpChain.position.set(gp.x, 0, gp.z);
    for (const [x, y, z] of [[0, 3.0, 0], [0, 3.4, 0], [-0.3, 3.78, 0], [0.3, 3.78, 0.05], [-0.5, 4.16, 0], [0.5, 4.16, 0.1], [0.2, 4.5, 0.1], [-0.15, 4.5, -0.1]] as const) {
      const m = new THREE.Mesh(sugarGeo, mCarb);
      m.position.set(x, y, z);
      gpChain.add(m);
    }
    glycoprotein.add(gpChain);
    root.add(glycoprotein);

    const ringOf = (n: number, ringR: number, sub: () => THREE.BufferGeometry, mat: THREE.Material, cx: number, cz: number) => {
      const g = new THREE.Group();
      g.position.set(cx, 0, cz);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const m = new THREE.Mesh(ctx.track(sub()), mat);
        m.position.set(Math.cos(a) * ringR, 0, Math.sin(a) * ringR);
        g.add(m);
      }
      root.add(g);
      return g;
    };
    // Channel protein: five subunits around a central water-filled pore.
    const ch = spots.channel!;
    const channel = ringOf(5, 0.66, () => blobGeometry(0.4, 5.4, 5, 0.08, 16), mProt2, ch.x, ch.z);
    // Aquaporin: four subunits; each subunit has its own narrow water pore.
    const aq = spots.aquaporin!;
    const aquaporin = ringOf(4, 0.52, () => blobGeometry(0.46, 5.2, 9, 0.08, 16), mAqua, aq.x, aq.z);

    // Pump protein: spans the membrane, with a large cytoplasmic domain (where ATP binds).
    const pp = spots.pump!;
    const pump = new THREE.Group();
    pump.add(protein(blobGeometry(1.15, 5.4, 11), mProt, pp.x, -0.2, pp.z));
    pump.add(protein(blobGeometry(1.05, 2.0, 12, 0.15), mProt, pp.x + 0.2, -3.4, pp.z + 0.1));
    root.add(pump);

    // Peripheral protein: sits on the cytoplasmic surface without entering the hydrophobic core.
    const peripheral = protein(new THREE.SphereGeometry(0.85, 24, 16).scale(1.35, 0.6, 1.05), mProt2, 0.7, -HEAD_Y - HEAD_R - 0.4, 3.2);

    heads.count = hi;
    tails.count = ti;
    for (const im of [heads, tails, uppers, lowers, cholBodies, cholTails, cholOH]) im.instanceMatrix.needsUpdate = true;

    // ---------- label anchors ----------
    const front = (s: 1 | -1, ix: number) => {
      const target = (ix - (NX - 1) / 2) * SPACING;
      let best = lipids[0]!;
      for (const l of lipids) if (l.s === s && Math.abs(l.z - frontZ) < 0.3 && Math.abs(l.x - target) < Math.abs(best.x - target)) best = l;
      return best;
    };
    const plainFront = front(1, 2);
    const kinkFront = front(1, 9);
    const cholFront = front(1, 14);
    const anchors = {
      head: { object: anchorAt(root, plainFront.x, HEAD_Y + HEAD_R * 0.6, plainFront.z + 0.3, 'head'), highlight: [heads] },
      tails: { object: anchorAt(root, plainFront.x, HEAD_Y - 1.1, plainFront.z + 0.25, 'tails'), highlight: [tails, uppers, lowers] },
      kink: { object: anchorAt(root, kinkFront.x + 0.3, HEAD_Y - 1.25, kinkFront.z + 0.3, 'kink'), highlight: [uppers, lowers] },
      cholesterol: { object: anchorAt(root, cholFront.x, HEAD_Y - 0.95, cholFront.z + 0.25, 'cholesterol'), highlight: [cholBodies, cholTails, cholOH] },
      integral: { object: anchorAt(integral, 0.5, 2.7, 0.6, 'integral'), highlight: [integral] },
      channel: { object: anchorAt(root, ch.x, 2.85, ch.z, 'channel'), highlight: [channel] },
      aquaporin: { object: anchorAt(root, aq.x, 2.75, aq.z, 'aquaporin'), highlight: [aquaporin] },
      pump: { object: anchorAt(root, pp.x + 0.6, -3.6, pp.z + 1.1, 'pump'), highlight: [pump] },
      peripheral: { object: anchorAt(peripheral, 0.6, -0.35, 0.7, 'peripheral'), highlight: [peripheral] },
      glycoprotein: { object: anchorAt(root, gp.x + 0.8, 2.6, gp.z + 0.4, 'glycoprotein'), highlight: [glycoprotein] },
      carbohydrate: { object: anchorAt(gpChain, 0, 4.5, 0, 'carbohydrate'), highlight: [gpChain, glChain] },
      glycolipid: { object: anchorAt(glycolipid, 0.25, 3.3, 0.2, 'glycolipid'), highlight: [glycolipid] },
      outside: { object: anchorAt(root, -4.5, 3.6, 4.6, 'outside'), highlight: [] },
      cytoplasm: { object: anchorAt(root, -4.5, -3.4, 4.6, 'cytoplasm'), highlight: [] },
    };

    // ---------- optional lateral drift (fluidity) ----------
    const phases = lipids.map(() => [rand() * Math.PI * 2, 0.6 + rand() * 0.8] as const);
    let time = 0;
    const p = new THREE.Vector3();
    const dirty = new Set<THREE.InstancedMesh>();
    return {
      anchors,
      idle(dt) {
        time += dt;
        for (const it of insts) {
          const [ph, w] = phases[it.lipid]!;
          p.set(it.pos.x + 0.16 * Math.sin(time * w + ph), it.pos.y, it.pos.z + 0.16 * Math.cos(time * w * 0.8 + ph));
          setInstance(it.mesh, it.i, p, it.rot);
          dirty.add(it.mesh);
        }
        for (const mesh of dirty) mesh.instanceMatrix.needsUpdate = true;
        dirty.clear();
        integral.rotation.y += dt * 0.15;
        channel.rotation.y += dt * 0.1;
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
