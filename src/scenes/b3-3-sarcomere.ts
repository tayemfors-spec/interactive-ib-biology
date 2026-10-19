import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, rng } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';
import { SARC, SARC_DURATIONS, bandsAt, lengthAt } from './b3-3-kit';

/*
 * B3.3 one sarcomere, seen from the side (x = long axis, M-line at x = 0).
 * Schematic proportions: 1 µm along the axis = 4 units; the filament lattice is drawn far wider than
 * life so it can be seen. Topology that matters:
 *   - thin (actin) filaments are fixed to a Z-line at one end and free at the other;
 *   - thick (myosin) filaments are centred on the M-line, with heads in both halves pointing away from
 *     the centre and a bare zone (no heads) in the middle;
 *   - in the hexagonal lattice each thick filament is surrounded by six thin filaments;
 *   - titin runs from each Z-line to the end of a thick filament (and on along it to the M-line);
 *   - filament lengths never change: only the overlap does, so the A-band stays constant while the
 *     I-band and H-zone shorten. Every position below is computed from bandsAt(L) for exactness.
 * Steps: 0 relaxed · 1 Ca²⁺, cross-bridges form · 2 sliding · 3 contracted, compare bands · 4 relax and stretch.
 */
const S = SARC.scale;
const MH = (SARC.myosin / 2) * S; // half-length of a thick filament in scene units
const AL = SARC.actin * S; // length of a thin filament
const D = 1.0; // thick-filament spacing in the lattice (schematic)
const R_MYO = 0.11;
const R_ACT = 0.052;
const Z_R = 1.75;
const ROW_A = 2.08; // y of the A-band / I-band brackets
const ROW_H = 2.5; // y of the H-zone bracket
const GHOST_A = -2.12;
const GHOST_H = -2.54;

type YZ = [number, number];
const polar = (r: number, deg: number): YZ => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];

