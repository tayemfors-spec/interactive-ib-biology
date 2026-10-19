import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { along, bilayer, noCull, nucleotide } from './c2-1-kit';

/*
 * C2.1.11 insulin and its tyrosine kinase receptor in a muscle or fat cell.
 * Steps: 0 inactive · 1 insulin binds · 2 autophosphorylation of tyrosines · 3 relay proteins ·
 * 4 GLUT4 vesicles fuse with the plasma membrane · 5 glucose enters by facilitated diffusion.
 * Topology that matters: the receptor is two linked halves (a dimer) spanning the membrane; insulin
 * binds the outside part; the tyrosine kinase domains are in the cytoplasm and phosphorylate each other.
 */
const MEM_Y = 2;
const RX = -3.6;
const PIVOT_Y = 5.4; // where the two halves are linked, outside the cell
const GLUT_X = [1.6, 3.0, 4.6, 6.0];

const scene: SceneModule = {
  camera: { position: [0, 2.0, 20], target: [0, 0.4, 0], fov: 42, minDistance: 7, maxDistance: 38 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(17);
    const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

    const mem = bilayer(ctx, root, { y: MEM_Y, x: [-7.6, 7.6], z: [-2.6, 1.0], holes: [{ x: RX, z: 0, r: 1.7 }], seed: 9 });

    // ---------- insulin receptor: two halves joined outside the cell ----------
    const mRec = ctx.material('protein', { roughness: 0.45 });
    const mKin = ctx.material('protein2', { roughness: 0.45 });
    const halves: THREE.Group[] = [];
    const kinases: THREE.Mesh[] = [];
    const outerParts: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      const half = new THREE.Group();
      half.position.set(RX, PIVOT_Y, 0);
      const out = new THREE.Mesh(ctx.track(blobGeometry(0.55, 1.6, 90 + s, 0.12)), mRec);
      out.position.set(s * 0.55, 0.05, 0);
      out.rotation.z = s * 0.35;
      const tm = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.2, 0.2, 4.6, 10)), mRec);
      tm.position.set(s * 0.75, -3.2, 0);
      const kin = new THREE.Mesh(ctx.track(blobGeometry(0.62, 1.5, 95 + s, 0.12)), mKin);
      kin.position.set(s * 0.8, -6.25, 0.1);
      half.add(out, tm, kin);
      root.add(half);
      halves.push(half);
      kinases.push(kin);
      outerParts.push(out);
    }
    const bridge = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6)), mRec);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(RX, PIVOT_Y + 0.1, 0);
    root.add(bridge);

    // ---------- insulin: a small two-chain protein ----------
    const mIns = ctx.material('chol', { roughness: 0.4 });
    const insulin = new THREE.Group();
    const chainA = new THREE.Mesh(ctx.track(blobGeometry(0.26, 0.9, 101, 0.1)), mIns);
    const chainB = new THREE.Mesh(ctx.track(blobGeometry(0.28, 1.2, 102, 0.1)), mIns);
    chainA.rotation.z = Math.PI / 2;
    chainB.rotation.z = Math.PI / 2;
    chainB.position.set(0.05, -0.42, 0);
    insulin.add(chainA, chainB);
    root.add(insulin);
    const INS_FREE = v(-0.6, 7.0, 1.2);
    const INS_BOUND = v(RX, PIVOT_Y + 0.75, 0.35);

    // ---------- tyrosine phosphates (3 on each kinase domain) and the ATP that supplies them ----------
    const phos = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.15, 8, 6)), ctx.material('head', { roughness: 0.35 }), 6);
    root.add(phos);
    const atps = [nucleotide(ctx, 3), nucleotide(ctx, 3)];
    atps.forEach((a) => root.add(a));

    // ---------- relay proteins and the signalling chain ----------
    const relay = new THREE.InstancedMesh(ctx.track(blobGeometry(0.42, 1.1, 110, 0.12)), ctx.material('water', { roughness: 0.45 }), 2);
    const chain = new THREE.InstancedMesh(ctx.track(blobGeometry(0.3, 0.75, 111, 0.1)), ctx.material('na', { roughness: 0.45 }), 3);
    root.add(relay, chain);
    const RELAY_FROM = [v(RX - 2.4, -2.6, 0.8), v(RX + 2.6, -2.4, 0.6)];
    const CHAIN = [v(-0.6, -2.6, 0.6), v(0.9, -3.3, 0.4), v(2.0, -4.1, 0.6)];
    const relayPhos = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.13, 8, 6)), ctx.material('head', { roughness: 0.35 }), 5);
    root.add(relayPhos);

    // ---------- GLUT4 vesicles (two transporters each) ----------
    const mVes = ctx.material('head', { roughness: 0.6, transparent: true, opacity: 0.42, depthWrite: false });
    const vesGeo = ctx.track(new THREE.SphereGeometry(1.0, 24, 16));
    const vesicles = [new THREE.Mesh(vesGeo, mVes), new THREE.Mesh(vesGeo, mVes)];
    vesicles.forEach((m) => root.add(m));
    const VES_HOME = [v(2.4, -4.6, 0.4), v(5.2, -3.8, -0.3)];
    const VES_DOCK = [v(2.3, 0.3, 0.1), v(5.3, 0.3, 0.1)];
    const glut = new THREE.InstancedMesh(ctx.track(blobGeometry(0.42, 3.6, 120, 0.08)), ctx.material('water', { roughness: 0.45 }), 4);
    root.add(glut);
    const glutGroup = new THREE.Group(); // for highlighting
    glutGroup.add(glut);
    root.add(glutGroup);

    // ---------- glucose (hexagons): high outside, low inside ----------
    const N_OUT = 18;
    const glc = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 6)), ctx.material('glucose', { roughness: 0.4 }), N_OUT + 2);
    root.add(glc);
    const glcBase = Array.from({ length: N_OUT }, () => v(0.4 + rand() * 7, 4.4 + rand() * 2.2, -2 + rand() * 4));
    const glcIn = [v(-1.5, -4.8, 1), v(6.6, -5.2, -0.6)];
    const ENTERING = [0, 3, 6, 9, 12, 15]; // these pass through GLUT4 in the last step
    noCull(root);
    const tmp = new THREE.Vector3();
    const hide = (m: THREE.InstancedMesh, i: number) => setInstance(m, i, tmp.set(0, -60, 0), undefined, 0.001);

    const anchors = {
      insulin: { object: anchorAt(insulin, 0.6, 0.3, 0.3, 'insulin'), highlight: [insulin] },
      receptor: { object: anchorAt(root, RX - 1.6, PIVOT_Y - 0.2, 0.4, 'receptor'), highlight: [...halves, bridge] },
      kinase: { object: anchorAt(kinases[0]!, -0.4, -0.3, 0.6, 'kinase'), highlight: kinases },
      phosphotyrosine: { object: anchorAt(kinases[1]!, 0.6, 0.3, 0.6, 'phosphotyrosine'), highlight: [phos] },
      atp: { object: anchorAt(atps[1]!, 0.4, 0, 0.2, 'atp'), highlight: atps },
      relay: { object: anchorAt(root, CHAIN[0]!.x, CHAIN[0]!.y + 0.5, 0.9, 'relay'), highlight: [relay, chain] },
      vesicle: { object: anchorAt(vesicles[1]!, 0.9, -0.4, 0.5, 'vesicle'), highlight: vesicles },
      glut4: { object: anchorAt(root, GLUT_X[3]!, MEM_Y - 1.7, 0.6, 'glut4'), highlight: [glutGroup] },
      glucose: { object: anchorAt(root, 4.6, 6.6, 1.0, 'glucose'), highlight: [glc] },
      outside: { object: anchorAt(root, -6.6, 6.2, -1.0, 'outside'), highlight: [] },
      cytoplasm: { object: anchorAt(root, -6.4, -3.2, -1.0, 'cytoplasm'), highlight: [] },
    };

    return {
      anchors,
      durations: [4, 5, 6, 6, 7, 7],
      render(index, t) {
        const at = (i: number) => (index > i ? 1 : index === i ? t : 0);
        const s1 = at(1), s2 = at(2), s3 = at(3), s4 = at(4);

        // insulin binds; the receptor changes shape so the two kinase domains come together
        const bound = ease(phase(s1, 0.05, 0.55));
        const closed = ease(phase(s1, 0.45, 0.95));
        insulin.position.copy(INS_FREE).lerp(INS_BOUND, bound);
        if (index === 0) insulin.position.y += Math.sin(t * 8) * 0.15;
        insulin.rotation.set(0.3, (1 - bound) * 1.4, 0);
        halves.forEach((h, i) => { h.rotation.z = (i === 0 ? -1 : 1) * (0.11 - 0.14 * closed); });

        // autophosphorylation: each kinase domain adds phosphate (from ATP) to tyrosines on the other
        const kp = phase(s2, 0.2, 0.85);
        atps.forEach((a, i) => {
          a.visible = index === 2 && kp < 1;
          const k = kinases[i]!;
          k.getWorldPosition(tmp);
          a.position.copy(tmp).add(v(i === 0 ? -1.5 : 1.0, -0.9, 0.7)).lerp(tmp.clone().add(v(i === 0 ? -0.4 : 0.1, -0.5, 0.8)), ease(phase(s2, 0, 0.25)));
          a.scale.setScalar(1 - 0.6 * phase(s2, 0.55, 0.85));
        });
        for (let i = 0; i < 6; i++) {
          const on = phase(kp, (i % 3) * 0.25 + (i < 3 ? 0 : 0.1), (i % 3) * 0.25 + 0.35);
          if (on <= 0) { hide(phos, i); continue; }
          const k = kinases[i < 3 ? 0 : 1]!;
          k.getWorldPosition(tmp);
          const side = i < 3 ? -1 : 1;
          setInstance(phos, i, tmp.add(v(side * 0.55, 0.45 - (i % 3) * 0.45, 0.55)), undefined, ease(on));
        }
        phos.instanceMatrix.needsUpdate = true;

        // relay proteins dock on the phosphotyrosines, are phosphorylated and pass the signal on
        const dock = ease(phase(s3, 0, 0.35));
        RELAY_FROM.forEach((p, i) => {
          kinases[i]!.getWorldPosition(tmp);
          const target = tmp.clone().add(v(i === 0 ? -0.95 : 0.95, -0.7, 0.4));
          setInstance(relay, i, p.clone().lerp(target, dock), new THREE.Euler(0, 0, 0.9));
        });
        relay.instanceMatrix.needsUpdate = true;
        CHAIN.forEach((p, i) => {
          const on = ease(phase(s3, 0.45 + i * 0.15, 0.6 + i * 0.15));
          setInstance(chain, i, p, new THREE.Euler(0, 0, 1.1), 1 + 0.15 * on);
        });
        chain.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < 5; i++) {
          const on = i < 2 ? phase(s3, 0.3, 0.45) : phase(s3, 0.45 + (i - 2) * 0.15, 0.6 + (i - 2) * 0.15);
          if (on <= 0) { hide(relayPhos, i); continue; }
          if (i < 2) { kinases[i]!.getWorldPosition(tmp); tmp.add(v(i === 0 ? -1.3 : 1.3, -0.3, 0.75)); }
          else tmp.copy(CHAIN[i - 2]!).add(v(0.3, 0.35, 0.3));
          setInstance(relayPhos, i, tmp, undefined, ease(on));
        }
        relayPhos.instanceMatrix.needsUpdate = true;

        // GLUT4 vesicles move to the membrane and fuse with it (exocytosis)
        const move = ease(phase(s4, 0, 0.5));
        const fuse = ease(phase(s4, 0.5, 0.9));
        vesicles.forEach((m, i) => {
          m.position.copy(VES_HOME[i]!).lerp(VES_DOCK[i]!, move);
          m.position.y += fuse * 0.9;
          m.scale.set(1 + fuse * 0.5, Math.max(0.001, 1 - fuse), 1 + fuse * 0.3);
          m.visible = fuse < 0.98;
        });
        for (let i = 0; i < 4; i++) {
          const ves = vesicles[i >> 1]!;
          const off = (i % 2 === 0 ? -0.55 : 0.55);
          const inVes = tmp.copy(ves.position).add(v(off, 0, 0.35));
          const inMem = v(GLUT_X[i]!, MEM_Y, 0.2);
          const p = inVes.clone().lerp(inMem, fuse);
          const sc = 0.4 + 0.6 * fuse; // drawn smaller while packed in the vesicle membrane
          setInstance(glut, i, p, new THREE.Euler(0, 0, (1 - fuse) * (i % 2 ? -0.8 : 0.8)), sc, sc);
          mem.clear(GLUT_X[i]!, 0.2, 0.62, fuse > 0.5);
        }
        glut.instanceMatrix.needsUpdate = true;

        // glucose: diffuses in through GLUT4 only once the transporters are in the membrane
        const N = N_OUT;
        for (let i = 0; i < N; i++) {
          const b = glcBase[i]!;
          const k = ENTERING.indexOf(i);
          if (k >= 0 && index === 5) {
            const gx = GLUT_X[k % 4]!;
            const path = [b, v(gx, 4.4, 0.2), v(gx, -0.6, 0.2), v(gx + (k % 2 ? 0.8 : -0.8), -2.6 - (k % 3) * 0.5, 0.8)];
            const u = ease(phase(t, 0.05 + k * 0.1, 0.4 + k * 0.1));
            setInstance(glc, i, along(path, u, tmp), new THREE.Euler(Math.PI / 2, 0, 0));
            continue;
          }
          tmp.set(b.x + 0.2 * Math.sin(t * 6 + i), b.y + 0.15 * Math.cos(t * 5 + i), b.z + 0.2 * Math.sin(t * 4 + i * 0.7));
          setInstance(glc, i, tmp, new THREE.Euler(Math.PI / 2 + i, 0, 0));
        }
        glcIn.forEach((p, j) => setInstance(glc, N + j, p, new THREE.Euler(Math.PI / 2, 0, 0)));
        glc.instanceMatrix.needsUpdate = true;
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
