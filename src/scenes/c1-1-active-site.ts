import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';

/*
 * C1.1.4–C1.1.7 An enzyme catalysing the hydrolysis of a disaccharide, then denatured.
 * The enzyme is drawn as two domains joined at a hinge, with the active site in the cleft between
 * them (a schematic of the kind of hinge closure seen in hexokinase). A handful of amino acids line
 * the cleft: the active site is made of only a few residues, held in place by the fold of the whole
 * protein. Steps:
 *   0 random motion — substrate and enzyme move about at random in solution
 *   1 collision — the substrate collides with the active site in the right orientation and binds
 *   2 induced fit — the cleft closes round the substrate; the substrate is bent and its bond strained
 *   3 reaction — water is used to break the glycosidic bond (hydrolysis)
 *   4 release — the cleft reopens, two products leave, the enzyme is unchanged and can be reused
 *   5 denatured — heat breaks the bonds holding the fold; the chain unfolds and the active site is lost
 */
const HINGE_X = -1.7;
const OPEN = 0.15; // jaw angle (rad) when the active site is empty
const CLOSED = 0.015; // jaw angle when gripping the substrate
const LOBE = { rx: 2.15, ry: 1.12, rz: 1.75, cx: 2.0, cy: 1.58 }; // lobe ellipsoid and its centre in hinge space
const SITE = new THREE.Vector3(0.75, 0, 0.25); // where the bound substrate's centre sits

type V = THREE.Vector3;
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const along = (pts: V[], u: number, out: V) => {
  const k = Math.max(0, Math.min(0.9999, u)) * (pts.length - 1);
  const i = Math.floor(k);
  return out.copy(pts[i]!).lerp(pts[i + 1]!, k - i);
};