const scene: SceneModule = {
  camera: { position: [1.2, 2.6, 14.4], target: [0, 0.2, 0], fov: 38, minDistance: 5, maxDistance: 32 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(33);

    const mZ = ctx.material('text', { roughness: 0.6 });
    const mM = ctx.material('head', { roughness: 0.5 });
    const mActin = ctx.material('protein', { roughness: 0.45 });
    const mMyo = ctx.material('protein2', { roughness: 0.5 });
    const mHead = ctx.material('na', { roughness: 0.4 });
    const mTitin = ctx.material('carb', { roughness: 0.5 });
    const mCa = ctx.material('glucose', { roughness: 0.3, emissiveIntensity: 0.2 });
    const bracketMat = {
      A: ctx.material('protein2', { roughness: 0.4 }),
      I: ctx.material('protein', { roughness: 0.4 }),
      H: ctx.material('head', { roughness: 0.4 }),
    };
    const ghostMat = {
      A: ctx.material('protein2', { roughness: 0.4, transparent: true, opacity: 0.45, depthWrite: false }),
      I: ctx.material('protein', { roughness: 0.4, transparent: true, opacity: 0.45, depthWrite: false }),
      H: ctx.material('head', { roughness: 0.4, transparent: true, opacity: 0.45, depthWrite: false }),
      Z: ctx.material('text', { roughness: 0.6, transparent: true, opacity: 0.16, depthWrite: false }),
    };

    // ---------- hexagonal lattice ----------
    const myosins: YZ[] = [[0, 0], ...[0, 60, 120, 180, 240, 300].map((a) => polar(D, a))];
    const actins: YZ[] = [
      ...[30, 90, 150, 210, 270, 330].map((a) => polar(D / Math.sqrt(3), a)),
      ...[30, 90, 150, 210, 270, 330].map((a) => polar((2 * D) / Math.sqrt(3), a)),
      // the outermost sites complete a ring of six thin filaments round every thick filament
      ...[0, 60, 120, 180, 240, 300].flatMap((a) => [-30, 30].map((o): YZ => {
        const [my, mz] = polar(D, a);
        const [dy, dz] = polar(D / Math.sqrt(3), a + o);
        return [my + dy, mz + dz];
      })),
    ];

    // ---------- Z-lines and M-line (hexagonal plates across the lattice) ----------
    const plate = (r: number, th: number) => ctx.track(new THREE.CylinderGeometry(r, r, th, 6).rotateZ(Math.PI / 2).rotateX(Math.PI / 6));
    const zGeo = plate(Z_R, 0.1);
    const zLeft = new THREE.Mesh(zGeo, mZ);
    const zRight = new THREE.Mesh(zGeo, mZ);
    zLeft.name = 'z-left';
    zRight.name = 'z-right';
    const ghostZ = [new THREE.Mesh(zGeo, ghostMat.Z), new THREE.Mesh(zGeo, ghostMat.Z)];
    ghostZ[0]!.position.x = -(SARC.relaxed / 2) * S;
    ghostZ[1]!.position.x = (SARC.relaxed / 2) * S;
    const mLine = new THREE.Mesh(plate(1.45, 0.07), mM);
    mLine.name = 'm-line';
    root.add(zLeft, zRight, mLine, ...ghostZ);

    // ---------- thin filaments: two twisted strands of globular actin, one group per half ----------
    const bead = ctx.track(new THREE.IcosahedronGeometry(R_ACT, 0));
    const beadStep = 0.13;
    const perStrand = Math.floor(AL / beadStep);
    const makeActinHalf = (dir: 1 | -1) => {
      const g = new THREE.Group();
      const mesh = new THREE.InstancedMesh(bead, mActin, actins.length * perStrand * 2);
      const m4 = new THREE.Matrix4();
      let i = 0;
      for (const [y, z] of actins)
        for (let s = 0; s < 2; s++)
          for (let k = 0; k < perStrand; k++) {
            const x = (k + 0.5) * beadStep;
            const psi = (x / 1.5) * Math.PI * 2 + s * Math.PI;
            m4.makeTranslation(dir * x, y + 0.042 * Math.cos(psi), z + 0.042 * Math.sin(psi));
            mesh.setMatrixAt(i++, m4);
          }
      mesh.count = i;
      g.add(mesh);
      root.add(g);
      return g;
    };
    const actinLeft = makeActinHalf(1); // grows rightwards from the left Z-line
    const actinRight = makeActinHalf(-1); // grows leftwards from the right Z-line
    actinLeft.name = 'actin-left';
    actinRight.name = 'actin-right';

    // ---------- thick filaments ----------
    const myoGeo = ctx.track(new THREE.CapsuleGeometry(R_MYO, 2 * MH - 2 * R_MYO, 4, 10).rotateZ(Math.PI / 2));
    const myosin = new THREE.InstancedMesh(myoGeo, mMyo, myosins.length);
    myosins.forEach(([y, z], i) => myosin.setMatrixAt(i, new THREE.Matrix4().makeTranslation(0, y, z)));
    myosin.name = 'myosin';
    root.add(myosin);

    // ---------- myosin heads: in each half, from the bare zone to the end, facing each neighbouring actin ----------
    const HEAD_LEN = 0.26;
    const headGeo = ctx.track(new THREE.CapsuleGeometry(0.04, HEAD_LEN - 0.08, 3, 6).translate(0, HEAD_LEN / 2, 0));
    type Head = { base: THREE.Vector3; r: THREE.Vector3; ax: number; sign: 1 | -1; gap: number; off: number };
    const heads: Head[] = [];
    const neighbour = D / Math.sqrt(3) + 0.01;
    const hx0 = (SARC.bare / 2) * S + 0.05;
    const hdx = 0.5;
    myosins.forEach(([my, mz]) => {
      let j = 0;
      for (const [ay, az] of actins) {
        const dy = ay - my, dz = az - mz;
        const dist = Math.hypot(dy, dz);
        if (dist > neighbour) continue;
        const r = new THREE.Vector3(0, dy / dist, dz / dist);
        for (const sign of [1, -1] as const)
          for (let x = hx0 + (j / 6) * hdx; x < MH - 0.12; x += hdx)
            heads.push({ base: new THREE.Vector3(sign * x, my + r.y * R_MYO, mz + r.z * R_MYO), r, ax: x, sign, gap: dist - R_MYO - R_ACT, off: rand() });
        j++;
      }
    });
    const headMesh = new THREE.InstancedMesh(headGeo, mHead, heads.length);
    headMesh.name = 'heads';
    root.add(headMesh);

    // ---------- titin: an elastic coil from each Z-line to the end of each thick filament ----------
    class Coil extends THREE.Curve<THREE.Vector3> {
      constructor() { super(); }
      override getPoint(u: number, out = new THREE.Vector3()) {
        const a = u * Math.PI * 2 * 7;
        return out.set(u, 0.07 * Math.cos(a), 0.07 * Math.sin(a));
      }
    }
    const coilGeo = ctx.track(new THREE.TubeGeometry(new Coil(), 160, 0.02, 4, false));
    const titin = new THREE.InstancedMesh(coilGeo, mTitin, myosins.length * 2);
    titin.name = 'titin';
    root.add(titin);

    // ---------- Ca²⁺ ions (fixed fractional positions so they spread with the sarcomere) ----------
    const caGeo = ctx.track(new THREE.SphereGeometry(0.07, 10, 8));
    const caPos = Array.from({ length: 46 }, () => {
      const [y, z] = polar(0.3 + rand() * 1.4, rand() * 360);
      return new THREE.Vector3(rand() - 0.5, y, z);
    });
    const ca = new THREE.InstancedMesh(caGeo, mCa, caPos.length);
    root.add(ca);

    // ---------- band brackets: live (above) and the relaxed lengths for comparison (below) ----------
    const barGeo = ctx.track(new THREE.BoxGeometry(1, 0.07, 0.07));
    const tickGeo = ctx.track(new THREE.BoxGeometry(0.05, 0.3, 0.07));
    const bracket = (mat: THREE.Material, y: number) => {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(barGeo, mat);
      const t0 = new THREE.Mesh(tickGeo, mat);
      const t1 = new THREE.Mesh(tickGeo, mat);
      g.add(bar, t0, t1);
      g.position.y = y;
      root.add(g);
      const set = (x0: number, x1: number) => {
        const len = x1 - x0;
        g.visible = len > 0.02;
        bar.position.x = (x0 + x1) / 2;
        bar.scale.x = Math.max(0.001, len);
        t0.position.x = x0;
        t1.position.x = x1;
      };
      return { g, set };
    };
    const live = { iL: bracket(bracketMat.I, ROW_A), A: bracket(bracketMat.A, ROW_A), iR: bracket(bracketMat.I, ROW_A), H: bracket(bracketMat.H, ROW_H) };
    const ghost = { iL: bracket(ghostMat.I, GHOST_A), A: bracket(ghostMat.A, GHOST_A), iR: bracket(ghostMat.I, GHOST_A), H: bracket(ghostMat.H, GHOST_H) };
    const rb = bandsAt(SARC.relaxed);
    ghost.iL.set(-(rb.L / 2) * S, -MH);
    ghost.A.set(-MH, MH);
    ghost.iR.set(MH, (rb.L / 2) * S);
    ghost.H.set(-rb.actinTip * S, rb.actinTip * S);
    const ghostAll = [ghost.iL.g, ghost.A.g, ghost.iR.g, ghost.H.g, ...ghostZ];

    // ---------- anchors (moved in render with the structures they label) ----------
    const front = myosins.reduce((b, p) => (p[1] > b[1] ? p : b)); // thick filament nearest the camera
    const frontActin = actins.reduce((b, p) => (p[1] > b[1] ? p : b));
    const a = {
      z: anchorAt(root, 0, -1.25, 1.05, 'z-line'),
      m: anchorAt(root, 0, -1.15, 0.85, 'm-line'),
      actin: anchorAt(root, 0, frontActin[0], frontActin[1] + 0.08, 'actin'),
      myosin: anchorAt(root, -1.0, front[0], front[1] + R_MYO, 'myosin'),
      head: anchorAt(root, 2.3, front[0] + 0.25, front[1] + 0.3, 'myosin-head'),
      titin: anchorAt(root, 0, front[0], front[1] + 0.1, 'titin'),
      A: anchorAt(root, 0.6, ROW_A + 0.05, 0, 'a-band'),
      I: anchorAt(root, 0, ROW_A + 0.05, 0, 'i-band'),
      H: anchorAt(root, 0, ROW_H + 0.05, 0, 'h-zone'),
      ca: anchorAt(root, 0, 0, 0, 'calcium'),
    };
    const caLabelIdx = caPos.reduce((b, p, i) => (p.z > caPos[b]!.z ? i : b), 0);

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    const COCKED = (35 * Math.PI) / 180; // tilted away from the M-line (towards the Z-line)
    const STROKED = (-40 * Math.PI) / 180; // tilted towards the M-line after the power stroke

    /** Head state for the cycling heads during sliding (also frozen at its t = 1 value in step 3). */
    const cycle = (h: Head, t: number) => {
      const c = (((3 * t + h.off) % 1) + 1) % 1;
      return c < 0.6 ? { att: 1, phi: lerp(COCKED, STROKED, c / 0.6) } : { att: 0, phi: lerp(STROKED, COCKED, (c - 0.6) / 0.4) };
    };

    const render = (index: number, t: number) => {
      const L = lengthAt(index, t);
      const b = bandsAt(L);
      const zx = (L / 2) * S;
      const tip = b.actinTip * S;

      zLeft.position.x = -zx;
      zRight.position.x = zx;
      actinLeft.position.x = -zx;
      actinRight.position.x = zx;

      // titin: from each Z-line to the nearer end of every thick filament
      myosins.forEach(([y, z], i) => {
        sc.set(zx - MH, 1, 1);
        m4.compose(pos.set(MH, y, z), q.identity(), sc);
        titin.setMatrixAt(2 * i, m4);
        m4.compose(pos.set(-zx, y, z), q.identity(), sc);
        titin.setMatrixAt(2 * i + 1, m4);
      });
      titin.instanceMatrix.needsUpdate = true;

      // calcium: absent at rest, released in step 1, removed in step 4
      const caShow = index === 0 ? 0 : index === 1 ? ease(phase(t, 0, 0.35)) : index === 4 ? 1 - ease(phase(t, 0, 0.3)) : 1;
      caPos.forEach((p, i) => {
        sc.setScalar(Math.max(0.001, caShow));
        m4.compose(pos.set(p.x * 2 * zx * 0.92, p.y, p.z), q.identity(), sc);
        ca.setMatrixAt(i, m4);
      });
      ca.visible = caShow > 0.001;
      ca.instanceMatrix.needsUpdate = true;

      // myosin heads
      heads.forEach((h, i) => {
        const inOverlap = h.ax >= tip + 0.04;
        let att = 0;
        let phi = COCKED;
        if (index === 1 && inOverlap) att = ease(phase(t, 0.35, 0.9));
        else if ((index === 2 || index === 3) && inOverlap) ({ att, phi } = cycle(h, index === 2 ? t : 1));
        else if (index === 4) {
          const s = cycle(h, 1);
          const k = ease(phase(t, 0, 0.3));
          att = h.ax >= bandsAt(SARC.contracted).actinTip * S + 0.04 ? s.att * (1 - k) : 0;
          phi = lerp(s.phi, COCKED, k);
        }
        const reach = lerp(0.62 * h.gap, h.gap / Math.cos(phi), att);
        dir.copy(h.r).multiplyScalar(Math.cos(phi)).add(pos.set(h.sign * Math.sin(phi), 0, 0)).normalize();
        q.setFromUnitVectors(Y, dir);
        sc.set(1, reach / HEAD_LEN, 1);
        m4.compose(h.base, q, sc);
        headMesh.setMatrixAt(i, m4);
      });
      headMesh.instanceMatrix.needsUpdate = true;

      // brackets
      live.iL.set(-zx, -MH);
      live.A.set(-MH, MH);
      live.iR.set(MH, zx);
      live.H.set(-tip, tip);
      const g = index === 2 ? ease(phase(t, 0.2, 0.6)) : index === 3 ? 1 : index === 4 ? 1 - ease(phase(t, 0, 0.3)) : 0;
      for (const o of ghostAll) o.visible = g > 0.01;
      ghostMat.A.opacity = ghostMat.I.opacity = ghostMat.H.opacity = 0.5 * g;
      ghostMat.Z.opacity = 0.18 * g;

      // anchors follow their structures
      a.z.position.x = -zx + 0.05;
      a.actin.position.x = zx - 2.8;
      a.titin.position.x = -(zx + MH) / 2;
      a.I.position.x = -(zx + MH) / 2;
      a.H.position.x = 0;
      const cp = caPos[caLabelIdx]!;
      a.ca.position.set(cp.x * 2 * zx * 0.92, cp.y, cp.z);
    };
    render(0, 0);

    return {
      anchors: {
        'z-line': { object: a.z, highlight: [zLeft, zRight] },
        'm-line': { object: a.m, highlight: [mLine] },
        actin: { object: a.actin, highlight: [actinLeft, actinRight] },
        myosin: { object: a.myosin, highlight: [myosin] },
        'myosin-head': { object: a.head, highlight: [headMesh] },
        titin: { object: a.titin, highlight: [titin] },
        'a-band': { object: a.A, highlight: [live.A.g] },
        'i-band': { object: a.I, highlight: [live.iL.g, live.iR.g] },
        'h-zone': { object: a.H, highlight: [live.H.g] },
        calcium: { object: a.ca, highlight: [ca] },
      },
      durations: SARC_DURATIONS,
      render,
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
