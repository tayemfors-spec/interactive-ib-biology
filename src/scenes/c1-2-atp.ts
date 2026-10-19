import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';

/*
 * C1.2 ATP: a ball-and-stick model (hydrogen atoms omitted except on water) and its hydrolysis / re-formation.
 *   step 0  structure: adenine — ribose — three phosphate groups (α, β, γ) in a chain
 *   step 1  hydrolysis: water splits the bond to the terminal (γ) phosphate → ADP + Pi, energy released
 *   step 2  condensation (phosphorylation): energy from respiration joins Pi back onto ADP → ATP, water released
 * Topology that matters: adenine N9 bonds ribose C1′; the phosphate chain starts at C5′ (outside the ring);
 * phosphates are joined by bridging oxygens; only the terminal phosphate is removed. Colours: C dark, N blue,
 * O red, P orange, H white (atom radii schematic).
 */
type V = THREE.Vector3;
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

const scene: SceneModule = {
  camera: { position: [-2.0, 1.6, 17], target: [-2.4, -0.4, 0], fov: 38, minDistance: 7, maxDistance: 34 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);

    const mat = {
      C: ctx.material('text', { roughness: 0.45 }),
      N: ctx.material('protein', { roughness: 0.4 }),
      O: ctx.material('k', { roughness: 0.4 }),
      P: ctx.material('head', { roughness: 0.35 }),
      H: ctx.material('neutral', { roughness: 0.4 }),
      bond: ctx.material('neutral', { roughness: 0.6 }),
      energy: ctx.material('glucose', { roughness: 0.3, emissive: new THREE.Color(0xffc531), emissiveIntensity: 0.7 }),
      halo: ctx.material('glucose', { roughness: 0.3, transparent: true, opacity: 0.55, emissive: new THREE.Color(0xffc531), emissiveIntensity: 0.6 }),
    };
    const R = { C: 0.3, N: 0.3, O: 0.28, P: 0.42, H: 0.17 } as const;
    const sphere = ctx.track(new THREE.SphereGeometry(1, 22, 16));
    const cyl = ctx.track(new THREE.CylinderGeometry(0.085, 0.085, 1, 10));
    const up = new THREE.Vector3(0, 1, 0);

    const atom = (el: keyof typeof R, p: V, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(sphere, mat[el]);
      m.scale.setScalar(R[el]);
      m.position.copy(p);
      parent.add(m);
      return m;
    };
    const placeBond = (m: THREE.Mesh, a: V, b: V) => {
      const d = b.clone().sub(a);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(up, d.clone().normalize());
      m.scale.set(1, Math.max(0.001, d.length()), 1);
    };
    const bond = (a: V, b: V, parent: THREE.Object3D) => {
      const m = new THREE.Mesh(cyl, mat.bond);
      placeBond(m, a, b);
      parent.add(m);
      return m;
    };
    const poly = (centre: V, r: number, startDeg: number, n: number, dir = 1) =>
      Array.from({ length: n }, (_, i) => {
        const a = ((startDeg + dir * (360 / n) * i) * Math.PI) / 180;
        return v(centre.x + r * Math.cos(a), centre.y + r * Math.sin(a), 0);
      });

    // ---------- ribose (pentose ring: O4′, C1′, C2′, C3′, C4′) ----------
    const ribose = new THREE.Group();
    const [O4, C1, C2, C3, C4] = poly(v(0, 0), 0.85, 90, 5, -1) as [V, V, V, V, V];
    const O2 = C2.clone().add(v(0.35, -0.94)), O3 = C3.clone().add(v(-0.35, -0.94));
    const C5 = C4.clone().add(v(-0.62, 0.82));
    [O4, C1, C2, C3, C4].forEach((p, i, a) => bond(p, a[(i + 1) % 5]!, ribose));
    bond(C2, O2, ribose); bond(C3, O3, ribose); bond(C4, C5, ribose);
    atom('O', O4, ribose); atom('C', C1, ribose); atom('C', C2, ribose); atom('C', C3, ribose); atom('C', C4, ribose);
    atom('O', O2, ribose); atom('O', O3, ribose); atom('C', C5, ribose);
    root.add(ribose);

    // ---------- adenine (purine: imidazole ring fused to a six-membered ring), N9 bonded to C1′ ----------
    const adenine = new THREE.Group();
    const dirN = v(0.862, 0.507).normalize();
    const N9 = C1.clone().addScaledVector(dirN, 1.0);
    const c5 = N9.clone().addScaledVector(dirN, 0.85);
    const a0 = (Math.atan2(N9.y - c5.y, N9.x - c5.x) * 180) / Math.PI;
    const [, C8, N7, C5a, C4a] = poly(c5, 0.85, a0, 5, -1) as [V, V, V, V, V];
    const mid = C5a.clone().add(C4a).multiplyScalar(0.5);
    const out = mid.clone().sub(c5).normalize();
    const side = C5a.distanceTo(C4a);
    const hc = mid.clone().addScaledVector(out, (side * Math.sqrt(3)) / 2);
    const aC5 = (Math.atan2(C5a.y - hc.y, C5a.x - hc.x) * 180) / Math.PI;
    const aC4 = (Math.atan2(C4a.y - hc.y, C4a.x - hc.x) * 180) / Math.PI;
    const hdir = ((aC5 - aC4 + 540) % 360) - 180 > 0 ? 1 : -1; // go round the hexagon away from C4
    const [, C6, N1, C2a, N3] = poly(hc, side, aC5, 6, hdir) as [V, V, V, V, V];
    const N6 = C6.clone().addScaledVector(C6.clone().sub(hc).normalize(), 1.0);
    const ring5 = [N9, C8, N7, C5a, C4a];
    ring5.forEach((p, i) => bond(p, ring5[(i + 1) % 5]!, adenine));
    const ring6 = [C5a, C6, N1, C2a, N3, C4a];
    ring6.forEach((p, i) => { if (i < 5) bond(p, ring6[i + 1]!, adenine); });
    bond(C6, N6, adenine);
    bond(C1, N9, adenine);
    atom('N', N9, adenine); atom('C', C8, adenine); atom('N', N7, adenine); atom('C', C5a, adenine); atom('C', C4a, adenine);
    atom('C', C6, adenine); atom('N', N1, adenine); atom('C', C2a, adenine); atom('N', N3, adenine); atom('N', N6, adenine);
    root.add(adenine);

    // ---------- phosphate chain from C5′: O5′–Pα–O–Pβ–O–Pγ ----------
    const O5 = v(-2.35, 1.35), Pa = v(-3.25, 0.95), Oab = v(-4.15, 1.35), Pb = v(-5.05, 0.95), Obg = v(-5.95, 1.35), Pg = v(-6.85, 0.95);
    const nb = [v(0.32, -0.82, 0.48), v(-0.32, -0.82, -0.48)];
    const pA = new THREE.Group(), pB = new THREE.Group();
    bond(C5, O5, pA); bond(O5, Pa, pA); bond(Pa, Oab, pA);
    atom('O', O5, pA); atom('P', Pa, pA);
    for (const d of nb) { const o = Pa.clone().add(d); bond(Pa, o, pA); atom('O', o, pA); }
    bond(Oab, Pb, pB); bond(Pb, Obg, pB);
    atom('O', Oab, pB); atom('P', Pb, pB); atom('O', Obg, pB);
    for (const d of nb) { const o = Pb.clone().add(d); bond(Pb, o, pB); atom('O', o, pB); }
    root.add(pA, pB);

    // the terminal (γ) phosphate moves as one group; built at the origin and placed at Pg
    const pi = new THREE.Group();
    const giO = [...nb, v(-0.95, 0.2, 0)];
    atom('P', v(0, 0), pi);
    for (const d of giO) { bond(v(0, 0), d, pi); atom('O', d, pi); }
    root.add(pi);
    // the γ bond that is hydrolysed (Oβγ–Pγ)
    const gBond = new THREE.Mesh(cyl, mat.bond);
    root.add(gBond);

    // ---------- water: O and two H; in hydrolysis its O + one H join Pi, the other H joins ADP ----------
    const water = new THREE.Group();
    const wO = atom('O', v(0, 0), water), wH1 = atom('H', v(0, 0), water), wH2 = atom('H', v(0, 0), water);
    const bOH1 = bond(v(0, 0), v(0, 1), water), bOH2 = bond(v(0, 0), v(0, 1), water);
    const bPiO = bond(v(0, 0), v(0, 1), water); // Pγ–O(water) after hydrolysis
    root.add(water);

    // ---------- energy: sparks released (hydrolysis) or supplied from respiration (condensation) ----------
    const SPARKS = 14;
    const sparkGeo = ctx.track(new THREE.OctahedronGeometry(0.2, 0));
    const sparks = new THREE.InstancedMesh(sparkGeo, mat.energy, SPARKS);
    root.add(sparks);
    const halo = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.62, 0.07, 10, 40)), mat.halo);
    halo.rotation.y = Math.PI / 2;
    root.add(halo);
    const BOND_MID = Obg.clone().add(Pg).multiplyScalar(0.5);
    halo.position.copy(BOND_MID);
    const sparkDirs = Array.from({ length: SPARKS }, (_, i) => {
      const a = (i / SPARKS) * Math.PI * 2;
      return v(Math.cos(a), Math.sin(a) * 0.9, Math.sin(a * 3) * 0.4);
    });

    // positions used by the steps
    const PI_AWAY = v(-6.7, -2.7, 0.5); // where Pi drifts after hydrolysis
    const W_START = BOND_MID.clone().add(v(0.4, -3.3, 0.6));
    const W_ATTACK = BOND_MID.clone().add(v(0, -1.05, 0.6));
    const W_LEAVE = BOND_MID.clone().add(v(1.9, -3.6, 0.8));
    const SLOT = v(0.15, 0.25, 0.95); // the new O on Pi, relative to P
    const H1_ON_PI = v(0.55, 0.75, 1.2); // relative to P
    const H2_ON_ADP = Obg.clone().add(v(0.35, 0.55, 0.45));
    const waterShape = (o: V) => [o, o.clone().add(v(-0.58, 0.42, 0)), o.clone().add(v(0.58, 0.42, 0))] as const;

    const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const drawSparks = (radius: number, scale: number) => {
      for (let i = 0; i < SPARKS; i++) {
        if (scale <= 0.001) { tmp.makeScale(0, 0, 0); sparks.setMatrixAt(i, tmp); continue; }
        p.copy(BOND_MID).addScaledVector(sparkDirs[i]!, radius);
        q.setFromEuler(new THREE.Euler(i, i * 0.7, 0));
        s.setScalar(scale);
        tmp.compose(p, q, s);
        sparks.setMatrixAt(i, tmp);
      }
      sparks.instanceMatrix.needsUpdate = true;
    };
    /** Lay out water atoms: oxygen o, hydrogens h1 (bonded to o) and h2 (bonded to `h2Partner`); `onPi` draws the Pγ–O bond. */
    const drawWater = (o: V, h1: V, h2: V, h2Partner: V, onPi: V | null, visible = true) => {
      water.visible = visible;
      wO.position.copy(o); wH1.position.copy(h1); wH2.position.copy(h2);
      placeBond(bOH1, o, h1);
      placeBond(bOH2, h2Partner, h2);
      if (onPi) placeBond(bPiO, onPi, o);
      bPiO.visible = !!onPi;
    };

    // anchors (moving ones are children of the moving parts)
    const piAnchor = new THREE.Object3D(); piAnchor.position.set(0, 0.45, 0.4); pi.add(piAnchor); piAnchor.name = 'pi';
    const wAnchor = new THREE.Object3D(); wAnchor.position.set(0, -0.35, 0.3); wO.add(wAnchor); wAnchor.name = 'water';
    const anchors = {
      adenine: { object: anchorAt(root, N1.x, N1.y, 0.35, 'adenine'), highlight: [adenine] },
      ribose: { object: anchorAt(root, (C2.x + C3.x) / 2, C2.y - 0.1, 0.35, 'ribose'), highlight: [ribose] },
      phosphates: { object: anchorAt(root, Pb.x, Pb.y + 0.75, 0.3, 'phosphates'), highlight: [pA, pB, pi, gBond] },
      terminal: { object: anchorAt(root, Pg.x - 0.4, Pg.y + 0.6, 0.3, 'terminal'), highlight: [pi, gBond] },
      adp: { object: anchorAt(root, Pa.x, Pa.y + 0.7, 0.3, 'adp'), highlight: [adenine, ribose, pA, pB] },
      pi: { object: piAnchor, highlight: [pi] },
      water: { object: wAnchor, highlight: [water] },
      energy: { object: anchorAt(root, BOND_MID.x + 0.1, BOND_MID.y + 1.0, 0.4, 'energy'), highlight: [sparks, halo] },
    };

    const render = (index: number, t: number) => {
      const H2_AT_PI = (pg: V) => pg.clone().add(H1_ON_PI);
      if (index === 0) {
        pi.position.copy(Pg); gBond.visible = true; placeBond(gBond, Obg, Pg);
        { const [o, h1, h2] = waterShape(W_START); drawWater(o, h1, h2, o, null, false); }
        drawSparks(0, 0); halo.visible = false;
        return;
      }
      if (index === 1) {
        // hydrolysis: water approaches, the γ bond breaks, Pi drifts away and energy is released
        const a = ease(phase(t, 0, 0.35));
        const b = ease(phase(t, 0.35, 0.55));
        const c = ease(phase(t, 0.5, 1));
        const pg = Pg.clone().lerp(PI_AWAY, c);
        pi.position.copy(pg);
        gBond.visible = b < 0.5; placeBond(gBond, Obg, Pg);
        const [o0, h10, h20] = waterShape(W_START.clone().lerp(W_ATTACK, a));
        const oEnd = pg.clone().add(SLOT);
        const o = o0.clone().lerp(oEnd, b);
        const h1 = h10.clone().lerp(H2_AT_PI(pg), b);
        const h2 = h20.clone().lerp(H2_ON_ADP, b);
        drawWater(o, h1, h2, b < 0.5 ? o : Obg, b > 0.5 ? pg : null);
        drawSparks(lerp(0.3, 2.5, ease(phase(t, 0.45, 1))), t < 0.45 ? 0 : lerp(0.4, 1, phase(t, 0.45, 0.7)));
        halo.visible = false;
        return;
      }
      // index 2 — condensation: energy from respiration joins Pi to ADP, releasing water
      const a = ease(phase(t, 0, 0.45)); // energy converges
      const b = ease(phase(t, 0.1, 0.5)); // Pi returns
      const c = ease(phase(t, 0.5, 0.65)); // water forms, bond forms
      const d = ease(phase(t, 0.65, 1)); // water leaves
      const pg = PI_AWAY.clone().lerp(Pg, b);
      pi.position.copy(pg);
      gBond.visible = c > 0.5; placeBond(gBond, Obg, Pg);
      const [wo, wh1, wh2] = waterShape(W_ATTACK.clone().lerp(W_LEAVE, d));
      const o = pg.clone().add(SLOT).lerp(wo, c);
      const h1 = H2_AT_PI(pg).lerp(wh1, c);
      const h2 = H2_ON_ADP.clone().lerp(wh2, c);
      drawWater(o, h1, h2, c > 0.5 ? o : Obg, c < 0.5 ? pg : null);
      drawSparks(lerp(3.4, 0.4, a), t < 0.5 ? 1 - 0.6 * phase(t, 0.3, 0.5) : 0);
      halo.visible = t > 0.5;
      halo.scale.setScalar(lerp(0.6, 1, ease(phase(t, 0.5, 0.7))));
    };
    render(0, 0);

    return { anchors, durations: [4, 7, 7], render, dispose() { root.removeFromParent(); } };
  },
};

export default scene;
