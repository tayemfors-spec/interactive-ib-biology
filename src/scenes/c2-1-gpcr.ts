import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
import { ease, phase } from '../lib/timeline';
import { along, bilayer, noCull, nucleotide } from './c2-1-kit';

/*
 * C2.1.9–10 adrenaline (epinephrine) signalling in a liver cell through a G protein-coupled receptor.
 * Steps: 0 resting · 1 adrenaline binds · 2 G protein activated (GDP→GTP, α separates) ·
 * 3 adenylyl cyclase makes cAMP · 4 kinase cascade (amplification) · 5 glycogen broken down · 6 switching off.
 * Topology that matters: seven transmembrane helices; ligand binds on the outside; G protein and the
 * catalytic part of adenylyl cyclase are on the cytoplasmic face; α carries GDP (2 phosphates) or GTP (3).
 */
const MEM_Y = 2; // bilayer mid-plane; heads at 3.7 (outer) and 0.3 (inner)
const RX = -4; // receptor
const AX = 1.6; // adenylyl cyclase
const G_Y = -0.75; // G protein centre (just under the inner heads)

const scene: SceneModule = {
  camera: { position: [0, 1.4, 21], target: [0, -0.6, 0], fov: 42, minDistance: 7, maxDistance: 38 },

  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.add(root);
    const rand = rng(11);
    const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

    bilayer(ctx, root, { y: MEM_Y, x: [-7.6, 7.6], z: [-2.6, 1.0], holes: [{ x: RX, z: 0, r: 1.45 }, { x: AX, z: 0, r: 1.35 }], seed: 5 });

    // ---------- receptor: seven transmembrane helices around a ligand-binding pocket ----------
    const mRec = ctx.material('protein', { roughness: 0.45 });
    const receptor = new THREE.Group();
    receptor.position.set(RX, MEM_Y, 0);
    const helixGeo = ctx.track(new THREE.CylinderGeometry(0.3, 0.3, 5.0, 12));
    const helices: THREE.Mesh[] = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const h = new THREE.Mesh(helixGeo, mRec);
      h.position.set(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82);
      receptor.add(h);
      helices.push(h);
    }
    // extracellular and intracellular loops, drawn as flattened caps
    const loopOut = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.82, 0.16, 8, 24)), mRec);
    loopOut.rotation.x = Math.PI / 2;
    loopOut.position.y = 2.5;
    const loopIn = loopOut.clone();
    loopIn.position.y = -2.5;
    receptor.add(loopOut, loopIn);
    root.add(receptor);

    // ---------- adrenaline: a benzene ring (catechol) with a short side chain ----------
    const mAdr = ctx.material('k', { roughness: 0.35 });
    const adrenaline = new THREE.Group();
    const ring = new THREE.Mesh(ctx.track(new THREE.TorusGeometry(0.3, 0.1, 6, 6)), mAdr);
    const side = new THREE.Mesh(ctx.track(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6)), mAdr);
    side.rotation.z = Math.PI / 2;
    side.position.set(0.62, 0, 0);
    const nH = new THREE.Mesh(ctx.track(new THREE.SphereGeometry(0.14, 8, 6)), mAdr);
    nH.position.set(1.0, 0, 0);
    adrenaline.add(ring, side, nH);
    adrenaline.scale.setScalar(1.35);
    root.add(adrenaline);
    const ADR_FREE = v(-1.7, 5.8, 1.2);
    const ADR_BOUND = v(RX - 0.3, MEM_Y + 2.85, 0.5);

    // ---------- G protein: α (with GDP/GTP), β and γ on the cytoplasmic face ----------
    const alpha = new THREE.Mesh(ctx.track(blobGeometry(0.75, 1.6, 61, 0.1)), ctx.material('protein2', { roughness: 0.45 }));
    alpha.rotation.z = Math.PI / 2;
    const beta = new THREE.Mesh(ctx.track(blobGeometry(0.7, 1.4, 62, 0.12)), ctx.material('chol', { roughness: 0.5 }));
    const gamma = new THREE.Mesh(ctx.track(blobGeometry(0.32, 1.2, 63, 0.1)), ctx.material('carb', { roughness: 0.5 }));
    gamma.rotation.z = 0.6;
    const betaGamma = new THREE.Group();
    beta.position.set(0, 0, 0);
    gamma.position.set(-0.75, 0.35, 0.3);
    betaGamma.add(beta, gamma);
    root.add(alpha, betaGamma);
    const A_HOME = v(RX + 1.0, G_Y, 0.55);
    const A_AC = v(AX - 1.55, G_Y - 0.15, 0.6);
    const BG_HOME = v(RX - 0.75, G_Y - 0.15, -0.2);
    const BG_AWAY = v(RX - 2.0, G_Y - 0.05, -0.4);

    const gdp = nucleotide(ctx, 2);
    const gtp = nucleotide(ctx, 3);
    root.add(gdp, gtp);
    const NUC_OFF = v(0.15, -0.55, 0.75); // nucleotide site on α, relative to α
    const GDP_GONE = v(RX + 2.6, -3.6, 1.6);
    const GTP_FROM = v(RX + 3.2, -3.4, 1.4);

    // ---------- adenylyl cyclase: transmembrane anchor + large catalytic domain in the cytoplasm ----------
    const mAC = ctx.material('protein', { roughness: 0.5 });
    const ac = new THREE.Group();
    ac.position.set(AX, 0, 0);
    const acTm = new THREE.Mesh(ctx.track(blobGeometry(0.95, 4.6, 70, 0.1)), mAC);
    acTm.position.y = MEM_Y;
    const acCat = new THREE.Mesh(ctx.track(blobGeometry(1.15, 2.6, 71, 0.12)), mAC);
    acCat.rotation.z = Math.PI / 2;
    acCat.position.set(0.3, -1.05, 0.1);
    ac.add(acTm, acCat);
    root.add(ac);

    const atp = nucleotide(ctx, 3);
    root.add(atp);
    const ATP_AT = v(AX + 1.8, -1.9, 1.1);

    // ---------- cAMP: a ring (cyclic) ----------
    const N_CAMP = 14;
    const campGeo = ctx.track(new THREE.TorusGeometry(0.2, 0.08, 6, 12));
    const camp = new THREE.InstancedMesh(campGeo, ctx.material('tail', { roughness: 0.35 }), N_CAMP);
    root.add(camp);
    const campSpot = Array.from({ length: N_CAMP }, (_, i) => v(-0.6 + (i % 7) * 0.95 + rand() * 0.3, -2.25 - Math.floor(i / 7) * 0.65 - rand() * 0.2, -0.6 + rand() * 1.6));
    const CAMP_SRC = v(AX + 0.8, -1.7, 0.6);

    // ---------- protein kinase A: regulatory (R) + catalytic (C) subunits; cAMP releases C ----------
    const pkaR = new THREE.InstancedMesh(ctx.track(blobGeometry(0.42, 1.0, 80, 0.1)), ctx.material('neutral', { roughness: 0.5 }), 2);
    const pkaC = new THREE.InstancedMesh(ctx.track(blobGeometry(0.45, 1.0, 81, 0.12)), ctx.material('na', { roughness: 0.45 }), 2);
    root.add(pkaR, pkaC);
    const PKA = [v(0.6, -3.6, 0.4), v(3.6, -3.5, 0.2)];

    // ---------- cascade: phosphorylase kinase (4) then glycogen phosphorylase (8), each phosphorylated ----------
    const phk = new THREE.InstancedMesh(ctx.track(blobGeometry(0.36, 0.9, 82, 0.1)), ctx.material('water', { roughness: 0.45 }), 4);
    const gp = new THREE.InstancedMesh(ctx.track(blobGeometry(0.3, 0.75, 83, 0.1)), ctx.material('protein', { roughness: 0.45 }), 8);
    root.add(phk, gp);
    const PHK = Array.from({ length: 4 }, (_, i) => v(-0.2 + i * 1.55, -4.75, 0.2 + (i % 2) * 0.4));
    const GP = Array.from({ length: 8 }, (_, i) => v(-1.6 + i * 0.95, -5.9 - (i % 2) * 0.3, 0.4 - (i % 3) * 0.3));
    const phos = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.13, 8, 6)), ctx.material('head', { roughness: 0.35 }), 12);
    root.add(phos);

    // ---------- glycogen: a branched chain of glucose units ----------
    const glyPts: THREE.Vector3[] = [];
    const chain = (x0: number, y0: number, dx: number, dy: number, n: number) => { for (let i = 0; i < n; i++) glyPts.push(v(x0 + dx * i, y0 + dy * i, 0.3 + Math.sin(i) * 0.15)); };
    chain(-6.8, -3.4, 0.36, -0.2, 10);
    chain(-5.7, -4.1, 0.3, -0.28, 8);
    chain(-4.6, -3.6, 0.38, -0.08, 6);
    chain(-6.2, -5.2, 0.4, -0.12, 7);
    const glycogen = new THREE.InstancedMesh(ctx.track(new THREE.SphereGeometry(0.18, 8, 6)), ctx.material('carb', { roughness: 0.5 }), glyPts.length);
    root.add(glycogen);
    // glucose released: the ends of chains are removed one unit at a time
    const N_GLC = 12;
    const glc = new THREE.InstancedMesh(ctx.track(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 6)), ctx.material('glucose', { roughness: 0.4 }), N_GLC);
    root.add(glc);
    const removable = [9, 17, 23, 30, 8, 16, 22, 29, 7, 15, 21, 28]; // chain ends first
    const GLC_TO = Array.from({ length: N_GLC }, (_, i) => v(-7 + (i % 6) * 0.55, -6.6 - Math.floor(i / 6) * 0.55, 1.3 - (i % 3) * 0.3));

    noCull(root);
    const tmp = new THREE.Vector3();
    const hide = (m: THREE.InstancedMesh, i: number) => setInstance(m, i, tmp.set(0, -50, 0), undefined, 0.001);

    const anchors = {
      adrenaline: { object: anchorAt(adrenaline, 0, 0.35, 0, 'adrenaline'), highlight: [adrenaline] },
      receptor: { object: anchorAt(root, RX - 0.9, MEM_Y + 2.6, 0.9, 'receptor'), highlight: [receptor] },
      'g-protein': { object: anchorAt(root, RX + 0.2, G_Y - 0.9, 1.0, 'g-protein'), highlight: [alpha, betaGamma] },
      gdp: { object: anchorAt(gdp, 0.3, -0.1, 0.2, 'gdp'), highlight: [gdp] },
      alpha: { object: anchorAt(alpha, 0, 0, 0.75, 'alpha'), highlight: [alpha] },
      'beta-gamma': { object: anchorAt(betaGamma, -0.3, -0.4, 0.6, 'beta-gamma'), highlight: [betaGamma] },
      gtp: { object: anchorAt(gtp, 0.4, -0.1, 0.2, 'gtp'), highlight: [gtp] },
      'adenylyl-cyclase': { object: anchorAt(root, AX + 0.9, MEM_Y + 1.9, 0.9, 'adenylyl-cyclase'), highlight: [ac] },
      atp: { object: anchorAt(atp, 0.3, 0, 0.2, 'atp'), highlight: [atp] },
      camp: { object: anchorAt(root, 4.6, -2.3, 0.8, 'camp'), highlight: [camp] },
      pka: { object: anchorAt(root, PKA[1]!.x + 0.9, PKA[1]!.y, 0.6, 'pka'), highlight: [pkaR, pkaC] },
      cascade: { object: anchorAt(root, 5.5, -5.9, 0.6, 'cascade'), highlight: [phk, gp] },
      glycogen: { object: anchorAt(root, -5.4, -3.4, 0.6, 'glycogen'), highlight: [glycogen] },
      glucose: { object: anchorAt(root, -6.2, -6.9, 1.2, 'glucose'), highlight: [glc] },
      outside: { object: anchorAt(root, 5.4, 5.6, -1.0, 'outside'), highlight: [] },
      cytoplasm: { object: anchorAt(root, 6.9, -3.6, -1.0, 'cytoplasm'), highlight: [] },
    };

    return {
      anchors,
      durations: [4, 5, 7, 6, 7, 6, 7],
      render(index, t) {
        const at = (i: number) => (index > i ? 1 : index === i ? t : 0); // progress through step i
        const s1 = at(1), s2 = at(2), s3 = at(3), s4 = at(4), s5 = at(5), s6 = at(6);

        // adrenaline binds (step 1) and leaves again when the signal is switched off (step 6)
        const bound = ease(phase(s1, 0.05, 0.6)) * (1 - ease(phase(s6, 0.05, 0.4)));
        const wob = index === 0 ? Math.sin(t * 9) * 0.15 : 0;
        adrenaline.position.copy(ADR_FREE).lerp(ADR_BOUND, bound);
        adrenaline.position.y += wob;
        adrenaline.rotation.set(0.4, 0.3 + (1 - bound) * 1.2, bound * 0.6);
        // conformational change: helices tilt while the ligand is bound
        helices.forEach((h, k) => { h.rotation.z = bound * 0.09 * Math.cos((k / 7) * Math.PI * 2); h.rotation.x = bound * 0.09 * Math.sin((k / 7) * Math.PI * 2); });

        // α moves off the receptor to adenylyl cyclase, then back again when GTP is hydrolysed
        const leave = ease(phase(s2, 0.55, 1)) * (1 - ease(phase(s6, 0.5, 0.95)));
        alpha.position.copy(A_HOME).lerp(A_AC, leave);
        betaGamma.position.copy(BG_HOME).lerp(BG_AWAY, ease(phase(s2, 0.55, 0.9)) * (1 - ease(phase(s6, 0.5, 0.95))));

        // nucleotide on α: GDP → (released) → GTP → (hydrolysed in step 6) → GDP
        const site = tmp.copy(alpha.position).add(NUC_OFF);
        const gdpOut = ease(phase(s2, 0.05, 0.3));
        const gtpIn = ease(phase(s2, 0.25, 0.5));
        const hydrolysed = phase(s6, 0.1, 0.35) >= 1;
        if (index < 6 || !hydrolysed) {
          gdp.visible = gdpOut < 1;
          gdp.position.copy(site).lerp(GDP_GONE, gdpOut);
          gdp.scale.setScalar(1 - gdpOut * 0.6);
          gtp.visible = gtpIn > 0;
          gtp.position.copy(GTP_FROM).lerp(site, gtpIn);
          gtp.scale.setScalar(1);
        } else {
          // GTP → GDP + Pi on α: show GDP back in the site
          gtp.visible = false;
          gdp.visible = true;
          gdp.scale.setScalar(1);
          gdp.position.copy(site);
        }

        // adenylyl cyclase converts ATP → cAMP (step 3); phosphodiesterase removes cAMP (step 6)
        atp.visible = index === 3;
        atp.position.copy(ATP_AT).lerp(v(AX + 1.0, -1.6, 0.9), ease(phase(s3, 0, 0.15)));
        atp.scale.setScalar(index === 3 ? 1 - 0.5 * phase(s3, 0.85, 1) : 1);
        const campGone = ease(phase(s6, 0.3, 0.75));
        for (let i = 0; i < N_CAMP; i++) {
          const born = ease(phase(s3, 0.12 + i * 0.05, 0.3 + i * 0.05));
          if (born <= 0 || campGone >= 1) { hide(camp, i); continue; }
          // four cAMP move on to bind the two PKA regulatory subunits in step 4
          let p = tmp.copy(CAMP_SRC).lerp(campSpot[i]!, born);
          if (i < 4) p = p.lerp(PKA[i >> 1]!.clone().add(v((i % 2) * 0.5 - 0.25, 0.55, 0.45)), ease(phase(s4, 0, 0.3)));
          if (index < 6) p.y += Math.sin(t * 7 + i) * 0.05;
          setInstance(camp, i, p, new THREE.Euler(0.8, i, 0), 1 - campGone);
        }
        camp.count = N_CAMP;
        camp.instanceMatrix.needsUpdate = true;

        // PKA: catalytic subunits are released from the regulatory subunits once cAMP binds
        const cFree = ease(phase(s4, 0.25, 0.45)) * (1 - ease(phase(s6, 0.5, 0.95)));
        PKA.forEach((p, i) => {
          setInstance(pkaR, i, p, new THREE.Euler(0, 0, Math.PI / 2));
          setInstance(pkaC, i, tmp.copy(p).add(v(0, -0.55 - cFree * 0.45, 0.1 + cFree * 0.4)), new THREE.Euler(0, 0, Math.PI / 2));
        });
        pkaR.instanceMatrix.needsUpdate = true;
        pkaC.instanceMatrix.needsUpdate = true;

        // phosphorylation cascade (amplification): 2 PKA → 4 phosphorylase kinase → 8 glycogen phosphorylase
        const phkOn = phase(s4, 0.45, 0.7) * (1 - phase(s6, 0.5, 0.9));
        const gpOn = phase(s4, 0.7, 0.95) * (1 - phase(s6, 0.5, 0.9));
        PHK.forEach((p, i) => setInstance(phk, i, p, new THREE.Euler(0, 0, Math.PI / 2), 1 + 0.12 * ease(phkOn)));
        GP.forEach((p, i) => setInstance(gp, i, p, new THREE.Euler(0, 0, Math.PI / 2), 1 + 0.12 * ease(gpOn)));
        phk.instanceMatrix.needsUpdate = true;
        gp.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < 12; i++) {
          const isPhk = i < 4;
          const p = isPhk ? PHK[i]! : GP[i - 4]!;
          const on = isPhk ? phase(phkOn, i * 0.15, i * 0.15 + 0.4) : phase(gpOn, (i - 4) * 0.07, (i - 4) * 0.07 + 0.4);
          if (on <= 0) { hide(phos, i); continue; }
          setInstance(phos, i, tmp.copy(p).add(v(isPhk ? 0.55 : 0.45, 0.28, 0.3)), undefined, ease(on));
        }
        phos.instanceMatrix.needsUpdate = true;

        // glycogen phosphorylase removes glucose units from the chain ends (step 5)
        const removed = Math.floor(ease(phase(s5, 0.05, 0.85)) * N_GLC + 1e-6);
        glyPts.forEach((p, i) => {
          const k = removable.indexOf(i);
          if (k >= 0 && k < removed) hide(glycogen, i);
          else setInstance(glycogen, i, p);
        });
        glycogen.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < N_GLC; i++) {
          if (i >= removed) { hide(glc, i); continue; }
          const from = glyPts[removable[i]!]!;
          const u = index === 5 ? ease(phase(t, 0.05 + (i / N_GLC) * 0.8 + 0.05, 0.05 + (i / N_GLC) * 0.8 + 0.2)) : 1;
          setInstance(glc, i, along([from, GLC_TO[i]!], u, tmp), new THREE.Euler(Math.PI / 2, 0, 0));
        }
        glc.instanceMatrix.needsUpdate = true;
      },
      dispose() { root.removeFromParent(); },
    };
  },
};

export default scene;
