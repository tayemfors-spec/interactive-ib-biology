import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';

/*
 * C1.2 (AHL) where each stage of aerobic respiration happens, in a mitochondrion cut lengthways (z = 0 is the
 * cut face; only the back half is drawn). One crista is drawn much larger than life so that the electron
 * transport chain and ATP synthase can be seen in its membrane.
 *   0 glycolysis (cytoplasm)   1 link reaction (matrix)   2 Krebs cycle (matrix)
 *   3 electron transport chain and proton pumping (inner membrane)   4 chemiosmosis (ATP synthase)
 *   5 oxygen as the final electron acceptor
 * Topology that matters: double membrane; the crista is a fold of the INNER membrane, so the space inside it is
 * continuous with the intermembrane space; protons are pumped from the matrix into that space; the ATP
 * synthase head projects into the matrix; O₂ is reduced to water on the matrix side.
 * Molecules are bead models: gold beads are carbon atoms in the carbon skeleton, so carbon counts are right
 * (6C glucose → 2 × 3C pyruvate → 2C acetyl + CO₂; 2C + 4C oxaloacetate → 6C citrate → … → 4C).
 */
type V = THREE.Vector3;
const v = (x: number, y: number, z = 0.3) => new THREE.Vector3(x, y, z);

// mitochondrion
const RO = 3.3, LO = 6.6; // outer membrane radius, half-length
const RI = 2.75, LI = 6.0; // inner membrane (boundary) radius, half-length
// the enlarged crista: a U-shaped fold rising from the bottom of the inner membrane
const CX = 1.3, CW = 1.5, CTIP = 0.5, CDEPTH = 1.4, MEM = 0.13;
const WALL_L = CX - CW / 2, WALL_R = CX + CW / 2;
// electron carriers on the left wall of the crista, ATP synthase on the right wall
const CARRIERS = [-1.95, -0.85, 0.2];
const SYN_Y = -1.3;
const KREBS = v(-1.75, 0.75, 0.3), KR = 1.0;
const LINK_A = v(-4.55, 1.0), LINK_B = v(-4.55, -0.75);
const BEAD = 0.32;

/** Points round a stadium (capsule outline along x) in the z = 0 plane, anticlockwise from the bottom of the right-hand end. */
function stadium(L: number, R: number, n = 18): V[] {
  const s = L - R;
  const pts: V[] = [];
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; pts.push(new THREE.Vector3(s + R * Math.cos(a), R * Math.sin(a), 0)); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI; pts.push(new THREE.Vector3(-s + R * Math.cos(a), R * Math.sin(a), 0)); }
  return pts;
}

/** The inner membrane outline at the cut face, with the crista fold inserted along the bottom. */
function innerOutline(n = 18): V[] {
  const s = LI - RI;
  const pts: V[] = [];
  const P = (x: number, y: number) => pts.push(new THREE.Vector3(x, y, 0));
  P(WALL_R, -RI);
  P(s, -RI);
  for (let i = 1; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; P(s + RI * Math.cos(a), RI * Math.sin(a)); }
  for (let i = 1; i <= n; i++) { const a = Math.PI / 2 + (i / n) * Math.PI; P(-s + RI * Math.cos(a), RI * Math.sin(a)); }
  P(WALL_L, -RI);
  // up the left wall, round the tip, down the right wall
  P(WALL_L, CTIP);
  for (let i = 1; i < 10; i++) { const a = Math.PI - (i / 10) * Math.PI; P(CX + (CW / 2) * Math.cos(a), CTIP + (CW / 2) * Math.sin(a)); }
  P(WALL_R, CTIP);
  return pts;
}

