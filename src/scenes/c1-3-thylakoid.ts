import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';

/*
 * C1.3 light-dependent reactions in a patch of thylakoid membrane (AHL).
 * The stroma is ABOVE the membrane (+y) and the thylakoid space (lumen) is BELOW it (−y).
 * The membrane is cut along its front edge so the components embedded in it can be seen.
 * Left to right: light-harvesting complex II + photosystem II (with the water-splitting site on its lumen
 * side), plastoquinone (mobile, in the membrane), cytochrome complex, plastocyanin (mobile, in the lumen),
 * photosystem I + light-harvesting complex I, ferredoxin and NADP reductase (stroma side), ATP synthase
 * (head in the stroma).
 * Steps: 0 light → PSII; 1 photolysis; 2 electron transport + H⁺ pumping; 3 light → PSI; 4 NADP reduced;
 *        5 ATP synthase (chemiosmosis); 6 cyclic photophosphorylation.
 * Electron bookkeeping: 2 H₂O → O₂ + 4H⁺ + 4e⁻; 4 e⁻ reduce 2 NADP (each NADP takes 2 e⁻ + 1 H⁺ from the stroma).
 */
const ZP = 0.5; // centre plane of the proteins (the membrane's cut edge is near z = 0.3)
const HEAD = 1.0;
const X = { lhc2: -8.25, ps2: -6.45, pq: -4.6, cyt: -3.0, pc: -1.4, ps1: 0.95, lhc1: 2.75, fd: 2.15, fnr: 4.15, atp: 7.2 };
const P680 = new THREE.Vector3(X.ps2, 0.2, ZP + 1.2);
const P700 = new THREE.Vector3(X.ps1, 0.2, ZP + 1.2);
const OEC = new THREE.Vector3(X.ps2, -1.75, ZP + 0.7);
const FNR_SITE = new THREE.Vector3(X.fnr, 2.55, ZP + 0.9);
const ATP_HEAD = new THREE.Vector3(X.atp, 3.05, ZP + 1.25);
const CAP = 48;

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (path: V[], u: number, out: V) => {
  if (path.length === 1) return out.copy(path[0]!);
  const k = Math.max(0, Math.min(0.9999, u)) * (path.length - 1);
  const i = Math.floor(k);
  return out.copy(path[i]!).lerp(path[i + 1]!, k - i);
};

type Kind = 'e' | 'h' | 'water' | 'o2' | 'nadp' | 'nadph' | 'adp' | 'pi' | 'atp' | 'photon' | 'glow';
interface P { k: Kind; p: V[]; t0?: number; t1?: number; on?: [number, number]; jig?: boolean }

