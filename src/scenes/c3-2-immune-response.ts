import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { lumpySphere, seg, spherePoints, yShape } from './c3-2-kit';

/*
 * C3.2 the antibody response, one step each (all in the plane z ≈ 0, seen from the front):
 *   0 infection          a bacterium with surface antigens arrives near a macrophage
 *   1 phagocytosis       engulfed by endocytosis into a vacuole; lysosomes fuse; digested
 *   2 presentation       antigen fragments displayed on the macrophage surface by MHC proteins
 *   3 t-activation       the one helper T-cell whose receptor fits binds and is activated
 *   4 b-activation       the B-cell that has bound the same antigen is activated by that helper T-cell
 *   5 clonal-expansion   the activated B-cell divides by mitosis (1 → 2 → 4 → 8)
 *   6 plasma-cells       most of the clone become plasma cells secreting antibodies; a few become memory cells
 *   7 antibodies-act     antibodies bind antigens: pathogens are clumped (agglutination)
 *   8 memory             infection cleared; antibodies and plasma cells decline; memory cells remain
 * Cell types are told apart by colour and shape: macrophage (large, irregular, translucent purple),
 * helper T-cells (blue, knob-shaped receptors), B-cells (green, Y-shaped receptors), plasma cells
 * (large green), memory cells (orange). Non-matching lymphocytes are drawn faded.
 */
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

const MAC = v(-8.5, 2); // macrophage centre
const MAC_R = 2.6;
const VAC = v(-8.9, 2.5); // phagocytic vacuole inside the macrophage
const P0_START = v(-12.6, 7.6);
const P0_TOUCH = v(-11.25, 5.0);
const T_R = 1.15;
const B_R = 1.25;
const T_START = v(-1.6, 6.2);
const T_AT_MAC = v(-4.15, 2.0);
const BM = v(0.4, -3.6);
const T_AT_B = v(-2.35, -1.8);
const P6_START = v(4.2, 0.6);
const P6_AT_B = v(2.25, -3.05);
// final positions of the clone of 8 cells (2 rows of 4)
const CLONE = [v(1.7, -1.2), v(4.65, -1.2), v(7.6, -1.2), v(10.55, -1.2), v(1.7, -4.7), v(4.65, -4.7), v(7.6, -4.7), v(10.55, -4.7)];
const MEMORY = new Set([3, 4]); // which clone members become memory cells
// pathogens multiplying in the tissue (upper right) and where antibodies clump them
const PATH_HOME = [v(6.3, 6.4), v(9.6, 7.6), v(11.6, 4.6), v(8.1, 3.6), v(11.4, 8.6)];
const CLUMP = [v(7.6, 5.4), v(9.2, 6.1), v(10.6, 5.1), v(8.6, 4.2), v(9.9, 7.5)];
const CLUMP_LINKS: [number, number][] = [[0, 1], [1, 2], [0, 3], [3, 2], [1, 4], [2, 4], [1, 3]];
const N_AB = 36; // free antibodies drawn
const ANTIGEN_DIRS = [v(0, 1, 0), v(0, -1, 0), v(0.6, 0.8, 0.5), v(-0.6, 0.8, 0.5), v(0.6, -0.8, 0.5), v(-0.6, -0.8, 0.5), v(0, 0.7, 1), v(0, -0.7, 1), v(0.6, 0, 1), v(-0.6, 0, 1)].map((d) => d.normalize());
// MHC proteins face right, towards the helper T-cells
const MHC_ANGLES = [-0.55, 0, 0.45, 0.9];
const mhcDir = (a: number) => v(Math.cos(a), Math.sin(a), 0.32).normalize();

