import * as THREE from 'three';
import type { PaletteKey, SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';

/*
 * B1.1 polysaccharides, schematic. Each glucose residue is a hexagonal tile (the pyranose ring) with
 *   - a red bead at the ring oxygen (between C1 and C5), and
 *   - a short dark stub at C5 for carbon 6 (the CH₂OH group).
 * In the tile's own frame (as in the exam drawing) C1 is at 0°, the ring O at 60°, C5 at 120°, C4 at 180°,
 * C3 at 240° and C2 at 300°. e1 points from C4 to C1, i.e. towards the reducing end of the chain.
 * Links:
 *   - 1,4 glycosidic bond: C1 of one residue – O – C4 of the next (grey rods, red O bead).
 *   - 1,6 glycosidic bond: C1 of the first residue of a branch – O – C6 of a residue in the parent chain
 *     (blue rods). Branches therefore start from a C6 stub.
 * Four panels:
 *   amylose (top left): an unbranched α-1,4 chain coiled into a left-handed helix, 6 residues per turn;
 *   amylopectin (top right): α-1,4 chains with α-1,6 branches spaced widely (model: every 5 residues);
 *   glycogen (bottom left): the same links but branched more often (model: every 2 residues, two
 *     branches per chain), so it is more compact and has more chain ends;
 *   cellulose (bottom right): straight β-1,4 chains in which every other residue is turned over (ring O and
 *     CH₂OH alternate sides), lying parallel and cross-linked by hydrogen bonds; a second layer of chains
 *     behind shows chains bundling into a microfibril.
 * Branched chains are drawn straight, in one plane, for clarity; in real amylopectin and glycogen the
 * α-1,4 chains also coil.
 */
const R = 0.55; // tile circumradius
const LINK = 0.5; // gap between tiles bridged by a glycosidic link
const STEP = 2 * R + LINK;
const Z = new THREE.Vector3(0, 0, 1);
const UPV = new THREE.Vector3(0, 1, 0);

interface Residue { p: THREE.Vector3; e1: THREE.Vector3; e2: THREE.Vector3; beta: boolean; tip: boolean }
/** Point at angle `deg` in the residue's ring frame, distance `rad` from its centre. */
const vtx = (r: Residue, deg: number, rad = R) => {
  const a = THREE.MathUtils.degToRad(deg);
  return r.p.clone().addScaledVector(r.e1, rad * Math.cos(a)).addScaledVector(r.e2, rad * Math.sin(a));
};

interface Chain { c1: THREE.Vector3; g: THREE.Vector3; side: number; depth: number; len: number }
interface TreeOpts {
  every: number; firstAt: number; maxDepth: number; turn: number;
  lenOf: (depth: number) => number;
  sideOf: (depth: number, k: number) => number;
  pull: (p: THREE.Vector3, g: THREE.Vector3) => THREE.Vector3;
  /** Keeps the tree inside its panel. */
  inside: (p: THREE.Vector3) => boolean;
}

const scene: SceneModule = {
  camera: { position: [0, 2.5, 42], target: [0, -0.2, 0], fov: 38, minDistance: 8, maxDistance: 70 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    const residues: Residue[] = [];
    const links14: [THREE.Vector3, THREE.Vector3][] = []; // C4 vertex of one residue, C1 vertex of the next
    const hbonds: [THREE.Vector3, THREE.Vector3][] = [];
    const orient = (e1: THREE.Vector3, side: number) => new THREE.Vector3().crossVectors(Z, e1).normalize().multiplyScalar(side);

    // ---------- amylose: a left-handed α-1,4 helix, 6 residues per turn ----------
    const AMY = new THREE.Vector3(-8.6, 5.2, 0);
    const nAmy = 15;
    {
      const rh = 1.75, pitch = 3.3; // pitch stretched so the tiles of successive turns do not overlap
      const pos = (i: number) => {
        const phi = (-i * Math.PI) / 3; // decreasing angle as x increases: left-handed about +x
        return AMY.clone().add(new THREE.Vector3((i - (nAmy - 1) / 2) * (pitch / 6), rh * Math.cos(phi), rh * Math.sin(phi)));
      };
      for (let i = 0; i < nAmy; i++) {
        const p = pos(i);
        const e1 = pos(i - 1).sub(pos(i + 1)).normalize(); // towards residue i−1 (reducing end at i = 0)
        const radial = p.clone().sub(AMY).setX(0).normalize();
        const e2 = new THREE.Vector3().crossVectors(radial, e1).normalize(); // ring faces outwards
        residues.push({ p, e1, e2, beta: false, tip: i === nAmy - 1 });
      }
      for (let i = 0; i < nAmy - 1; i++) links14.push([vtx(residues[i]!, 180), vtx(residues[i + 1]!, 0)]);
    }

    // ---------- branched trees (amylopectin and glycogen) ----------
    /** True if a tile centred at q would overlap an existing tile (the chain's own previous residue may sit closer, at a bend). */
    const occupied = (q: THREE.Vector3, min: number, except?: Residue | null) => residues.some((r) => r !== except && r.p.distanceToSquared(q) < min * min);
    const pending: { c6: THREE.Vector3; o6: THREE.Vector3; c1: THREE.Vector3 }[] = [];
    const rand = rng(11);
    const perp = (v: THREE.Vector3, ang: number) => {
      const a = Math.abs(v.z) < 0.9 ? new THREE.Vector3().crossVectors(v, Z).normalize() : new THREE.Vector3().crossVectors(v, UPV).normalize();
      return a.applyAxisAngle(v, ang);
    };
    /**
     * Grow a branched α-glucan from its reducing end. In flat mode (amylopectin) chains stay in the xy-plane and
     * every residue of a chain faces the same way. In 3D mode (glycogen) chains grow outwards in all directions:
     * each residue is twisted 60° about the chain relative to the previous one (as in a coiled α-1,4 chain),
     * except that a branching residue is turned so its C6 faces outwards, and a blocked chain may bend a little.
     */
    const tree = (start: Chain, o: TreeOpts, centre: THREE.Vector3, threeD = false) => {
      const first = residues.length;
      const queue: Chain[] = [start];
      let k = 0;
      let branchCount = 0;
      while (queue.length) {
        const ch = queue.shift()!;
        let attach = ch.c1.clone(); // where the next residue's C1 vertex goes
        let g = ch.g.clone().normalize(); // growth direction, away from the reducing end
        let prev: Residue | null = null;
        for (let i = 0; i < ch.len; i++) {
          if (i > 0 && ch.depth > 0) g = o.pull(attach, g).normalize();
          const ok = (d: THREE.Vector3) => { const q = attach.clone().addScaledVector(d, R); return !occupied(q, 1.42, prev) && o.inside(q); };
          // C1 stays at `attach`, so bending the chain here keeps the 1,4 or 1,6 link intact
          const tries = threeD ? [g, ...[0.6, 1.2, 1.6].flatMap((a) => [0, 1, 2, 3, 4, 5].map((j) => g.clone().applyAxisAngle(perp(g, (j * Math.PI) / 3), a)))] : [g];
          const choice = tries.find(ok);
          if (!choice) break;
          g = choice.clone();
          const p = attach.clone().addScaledVector(g, R);
          const e1 = g.clone().negate();
          const branching = ch.depth < o.maxDepth && i >= o.firstAt && (i - o.firstAt) % o.every === 0 && i < ch.len - 1;
          let e2: THREE.Vector3;
          if (!threeD) e2 = orient(e1, ch.side);
          else if (branching) {
            const want = p.clone().sub(centre).normalize().multiplyScalar(0.6).add(perp(e1, branchCount++ * 2.4 + rand()));
            e2 = want.addScaledVector(e1, -want.dot(e1)).normalize();
          } else e2 = prev ? prev.e2.clone().addScaledVector(e1, -prev.e2.dot(e1)).normalize().applyAxisAngle(e1, Math.PI / 3) : perp(e1, rand() * 6.28);
          const r: Residue = { p, e1, e2, beta: false, tip: false };
          residues.push(r);
          if (prev) links14.push([vtx(prev, 180), vtx(r, 0)]);
          prev = r;
          attach = p.clone().addScaledVector(g, R + LINK);
          if (branching) {
            // a branch: its first residue is joined by its C1, through an O, to C6 of this residue (1,6 link)
            const u = vtx(r, 120, 1).sub(r.p).normalize();
            const c6 = vtx(r, 120, R + 0.42);
            const o6 = c6.clone().addScaledVector(u, 0.36);
            const gb = threeD ? u.clone().addScaledVector(p.clone().sub(centre).normalize(), 0.4).normalize() : u.clone().applyAxisAngle(Z, o.turn * ch.side).normalize();
            const c1 = o6.clone().addScaledVector(gb, 0.36);
            pending.push({ c6, o6, c1 });
            queue.push({ c1, g: gb, side: o.sideOf(ch.depth + 1, k++), depth: ch.depth + 1, len: o.lenOf(ch.depth + 1) });
          }
        }
        if (prev) prev.tip = true; // a non-reducing end
      }
      return residues[first]!;
    };

    // amylopectin: main chain along the bottom (reducing end at the right), branches every 5 residues,
    // turning to run roughly parallel (upwards), as in the clusters of amylopectin
    const AP = new THREE.Vector3(8.6, 5.2, 0);
    const apReducing = tree(
      { c1: AP.clone().add(new THREE.Vector3(5.8, -3.4, 0)), g: new THREE.Vector3(-1, 0, 0), side: 1, depth: 0, len: 8 },
      {
        every: 5, firstAt: 1, maxDepth: 2, turn: -0.5, lenOf: (d) => (d === 1 ? 6 : 4), sideOf: () => -1, pull: (_p, g) => g.clone().lerp(UPV, 0.35),
        inside: (p) => Math.abs(p.x - AP.x) < 6.6 && p.y - AP.y < 4.4,
      },
      AP,
    );
    // glycogen: chains branch every 2 residues (two branches per inner chain) and grow outwards in all
    // directions from a central reducing end, giving a compact, roughly spherical molecule with many ends
    const GL = new THREE.Vector3(-10, -6.2, 0);
    tree(
      { c1: GL.clone().add(new THREE.Vector3(0.3, 0, 0)), g: new THREE.Vector3(-1, 0.15, 0.1), side: 1, depth: 0, len: 4 },
      {
        every: 2, firstAt: 0, maxDepth: 8, turn: 0, lenOf: () => 6, sideOf: () => 1, pull: (p, g) => g.clone().lerp(p.clone().sub(GL).normalize(), 0.2),
        inside: (p) => p.distanceTo(GL) < 7,
      },
      GL,
      true,
    );
    // keep only the 1,6 links whose branch residue was actually placed
    const links16 = pending.filter((b) => residues.some((r) => vtx(r, 0).distanceTo(b.c1) < 0.05));

    // ---------- cellulose: parallel straight β-1,4 chains, alternate residues inverted ----------
    const CE = new THREE.Vector3(8.6, -5.6, 0);
    const chains = 4, perChain = 7, gapY = 2.15;
    const cel: Residue[][] = [];
    for (const layer of [0, 1]) {
      for (let c = 0; c < chains; c++) {
        const row: Residue[] = [];
        for (let i = 0; i < perChain; i++) {
          const p = CE.clone().add(new THREE.Vector3((i - (perChain - 1) / 2) * STEP + layer * STEP * 0.5, (c - (chains - 1) / 2) * gapY + layer * 0.35, -layer * 1.5));
          const flip = i % 2 === 0 ? 1 : -1; // every other residue is rotated 180° about the chain axis
          const r: Residue = { p, e1: new THREE.Vector3(1, 0, 0), e2: new THREE.Vector3(0, flip, 0), beta: true, tip: false };
          residues.push(r);
          // β-1,4: C1 of the residue on the left joins C4 of the residue on the right (reducing end at the right)
          if (i > 0) links14.push([vtx(r, 180), vtx(row[i - 1]!, 0)]);
          row.push(r);
        }
        cel.push(row);
      }
    }
    // hydrogen bonds between neighbouring chains in the front layer: O6–H of one chain to O3 of the next
    for (let c = 0; c < chains; c++) {
      for (let i = 0; i < perChain; i++) {
        const r = cel[c]![i]!;
        const up = r.e2.y > 0;
        const nb = cel[c + (up ? 1 : -1)];
        if (!nb) continue;
        const target = nb[i]!;
        // C3 (240°) of the neighbouring residue faces this chain when that residue points the same way
        const tDeg = (target.e2.y > 0) === up ? 240 : 300;
        hbonds.push([vtx(r, 120, R + 0.62), vtx(target, tDeg, R + 0.05)]);
      }
    }

    // ---------- meshes ----------
    const tileGeo = ctx.track(new THREE.CylinderGeometry(R, R, 0.2, 6));
    const beadGeo = ctx.track(new THREE.SphereGeometry(0.15, 10, 8));
    const c6Geo = ctx.track(new THREE.SphereGeometry(0.17, 10, 8));
    const rodGeo = ctx.track(new THREE.CylinderGeometry(1, 1, 1, 6, 1));
    const mesh = (geo: THREE.BufferGeometry, key: PaletteKey, n: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
      const m = new THREE.InstancedMesh(geo, ctx.material(key, { roughness: 0.5, ...opts }), Math.max(1, n));
      m.count = 0;
      root.add(m);
      return m;
    };
    const tilesA = mesh(tileGeo, 'glucose', residues.length);
    const tilesTip = mesh(tileGeo, 'glucose', residues.length);
    const tilesB = mesh(tileGeo, 'carb', residues.length);
    const ringO = mesh(beadGeo, 'k', residues.length, { roughness: 0.35 });
    const c6 = mesh(c6Geo, 'text', residues.length);
    const stubs = mesh(rodGeo, 'text', residues.length);
    const l14 = mesh(rodGeo, 'neutral', links14.length * 2);
    const o14 = mesh(beadGeo, 'k', links14.length, { roughness: 0.35 });
    const l16 = mesh(rodGeo, 'protein', links16.length * 2, { roughness: 0.4 });
    const o16 = mesh(beadGeo, 'k', links16.length, { roughness: 0.35 });
    const hb = mesh(rodGeo, 'water', hbonds.length * 4);

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const put = (m: THREE.InstancedMesh, p: THREE.Vector3) => { m4.makeTranslation(p.x, p.y, p.z); m.setMatrixAt(m.count++, m4); };
    const rod = (m: THREE.InstancedMesh, a: THREE.Vector3, b: THREE.Vector3, r: number) => {
      const d = b.clone().sub(a);
      q.setFromUnitVectors(UPV, d.clone().normalize());
      s.set(r, Math.max(1e-4, d.length()), r);
      m4.compose(a.clone().add(b).multiplyScalar(0.5), q, s);
      m.setMatrixAt(m.count++, m4);
    };
    for (const r of residues) {
      // cylinder: local y → ring normal, local z → e1 (so a vertex, C1, points along e1)
      const n = new THREE.Vector3().crossVectors(r.e1, r.e2).normalize();
      const x = new THREE.Vector3().crossVectors(n, r.e1).normalize();
      const target = r.beta ? tilesB : r.tip ? tilesTip : tilesA;
      target.setMatrixAt(target.count++, new THREE.Matrix4().makeBasis(x, n, r.e1).setPosition(r.p));
      put(ringO, vtx(r, 60, R * 0.98));
      const c6p = vtx(r, 120, R + 0.42);
      rod(stubs, vtx(r, 120, R), c6p, 0.07);
      put(c6, c6p);
    }
    for (const [a, b] of links14) {
      const mid = a.clone().lerp(b, 0.5);
      rod(l14, a, mid, 0.07);
      rod(l14, mid, b, 0.07);
      put(o14, mid);
    }
    for (const { c6: c, o6, c1 } of links16) {
      // C6 (the stub end) – O – C1 of the branch's first residue
      rod(l16, c, o6, 0.08);
      rod(l16, o6, c1, 0.08);
      put(o16, o6);
    }
    for (const [a, b] of hbonds) {
      const d = b.clone().sub(a);
      const seg = d.length() / 7;
      d.normalize();
      for (let k = 0; k < 4; k++) rod(hb, a.clone().addScaledVector(d, 2 * k * seg), a.clone().addScaledVector(d, (2 * k + 1) * seg), 0.05);
    }
    for (const m of [tilesA, tilesTip, tilesB, ringO, c6, stubs, l14, o14, l16, o16, hb]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }

    // ---------- anchors ----------
    // Every anchor sits on a tile or link of its own structure (never in the empty space beside it), so the
    // chip or phone marker points at the right molecule.
    const alpha = residues.filter((r) => !r.beta);
    const nearest = <T,>(list: T[], pos: (x: T) => THREE.Vector3, want: THREE.Vector3) =>
      list.slice().sort((a, b) => pos(a).distanceToSquared(want) - pos(b).distanceToSquared(want))[0]!;
    const resNear = (want: THREE.Vector3, panel: THREE.Vector3, within: number) => nearest(alpha.filter((r) => r.p.distanceTo(panel) < within), (r) => r.p, want).p;
    const inPanel = (v: THREE.Vector3, panel: THREE.Vector3) => Math.abs(v.x - panel.x) < 7.5 && Math.abs(v.y - panel.y) < 5.5;
    const glTip = residues.filter((r) => r.tip && !r.beta && r.p.distanceTo(GL) < 8).sort((a, b) => a.p.x - b.p.x)[0]!;
    const link16 = links16.filter((l) => inPanel(l.c6, AP)).sort((a, b) => a.c6.x - b.c6.x)[0] ?? links16[0]!;
    // a 1,4 link in the middle of amylopectin's main chain (the bottom row of its panel), clear of the 1,6 branch points
    const mainY = AP.y - 3.4;
    const link14 = nearest(
      links14.filter(([a, b]) => inPanel(a, AP) && Math.abs(a.y - mainY) < 0.2 && Math.abs(b.y - mainY) < 0.2 && a.z === 0 && b.z === 0),
      ([a, b]) => a.clone().lerp(b, 0.5),
      AP.clone().add(new THREE.Vector3(0, -3.4, 0)),
    );
    const hbLeft = hbonds.filter(([a]) => a.z > -0.5).sort((a, b) => a[0].x - b[0].x || a[0].y - b[0].y)[1] ?? hbonds[0]!;
    const front = (c: number, i: number) => cel[c]![i]!.p; // front-layer cellulose tile (chains 0…3, bottom to top)
    const at = (name: string, p: THREE.Vector3, dz = 0.3) => anchorAt(root, p.x, p.y, p.z + dz, name);
    // amylose: the front-facing tile nearest the left end of the helix
    const amyFront = residues.slice(0, nAmy).filter((r) => r.p.z > 1).sort((a, b) => a.p.x - b.p.x)[0]!.p;
    const anchors = {
      amylose: { object: at('amylose', amyFront), highlight: [tilesA] },
      amylopectin: { object: at('amylopectin', resNear(AP.clone().add(new THREE.Vector3(-2, 0, 0)), AP, 8)), highlight: [tilesA, tilesTip] },
      glycogen: { object: at('glycogen', resNear(GL.clone().add(new THREE.Vector3(-1, 3.5, 3)), GL, 8)), highlight: [tilesA, tilesTip] },
      cellulose: { object: at('cellulose', front(chains - 1, 0)), highlight: [tilesB] },
      'alpha-residue': { object: at('alpha-residue', resNear(AP.clone().add(new THREE.Vector3(3.6, -3.4, 0)), AP, 8)), highlight: [tilesA, tilesTip] },
      'beta-residue': { object: at('beta-residue', front(0, 2)), highlight: [tilesB] },
      'link-14': { object: at('link-14', link14[0].clone().lerp(link14[1], 0.5)), highlight: [l14, o14] },
      'link-16': { object: at('link-16', link16.o6), highlight: [l16, o16] },
      ends: { object: at('ends', glTip.p), highlight: [tilesTip] },
      hbonds: { object: at('hbonds', hbLeft[0].clone().lerp(hbLeft[1], 0.5)), highlight: [hb] },
      // the middle of the bundle: a front tile in the centre of the stack, with the second layer showing behind it
      microfibril: { object: at('microfibril', front(2, Math.floor(perChain / 2))), highlight: [tilesB, hb] },
    };
    void apReducing;
    return { anchors, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
