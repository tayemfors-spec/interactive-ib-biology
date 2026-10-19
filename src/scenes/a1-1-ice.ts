import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { DASHES, OH_LEN, placeHBond, placeRod, waterKit } from './a1-1-molecule';

/*
 * A1.1 ice (ordinary hexagonal ice, ice Ih). Units: Å.
 * Oxygens sit on a hexagonal (wurtzite-type) lattice, a = 4.52 Å, c = 7.36 Å, which gives every
 * molecule four neighbours at ≈ 2.76 Å arranged tetrahedrally. The c-axis points along +z (towards
 * the camera), so the open hexagonal channels are seen end-on.
 * Hydrogens obey the ice rules: exactly one H on each O···O link, and two H on each O (covalent),
 * so in the interior each molecule donates two hydrogen bonds and accepts two. The rules are satisfied by
 * orienting the links along an Euler circuit of the network (every vertex then has as many links in as out);
 * at the surface a molecule with a missing neighbour keeps a free O–H pointing outwards.
 */
const A = 4.52;
const C = 7.36;
const RADIUS = 8.6; // radius of the cylinder of lattice kept, in the basal (xy) plane
const HALF_H = 6.5; // half-height along c (keeps four puckered bilayers)
const BOND = 3.0; // O···O distance below which two sites are linked