const scene: SceneModule = {
  camera: { position: [0, 1.4, 31], target: [0, 0.6, 0], fov: 38, minDistance: 12, maxDistance: 60 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(32);

    // ---------- materials ----------
    const mPath = ctx.material('k', { roughness: 0.5 });
    const mAntigen = ctx.material('glucose', { roughness: 0.4 });
    const mMac = ctx.material('protein2', { roughness: 0.6, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
    const mMacNuc = ctx.material('na', { roughness: 0.5 });
    const mLyso = ctx.material('head', { roughness: 0.4 });
    const mVac = ctx.material('water', { roughness: 0.3, transparent: true, opacity: 0.5, depthWrite: false });
    const mMhc = ctx.material('neutral', { roughness: 0.5 });
    const mT = ctx.material('water', { roughness: 0.55 });
    const mTFaded = ctx.material('water', { roughness: 0.55, transparent: true, opacity: 0.45 });
    const mTR = ctx.material('neutral', { roughness: 0.5 });
    const mB = ctx.material('carb', { roughness: 0.55 });
    const mBFaded = ctx.material('carb', { roughness: 0.55, transparent: true, opacity: 0.45 });
    const mAb = ctx.material('protein', { roughness: 0.45 });
    const mMem = ctx.material('head', { roughness: 0.5 });
    const mHalo = ctx.material('glucose', { roughness: 0.3, transparent: true, opacity: 0, depthWrite: false });
    const mHaloB = ctx.material('glucose', { roughness: 0.3, transparent: true, opacity: 0, depthWrite: false });
    const mSignal = ctx.material('tail', { roughness: 0.4 });
    const mER = ctx.material('tail', { roughness: 0.5 });

    // ---------- geometry ----------
    const rodGeo = ctx.track(new THREE.CapsuleGeometry(0.42, 1.2, 6, 14));
    const knobGeo = ctx.track(new THREE.SphereGeometry(0.17, 10, 8));
    const cylGeo = ctx.track(new THREE.CylinderGeometry(0.06, 0.06, 1, 6));
    const abGeo = ctx.track(new THREE.CylinderGeometry(0.075, 0.075, 1, 6));
    const tHeadGeo = ctx.track(new THREE.SphereGeometry(0.13, 8, 6));
    const tCellGeo = ctx.track(lumpySphere(T_R, 3, 0.04, 32, 22));
    const bCellGeo = ctx.track(lumpySphere(B_R, 5, 0.04, 32, 22));
    const haloGeo = ctx.track(new THREE.SphereGeometry(1, 32, 20));
    const dotGeo = ctx.track(new THREE.SphereGeometry(0.16, 10, 8));

    /** A rod-shaped bacterium with antigen knobs (glycoproteins) on its surface. */
    const bacterium = (rot: number) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(rodGeo, mPath);
      g.add(body);
      const knobs = new THREE.InstancedMesh(knobGeo, mAntigen, ANTIGEN_DIRS.length);
      ANTIGEN_DIRS.forEach((d, i) => {
        // points on the capsule surface: stretched along y
        const p = v(d.x * 0.44, d.y * 0.9 + Math.sign(d.y) * 0.15, d.z * 0.44);
        setInstance(knobs, i, p);
      });
      g.add(knobs);
      g.rotation.z = rot;
      root.add(g);
      return g;
    };

    // ---------- macrophage (phagocyte) ----------
    const macrophage = new THREE.Group();
    macrophage.position.copy(MAC);
    const macBody = new THREE.Mesh(ctx.track(lumpySphere(MAC_R, 11, 0.12)), mMac);
    macBody.renderOrder = 2;
    const nucleus = new THREE.Group();
    for (const [x, y, s] of [[-0.9, -0.9, 0.72], [-0.1, -1.3, 0.62], [-1.5, -0.1, 0.55]] as const) {
      const n = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(s, 20, 14)), mMacNuc);
      n.position.set(x, y, -0.3);
      nucleus.add(n);
    }
    macrophage.add(macBody, nucleus);
    // pseudopodia that reach round the bacterium during engulfment
    const podGeo = ctx.track(new THREE.CapsuleGeometry(0.42, 1.5, 6, 12));
    const pods = [0, 1].map(() => { const m = new THREE.Mesh(podGeo, mMac); m.renderOrder = 2; macrophage.add(m); return m; });
    root.add(macrophage);

    // lysosomes (6: four fuse with the vacuole, two stay)
    const LYSO_HOME = [v(0.6, -0.6, 0.9), v(1.2, 0.4, 0.6), v(0.3, 1.4, 0.8), v(-1.4, 1.0, 0.7), v(1.4, -1.5, 0.4), v(-0.4, -1.9, 0.9)].map((p) => p.add(MAC));
    const lysoGeo = ctx.track(new THREE.SphereGeometry(0.3, 14, 10));
    const lysos = LYSO_HOME.map((p) => { const m = new THREE.Mesh(lysoGeo, mLyso); m.position.copy(p); root.add(m); return m; });
    const vacuole = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(1.05, 24, 16)), mVac);
    vacuole.position.copy(VAC);
    vacuole.renderOrder = 1;
    root.add(vacuole);

    // MHC proteins on the macrophage surface, with antigen fragments
    const mhc = new THREE.Group();
    const mhcSpots = MHC_ANGLES.map((a) => MAC.clone().addScaledVector(mhcDir(a), MAC_R * 0.98));
    const mhcStalks = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10)), mMhc, mhcSpots.length);
    mhcSpots.forEach((p, i) => {
      const d = mhcDir(MHC_ANGLES[i]!);
      const q = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), d);
      setInstance(mhcStalks, i, p.clone().addScaledVector(d, 0.2), new THREE.Euler().setFromQuaternion(q));
    });
    mhc.add(mhcStalks);
    root.add(mhc);
    const fragGeo = ctx.track(new THREE.SphereGeometry(0.2, 10, 8));
    const frags = mhcSpots.map(() => { const m = new THREE.Mesh(fragGeo, mAntigen); root.add(m); return m; });
    const fragSeat = mhcSpots.map((p, i) => p.clone().addScaledVector(mhcDir(MHC_ANGLES[i]!), 0.55));
    const fragInVac = [v(-0.3, 0.2, 0.2), v(0.3, 0.25, -0.1), v(-0.1, -0.3, 0.3), v(0.25, -0.2, 0.1)].map((p) => p.add(VAC));

    // ---------- pathogens ----------
    const p0 = bacterium(-0.7);
    const p6 = bacterium(0.9);
    const others = PATH_HOME.map((_, i) => bacterium([0.3, -0.9, 1.2, -0.2, 0.6][i]!));

    // ---------- lymphocytes ----------
    /** Helper T-cell: round, blue, covered in short knob-shaped T-cell receptors. */
    const tCell = (pos: THREE.Vector3, faded: boolean) => {
      const g = new THREE.Group();
      g.position.copy(pos);
      g.add(new THREE.Mesh(tCellGeo, faded ? mTFaded : mT));
      const pts = spherePoints(22, pos.x);
      const stalks = new THREE.InstancedMesh(cylGeo, mTR, pts.length);
      const heads = new THREE.InstancedMesh(tHeadGeo, mTR, pts.length);
      pts.forEach((d, i) => {
        seg(stalks, i, d.clone().multiplyScalar(T_R * 0.95), d.clone().multiplyScalar(T_R + 0.3));
        setInstance(heads, i, d.clone().multiplyScalar(T_R + 0.36), undefined, 1, 0.7);
      });
      g.add(stalks, heads);
      root.add(g);
      return g;
    };
    /** B-cell: round, green, covered in Y-shaped receptors (membrane-bound antibodies). */
    const bCell = (pos: THREE.Vector3, faded: boolean) => {
      const g = new THREE.Group();
      g.position.copy(pos);
      g.add(new THREE.Mesh(bCellGeo, faded ? mBFaded : mB));
      const pts = spherePoints(18, pos.y);
      const ys = new THREE.InstancedMesh(cylGeo, mAb, pts.length * 3);
      pts.forEach((d, i) => yShape(ys, i * 3, d.clone().multiplyScalar(B_R * 0.95), d, 0.75));
      g.add(ys);
      root.add(g);
      return g;
    };
    const tm = tCell(T_START, false);
    const t2 = tCell(v(2.2, 7.6), true);
    const t3 = tCell(v(-4.4, 7.9), true);
    const bm = bCell(BM, false);
    const b2 = bCell(v(-5.4, -6.4), true);
    const b3 = bCell(v(-1.6, -7.6), true);
    const haloT = new THREE.Mesh(haloGeo, mHalo);
    haloT.renderOrder = 3;
    tm.add(haloT);
    const haloB = new THREE.Mesh(haloGeo, mHaloB);
    haloB.renderOrder = 3;
    bm.add(haloB);
    const signals = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(dotGeo, mSignal); root.add(m); return m; });

    // ---------- clone, plasma cells and memory cells ----------
    const cloneGeo = ctx.track(lumpySphere(B_R, 9, 0.05, 32, 22));
    const clone = CLONE.map(() => { const m = new THREE.Mesh(cloneGeo, mB); root.add(m); return m; });
    // rough ER drawn as rings on the camera-facing side of each plasma cell
    const erGeo = ctx.track(new THREE.TorusGeometry(0.62, 0.05, 6, 28, Math.PI * 1.4));
    const ers = CLONE.map((_, i) => {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const r = new THREE.Mesh(erGeo, mER);
        r.scale.setScalar(1 - k * 0.25);
        r.position.set(0.15, -0.1, B_R * 0.98 + 0.02);
        r.rotation.z = 0.6 + k * 0.4 + i;
        g.add(r);
      }
      clone[i]!.add(g);
      return g;
    });
    const memGeo = ctx.track(lumpySphere(B_R * 0.9, 13, 0.05, 32, 22));
    const memory = CLONE.map((p, i) => {
      if (!MEMORY.has(i)) return null;
      const g = new THREE.Group();
      g.position.copy(p);
      g.add(new THREE.Mesh(memGeo, mMem));
      const pts = spherePoints(14, i);
      const ys = new THREE.InstancedMesh(cylGeo, mAb, pts.length * 3);
      pts.forEach((d, k) => yShape(ys, k * 3, d.clone().multiplyScalar(B_R * 0.86), d, 0.7));
      g.add(ys);
      root.add(g);
      return g;
    });

    // ---------- free antibodies ----------
    const abs = new THREE.InstancedMesh(abGeo, mAb, N_AB * 3);
    root.add(abs);
    const plasmaIdx = CLONE.map((_, i) => i).filter((i) => !MEMORY.has(i));
    type Ab = { src: THREE.Vector3; mid: THREE.Vector3; dir: THREE.Vector3; t0: number; bound?: { pos: THREE.Vector3; dir: THREE.Vector3; pathogen: number } };
    const antibodies: Ab[] = [];
    for (let k = 0; k < N_AB; k++) {
      const s = CLONE[plasmaIdx[k % plasmaIdx.length]!]!;
      const src = s.clone().add(v((rand() - 0.5) * 0.6, B_R * 0.9, 0.6));
      // spread out into the tissue above and around the clone, towards the bacteria
      const mid = v(2 + rand() * 10.5, 1.3 + rand() * 3.9, (rand() - 0.5) * 3);
      const ang = rand() * Math.PI * 2;
      antibodies.push({ src, mid, dir: v(Math.cos(ang), Math.sin(ang), (rand() - 0.5) * 0.6).normalize(), t0: (k / N_AB) * 0.55 });
    }
    // the first antibodies bridge neighbouring bacteria (agglutination); the next ones coat single bacteria
    CLUMP_LINKS.forEach(([a, b], k) => {
      const pa = CLUMP[a]!, pb = CLUMP[b]!;
      const along = pb.clone().sub(pa).normalize();
      const perp = v(-along.y, along.x, 0);
      const mid = pa.clone().add(pb).multiplyScalar(0.5).add(v(0, 0, 0.5));
      antibodies[k]!.bound = { pos: mid.addScaledVector(perp, -0.32), dir: perp, pathogen: a };
    });
    for (let k = CLUMP_LINKS.length; k < CLUMP_LINKS.length + 8; k++) {
      const pi = k % CLUMP.length;
      const ang = (k * 2.1) % (Math.PI * 2);
      const out = v(Math.cos(ang), Math.sin(ang), 0.7).normalize();
      antibodies[k]!.bound = { pos: CLUMP[pi]!.clone().addScaledVector(out, 1.55), dir: out.clone().negate(), pathogen: pi };
    }

    // ---------- label anchors ----------
    const memAnchorCell = memory[4]!;
    const anchors = {
      pathogen: { object: anchorAt(p0, 0.45, -0.3, 0.45, 'pathogen'), highlight: [p0] },
      antigen: { object: anchorAt(others[0]!, 0, 1.05, 0.25, 'antigen'), highlight: [] },
      macrophage: { object: anchorAt(macrophage, -1.2, -2.0, 1.2, 'macrophage'), highlight: [macBody, pods[0]!, pods[1]!] },
      lysosome: { object: anchorAt(lysos[4]!, 0, 0, 0.3, 'lysosome'), highlight: lysos },
      mhc: { object: anchorAt(root, fragSeat[1]!.x, fragSeat[1]!.y, fragSeat[1]!.z + 0.2, 'mhc'), highlight: [mhc] },
      'helper-t': { object: anchorAt(tm, 0.2, T_R * 0.7, T_R * 0.7, 'helper-t'), highlight: [tm] },
      'other-t': { object: anchorAt(t2, 0, 0, T_R, 'other-t'), highlight: [t2, t3] },
      'b-cell': { object: anchorAt(bm, 0.3, -0.5, B_R, 'b-cell'), highlight: [bm] },
      'other-b': { object: anchorAt(b2, 0.2, 0, B_R, 'other-b'), highlight: [b2, b3] },
      clone: { object: anchorAt(clone[5]!, 0, 0, B_R, 'clone'), highlight: clone },
      plasma: { object: anchorAt(clone[1]!, 0.3, -0.4, B_R, 'plasma'), highlight: plasmaIdx.map((i) => clone[i]!) },
      antibody: { object: anchorAt(root, antibodies[30]!.mid.x, antibodies[30]!.mid.y, antibodies[30]!.mid.z, 'antibody'), highlight: [abs] },
      agglutination: { object: anchorAt(root, 9.1, 5.2, 1.0, 'agglutination'), highlight: [abs, ...others] },
      memory: { object: anchorAt(memAnchorCell, 0, -0.3, B_R * 0.9, 'memory'), highlight: memory.filter((m): m is THREE.Group => !!m) },
    };

    const show = (o: THREE.Object3D, s: number) => { o.visible = s > 0.001; o.scale.setScalar(Math.max(0.001, s)); };
    const tmp = v(0, 0);

    return {
      anchors,
      durations: [4, 7, 5, 6, 7, 7, 7, 6, 6],
      render(index, t) {
        // ----- the bacterium that is engulfed -----
        if (index === 0) { p0.position.lerpVectors(P0_START, P0_TOUCH, ease(t)); show(p0, 1); }
        else if (index === 1) {
          p0.position.lerpVectors(P0_TOUCH, VAC, ease(phase(t, 0.05, 0.4)));
          show(p0, 1 - 0.45 * ease(phase(t, 0.62, 0.95)));
        } else if (index === 2) { p0.position.copy(VAC); show(p0, 0.55 * (1 - ease(phase(t, 0, 0.35)))); }
        else show(p0, 0);

        // pseudopodia: reach round the bacterium, then close into the vacuole
        const reach = index === 1 ? ease(phase(t, 0, 0.18)) * (1 - ease(phase(t, 0.3, 0.45))) : 0;
        const toward = P0_TOUCH.clone().sub(MAC).normalize();
        pods.forEach((pod, k) => {
          const sgn = k === 0 ? 1 : -1;
          const a = Math.atan2(toward.y, toward.x) + sgn * 0.42;
          const base = v(Math.cos(a), Math.sin(a), 0).multiplyScalar(MAC_R * 0.85);
          pod.position.copy(base).addScaledVector(v(Math.cos(a), Math.sin(a), 0), 1.0 * reach);
          pod.rotation.z = a - Math.PI / 2 - sgn * 0.35;
          pod.visible = reach > 0.02;
          pod.scale.set(1, Math.max(0.01, reach), 1);
        });

        // vacuole
        if (index === 1) show(vacuole, ease(phase(t, 0.3, 0.42)));
        else if (index === 2) show(vacuole, 1 - ease(phase(t, 0.5, 0.9)));
        else show(vacuole, 0);

        // lysosomes: four move to the vacuole and fuse with it
        lysos.forEach((l, i) => {
          if (i >= 4) { l.position.copy(LYSO_HOME[i]!); show(l, 1); return; }
          if (index === 0) { l.position.copy(LYSO_HOME[i]!); show(l, 1); }
          else if (index === 1) {
            const u = ease(phase(t, 0.42, 0.62 + i * 0.02));
            l.position.lerpVectors(LYSO_HOME[i]!, VAC.clone().add(LYSO_HOME[i]!.clone().sub(VAC).normalize().multiplyScalar(0.9)), u);
            show(l, 1 - ease(phase(t, 0.63 + i * 0.02, 0.72 + i * 0.02)));
          } else show(l, 0);
        });

        // antigen fragments: made in the vacuole, then displayed by MHC proteins
        frags.forEach((f, i) => {
          if (index === 0) show(f, 0);
          else if (index === 1) { f.position.copy(fragInVac[i]!); show(f, ease(phase(t, 0.72, 0.95))); }
          else if (index === 2) { f.position.lerpVectors(fragInVac[i]!, fragSeat[i]!, ease(phase(t, 0.15 + i * 0.05, 0.75 + i * 0.05))); show(f, 1); }
          else { f.position.copy(fragSeat[i]!); show(f, 1); }
        });

        // ----- the matching helper T-cell -----
        if (index <= 2) tm.position.copy(T_START);
        else if (index === 3) tm.position.lerpVectors(T_START, T_AT_MAC, ease(phase(t, 0, 0.55)));
        else if (index === 4) tm.position.lerpVectors(T_AT_MAC, T_AT_B, ease(phase(t, 0.28, 0.68)));
        else tm.position.copy(T_AT_B);
        const tAct = index < 3 ? 0 : index === 3 ? ease(phase(t, 0.6, 0.9)) : 1;
        tm.scale.setScalar(1 + 0.12 * tAct);
        mHalo.opacity = index >= 8 ? 0 : 0.3 * tAct;
        haloT.visible = mHalo.opacity > 0.01;
        haloT.scale.setScalar(T_R + 0.32);

        // ----- the bacterium whose antigens bind the matching B-cell -----
        if (index <= 3) { p6.position.copy(P6_START); show(p6, 1); }
        else if (index === 4) { p6.position.lerpVectors(P6_START, P6_AT_B, ease(phase(t, 0, 0.28))); show(p6, 1); }
        else if (index === 5) { p6.position.copy(P6_AT_B); show(p6, 1 - ease(phase(t, 0, 0.12))); }
        else show(p6, 0);

        // ----- B-cell activation and signalling -----
        const bAct = index < 4 ? 0 : index === 4 ? ease(phase(t, 0.78, 1)) : 1;
        mHaloB.opacity = index === 4 ? 0.3 * bAct : 0;
        haloB.visible = mHaloB.opacity > 0.01;
        haloB.scale.setScalar(B_R + 0.32);
        bm.visible = index <= 4;
        signals.forEach((s, k) => {
          const u = index === 4 ? phase(t, 0.68 + k * 0.03, 0.85 + k * 0.03) : 0;
          s.visible = index === 4 && u > 0 && u < 1;
          s.position.lerpVectors(T_AT_B, BM, u).add(v(0, 0, 0.9 + 0.2 * Math.sin(k * 2)));
        });

        // ----- clonal expansion: three rounds of mitosis -----
        const gen = (k: number, i: number) => {
          const size = 8 >> k;
          const j = Math.floor(i / size);
          if (k === 0) return BM.clone();
          const m = v(0, 0);
          for (let x = j * size; x < (j + 1) * size; x++) m.add(CLONE[x]!);
          return m.multiplyScalar(1 / size).lerp(BM, 1 - k / 3);
        };
        clone.forEach((c, i) => {
          if (index < 5) { c.visible = false; return; }
          c.visible = true;
          if (index === 5) {
            const g = Math.min(2.999, t * 3);
            const d = Math.floor(g);
            const s = ease(phase(g - d, 0.25, 1));
            c.position.copy(gen(d, i)).lerp(gen(d + 1, i), s);
            c.scale.setScalar(0.92 + 0.08 * Math.abs(Math.cos(Math.PI * s)));
            ers[i]!.visible = false;
            return;
          }
          c.position.copy(CLONE[i]!);
          if (MEMORY.has(i)) {
            const s = index === 6 ? 1 - ease(phase(t, 0, 0.3)) : 0;
            c.scale.setScalar(Math.max(0.001, s));
            c.visible = s > 0.001;
            ers[i]!.visible = false;
            return;
          }
          const grow = index === 6 ? ease(phase(t, 0, 0.3)) : 1;
          const die = index === 8 ? ease(phase(t, 0.15, 0.7)) : 0;
          const s = (1 + 0.15 * grow) * (1 - die);
          c.scale.setScalar(Math.max(0.001, s));
          c.visible = s > 0.001;
          ers[i]!.visible = grow > 0.5;
        });
        memory.forEach((m) => {
          if (!m) return;
          const s = index < 6 ? 0 : index === 6 ? ease(phase(t, 0.05, 0.35)) : 1;
          show(m, s);
        });

        // ----- antibodies -----
        antibodies.forEach((ab, k) => {
          const i0 = k * 3;
          if (index < 6) { yShape(abs, i0, tmp, ab.dir, 1, 0); return; }
          if (index === 6) {
            const u = ease(phase(t, 0.3 + ab.t0, 0.3 + ab.t0 + 0.15));
            const vis = t > 0.3 + ab.t0 ? 1 : 0;
            tmp.lerpVectors(ab.src, ab.mid, u);
            yShape(abs, i0, tmp, ab.dir, 1, vis);
            return;
          }
          if (ab.bound) {
            const u = index === 7 ? ease(phase(t, 0.15, 0.75)) : 1;
            const fade = index === 8 ? 1 - ease(phase(t, 0, 0.4)) : 1;
            tmp.lerpVectors(ab.mid, ab.bound.pos, u);
            const d = ab.dir.clone().lerp(ab.bound.dir, u).normalize();
            yShape(abs, i0, tmp, d, 1, fade);
            return;
          }
          // unbound antibodies: most are removed after the infection, a few remain for a while
          const keep = k < 21 ? 1 : 0;
          const fade = index === 8 ? (keep ? 1 : 1 - ease(phase(t, 0.2 + (k % 6) * 0.05, 0.55 + (k % 6) * 0.05))) : 1;
          yShape(abs, i0, ab.mid, ab.dir, 1, fade);
        });
        abs.instanceMatrix.needsUpdate = true;

        // ----- the other bacteria: clumped by antibodies, then cleared -----
        others.forEach((p, i) => {
          if (index < 7) { p.position.copy(PATH_HOME[i]!); show(p, 1); }
          else if (index === 7) { p.position.lerpVectors(PATH_HOME[i]!, CLUMP[i]!, ease(phase(t, 0.1, 0.7))); show(p, 1); }
          else { p.position.copy(CLUMP[i]!); show(p, 1 - ease(phase(t, 0, 0.4))); }
        });
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