const scene: SceneModule = {
  camera: { position: [0, 5.5, 20], target: [0, -0.2, -0.6], fov: 40, minDistance: 8, maxDistance: 40 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(31);

    // ---------- materials ----------
    const glowing: THREE.MeshStandardMaterial[] = [];
    const glow = (m: THREE.MeshStandardMaterial, k = 0.6) => { glowing.push(m); m.emissiveIntensity = k; return m; };
    const fadeable = (key: Parameters<typeof ctx.material>[0], o: THREE.MeshStandardMaterialParameters = {}) => ctx.material(key, { roughness: 0.5, transparent: true, ...o });
    const mHead = ctx.material('head', { roughness: 0.5 });
    const mTail = ctx.material('tail', { roughness: 0.75 });
    const mLhc = fadeable('neutral', { roughness: 0.6 });
    const mPs2 = fadeable('protein');
    const mPs1 = fadeable('protein');
    const mCyt = fadeable('protein2');
    const mFnr = fadeable('protein2');
    const mCarrier = ctx.material('chol', { roughness: 0.45 });
    const mPq = ctx.material('glucose', { roughness: 0.4 });
    const mOec = ctx.material('text', { roughness: 0.5, metalness: 0.3 });
    const mChl = fadeable('carb', { roughness: 0.4 });
    const mCar = fadeable('head', { roughness: 0.4 });
    const mRc2 = glow(fadeable('glucose', { roughness: 0.3 }), 0.15);
    const mRc1 = glow(ctx.material('glucose', { roughness: 0.3 }), 0.15);
    const mAtpA = ctx.material('protein', { roughness: 0.5 });
    const mAtpB = ctx.material('protein2', { roughness: 0.5 });

    // ---------- membrane: a bilayer slab behind the proteins ----------
    const footprints: [number, number][] = [[X.lhc2, 1.0], [X.ps2, 1.3], [X.cyt, 1.35], [X.ps1, 1.3], [X.lhc1, 0.95], [X.atp, 1.1]];
    const slots: { x: number; z: number; s: 1 | -1 }[] = [];
    for (const s of [1, -1] as const)
      for (let x = -9.3; x <= 9.31; x += 0.62)
        for (let z = -3; z <= 0.31; z += 0.62) {
          if (footprints.some(([px, r]) => Math.hypot(x - px, z - ZP) < r)) continue;
          slots.push({ x: x + (rand() - 0.5) * 0.1, z: z + (rand() - 0.5) * 0.1, s });
        }
    const heads = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.28, 10, 8)), mHead, slots.length);
    const tails = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 5)), mTail, slots.length * 2);
    slots.forEach((p, i) => {
      setInstance(heads, i, v(p.x, p.s * HEAD, p.z));
      const yT = p.s * (HEAD - 0.5);
      setInstance(tails, 2 * i, v(p.x - 0.09, yT, p.z));
      setInstance(tails, 2 * i + 1, v(p.x + 0.09, yT, p.z));
    });
    const membrane = new THREE.Group();
    membrane.add(heads, tails);
    root.add(membrane);

    // ---------- protein complexes ----------
    const blob = (mat: THREE.Material, x: number, y: number, z: number, r: number, h: number, seed: number) => {
      const m = new THREE.Mesh(ctx.track(blobGeometry(r, h, seed, 0.08, 18)), mat);
      m.position.set(x, y, z);
      return m;
    };
    const lhc2 = blob(mLhc, X.lhc2, 0, ZP, 0.85, 2.5, 3);
    const ps2 = new THREE.Group();
    ps2.add(blob(mPs2, X.ps2, 0, ZP, 1.15, 3.1, 5));
    const oec = new THREE.Group();
    const cube = ctx.track(new THREE.BoxGeometry(0.2, 0.2, 0.2));
    [[0, 0, 0], [0.22, 0.06, 0.05], [-0.2, 0.08, 0.02], [0.03, -0.18, 0.06], [0.05, 0.2, -0.04]].forEach(([dx, dy, dz]) => {
      const c = new THREE.Mesh(cube, mOec);
      c.position.set(OEC.x + dx!, OEC.y + dy!, OEC.z + dz!);
      c.rotation.set(dx! * 3, dy! * 3, 0.4);
      oec.add(c);
    });
    ps2.add(oec);
    const cyt = new THREE.Group();
    cyt.add(blob(mCyt, X.cyt - 0.42, 0, ZP, 0.75, 3.3, 7), blob(mCyt, X.cyt + 0.42, 0.05, ZP + 0.1, 0.75, 3.2, 8));
    const ps1 = blob(mPs1, X.ps1, 0, ZP, 1.15, 3.1, 9);
    const lhc1 = blob(mLhc, X.lhc1, 0, ZP, 0.8, 2.3, 11);
    const fd = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.36, 16, 12)), mCarrier);
    fd.position.set(X.fd, 2.0, ZP + 0.85);
    const fnr = blob(mFnr, X.fnr, 1.75, ZP + 0.3, 0.7, 1.5, 13);
    fnr.rotation.z = Math.PI / 2;
    const pq = new THREE.Mesh(ctx.track(new THREE.CapsuleGeometry(0.2, 0.55, 6, 12)), mPq);
    pq.rotation.z = Math.PI / 2;
    const pc = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.4, 16, 12)), mCarrier);
    root.add(lhc2, ps2, cyt, ps1, lhc1, fd, fnr, pq, pc);

    // ATP synthase: c-ring rotor in the membrane, central stalk, head (3 α + 3 β) in the stroma, peripheral stalk
    const atps = new THREE.Group();
    const rotor = new THREE.Group();
    rotor.position.set(X.atp, 0, ZP);
    const cSub = ctx.track(new THREE.CylinderGeometry(0.17, 0.17, 2.0, 8));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = new THREE.Mesh(cSub, i % 2 ? mAtpA : mAtpB);
      c.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
      rotor.add(c);
    }
    const stalk = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.2, 0.2, 2.3, 10)), mAtpB);
    stalk.position.y = 1.9;
    rotor.add(stalk);
    const headG = new THREE.Group();
    const sub = ctx.track(new THREE.SphereGeometry(0.55, 18, 12));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = new THREE.Mesh(sub, i % 2 ? mAtpA : mAtpB);
      s.position.set(X.atp + Math.cos(a) * 0.62, 3.25, ZP + Math.sin(a) * 0.62);
      headG.add(s);
    }
    const stator = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 6)), mAtpA);
    stator.position.set(X.atp + 1.25, 1.35, ZP - 0.4);
    const statorBase = new THREE.Mesh(ctx.track(blobGeometry(0.35, 2.0, 21, 0.05, 12)), mAtpA);
    statorBase.position.set(X.atp + 1.0, 0, ZP - 0.3);
    atps.add(rotor, headG, stator, statorBase);
    root.add(atps);

    // ---------- pigment arrays on the front faces of the photosystems ----------
    const pigGeo = ctx.track(new THREE.SphereGeometry(0.13, 10, 8));
    const arr2: V[] = [], arr1: V[] = [];
    const face = (out: V[], cx: number, zf: number, cols: number[], rows: number[]) => { for (const y of rows) for (const dx of cols) out.push(v(cx + dx, y, zf)); };
    face(arr2, X.lhc2, ZP + 0.92, [-0.4, 0, 0.4], [-0.8, -0.4, 0, 0.4, 0.8]);
    face(arr2, X.ps2, ZP + 1.22, [-0.62, 0.62], [-0.65, -0.2, 0.25, 0.7]);
    arr2.push(v(X.ps2, -0.45, ZP + 1.24), v(X.ps2, 0.75, ZP + 1.22));
    face(arr1, X.lhc1, ZP + 0.88, [-0.38, 0.02, 0.4], [-0.75, -0.3, 0.15, 0.6]);
    face(arr1, X.ps1, ZP + 1.22, [-0.62, 0.62], [-0.65, -0.2, 0.25, 0.7]);
    arr1.push(v(X.ps1, -0.45, ZP + 1.24), v(X.ps1, 0.75, ZP + 1.22));
    const pigs = [...arr2.map((p) => ({ p, ps: 2 })), ...arr1.map((p) => ({ p, ps: 1 }))];
    const isCar = (i: number) => i % 4 === 3;
    const chl = new THREE.InstancedMesh(pigGeo, mChl, pigs.length);
    const car = new THREE.InstancedMesh(pigGeo, mCar, pigs.length);
    let nc = 0, nk = 0;
    pigs.forEach(({ p }, i) => (isCar(i) ? setInstance(car, nk++, p) : setInstance(chl, nc++, p)));
    chl.count = nc; car.count = nk;
    const rcGeo = ctx.track(new THREE.SphereGeometry(0.22, 16, 12));
    const rc2 = new THREE.Mesh(rcGeo, mRc2); rc2.position.copy(P680);
    const rc1 = new THREE.Mesh(rcGeo, mRc1); rc1.position.copy(P700);
    root.add(chl, car, rc2, rc1);

    // ---------- particles ----------
    const geo: Record<Kind, THREE.BufferGeometry> = {
      e: ctx.track(new THREE.SphereGeometry(0.21, 12, 10)),
      h: ctx.track(new THREE.SphereGeometry(0.15, 10, 8)),
      water: ctx.track(new THREE.SphereGeometry(0.24, 12, 8)),
      o2: ctx.track(new THREE.CapsuleGeometry(0.17, 0.28, 4, 10).rotateZ(Math.PI / 2)),
      nadp: ctx.track(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10).rotateZ(Math.PI / 2)),
      nadph: ctx.track(new THREE.CapsuleGeometry(0.25, 0.6, 4, 10).rotateZ(Math.PI / 2)),
      adp: ctx.track(new THREE.IcosahedronGeometry(0.25, 0)),
      pi: ctx.track(new THREE.SphereGeometry(0.14, 8, 6)),
      atp: ctx.track(new THREE.IcosahedronGeometry(0.34, 0)),
      photon: ctx.track(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8)),
      glow: ctx.track(new THREE.SphereGeometry(0.2, 12, 8)),
    };
    const mat: Record<Kind, THREE.MeshStandardMaterial> = {
      e: glow(ctx.material('na', { roughness: 0.3 }), 0.75),
      h: ctx.material('k', { roughness: 0.4 }),
      water: ctx.material('water', { roughness: 0.3 }),
      o2: ctx.material('neutral', { roughness: 0.4 }),
      nadp: ctx.material('protein2', { roughness: 0.4 }),
      nadph: glow(ctx.material('glucose', { roughness: 0.35 }), 0.25),
      adp: ctx.material('head', { roughness: 0.4 }),
      pi: ctx.material('tail', { roughness: 0.4 }),
      atp: glow(ctx.material('head', { roughness: 0.3 }), 0.3),
      photon: glow(ctx.material('tail', { roughness: 0.2 }), 0.9),
      glow: glow(ctx.material('glucose', { roughness: 0.2, transparent: true, opacity: 0.85 }), 1.2),
    };
    const meshes = {} as Record<Kind, THREE.InstancedMesh>;
    for (const k of Object.keys(geo) as Kind[]) {
      meshes[k] = new THREE.InstancedMesh(geo[k], mat[k], CAP);
      meshes[k].count = 0;
      root.add(meshes[k]);
    }

    // fixed places
    const lumenPts = Array.from({ length: 30 }, () => v(-8.6 + rand() * 17.2, -2.4 - rand() * 1.8, -1.6 + rand() * 3.6));
    // only a few free H⁺ are drawn in the stroma: once pumping starts the lumen always holds far more
    const stromaPts = Array.from({ length: 6 }, () => v(-8.4 + rand() * 12.5, 2.6 + rand() * 1.9, -1.6 + rand() * 2.4)).slice(0, 4);
    const E_EXIT = [v(-5.15, -0.5, 1.8), v(-4.7, -0.5, 1.8), v(-5.15, -0.95, 1.8), v(-4.7, -0.95, 1.8)];
    const PS1_WAIT = [v(0.55, -0.6, 1.95), v(1.35, -0.6, 1.95), v(0.55, -1.0, 1.85), v(1.35, -1.0, 1.85)];
    const FD_WAIT = [v(1.75, 2.45, 1.75), v(2.55, 2.45, 1.75), v(1.85, 2.85, 1.55), v(2.5, 2.85, 1.55)];
    const PQ_A = v(-5.05, 0, ZP + 1.0), PQ_B = v(-3.85, 0, ZP + 1.0);
    const PC_A = v(-2.25, -1.85, ZP + 0.9), PC_B = v(-0.55, -1.85, ZP + 0.9);
    const ETC = (start: V, end: V) => [start, v(-4.85, 0.05, 1.65), v(-3.75, 0.0, 1.7), v(-3.0, -0.9, 1.9), v(-2.1, -1.75, 1.55), v(-0.55, -1.55, 1.6), end];

    const statics = (k: Kind, pts: V[]): P[] => pts.map((p) => ({ k, p: [p], jig: true }));
    /** One light-harvesting event: photon → pigment, energy hops through the array to the reaction centre, an electron leaves. */
    const harvest = (s: number, arr: V[], rcPos: V, from: number, eStart: V, eEnd: V[]): P[] => {
      const target = arr[from]!;
      const hops = [target, arr[(from + 5) % arr.length]!, arr[arr.length - 1]!, rcPos];
      return [
        { k: 'photon', p: [v(target.x - 1.6, 6.2, target.z + 2.2), target], t0: s, t1: s + 0.07, on: [s, s + 0.075] },
        { k: 'glow', p: hops, t0: s + 0.07, t1: s + 0.14, on: [s + 0.07, s + 0.145] },
        { k: 'e', p: [eStart, ...eEnd], t0: s + 0.145, t1: s + 0.21, on: [s + 0.14, 1] },
      ];
    };

    const lum = (a: number, b: number) => lumenPts.slice(a, b);
    const steps: P[][] = [
      // 0 · light absorbed by PSII: four photons, four electrons emitted from P680
      [
        ...statics('h', lum(0, 5)), ...statics('h', stromaPts),
        ...[0, 1, 2, 3].flatMap((c) => harvest(0.04 + c * 0.23, arr2, P680, [0, 9, 4, 13][c]!, P680, [E_EXIT[c]!])),
      ],
      // 1 · photolysis at the water-splitting site on the lumen side of PSII
      [
        ...statics('h', lum(0, 5)), ...statics('h', stromaPts), ...statics('e', E_EXIT),
        { k: 'water', p: [v(-7.9, -3.4, 1.9), v(OEC.x - 0.2, OEC.y - 0.25, OEC.z + 0.3)], t0: 0, t1: 0.35, on: [0, 0.4] },
        { k: 'water', p: [v(-5.2, -3.6, 2.1), v(OEC.x + 0.25, OEC.y - 0.25, OEC.z + 0.3)], t0: 0.04, t1: 0.36, on: [0, 0.4] },
        { k: 'o2', p: [OEC, v(-5.6, -2.7, 2.2), v(-4.6, -3.7, 2.0)], t0: 0.42, t1: 1, on: [0.4, 1] },
        ...lum(5, 9).map((p, i): P => ({ k: 'h', p: [OEC, v(OEC.x + 0.4 * (i - 1.5), OEC.y - 0.6, OEC.z + 0.3), p], t0: 0.42 + i * 0.04, t1: 0.85 + i * 0.03, on: [0.4, 1] })),
        ...[0, 1, 2, 3].map((i): P => ({ k: 'e', p: [v(OEC.x + 0.15 * (i - 1.5), OEC.y, OEC.z + 0.4), v(P680.x + 0.12 * (i - 1.5), P680.y - 0.15, P680.z + 0.1)], t0: 0.42 + i * 0.05, t1: 0.66 + i * 0.05, on: [0.4, 0.74 + i * 0.05] })),
      ],
      // 2 · electron transport chain: PSII → plastoquinone → cytochrome complex → plastocyanin → PSI; H⁺ pumped
      [
        ...statics('h', lum(0, 9)), ...statics('h', stromaPts),
        ...[0, 1, 2, 3].map((i): P => ({ k: 'e', p: ETC(E_EXIT[i]!, PS1_WAIT[i]!), t0: 0.04 + i * 0.07, t1: 0.7 + i * 0.07 })),
        ...lum(9, 17).map((p, i): P => ({ k: 'h', p: [v(-5.2 + i * 0.3, 3.6 + (i % 2) * 0.5, 1.6), v(-4.4 + i * 0.1, 1.2, 1.6), v(-3.0, 0, 1.75), v(-3.0, -1.5, 1.8), p], t0: 0.12 + i * 0.06, t1: 0.6 + i * 0.05 })),
      ],
      // 3 · light absorbed by PSI: electrons re-excited at P700 and passed to ferredoxin
      [
        ...statics('h', lum(0, 17)), ...statics('h', stromaPts),
        ...[0, 1, 2, 3].flatMap((c) => harvest(0.04 + c * 0.23, arr1, P700, [0, 9, 4, 13][c]!, PS1_WAIT[c]!, [P700, v(1.7, 1.5, 1.9), FD_WAIT[c]!]).map((p) => (p.k === 'e' ? { ...p, on: [0, 1] as [number, number] } : p))),
      ],
      // 4 · NADP reductase: NADP + 2e⁻ + H⁺ → reduced NADP, in the stroma
      [
        ...statics('h', lum(0, 17)), ...statics('h', stromaPts),
        ...[0, 1, 2, 3].map((i): P => ({ k: 'e', p: [FD_WAIT[i]!, v(3.2, 2.4, 1.8), v(FNR_SITE.x + 0.15 * (i - 1.5), FNR_SITE.y, FNR_SITE.z + 0.3)], t0: 0.15 + i * 0.05, t1: 0.5, on: [0, 0.56] })),
        { k: 'nadp', p: [v(5.6, 4.6, 1.4), v(FNR_SITE.x - 0.35, FNR_SITE.y + 0.25, FNR_SITE.z + 0.2)], t0: 0, t1: 0.42, on: [0, 0.56] },
        { k: 'nadp', p: [v(3.0, 4.7, 1.9), v(FNR_SITE.x + 0.35, FNR_SITE.y + 0.55, FNR_SITE.z + 0.2)], t0: 0.05, t1: 0.45, on: [0, 0.56] },
        { k: 'h', p: [v(5.9, 3.7, 1.0), FNR_SITE], t0: 0.2, t1: 0.52, on: [0, 0.56] },
        { k: 'h', p: [v(2.4, 3.9, 1.2), FNR_SITE], t0: 0.25, t1: 0.53, on: [0, 0.56] },
        { k: 'nadph', p: [FNR_SITE, v(3.0, 4.2, 1.9)], t0: 0.58, t1: 0.95, on: [0.56, 1] },
        { k: 'nadph', p: [FNR_SITE, v(5.4, 4.3, 1.6)], t0: 0.6, t1: 0.98, on: [0.56, 1] },
      ],
      // 5 · chemiosmosis: H⁺ diffuse from the lumen back to the stroma through ATP synthase, which makes ATP
      [
        // H⁺ that reach the stroma fade into it (the stroma is large and H⁺ there is used or buffered),
        // so the end state still shows far more H⁺ in the lumen than in the stroma
        ...statics('h', lum(0, 11)), ...statics('h', stromaPts),
        ...lum(11, 17).map((p, i): P => ({ k: 'h', p: [p, v(X.atp - 0.45, -1.7, ZP + 1.0), v(X.atp - 0.75, -0.5, ZP + 0.75), v(X.atp - 0.75, 0.6, ZP + 0.75), v(X.atp - 1.0, 1.8, ZP + 1.1), v(5.4 + (i % 3) * 0.5, 2.6 + (i % 2) * 0.9, 1.6)], t0: 0.04 + i * 0.1, t1: 0.42 + i * 0.1, on: [0, 0.48 + i * 0.1] })),
        { k: 'adp', p: [v(8.3, 4.4, 1.2), ATP_HEAD], t0: 0, t1: 0.35, on: [0, 0.5] },
        { k: 'pi', p: [v(8.3, 4.9, 1.6), v(ATP_HEAD.x + 0.25, ATP_HEAD.y + 0.2, ATP_HEAD.z)], t0: 0.03, t1: 0.36, on: [0, 0.5] },
        { k: 'adp', p: [v(5.9, 4.6, 1.3), v(ATP_HEAD.x - 0.3, ATP_HEAD.y, ATP_HEAD.z + 0.1)], t0: 0.3, t1: 0.62, on: [0, 0.78] },
        { k: 'pi', p: [v(6.2, 5.0, 1.6), v(ATP_HEAD.x - 0.1, ATP_HEAD.y + 0.25, ATP_HEAD.z + 0.1)], t0: 0.33, t1: 0.64, on: [0, 0.78] },
        { k: 'atp', p: [ATP_HEAD, v(8.2, 4.1, 1.6)], t0: 0.52, t1: 0.82, on: [0.5, 1] },
        { k: 'atp', p: [ATP_HEAD, v(6.0, 4.6, 1.8)], t0: 0.8, t1: 1, on: [0.78, 1] },
      ],
      // 6 · cyclic: electrons from PSI return via ferredoxin to the cytochrome complex; ATP made, no NADP reduced, no O₂
      [
        ...statics('h', lum(0, 11)), ...statics('h', stromaPts),
        ...[0, 1].map((i): P => ({ k: 'e', p: [FD_WAIT[i]!, v(0.2, 2.6, 2.0), v(-2.4, 1.6, 1.9), v(-3.0, 0, 1.9), v(-3.0, -0.9, 1.9), v(-2.1, -1.75, 1.55), v(-0.55, -1.55, 1.6), v(P700.x + 0.2 * (i - 0.5), P700.y - 0.25, P700.z + 0.15)], t0: 0.02 + i * 0.06, t1: 0.5 + i * 0.06, on: [0, 0.6] })),
        ...harvest(0.58, arr1, P700, 4, P700, [v(1.7, 1.5, 1.9), FD_WAIT[0]!]).map((p) => (p.k === 'e' ? { ...p, t1: 0.9 } : p)),
        { k: 'e', p: [P700, v(1.7, 1.5, 1.9), FD_WAIT[1]!], t0: 0.75, t1: 0.95, on: [0.74, 1] },
        ...lum(11, 15).map((p, i): P => ({ k: 'h', p: [v(-4.9 + i * 0.4, 3.6 + (i % 2) * 0.4, 1.6), v(-4.2, 1.2, 1.6), v(-3.0, 0, 1.75), v(-3.0, -1.5, 1.8), p], t0: 0.1 + i * 0.08, t1: 0.5 + i * 0.08 })),
        ...lum(3, 6).map((p, i): P => ({ k: 'h', p: [p, v(X.atp - 0.45, -1.7, ZP + 1.0), v(X.atp - 0.75, -0.5, ZP + 0.75), v(X.atp - 0.75, 0.6, ZP + 0.75), v(X.atp - 1.0, 1.8, ZP + 1.1), v(5.6 + i * 0.5, 2.8 + (i % 2) * 0.8, 1.6)], t0: 0.3 + i * 0.12, t1: 0.65 + i * 0.12, on: [0, 0.71 + i * 0.12] })),
        { k: 'adp', p: [v(8.3, 4.4, 1.2), ATP_HEAD], t0: 0.2, t1: 0.5, on: [0, 0.66] },
        { k: 'pi', p: [v(8.3, 4.9, 1.6), v(ATP_HEAD.x + 0.25, ATP_HEAD.y + 0.2, ATP_HEAD.z)], t0: 0.22, t1: 0.52, on: [0, 0.66] },
        { k: 'atp', p: [ATP_HEAD, v(8.2, 4.1, 1.6)], t0: 0.68, t1: 0.95, on: [0.66, 1] },
      ],
    ];
    // a background H⁺ excess in the lumen, left from light-driven pumping that runs continuously, is drawn in
    // every step, so the lumen always holds clearly more H⁺ than the stroma (also after H⁺ flow out)
    for (const st of steps) st.unshift(...statics('h', lum(17, 25)));
    // in the cyclic step the lumen H⁺ that leave through ATP synthase must not also be drawn as statics
    steps[6] = steps[6]!.filter((p, _i, all) => !(p.k === 'h' && p.jig && all.some((q) => q !== p && !q.jig && q.p[0] === p.p[0])));

    // ---------- step-dependent emphasis ----------
    const setOpacity = (mats: THREE.MeshStandardMaterial[], o: number) => mats.forEach((m) => { m.opacity = o; m.depthWrite = o > 0.9; });
    const pq0 = PQ_A.clone(), pc0 = PC_A.clone();
    const tmp = new THREE.Vector3();
    const jitter = (p: V, i: number, t: number) => tmp.set(p.x + 0.18 * Math.sin(t * 6 + i * 1.7), p.y + 0.14 * Math.cos(t * 5 + i), p.z + 0.18 * Math.sin(t * 4 + i * 0.7));

    const anchors = {
      stroma: { object: anchorAt(root, -1.6, 4.9, -1.4, 'stroma'), highlight: [] },
      lumen: { object: anchorAt(root, -1.0, -4.3, -1.4, 'lumen'), highlight: [] },
      membrane: { object: anchorAt(root, 5.5, -HEAD, 0.3, 'membrane'), highlight: [membrane] },
      antenna: { object: anchorAt(root, X.lhc2, 1.15, ZP + 0.9, 'antenna'), highlight: [lhc2, chl, car] },
      p680: { object: anchorAt(root, P680.x, P680.y, P680.z + 0.2, 'p680'), highlight: [rc2] },
      psii: { object: anchorAt(root, X.ps2 + 0.3, 1.45, ZP + 0.9, 'psii'), highlight: [ps2] },
      oec: { object: anchorAt(root, OEC.x, OEC.y - 0.2, OEC.z + 0.3, 'oec'), highlight: [oec] },
      pq: { object: anchorAt(root, X.pq, 0.25, ZP + 1.2, 'pq'), highlight: [pq] },
      cyt: { object: anchorAt(root, X.cyt, 1.6, ZP + 0.7, 'cyt'), highlight: [cyt] },
      pc: { object: anchorAt(root, X.pc, -2.25, ZP + 0.9, 'pc'), highlight: [pc] },
      psi: { object: anchorAt(root, X.ps1 - 0.3, 1.45, ZP + 0.9, 'psi'), highlight: [ps1] },
      p700: { object: anchorAt(root, P700.x, P700.y, P700.z + 0.2, 'p700'), highlight: [rc1] },
      fd: { object: anchorAt(root, X.fd, 2.3, ZP + 1.1, 'fd'), highlight: [fd] },
      fnr: { object: anchorAt(root, X.fnr + 0.3, 2.1, ZP + 0.8, 'fnr'), highlight: [fnr] },
      'atp-synthase': { object: anchorAt(root, X.atp + 0.4, 3.7, ZP + 0.6, 'atp-synthase'), highlight: [atps] },
    };

    return {
      anchors,
      durations: [8, 7, 8, 8, 6, 7, 8],
      render(index, t) {
        for (const m of glowing) m.emissive.copy(m.color);
        // emphasis: in the cyclic step PSII, its antenna and NADP reductase are not used
        const cyclic = index === 6;
        setOpacity([mPs2, mFnr, mRc2], cyclic ? 0.25 : 1);
        setOpacity([mLhc, mPs1, mCyt, mChl, mCar], 1);
        // mobile carriers
        pq.position.copy(pq0);
        pc.position.copy(pc0);
        if (index === 2 || index === 6) {
          const s = index === 2 ? 0 : 0.12;
          pq.position.lerpVectors(PQ_A, PQ_B, ease(phase(t, 0.08 + s, 0.35 + s)) - ease(phase(t, 0.6, 0.85)));
          pc.position.lerpVectors(PC_A, PC_B, ease(phase(t, 0.4 + s, 0.62 + s)) - ease(phase(t, 0.8, 0.98)));
        }
        // ATP synthase rotor turns only while H⁺ flow through it
        rotor.rotation.y = index === 5 ? t * Math.PI * 4 : index === 6 ? phase(t, 0.3, 1) * Math.PI * 2.5 : 0;
        // reaction centres flash when excitation energy arrives, and dim once the electron has left
        const flash = (list: P[]) => list.filter((p) => p.k === 'glow').reduce((m, p) => Math.max(m, 1 - Math.abs(t - p.t1!) / 0.035), 0);
        mRc2.emissiveIntensity = 0.15 + (index === 0 ? 1.4 * Math.max(0, flash(steps[0]!)) : 0);
        mRc1.emissiveIntensity = 0.15 + (index === 3 || index === 6 ? 1.4 * Math.max(0, flash(steps[index]!)) : 0);

        const counts = {} as Record<Kind, number>;
        for (const k of Object.keys(meshes) as Kind[]) counts[k] = 0;
        steps[index]!.forEach((p, n) => {
          if (p.on && !(t >= p.on[0] && (t < p.on[1] || p.on[1] >= 1))) return;
          const mesh = meshes[p.k];
          const i = counts[p.k]++;
          if (i >= CAP) return;
          const pos = p.p.length === 1 ? (p.jig ? jitter(p.p[0]!, n, t) : tmp.copy(p.p[0]!)) : at(p.p, ease(phase(t, p.t0!, p.t1!)), tmp);
          if (p.k === 'e') pos.z += 0.45; // electrons are drawn just in front of the proteins they pass through
          let rot: THREE.Euler | undefined;
          if (p.k === 'photon' && p.p.length > 1) { const d = p.p[1]!.clone().sub(p.p[0]!); rot = new THREE.Euler(0, 0, Math.atan2(-d.x, d.y)); }
          setInstance(mesh, i, pos, rot);
        });
        for (const k of Object.keys(meshes) as Kind[]) { meshes[k].count = Math.min(CAP, counts[k]); meshes[k].instanceMatrix.needsUpdate = true; }
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