const scene: SceneModule = {
  camera: { position: [-0.3, 3.6, 18.4], target: [-1.0, 1.25, 0], fov: 38, minDistance: 6, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(12);
    const DS = THREE.DoubleSide;

    // ---------- membranes ----------
    const mOuter = ctx.material('tail', { roughness: 0.6, side: DS });
    const mInner = ctx.material('chol', { roughness: 0.55, side: DS });
    const mMatrix = ctx.material('neutral', { roughness: 0.95, side: THREE.BackSide });
    const mIms = ctx.material('na', { roughness: 0.9, transparent: true, opacity: 0.22, depthWrite: false, side: DS });

    const capsule = (R: number, L: number, n = 14) => {
      const h = L - R;
      const p: THREE.Vector2[] = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); p.push(new THREE.Vector2(Math.max(1e-3, R * Math.sin(t)), -h - R * Math.cos(t))); }
      for (let i = 0; i <= n; i++) { const t = (i / n) * (Math.PI / 2); p.push(new THREE.Vector2(Math.max(1e-3, R * Math.cos(t)), h + R * Math.sin(t))); }
      return p;
    };
    const halfShell = (R: number, L: number, mat: THREE.Material) => {
      const g = new THREE.LatheGeometry(capsule(R, L), 48, Math.PI / 2, Math.PI); // z ≤ 0 half
      g.rotateZ(-Math.PI / 2); // axis along x
      return new THREE.Mesh(ctx.track(g), mat);
    };
    const tube = (pts: V[], r: number, mat: THREE.Material, closed = true) =>
      new THREE.Mesh(ctx.track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.05), pts.length * 4, r, 8, closed)), mat);

    const outer = new THREE.Group();
    outer.add(halfShell(RO, LO, mOuter), tube(stadium(LO, RO), MEM, mOuter));
    const inner = new THREE.Group();
    inner.add(halfShell(RI, LI, mInner), tube(innerOutline(), MEM, mInner));
    const matrix = halfShell(RI - 0.06, LI - 0.06, mMatrix);
    root.add(outer, inner, matrix);

    // intermembrane space at the cut face (including the inside of the crista), tinted
    const toShape = (pts: V[]) => new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, p.y)));
    const imsShape = toShape(stadium(LO, RO));
    const hole = innerOutline().map((p) => new THREE.Vector2(p.x, p.y));
    if (THREE.ShapeUtils.isClockWise(hole) === THREE.ShapeUtils.isClockWise(imsShape.getPoints())) hole.reverse();
    imsShape.holes.push(new THREE.Path(hole));
    const ims = new THREE.Mesh(ctx.track(new THREE.ShapeGeometry(imsShape, 6)), mIms);
    ims.position.z = -0.04;
    root.add(ims);

    // the crista's two walls and tip, extruded back from the cut face
    const cShape = new THREE.Shape();
    const ro = CW / 2 + MEM, ri = CW / 2 - MEM;
    cShape.moveTo(CX - ro, -RI);
    cShape.lineTo(CX - ro, CTIP);
    cShape.absarc(CX, CTIP, ro, Math.PI, 0, true);
    cShape.lineTo(CX + ro, -RI);
    cShape.lineTo(CX + ri, -RI);
    cShape.lineTo(CX + ri, CTIP);
    cShape.absarc(CX, CTIP, ri, 0, Math.PI, false);
    cShape.lineTo(CX - ri, -RI);
    cShape.closePath();
    const cGeo = ctx.track(new THREE.ExtrudeGeometry(cShape, { depth: CDEPTH, bevelEnabled: false, curveSegments: 16 }));
    cGeo.translate(0, 0, -CDEPTH);
    const crista = new THREE.Mesh(cGeo, mInner);
    root.add(crista);

    // smaller background cristae: shelves of inner membrane across the matrix (as in a real mitochondrion)
    const shelves = new THREE.Group();
    for (const [x, top, depth] of [[-3.1, false, 1.5], [0.15, true, 1.35], [3.15, true, 1.55], [4.35, true, 1.0]] as const) {
      const Rx = x > LI - RI ? Math.sqrt(RI * RI - (x - (LI - RI)) ** 2) : RI;
      const v0 = Rx - depth;
      const s = new THREE.Shape();
      s.moveTo(0, v0);
      s.lineTo(0, Rx);
      s.absarc(0, 0, Rx, Math.PI / 2, Math.PI - Math.asin(Math.max(-1, Math.min(1, v0 / Rx))), false);
      s.lineTo(0, v0);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false, curveSegments: 12 });
      g.translate(0, 0, -0.08);
      g.rotateY(-Math.PI / 2);
      if (!top) g.scale(1, -1, 1);
      g.translate(x, 0, -0.05);
      shelves.add(new THREE.Mesh(ctx.track(g), mInner));
    }
    root.add(shelves);

    // ---------- proteins ----------
    const mCarrier = ctx.material('protein', { roughness: 0.45 });
    const mSynth = ctx.material('protein2', { roughness: 0.45 });
    const mRotor = ctx.material('protein', { roughness: 0.4, metalness: 0.15 });
    const mTrans = ctx.material('protein', { roughness: 0.5 });
    const carriers = new THREE.Group();
    CARRIERS.forEach((y, i) => {
      const m = new THREE.Mesh(ctx.track(blobGeometry(0.36, 1.05, 60 + i, 0.1, 16)), mCarrier);
      m.rotation.z = Math.PI / 2;
      m.position.set(WALL_L - 0.05, y, -0.18);
      carriers.add(m);
    });
    root.add(carriers);

    // ATP synthase: c-ring rotor in the membrane + central stalk (rotate together); head (F1) in the matrix + stator
    const synth = new THREE.Group();
    synth.position.set(WALL_R, SYN_Y, -0.2);
    const rotor = new THREE.Group();
    const cSub = ctx.track(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8));
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const m = new THREE.Mesh(cSub, mRotor);
      m.rotation.z = Math.PI / 2;
      m.position.set(0, Math.cos(a) * 0.36, Math.sin(a) * 0.36);
      rotor.add(m);
    }
    const stalk = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 10)), mRotor);
    stalk.rotation.z = Math.PI / 2;
    stalk.position.x = 0.75;
    const cam = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.13, 12, 8)), mRotor); // off-centre knob shows rotation
    cam.position.set(1.0, 0.16, 0);
    rotor.add(stalk, cam);
    const head = new THREE.Group();
    const lobe = ctx.track(new THREE.SphereGeometry(0.34, 16, 12));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const m = new THREE.Mesh(lobe, mSynth);
      m.position.set(1.6, Math.cos(a) * 0.4, Math.sin(a) * 0.4);
      head.add(m);
    }
    const stator = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6)), mSynth);
    stator.rotation.z = Math.PI / 2;
    stator.position.set(0.9, -0.62, 0.15);
    const statorFoot = new THREE.Mesh(ctx.track(new THREE.BoxGeometry(0.42, 0.22, 0.3)), mSynth);
    statorFoot.position.set(0.08, -0.55, 0.15);
    head.add(stator, statorFoot);
    synth.add(rotor, head);
    root.add(synth);

    // pyruvate transport proteins in the outer and inner membranes (left end)
    const transporters = new THREE.Group();
    for (const x of [-LO, -LI]) {
      const m = new THREE.Mesh(ctx.track(blobGeometry(0.22, 0.6, x > -6.3 ? 71 : 72, 0.1, 12)), mTrans);
      m.rotation.z = Math.PI / 2;
      m.position.set(x, 0.05, -0.05);
      transporters.add(m);
    }
    root.add(transporters);

    // Krebs cycle ring (shown in the Krebs step)
    const mRing = ctx.material('glucose', { roughness: 0.5, transparent: true, opacity: 0.75 });
    const ring = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(KR, 0.07, 8, 64)), mRing);
    ring.position.copy(KREBS).setZ(0.2);
    root.add(ring);

    // ---------- small molecules, drawn from a per-frame list ----------
    type Kind = 'C' | 'P' | 'CoA' | 'NADH' | 'NAD' | 'FADH' | 'ATP' | 'ADP' | 'Hp' | 'e' | 'O' | 'H' | 'Cc';
    const capsuleGeo = (r: number, l: number) => ctx.track(new THREE.CapsuleGeometry(r, l, 4, 10));
    const defs: Record<Kind, [THREE.BufferGeometry, THREE.Material, number]> = {
      C: [ctx.track(new THREE.SphereGeometry(0.16, 14, 10)), ctx.material('glucose', { roughness: 0.35 }), 40],
      P: [ctx.track(new THREE.SphereGeometry(0.12, 10, 8)), ctx.material('head', { roughness: 0.35 }), 12],
      CoA: [ctx.track(blobGeometry(0.2, 0.55, 5, 0.12, 10)), ctx.material('text', { roughness: 0.5 }), 4],
      NADH: [capsuleGeo(0.13, 0.3), ctx.material('carb', { roughness: 0.4 }), 12],
      NAD: [capsuleGeo(0.13, 0.3), ctx.material('neutral', { roughness: 0.4 }), 12],
      FADH: [capsuleGeo(0.13, 0.3), ctx.material('chol', { roughness: 0.3, metalness: 0.2 }), 4],
      ATP: [ctx.track(new THREE.IcosahedronGeometry(0.2, 0)), ctx.material('head', { roughness: 0.3, emissive: new THREE.Color(0x6b3a00), emissiveIntensity: 0.4 }), 12],
      ADP: [ctx.track(new THREE.IcosahedronGeometry(0.15, 0)), ctx.material('head', { roughness: 0.6 }), 6],
      Hp: [ctx.track(new THREE.SphereGeometry(0.13, 10, 8)), ctx.material('na', { roughness: 0.35 }), 60],
      e: [ctx.track(new THREE.SphereGeometry(0.075, 10, 8)), ctx.material('water', { roughness: 0.2, emissive: new THREE.Color(0x2b7bd6), emissiveIntensity: 0.9 }), 8],
      O: [ctx.track(new THREE.SphereGeometry(0.13, 12, 8)), ctx.material('k', { roughness: 0.35 }), 20],
      H: [ctx.track(new THREE.SphereGeometry(0.08, 10, 8)), ctx.material('neutral', { roughness: 0.35 }), 12],
      Cc: [ctx.track(new THREE.SphereGeometry(0.13, 12, 8)), ctx.material('text', { roughness: 0.4 }), 12],
    };
    const meshes = {} as Record<Kind, THREE.InstancedMesh>;
    const used = {} as Record<Kind, number>;
    for (const k of Object.keys(defs) as Kind[]) {
      const [g, m, cap] = defs[k];
      meshes[k] = new THREE.InstancedMesh(g, m, cap);
      meshes[k].count = 0;
      root.add(meshes[k]);
    }
    const tilt = new THREE.Euler(0, 0, Math.PI / 2);
    const put = (k: Kind, p: V, scale = 1) => {
      if (scale <= 0.01) return;
      const i = used[k]++;
      if (i >= meshes[k].instanceMatrix.count) return;
      setInstance(meshes[k], i, p, k === 'NADH' || k === 'NAD' || k === 'FADH' ? tilt : undefined, scale);
    };
    /** n carbon beads in a row centred on c (optionally with a phosphate at one end). */
    const chain = (n: number, c: V, scale = 1, dir = new THREE.Vector3(1, 0, 0)) => {
      for (let i = 0; i < n; i++) put('C', c.clone().addScaledVector(dir, (i - (n - 1) / 2) * BEAD), scale);
    };
    const co2 = (c: V, scale = 1) => { put('Cc', c, scale); put('O', c.clone().add(new THREE.Vector3(-0.24, 0, 0)), scale); put('O', c.clone().add(new THREE.Vector3(0.24, 0, 0)), scale); };
    const water = (c: V) => { put('O', c); put('H', c.clone().add(new THREE.Vector3(-0.17, 0.15, 0.04))); put('H', c.clone().add(new THREE.Vector3(0.17, 0.15, 0.04))); };
    const path = (pts: V[], u: number) => {
      const k = Math.max(0, Math.min(0.9999, u)) * (pts.length - 1);
      const i = Math.floor(k);
      return pts[i]!.clone().lerp(pts[i + 1]!, k - i);
    };
    const mv = (a: V, b: V, u: number) => a.clone().lerp(b, ease(u));

    // static scatter of protons: in the intermembrane space band, in the crista space and in the matrix
    const imsH: V[] = [];
    const ring2 = stadium((LO + LI) / 2 + 0.02, (RO + RI) / 2, 40);
    for (let i = 0; i < 12; i++) { const p = ring2[Math.floor(rand() * ring2.length)]!; imsH.push(v(p.x, p.y, 0.15)); }
    const lumen = (n: number, seed: number) => {
      const r = rng(seed);
      return Array.from({ length: n }, () => v(CX + (r() - 0.5) * (CW - 0.5), -2.45 + r() * (CTIP + 2.6), 0.2 + r() * 0.2));
    };
    const lumenH = lumen(24, 3);
    const lumenBg = lumenH.slice(10); // protons already in the crista space (the gradient is maintained continuously)
    const matrixH = [v(-0.6, -2.0), v(-1.6, 1.9), v(3.9, 0.6), v(-3.4, -1.6)];

    // ---------- anchors (some move to where their molecule ends each step) ----------
    const dyn = (name: string) => anchorAt(root, 0, 0, 0, name);
    const aPyr = dyn('pyruvate'), aAcetyl = dyn('acetyl-coa'), aNadh = dyn('nadh'), aCo2 = dyn('co2'), aAtp = dyn('atp');
    const anchors = {
      outer: { object: anchorAt(root, -1.0, RO + 0.05, 0.1, 'outer'), highlight: [outer] },
      inner: { object: anchorAt(root, 4.3, -RI + 0.02, 0.15, 'inner'), highlight: [inner, crista] },
      ims: { object: anchorAt(root, 3.0, (RO + RI) / 2, 0.1, 'ims'), highlight: [ims] },
      matrix: { object: anchorAt(root, -2.8, -1.9, 0.1, 'matrix'), highlight: [matrix] },
      crista: { object: anchorAt(root, CX, CTIP + CW / 2 + 0.15, 0.1, 'crista'), highlight: [crista] },
      cytoplasm: { object: anchorAt(root, -8.2, 6.0, 0, 'cytoplasm'), highlight: [] },
      pyruvate: { object: aPyr, highlight: [meshes.C] },
      'acetyl-coa': { object: aAcetyl, highlight: [meshes.CoA, meshes.C] },
      krebs: { object: anchorAt(root, KREBS.x, KREBS.y + KR + 0.05, 0.3, 'krebs'), highlight: [ring] },
      nadh: { object: aNadh, highlight: [meshes.NADH] },
      fadh: { object: anchorAt(root, KREBS.x - KR - 0.75, KREBS.y, 0.3, 'fadh'), highlight: [meshes.FADH] },
      co2: { object: aCo2, highlight: [meshes.Cc, meshes.O] },
      atp: { object: aAtp, highlight: [meshes.ATP] },
      etc: { object: anchorAt(root, WALL_L - 0.45, CARRIERS[1]!, 0.25, 'etc'), highlight: [carriers] },
      protons: { object: anchorAt(root, CX, -0.3, 0.4, 'protons'), highlight: [meshes.Hp] },
      'atp-synthase': { object: anchorAt(root, WALL_R + 1.6, SYN_Y + 0.45, 0.1, 'atp-synthase'), highlight: [synth] },
      oxygen: { object: anchorAt(root, -0.75, 1.75, 0.3, 'oxygen'), highlight: [meshes.O] },
      water: { object: anchorAt(root, -1.05, 0.2, 0.3, 'water'), highlight: [meshes.O, meshes.H] },
    };

    // ---------- the steps ----------
    const G = v(-5.9, 5.5); // glucose in the cytoplasm (above the left end of the mitochondrion)
    const PYR = [v(-7.7, 3.4), v(-8.1, 2.6)];
    const glyTray = { nadh: [v(-8.15, 4.6), v(-3.65, 4.6)], atp: [v(-3.8, 5.6), v(-3.35, 5.6), v(-2.9, 5.6), v(-2.45, 5.6)] };
    const pyrPath = (i: number) => [PYR[i]!, v(-7.6, 0.6), v(-7.0, 0.05), v(-5.4, 0.05), i === 0 ? LINK_A : LINK_B];
    const krebsAt = (deg: number, r = KR) => KREBS.clone().add(new THREE.Vector3(Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r, 0));
    const ON_C1 = v(WALL_L - 0.55, CARRIERS[0]!), C3_SIDE = v(WALL_L - 0.6, CARRIERS[2]! + 0.1);
    const eAt = (i: number, d = 0) => v(WALL_L, CARRIERS[i]! + d, 0.3);

    const steps: ((t: number) => void)[] = [
      // 0 · glycolysis in the cytoplasm
      (t) => {
        const a = phase(t, 0, 0.25), b = phase(t, 0.25, 0.45), c = phase(t, 0.45, 0.7), d = phase(t, 0.7, 0.95);
        const triose = [mv(G.clone().add(v(-0.48, 0, 0)), v(-6.95, 4.45), b), mv(G.clone().add(v(0.48, 0, 0)), v(-5.15, 4.45), b)];
        if (b <= 0) chain(6, G);
        else if (d < 0.5) { chain(3, triose[0]!); chain(3, triose[1]!); }
        // the two ATP used phosphorylate glucose: they arrive and become phosphate groups on the ends
        const pEnds = [G.clone().add(v(-1.1, 0, 0)), G.clone().add(v(1.1, 0, 0))];
        if (a < 1) { put('ATP', mv(v(-8.1, 6.4), pEnds[0]!, a)); put('ATP', mv(v(-4.6, 6.6), pEnds[1]!, a)); }
        if (a >= 0.95 && d < 0.5) {
          put('P', b > 0 ? triose[0]!.clone().add(v(-0.6, 0, 0)) : pEnds[0]!);
          put('P', b > 0 ? triose[1]!.clone().add(v(0.6, 0, 0)) : pEnds[1]!);
        }
        // oxidation: each triose phosphate gives hydrogen to NAD → reduced NAD
        if (c > 0) { put('NADH', mv(triose[0]!, glyTray.nadh[0]!, c)); put('NADH', mv(triose[1]!, glyTray.nadh[1]!, c)); }
        // ATP formation: four ATP per glucose; the trioses become two pyruvate
        if (d > 0) {
          glyTray.atp.forEach((p, i) => put('ATP', mv(triose[i < 2 ? 0 : 1]!, p, d)));
          if (d >= 0.5) { chain(3, mv(triose[0]!, PYR[0]!, (d - 0.5) * 2)); chain(3, mv(triose[1]!, PYR[1]!, (d - 0.5) * 2)); }
        }
        aPyr.position.copy(PYR[0]!).add(v(0, 0.3, 0));
        aNadh.position.copy(glyTray.nadh[1]!).add(v(0.1, 0.2, 0));
        aAtp.position.copy(glyTray.atp[3]!).add(v(0.2, -0.1, 0));
      },
      // 1 · link reaction in the matrix (twice: one for each pyruvate)
      (t) => {
        [0, 1].forEach((i) => {
          const site = i === 0 ? LINK_A : LINK_B;
          const u = phase(t, i * 0.3, i * 0.3 + 0.6);
          const travel = phase(u, 0, 0.45), react = phase(u, 0.45, 0.85);
          const pos = path(pyrPath(i), ease(travel));
          const up = i === 0 ? 1 : -1;
          if (react <= 0) chain(3, pos);
          else {
            chain(2, site.clone().add(v(-0.15, 0, 0)));
            co2(mv(site.clone().add(v(0.32, 0, 0)), site.clone().add(v(-0.65, 0.95 * up, 0)), react)); // decarboxylation
            put('NADH', mv(site, site.clone().add(v(0.35, 0.72 * up, 0)), react)); // oxidation
            put('CoA', mv(site.clone().add(v(1.4, 0.35 * up, 0)), site.clone().add(v(0.42, 0, 0)), react));
          }
          if (react <= 0) put('CoA', site.clone().add(v(1.4, 0.35 * up, 0)));
        });
        aAcetyl.position.copy(LINK_A).add(v(0.2, 0.15, 0));
        aNadh.position.copy(LINK_A).add(v(0.45, 0.85, 0));
        aCo2.position.copy(LINK_A).add(v(-0.75, 1.1, 0));
      },
      // 2 · Krebs cycle (one turn shown; the second acetyl CoA waits for the second turn)
      (t) => {
        chain(2, LINK_B.clone().add(v(-0.15, 0, 0))); put('CoA', LINK_B.clone().add(v(0.42, 0, 0)));
        const enter = phase(t, 0, 0.15), join = phase(t, 0.15, 0.25), u = phase(t, 0.25, 0.95);
        const top = krebsAt(90);
        // acetyl CoA arrives; CoA is released to be reused
        const acetylPos = mv(LINK_A.clone().add(v(-0.15, 0, 0)), krebsAt(140), enter).lerp(top, ease(join));
        put('CoA', enter < 1 ? acetylPos.clone().add(v(0.57, 0, 0)) : mv(krebsAt(140).add(v(0.57, 0, 0)), krebsAt(155, 2.5), join));
        const ang = 90 - 360 * ease(u);
        const n = u < 0.2 ? 6 : u < 0.4 ? 5 : 4;
        if (join < 1) { chain(2, acetylPos); chain(4, top.clone().add(v(0, 0.02, 0)), 1); }
        else {
          // the carbon skeleton as an arc of beads round the cycle
          for (let i = 0; i < n; i++) put('C', krebsAt(ang + (i - (n - 1) / 2) * 16));
        }
        const out = (deg: number, at: number, kind: Kind | 'CO2', r = 1.75) => {
          if (u < at) return;
          const p = mv(krebsAt(deg), krebsAt(deg, r), phase(u, at, at + 0.08));
          if (kind === 'CO2') co2(p); else put(kind, p);
        };
        out(90 - 72, 0.2, 'CO2', 2.05); out(90 - 72 + 22, 0.2, 'NADH');
        out(90 - 144, 0.4, 'CO2', 2.05); out(90 - 144 + 22, 0.4, 'NADH');
        out(90 - 216, 0.6, 'ATP');
        out(90 - 270, 0.75, 'FADH');
        out(90 - 324, 0.9, 'NADH');
        aNadh.position.copy(krebsAt(90 - 50, 1.95));
        aCo2.position.copy(krebsAt(90 - 144, 2.35));
        aAtp.position.copy(krebsAt(90 - 216, 2.0));
        aAcetyl.position.copy(LINK_B).add(v(0.2, -0.3, 0));
      },
      // 3 · electron transport chain: reduced NAD gives electrons to the first carrier; protons pumped
      (t) => {
        const starts = [v(-1.0, -1.45), v(-1.55, -2.0), v(-0.75, -2.3)];
        starts.forEach((s, i) => {
          // the last one is still docking at the end of the step, to show where reduced NAD hands over its electrons
          const u = i === 2 ? phase(t, 0.7, 0.95) : phase(t, i * 0.1, i * 0.1 + 0.22);
          if (u < 1 || i === 2) put('NADH', mv(s, ON_C1, u));
          else put('NAD', mv(ON_C1, s.clone().add(v(-0.9, 0.35, 0)), phase(t, i * 0.1 + 0.22, i * 0.1 + 0.42)));
        });
        // two pairs of electrons pass along the chain
        [0, 1].forEach((k) => {
          const u = phase(t, 0.2 + k * 0.12, 0.8 + k * 0.12);
          const p = path([eAt(0), eAt(1), eAt(2)], ease(u));
          put('e', p.clone().add(v(0, 0.07 + k * 0.22, 0)));
          put('e', p.clone().add(v(0, -0.07 + k * 0.22, 0)));
        });
        // each carrier pumps protons from the matrix into the space inside the crista
        let pumped = 0;
        CARRIERS.forEach((y, i) => {
          [0.18, -0.18].forEach((dy, j) => {
            const u = phase(t, 0.3 + i * 0.2 + j * 0.04, 0.48 + i * 0.2 + j * 0.04);
            const dest = lumenH[4 + pumped]!;
            pumped++;
            put('Hp', path([v(WALL_L - 0.8, y + dy), v(WALL_L, y + dy), v(WALL_L + 0.35, y + dy), dest], ease(u)));
          });
        });
        lumenH.slice(0, 4).forEach((p) => put('Hp', p));
        lumenBg.forEach((p) => put('Hp', p));
        imsH.forEach((p) => put('Hp', p));
        matrixH.forEach((p) => put('Hp', p));
        aNadh.position.copy(ON_C1).add(v(-0.3, 0.25, 0));
      },
      // 4 · chemiosmosis: protons flow back through ATP synthase, which rotates and makes ATP
      (t) => {
        rotor.rotation.x = -t * Math.PI * 4;
        lumenBg.forEach((p) => put('Hp', p));
        const through = lumenH.slice(0, 10);
        through.forEach((p, i) => {
          if (i >= 5) { put('Hp', p); return; }
          const u = phase(t, 0.08 + i * 0.13, 0.3 + i * 0.13);
          const exit = v(WALL_R + 0.6 + (i % 2) * 0.45, SYN_Y - 0.75 - (i % 3) * 0.2);
          put('Hp', path([p, v(WALL_R - 0.25, SYN_Y + 0.36 * Math.cos(i)), v(WALL_R + 0.3, SYN_Y + 0.36 * Math.cos(i)), exit], ease(u)));
        });
        imsH.forEach((p) => put('Hp', p));
        matrixH.forEach((p) => put('Hp', p));
        // ADP + Pi → ATP in the head, in the matrix
        const headAt = v(WALL_R + 1.55, SYN_Y, 0.25);
        const outs = [v(4.55, 0.05), v(4.85, -0.8), v(4.55, -1.85)];
        outs.forEach((o, i) => {
          const u = phase(t, 0.1 + i * 0.25, 0.35 + i * 0.25);
          const w = phase(t, 0.35 + i * 0.25, 0.5 + i * 0.25);
          if (u < 1) { put('ADP', mv(o.clone().add(v(0.5, 0.3, 0)), headAt, u)); put('P', mv(o.clone().add(v(0.6, -0.15, 0)), headAt, u)); }
          else put('ATP', mv(headAt, o, w));
        });
        [0.07, -0.07, 0.29, 0.15].forEach((d) => put('e', eAt(2, d)));
        aAtp.position.copy(outs[1]!).add(v(0.25, 0, 0));
      },
      // 5 · oxygen accepts electrons and protons from the matrix, forming water
      (t) => {
        const arrive = phase(t, 0, 0.35), give = phase(t, 0.35, 0.55), form = phase(t, 0.55, 0.8), leave = phase(t, 0.8, 1);
        const o2 = mv(v(-1.6, 2.0), C3_SIDE, arrive);
        const w1 = mv(C3_SIDE.clone().add(v(-0.16, 0, 0)), v(-0.9, 0.85), leave);
        const w2 = mv(C3_SIDE.clone().add(v(0.16, 0, 0)), v(-0.95, -0.35), leave);
        if (form < 1) { put('O', o2.clone().add(v(-0.16, 0, 0))); put('O', o2.clone().add(v(0.16, 0, 0))); }
        // four electrons reach O₂ from the last carrier
        [0.07, -0.07, 0.29, 0.15].forEach((d, i) => { if (give < 1) put('e', mv(eAt(2, d), C3_SIDE.clone().add(v((i % 2) * 0.1, 0, 0)), give)); });
        // four protons come from the matrix
        const hs = [v(-1.1, 1.0), v(-1.4, 0.2), v(-1.0, -0.6), v(-0.4, -0.9)];
        if (form < 1) hs.forEach((h) => put('Hp', mv(h, C3_SIDE, Math.min(1, form * 1.1))));
        if (form >= 1) { water(w1); water(w2); }
        lumenH.slice(5).forEach((p) => put('Hp', p));
        imsH.forEach((p) => put('Hp', p));
        // more oxygen diffusing in from the cytoplasm
        put('O', v(-1.0, 1.75)); put('O', v(-0.68, 1.75));
      },
    ];

    return {
      anchors,
      durations: [8, 8, 10, 9, 9, 7],
      render(index, t) {
        for (const k of Object.keys(defs) as Kind[]) used[k] = 0;
        ring.visible = index === 2;
        if (index !== 4) rotor.rotation.x = 0;
        steps[index]!(t);
        for (const k of Object.keys(defs) as Kind[]) {
          meshes[k].count = Math.min(used[k], meshes[k].instanceMatrix.count);
          meshes[k].instanceMatrix.needsUpdate = true;
        }
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