const scene: SceneModule = {
  camera: { position: [0.6, 2.2, 17], target: [1.0, 0, 0], fov: 38, minDistance: 7, maxDistance: 34 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(11);

    // ---------- enzyme: two lumpy domains on a hinge, plus a core that fills the back ----------
    const mProt = ctx.material('protein', { roughness: 0.55, transparent: true });
    const lobeGeo = (seed: number) => {
      const g = new THREE.SphereGeometry(1, 48, 32);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const r = rng(seed);
      const k = [r() * 6, r() * 6, r() * 6];
      const p = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const n = Math.sin(p.x * 3.1 + k[0]!) * Math.sin(p.y * 2.7 + k[1]!) * Math.sin(p.z * 3.3 + k[2]!);
        const s = 1 + 0.1 * n;
        pos.setXYZ(i, p.x * LOBE.rx * s, p.y * LOBE.ry * s, p.z * LOBE.rz * s);
      }
      g.computeVertexNormals();
      return ctx.track(g);
    };
    const hingeUp = new THREE.Group();
    const hingeDown = new THREE.Group();
    hingeUp.position.x = hingeDown.position.x = HINGE_X;
    const upper = new THREE.Mesh(lobeGeo(3), mProt);
    const lower = new THREE.Mesh(lobeGeo(8), mProt);
    upper.position.set(LOBE.cx, LOBE.cy, 0);
    lower.position.set(LOBE.cx, -LOBE.cy, 0);
    hingeUp.add(upper);
    hingeDown.add(lower);
    const coreGeo = ctx.track(new THREE.SphereGeometry(1, 32, 24));
    coreGeo.scale(1.75, 2.25, 1.7);
    const core = new THREE.Mesh(coreGeo, mProt);
    core.position.set(HINGE_X - 0.05, 0, 0);
    const enzyme = new THREE.Group();
    enzyme.add(hingeUp, hingeDown, core);
    root.add(enzyme);

    // active-site amino acids: a few residues on the inner faces of the cleft
    const mRes = ctx.material('protein2', { roughness: 0.4 });
    const resGeo = ctx.track(new THREE.SphereGeometry(0.27, 16, 12));
    const onLobe = (lx: number, lz: number, up: boolean) => {
      // a point on the inner face of the ellipsoid, pushed slightly out so the residue shows
      const f = 1 - (lx / LOBE.rx) ** 2 - (lz / LOBE.rz) ** 2;
      const ly = LOBE.ry * Math.sqrt(Math.max(0.02, f)) * 0.93;
      return { lobe: up ? upper : lower, local: v(LOBE.cx + lx, (up ? LOBE.cy - ly : -LOBE.cy + ly), lz) };
    };
    const resDefs = [onLobe(-0.85, 0.75, true), onLobe(0.25, 0.95, true), onLobe(-0.9, 0.85, false), onLobe(0.05, 1.05, false), onLobe(0.9, 0.75, false)];
    const residues = resDefs.map(() => new THREE.Mesh(resGeo, mRes));
    residues.forEach((r) => root.add(r));

    // unfolded chain for the denatured step, revealed progressively
    const coilPts: V[] = [];
    let cp = v(-3.6, 1.2, 0.4);
    for (let i = 0; i < 26; i++) {
      coilPts.push(cp.clone());
      cp = cp.clone().add(v(0.3 + rand() * 0.25, (rand() - 0.5) * 1.9, (rand() - 0.5) * 1.4));
      cp.y = Math.max(-2.6, Math.min(2.6, cp.y));
      cp.z = Math.max(-1.3, Math.min(1.6, cp.z));
    }
    const coilCurve = new THREE.CatmullRomCurve3(coilPts, false, 'centripetal');
    const coilGeo = ctx.track(new THREE.TubeGeometry(coilCurve, 320, 0.17, 10, false));
    const coilIndex = coilGeo.index!.count;
    const coil = new THREE.Mesh(coilGeo, ctx.material('protein', { roughness: 0.55 }));
    coil.visible = false;
    root.add(coil);
    const scatter = [0.08, 0.3, 0.52, 0.74, 0.94].map((u) => coilCurve.getPointAt(u));

    // ---------- substrate: a disaccharide (two rings joined through an oxygen) ----------
    const ringGeo = ctx.track(new THREE.CylinderGeometry(0.46, 0.46, 0.24, 6));
    ringGeo.rotateX(Math.PI / 2); // flat face towards the camera
    const oGeo = ctx.track(new THREE.SphereGeometry(0.17, 14, 10));
    const bondGeo = ctx.track(new THREE.CylinderGeometry(0.07, 0.07, 1, 8));
    const mA = ctx.material('glucose', { roughness: 0.45 });
    const mB = ctx.material('carb', { roughness: 0.45 });
    const mO = ctx.material('k', { roughness: 0.35 });
    const mBond = ctx.material('neutral', { roughness: 0.5 });
    const mWater = ctx.material('water', { roughness: 0.3 });
    const hGeo = ctx.track(new THREE.SphereGeometry(0.13, 10, 8));
    const mH = ctx.material('neutral', { roughness: 0.4 });

    interface Sub { g: THREE.Group; a: THREE.Mesh; b: THREE.Mesh; o: THREE.Mesh; bondA: THREE.Mesh; bondB: THREE.Mesh; oh: THREE.Group; hOnO: THREE.Mesh }
    const makeSub = (): Sub => {
      const g = new THREE.Group();
      const a = new THREE.Mesh(ringGeo, mA);
      const b = new THREE.Mesh(ringGeo, mB);
      const o = new THREE.Mesh(oGeo, mO);
      const bondA = new THREE.Mesh(bondGeo, mBond);
      const bondB = new THREE.Mesh(bondGeo, mBond);
      g.add(a, b, o, bondA, bondB);
      // after hydrolysis: –OH (from water) on ring B, –H (from water) on the oxygen kept by ring A
      const oh = new THREE.Group();
      const ohO = new THREE.Mesh(oGeo, mWater);
      const ohH = new THREE.Mesh(hGeo, mH);
      ohO.position.set(-0.6, 0.08, 0);
      ohH.position.set(-0.78, 0.22, 0);
      oh.add(ohO, ohH);
      b.add(oh);
      const hOnO = new THREE.Mesh(hGeo, mH);
      hOnO.position.set(0.12, 0.14, 0);
      o.add(hOnO);
      root.add(g);
      return { g, a, b, o, bondA, bondB, oh, hOnO };
    };
    const bondBetween = (m: THREE.Mesh, p: V, q: V) => {
      m.visible = p.distanceTo(q) > 0.05;
      m.position.copy(p).add(q).multiplyScalar(0.5);
      m.scale.set(1, Math.max(0.001, p.distanceTo(q)), 1);
      m.quaternion.setFromUnitVectors(v(0, 1, 0), q.clone().sub(p).normalize());
    };
    /**
     * Pose a disaccharide. `bend` (0–1) strains it as in induced fit; `split` (0–1) breaks the bond:
     * the oxygen stays with ring A, and the two rings separate into products.
     */
    const pose = (s: Sub, centre: V, bend: number, split: number, spin = 0) => {
      s.g.position.copy(centre);
      s.g.rotation.set(0, 0, spin);
      const sep = 0.62 + 0.1 * bend + 0.75 * split;
      const tilt = 0.32 * bend * (1 - split);
      s.a.position.set(-sep, 0, 0);
      s.b.position.set(sep, 0, 0);
      s.a.rotation.set(0, 0, tilt);
      s.b.rotation.set(0, 0, -tilt);
      const sc = Math.min(1, split);
      const o = v(lerp(0, -sep + 0.62, sc), 0.2 * bend * (1 - sc) + 0.32 * sc, 0);
      s.o.position.copy(o);
      bondBetween(s.bondA, v(-sep + 0.4, 0.04, 0), o);
      bondBetween(s.bondB, o, v(sep - 0.4, 0.04, 0));
      s.bondB.visible = split < 0.15;
      s.oh.visible = s.hOnO.visible = split >= 0.15;
    };
    const main = makeSub();
    const others = [makeSub(), makeSub(), makeSub()];
    const otherHome = [v(6.2, 2.9, -1.2), v(-5.8, -2.9, -0.6), v(6.3, -3.3, 0.6)];

    // water used in hydrolysis
    const water = new THREE.Group();
    const wO = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.22, 14, 10)), mWater);
    const h1 = new THREE.Mesh(hGeo, mH);
    const h2 = new THREE.Mesh(hGeo, mH);
    h1.position.set(0.22, 0.14, 0);
    h2.position.set(-0.22, 0.14, 0);
    water.add(wO, h1, h2);
    root.add(water);

    // random-walk path of the substrate towards the active site
    const approach: V[] = [v(6.6, 1.7, 0.6), v(5.6, 2.4, 0.1), v(5.0, 1.2, 0.9), v(5.6, 0.2, 0.3), v(4.7, -0.8, 0.6), v(4.1, 0.3, 0.2)];
    const tmp = new THREE.Vector3();

    const setJaw = (a: number) => { hingeUp.rotation.z = a; hingeDown.rotation.z = -a; };
    const setEnzymeOpacity = (o: number) => { mProt.opacity = o; mProt.depthWrite = o > 0.9; enzyme.visible = o > 0.01; };
    const placeResidues = (denature: number) => {
      enzyme.updateMatrixWorld(true);
      residues.forEach((r, i) => {
        const d = resDefs[i]!;
        const p = d.lobe.parent!.localToWorld(d.local.clone());
        root.worldToLocal(p);
        r.position.copy(p).lerp(scatter[i]!, denature);
      });
    };
    const wanderOthers = (t: number, show = true) => {
      others.forEach((s, i) => {
        s.g.visible = show;
        const h = otherHome[i]!;
        pose(s, tmp.set(h.x + 0.5 * Math.sin(t * 5 + i * 2), h.y + 0.35 * Math.cos(t * 4 + i), h.z), 0, 0, 0.6 * Math.sin(t * 3 + i * 1.7));
      });
    };

    const anchors = {
      enzyme: { object: anchorAt(root, -2.2, 1.4, 1.3, 'enzyme'), highlight: [enzyme] },
      'active-site': { object: anchorAt(root, 0.6, 0.05, 1.35, 'active-site'), highlight: residues },
      residues: { object: anchorAt(root, 0.4, -0.75, 1.55, 'residues'), highlight: residues },
      substrate: { object: anchorAt(main.g, 0.7, 0.45, 0.2, 'substrate'), highlight: [main.g] },
      water: { object: anchorAt(root, SITE.x - 0.1, 0.65, 0.7, 'water'), highlight: [water] },
      products: { object: anchorAt(main.b, 0, 0.5, 0.15, 'products'), highlight: [main.g] },
      unfolded: { object: anchorAt(root, -2.4, 2.2, 0.9, 'unfolded'), highlight: [coil] },
      'site-lost': { object: anchorAt(root, scatter[2]!.x, scatter[2]!.y - 0.35, scatter[2]!.z + 0.3, 'site-lost'), highlight: residues },
    };

    return {
      anchors,
      durations: [5, 4, 4, 4, 5, 6],
      render(index, t) {
        let jaw = OPEN;
        let opacity = 1;
        let denature = 0;
        coil.visible = false;
        water.visible = false;
        main.g.visible = true;
        wanderOthers(index * 1.3 + t, index !== 3);
        switch (index) {
          case 0: { // random motion: substrate drifts about, not yet in the site
            along(approach, ease(t) * 0.999, tmp);
            pose(main, tmp, 0, 0, 0.7 * Math.sin(t * 7));
            break;
          }
          case 1: { // collision and binding in the right orientation
            const u = ease(phase(t, 0, 0.8));
            pose(main, tmp.copy(approach[approach.length - 1]!).lerp(SITE, u), 0, 0, lerp(0.7 * Math.sin(7), 0, u));
            break;
          }
          case 2: { // induced fit: the cleft closes and the substrate is strained
            const u = ease(t);
            jaw = lerp(OPEN, CLOSED, u);
            pose(main, SITE, u, 0);
            break;
          }
          case 3: { // hydrolysis: water breaks the bond inside the closed site
            jaw = CLOSED;
            water.visible = t < 0.62;
            water.position.copy(v(2.4, 1.4, 1.5)).lerp(v(SITE.x, 0.55, 0.5), ease(phase(t, 0, 0.5)));
            const sp = ease(phase(t, 0.5, 0.9));
            pose(main, SITE, 1 - sp, sp * 0.35);
            break;
          }
          case 4: { // release: cleft reopens, products move away, enzyme unchanged
            const o = ease(phase(t, 0, 0.35));
            jaw = lerp(CLOSED, OPEN, o);
            const m = ease(phase(t, 0.2, 1));
            pose(main, SITE, 0, lerp(0.35, 1.6, m));
            // drift the two products apart and out of the cleft
            const da = v(lerp(0, 3.6, m), lerp(0, 3.0, m), lerp(0, 0.6, m));
            main.a.position.add(da);
            main.o.position.add(da);
            main.bondA.position.add(da);
            main.b.position.add(v(lerp(0, 1.4, m), lerp(0, -2.0, m), lerp(0, 0.4, m)));
            main.b.rotation.z = 0.8 * m;
            break;
          }
          default: { // denatured: the fold is lost, so the active site no longer exists
            denature = ease(phase(t, 0.15, 0.85));
            opacity = 1 - ease(phase(t, 0, 0.55));
            jaw = lerp(OPEN, OPEN + 0.5, ease(phase(t, 0, 0.5)));
            coil.visible = t > 0.05;
            coilGeo.setDrawRange(0, Math.floor((coilIndex * ease(phase(t, 0.05, 0.9))) / 3) * 3);
            pose(main, tmp.set(lerp(6, 4.6, ease(t)), lerp(-1.6, -0.6, ease(t)), 0.8), 0, 0, 0.5);
          }
        }
        setJaw(jaw);
        setEnzymeOpacity(opacity);
        placeResidues(denature);
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