const scene: SceneModule = {
  camera: { position: [2.6, 3.6, 29], target: [0, 0, 0], fov: 38, minDistance: 10, maxDistance: 50 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const kit = waterKit(ctx);

    // ---------- lattice ----------
    const a1 = new THREE.Vector3(A, 0, 0);
    const a2 = new THREE.Vector3(-A / 2, (A * Math.sqrt(3)) / 2, 0);
    const basis: [number, number, number][] = [[1 / 3, 2 / 3, 0], [2 / 3, 1 / 3, 1 / 2], [1 / 3, 2 / 3, 3 / 8], [2 / 3, 1 / 3, 7 / 8]];
    const big: THREE.Vector3[] = [];
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) for (let k = -2; k <= 1; k++)
      for (const [u, v, w] of basis) {
        const p = a1.clone().multiplyScalar(i + u).addScaledVector(a2, j + v).add(new THREE.Vector3(0, 0, (k + w - 0.2) * C));
        if (Math.hypot(p.x, p.y) <= RADIUS + 3.5 && Math.abs(p.z) <= HALF_H + 3.5) big.push(p);
      }
    const inside = (p: THREE.Vector3) => Math.hypot(p.x, p.y) <= RADIUS && Math.abs(p.z) <= HALF_H;
    let idx = big.flatMap((p, i) => (inside(p) ? [i] : []));
    // all four ideal neighbour directions of each kept site (from the unclipped lattice)
    const ideal = new Map(idx.map((i) => [i, big.filter((q) => q !== big[i] && big[i]!.distanceTo(q) < BOND).map((q) => q.clone().sub(big[i]!).normalize())]));
    // prune sites with fewer than two neighbours in the cluster (they would dangle)
    for (let pass = 0; pass < 4; pass++) {
      const set = idx;
      idx = set.filter((i) => set.reduce((nb, j) => nb + (j !== i && big[i]!.distanceTo(big[j]!) < BOND ? 1 : 0), 0) >= 2);
    }
    const P = idx.map((i) => big[i]!);
    const n = P.length;
    const adj: number[][] = P.map((p, a) => P.flatMap((q, b) => (a !== b && p.distanceTo(q) < BOND ? [b] : [])));

    // ---------- ice rules via an Euler circuit ----------
    const DUMMY = n;
    type E = { u: number; v: number; used: boolean };
    const edges: E[] = [];
    const inc: number[][] = Array.from({ length: n + 1 }, () => []);
    const addEdge = (u: number, v: number) => { edges.push({ u, v, used: false }); inc[u]!.push(edges.length - 1); inc[v]!.push(edges.length - 1); };
    for (let a = 0; a < n; a++) for (const b of adj[a]!) if (a < b) addEdge(a, b);
    for (let a = 0; a < n; a++) if (adj[a]!.length % 2 === 1) addEdge(a, DUMMY);
    const directed: [number, number][] = []; // [from (donor), to (acceptor)]
    const ptr = new Array(n + 1).fill(0);
    for (let s = 0; s <= n; s++) {
      // Hierholzer: walk unused edges; the order of traversal gives a balanced orientation.
      const stack = [s];
      while (stack.length) {
        const u = stack[stack.length - 1]!;
        while (ptr[u] < inc[u]!.length && edges[inc[u]![ptr[u]]!]!.used) ptr[u]++;
        if (ptr[u] === inc[u]!.length) { stack.pop(); continue; }
        const e = edges[inc[u]![ptr[u]]!]!;
        e.used = true;
        const v = e.u === u ? e.v : e.u;
        if (u !== DUMMY && v !== DUMMY) directed.push([u, v]);
        stack.push(v);
      }
    }

    // H atoms: one per directed link (on the donor), plus free O–H at the surface to make two per O.
    const hOf: THREE.Vector3[][] = P.map(() => []);
    const hb: { h: THREE.Vector3; o: number; d: number }[] = [];
    for (const [d, a] of directed) {
      const h = P[d]!.clone().addScaledVector(P[a]!.clone().sub(P[d]!).normalize(), OH_LEN);
      hOf[d]!.push(h);
      hb.push({ h, o: a, d });
    }
    P.forEach((p, a) => {
      const own = ideal.get(idx[a]!)!;
      const used = adj[a]!.map((b) => P[b]!.clone().sub(p).normalize());
      const free = own.filter((u) => used.every((w) => u.angleTo(w) > 0.3));
      while (hOf[a]!.length < 2 && free.length) hOf[a]!.push(p.clone().addScaledVector(free.shift()!, OH_LEN));
    });

    // ---------- featured molecule: interior, four neighbours, near the front and centre ----------
    let feat = 0;
    let best = -Infinity;
    P.forEach((p, a) => {
      if (adj[a]!.length !== 4 || hOf[a]!.length !== 2) return;
      const r = Math.hypot(p.x, p.y);
      const score = p.z - 0.6 * Math.abs(r - 3.2) - (p.x < 0 ? 1.5 : 0);
      if (score > best) { best = score; feat = a; }
    });

    // ---------- meshes ----------
    const others = P.map((_, a) => a).filter((a) => a !== feat);
    const oMesh = new THREE.InstancedMesh(kit.oGeo, kit.mO, others.length);
    const hCount = others.reduce((s, a) => s + hOf[a]!.length, 0);
    const hMesh = new THREE.InstancedMesh(kit.hGeo, kit.mH, hCount);
    const sticks = new THREE.InstancedMesh(kit.rodGeo, kit.mBond, hCount);
    const m = new THREE.Matrix4();
    let hi = 0;
    others.forEach((a, k) => {
      m.makeTranslation(P[a]!.x, P[a]!.y, P[a]!.z);
      oMesh.setMatrixAt(k, m);
      for (const h of hOf[a]!) {
        m.makeTranslation(h.x, h.y, h.z);
        hMesh.setMatrixAt(hi, m);
        placeRod(sticks, hi, P[a]!, h);
        hi++;
      }
    });
    const featGroup = new THREE.Group();
    const fO = new THREE.Mesh(kit.oGeo, kit.mO);
    fO.position.copy(P[feat]!);
    featGroup.add(fO);
    const fSticks = new THREE.InstancedMesh(kit.rodGeo, kit.mBond, 2);
    hOf[feat]!.forEach((h, k) => {
      const hm = new THREE.Mesh(kit.hGeo, kit.mH);
      hm.position.copy(h);
      featGroup.add(hm);
      placeRod(fSticks, k, P[feat]!, h);
    });
    featGroup.add(fSticks);

    const featBonds = hb.filter((b) => b.d === feat || b.o === feat);
    const otherBonds = hb.filter((b) => b.d !== feat && b.o !== feat);
    const dashes = new THREE.InstancedMesh(kit.dashGeo, kit.mHB, otherBonds.length * DASHES);
    otherBonds.forEach((b, k) => placeHBond(dashes, k * DASHES, b.h, P[b.o]!));
    const featDashes = new THREE.InstancedMesh(kit.dashGeo, kit.mHB, featBonds.length * DASHES);
    featBonds.forEach((b, k) => placeHBond(featDashes, k * DASHES, b.h, P[b.o]!));

    // A hexagonal ring of six oxygens around the central channel, nearest the camera (front layer).
    // Rings in the basal plane are puckered (chair-shaped): the six O alternate slightly up and down.
    const zTop = Math.max(...P.map((p) => p.z));
    const ringO = P.filter((p) => Math.abs(Math.hypot(p.x, p.y) - A / Math.sqrt(3)) < 0.2 && p.z > zTop - 1.2);
    const ringZ = ringO.length ? ringO.reduce((s, p) => s + p.z, 0) / ringO.length : zTop;
    const ring = new THREE.Mesh(
      ctx.track(new THREE.TorusGeometry(A / Math.sqrt(3), 0.11, 6, 6)),
      ctx.material('carb', { roughness: 0.5 }),
    );
    ring.position.set(0, 0, ringZ);
    ring.rotation.z = Math.PI / 6; // ring oxygens lie at 30°, 90°, 150°… around the channel axis
    // The open channel through the middle of the rings (empty space that makes ice less dense)
    const channel = new THREE.Mesh(
      ctx.track(new THREE.CylinderGeometry(1.15, 1.15, 2 * HALF_H, 6, 1, true)),
      ctx.material('water', { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    );
    channel.rotation.x = Math.PI / 2;
    channel.rotation.y = Math.PI / 6;
    root.add(oMesh, hMesh, sticks, dashes, featGroup, featDashes, ring, channel);
    for (const im of [oMesh, hMesh, sticks, dashes, fSticks, featDashes]) im.instanceMatrix.needsUpdate = true;

    // ---------- anchors ----------
    const fp = P[feat]!;
    const fb = featBonds[0]!;
    const fbMid = fb.h.clone().lerp(P[fb.o]!, 0.5);
    const ob = otherBonds.reduce((bst, b) => (b.h.z - 0.2 * Math.abs(b.h.x + 5) > bst.h.z - 0.2 * Math.abs(bst.h.x + 5) ? b : bst), otherBonds[0]!);
    const obMid = ob.h.clone().lerp(P[ob.o]!, 0.5);
    const ringPt = ringO.reduce((bst, p) => (p.y > bst.y ? p : bst), ringO[0] ?? new THREE.Vector3(0, 2.6, zTop));
    const stick = others.map((a) => ({ a, p: P[a]! })).reduce((bst, o) => (o.p.z - 0.2 * Math.abs(o.p.x - 6) - 0.2 * Math.abs(o.p.y + 4) > bst.p.z - 0.2 * Math.abs(bst.p.x - 6) - 0.2 * Math.abs(bst.p.y + 4) ? o : bst));
    const stickMid = stick.p.clone().lerp(hOf[stick.a]![0]!, 0.5);

    const anchors = {
      'hex-ring': { object: anchorAt(root, ringPt.x, ringPt.y + 0.3, ringPt.z + 0.3, 'hex-ring'), highlight: [ring] },
      'open-space': { object: anchorAt(root, 0, 0, zTop + 0.6, 'open-space'), highlight: [channel] },
      'four-bonds': { object: anchorAt(root, fp.x + 0.3, fp.y + 0.3, fp.z + 0.4, 'four-bonds'), highlight: [featGroup, featDashes] },
      hbond: { object: anchorAt(root, obMid.x, obMid.y, obMid.z + 0.1, 'hbond'), highlight: [dashes, featDashes] },
      covalent: { object: anchorAt(root, stickMid.x, stickMid.y, stickMid.z + 0.15, 'covalent'), highlight: [sticks, fSticks] },
      density: { object: anchorAt(root, -RADIUS * 0.75, -RADIUS * 0.8, zTop, 'density'), highlight: [oMesh] },
    };
    void fbMid;

    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
