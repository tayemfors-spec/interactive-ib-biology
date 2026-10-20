import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { prefersReducedMotion } from '../lib/prefs';
import { wireProcess } from '../lib/process-ui';
import type { LabelDef, SceneDef } from '../schemas';
import { PALETTE_KEYS, type BuiltScene, type PaletteKey, type SceneContext, type SceneModule } from './types';

const sceneModules = import.meta.glob<SceneModule>('../scenes/*.ts', { import: 'default' });

const CSS_VAR: Record<PaletteKey, string> = {
  head: '--bio-head', tail: '--bio-tail', protein: '--bio-protein', protein2: '--bio-protein-2', carb: '--bio-carb',
  chol: '--bio-chol', na: '--bio-na', k: '--bio-k', water: '--bio-water', glucose: '--bio-glucose',
  neutral: '--border-strong', text: '--text',
};

/** Resolve the theme's colours (light-dark() tokens) to concrete sRGB values via a probe element. */
function readPalette(host: HTMLElement): Record<PaletteKey, THREE.Color> {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  host.append(probe);
  const out = {} as Record<PaletteKey, THREE.Color>;
  for (const key of PALETTE_KEYS) {
    probe.style.color = `var(${CSS_VAR[key]})`;
    out[key] = new THREE.Color(getComputedStyle(probe).color);
  }
  probe.remove();
  return out;
}

/** True if this object is drawn and solid enough to hide what is behind it. */
function blocksView(o: THREE.Object3D): boolean {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
  const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
  const m = Array.isArray(mat) ? mat[0] : mat;
  return !!m && m.visible && !(m.transparent && m.opacity < 0.5);
}

export interface ViewerHandle { dispose(): void; sample(): { drawn: number; colours: number }; azimuth(): number }

export async function mountViewer(fig: HTMLElement, scenes: SceneDef[]): Promise<ViewerHandle> {
  const stage = fig.querySelector<HTMLElement>('[data-stage]')!;
  const canvas = fig.querySelector<HTMLCanvasElement>('canvas')!;
  const layer = fig.querySelector<HTMLElement>('[data-labels]')!;
  const info = fig.querySelector<HTMLElement>('[data-info]')!;
  const processRoot = fig.querySelector<HTMLElement>('[data-process]')!;
  const labelsBtn = fig.querySelector<HTMLButtonElement>('[data-labels-toggle]')!;
  const motionBtn = fig.querySelector<HTMLButtonElement>('[data-idle-toggle]')!;
  const keyList = fig.querySelector<HTMLOListElement>('[data-key3d]')!;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const maxDpr = window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.enablePan = false;

  let palette = readPalette(fig);
  let materials: { key: PaletteKey; mat: THREE.MeshStandardMaterial }[] = [];
  let tracked: { dispose(): void }[] = [];
  let built: BuiltScene | null = null;
  let current: SceneDef | null = null;
  let detachProcess: (() => void) | null = null;
  let labelEls: { def: LabelDef; el: HTMLButtonElement; pos: THREE.Vector3; dimmed: boolean }[] = [];
  let selected: string | null = null;
  let stepId: string | null = null; // current process step, for labels limited to some steps
  let highlighted: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }[] = [];
  let labelsOn = true;
  let idleOn = false;
  let dirty = true;
  let onScreen = true;
  let visible = true; // on screen and the tab is in the foreground
  let raf = 0;
  let frame = 0;
  let last = performance.now();
  const ray = new THREE.Raycaster();
  const v = new THREE.Vector3();

  const ctx: SceneContext = {
    THREE,
    scene,
    material(key, opts = {}) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.0, ...opts, color: palette[key] });
      materials.push({ key, mat });
      tracked.push(mat);
      return mat;
    },
    track(r) { tracked.push(r); return r; },
    reducedMotion: prefersReducedMotion(),
  };

  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    dirty = true;
    if (built) renderNow();
    start();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // ---------- labels ----------
  const clearHighlight = () => {
    for (const h of highlighted) h.mesh.material = h.original;
    highlighted = [];
  };
  const select = (id: string | null) => {
    selected = id;
    clearHighlight();
    for (const l of labelEls) l.el.setAttribute('aria-pressed', String(l.def.id === id));
    if (!id || !built) { info.innerHTML = '<p class="hint">Select a label to read about that structure.</p>'; dirty = true; return; }
    const def = current!.labels.find((l) => l.id === id)!;
    const anchor = built.anchors[id]!;
    const targets = anchor.highlight ?? [anchor.object];
    for (const t of targets) t.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const original = o.material;
      const base = (Array.isArray(original) ? original[0] : original) as THREE.MeshStandardMaterial;
      const hi = base.clone();
      hi.emissive = new THREE.Color(0xffd54a);
      hi.emissiveIntensity = 0.55;
      tracked.push(hi);
      o.material = hi;
      highlighted.push({ mesh: o, original });
    });
    info.innerHTML = '';
    const h = document.createElement('p');
    h.className = 'info-name';
    const n = document.createElement('span');
    n.className = 'n';
    n.setAttribute('aria-hidden', 'true');
    n.textContent = String(current!.labels.indexOf(def) + 1);
    h.append(n, def.name);
    if (def.level === 'AHL') { const b = document.createElement('span'); b.className = 'badge badge-ahl'; b.textContent = 'AHL'; h.append(' ', b); }
    const p = document.createElement('p');
    p.textContent = def.text;
    info.append(h, p);
    dirty = true;
  };

  const buildLabels = (defs: LabelDef[]) => {
    layer.replaceChildren();
    labelEls = defs.map((def, idx) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'label3d';
      el.dataset.id = def.id;
      el.setAttribute('aria-pressed', 'false');
      el.setAttribute('aria-label', `${idx + 1}. ${def.name}`);
      // Number + name: on narrow screens only the number shows (CSS), and the info panel gives the name.
      const num = document.createElement('span');
      num.className = 'n';
      num.textContent = String(idx + 1);
      const txt = document.createElement('span');
      txt.className = 't';
      txt.textContent = def.name;
      el.append(num, txt);
      if (def.level === 'AHL') el.dataset.level = 'AHL';
      const anchor = built!.anchors[def.id];
      if (anchor) el.dataset.resolved = 'true';
      else console.error(`[viewer3d] label "${def.id}" has no anchor in scene ${current?.module}`);
      el.addEventListener('click', () => select(selected === def.id ? null : def.id));
      // Keyboard users select by tabbing onto a label; mouse clicks are handled by 'click' alone.
      el.addEventListener('focus', () => { if (el.matches(':focus-visible') && selected !== def.id) select(def.id); });
      layer.append(el);
      return { def, el, pos: new THREE.Vector3(), dimmed: false };
    });
    // Numbered key (shown on narrow screens, where markers show numbers only).
    keyList.replaceChildren(...defs.map((def, idx) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${idx + 1}. ${def.name}`;
      b.addEventListener('click', () => select(def.id));
      li.append(b);
      return li;
    }));
  };

  const placeLabels = () => {
    if (!built) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const checkOcclusion = frame % 8 === 0;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const items: { l: (typeof labelEls)[number]; x: number; y: number }[] = [];
    for (const l of labelEls) {
      const a = built.anchors[l.def.id];
      if (!a) continue;
      a.object.getWorldPosition(l.pos);
      v.copy(l.pos).project(camera);
      const offStep = !!l.def.steps && !!stepId && !l.def.steps.includes(stepId);
      const keyItem = keyList.children[labelEls.indexOf(l)] as HTMLElement | undefined;
      if (keyItem) keyItem.hidden = offStep;
      const hidden = offStep || !labelsOn || v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
      l.el.hidden = hidden && l.def.id !== selected;
      if (l.el.hidden) continue;
      items.push({ l, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h });
      if (checkOcclusion) {
        const dist = camera.position.distanceTo(l.pos);
        ray.set(camera.position, v.copy(l.pos).sub(camera.position).normalize());
        // Raycasting ignores visibility, so skip hidden or mostly see-through meshes: they don't block a label.
        const hit = ray.intersectObjects(scene.children, true).find((h) => blocksView(h.object));
        const own = (a.highlight ?? [a.object]).some((o) => { let n: THREE.Object3D | null = hit?.object ?? null; while (n) { if (n === o) return true; n = n.parent; } return false; });
        l.dimmed = !!hit && hit.distance < dist - 0.25 && !own;
        l.el.classList.toggle('dimmed', l.dimmed);
      }
    }
    // Keep chips from overlapping (overlapping touch targets are hard to tap): top to bottom,
    // nudge each chip down until it clears the chips already placed.
    items.sort((p, q) => p.y - q.y);
    for (const it of items) {
      const cw = it.l.el.offsetWidth;
      const ch = it.l.el.offsetHeight;
      const narrow = cw === ch; // numbered marker (phones), centred on the point
      // A chip normally extends to the right of its point; near the right edge it flips to the left,
      // so its dot still sits on the structure.
      const flip = !narrow && it.x + cw - 7 > w - 2;
      it.l.el.classList.toggle('flip', flip);
      const left = () => (narrow ? it.x - cw / 2 : flip ? it.x - cw + 7 : it.x - 7);
      const top = () => it.y - ch / 2;
      for (let guard = 0; guard < 12; guard++) {
        const clash = placed.find((r) => left() < r.x + r.w + 2 && left() + cw + 2 > r.x && top() < r.y + r.h + 2 && top() + ch + 2 > r.y);
        if (!clash) break;
        it.y = clash.y + clash.h + 3 + ch / 2;
      }
      // keep the chip inside the stage
      if (narrow) it.x = Math.max(cw / 2 + 2, Math.min(w - cw / 2 - 2, it.x));
      else if (!flip) it.x = Math.max(9, it.x);
      else it.x = Math.max(cw - 5, it.x);
      it.y = Math.max(ch / 2 + 2, Math.min(h - ch / 2 - 2, it.y));
      placed.push({ x: left(), y: top(), w: cw, h: ch });
      it.l.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
    }
  };

  // ---------- render loop ----------
  /** Draw one frame right now (does not depend on the animation loop running). */
  const renderNow = () => {
    if (!stage.clientWidth) return;
    controls.update();
    renderer.render(scene, camera);
    placeLabels();
    dirty = false;
    fig.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
  };
  const loop = (now: number) => {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    frame++;
    const moved = controls.update();
    if (idleOn && visible && built?.idle) { built.idle(dt); dirty = true; }
    if (moved || dirty) {
      renderer.render(scene, camera);
      placeLabels();
      dirty = false;
      fig.dataset.azimuth = controls.getAzimuthalAngle().toFixed(3);
    }
    // Keep looping while on screen (or while the camera is still easing to a stop).
    if (visible || moved) raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  controls.addEventListener('change', () => { dirty = true; start(); });

  const syncRunning = () => { visible = onScreen && !document.hidden; if (visible) { dirty = true; start(); } else stop(); };
  const io = new IntersectionObserver((entries) => { onScreen = entries.some((e) => e.isIntersecting); syncRunning(); });
  io.observe(stage);
  const onVis = () => syncRunning();
  document.addEventListener('visibilitychange', onVis);

  // ---------- theme ----------
  const recolor = () => {
    palette = readPalette(fig);
    for (const { key, mat } of materials) mat.color.copy(palette[key]);
    dirty = true;
  };
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', recolor);
  window.addEventListener('ibbio:prefs', recolor);

  // ---------- scenes ----------
  const unloadScene = () => {
    detachProcess?.();
    detachProcess = null;
    clearHighlight();
    built?.dispose?.();
    for (const r of tracked) r.dispose();
    tracked = [];
    materials = [];
    for (const child of [...scene.children]) if (!(child instanceof THREE.Light)) scene.remove(child);
    built = null;
  };

  const loadScene = async (def: SceneDef) => {
    unloadScene();
    current = def;
    const loader = sceneModules[`../scenes/${def.module}.ts`];
    if (!loader) throw new Error(`[viewer3d] missing scene module src/scenes/${def.module}.ts`);
    const mod = await loader();
    ctx.reducedMotion = prefersReducedMotion();
    built = await mod.build(ctx);
    // Instanced meshes are culled using a bounding sphere computed once; instances that move later
    // could wrongly vanish. They are cheap to draw, so never cull them.
    scene.traverse((o) => { if (o instanceof THREE.InstancedMesh) o.frustumCulled = false; });
    const c = mod.camera;
    camera.fov = c.fov ?? 40;
    camera.position.set(...c.position);
    controls.target.set(...c.target);
    // Narrow (portrait-ish) stages see less width: step the camera back so the whole model fits.
    const aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
    if (aspect < 4 / 3) {
      const offset = camera.position.clone().sub(controls.target);
      camera.position.copy(controls.target).add(offset.multiplyScalar(Math.min(1.7, (4 / 3) / aspect)));
    }
    controls.minDistance = c.minDistance;
    controls.maxDistance = c.maxDistance * 1.7;
    controls.update();
    controls.saveState();
    stepId = null;
    buildLabels(def.labels);
    select(null);
    if (def.steps.length && built.render) {
      const render = built.render.bind(built);
      detachProcess = wireProcess(processRoot, def.steps, (i, t) => { stepId = def.steps[i]?.id ?? null; render(i, t); dirty = true; start(); }, { durations: built.durations, keyTarget: stage }).detach;
    }
    motionBtn.hidden = !built.idle;
    fig.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === def.id)));
    resize();
    renderNow();
    start();
  };

  // ---------- controls ----------
  const rotate = (dAz: number, dPol = 0) => {
    const offset = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.theta += dAz;
    sph.phi = THREE.MathUtils.clamp(sph.phi + dPol, 0.15, Math.PI - 0.15);
    camera.position.copy(controls.target).add(offset.setFromSpherical(sph));
    controls.update();
    dirty = true; start();
  };
  const zoom = (factor: number) => {
    const offset = camera.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(len));
    controls.update();
    dirty = true; start();
  };
  const reset = () => { controls.reset(); dirty = true; start(); };
  const toggleLabels = () => { labelsOn = !labelsOn; labelsBtn.setAttribute('aria-pressed', String(labelsOn)); dirty = true; start(); };
  const step = Math.PI / 12;
  const handlers: Record<string, () => void> = {
    'rotate-left': () => rotate(-step), 'rotate-right': () => rotate(step),
    'zoom-in': () => zoom(0.85), 'zoom-out': () => zoom(1 / 0.85), reset,
  };
  const clicks: [Element, () => void][] = [];
  fig.querySelectorAll<HTMLButtonElement>('[data-cam]').forEach((b) => { const fn = handlers[b.dataset.cam!]!; b.addEventListener('click', fn); clicks.push([b, fn]); });
  const onLabels = () => toggleLabels();
  labelsBtn.addEventListener('click', onLabels);
  const onIdle = () => { idleOn = !idleOn; motionBtn.setAttribute('aria-pressed', String(idleOn)); start(); };
  motionBtn.addEventListener('click', onIdle);
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== stage) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => rotate(-step), ArrowRight: () => rotate(step), ArrowUp: () => rotate(0, -step / 2), ArrowDown: () => rotate(0, step / 2),
      '+': () => zoom(0.85), '=': () => zoom(0.85), '-': () => zoom(1 / 0.85), '0': reset, Home: reset,
      l: toggleLabels, L: toggleLabels, Escape: () => select(null),
    };
    const fn = map[e.key];
    if (fn) { e.preventDefault(); fn(); }
  };
  stage.addEventListener('keydown', onKey);
  const sceneButtons = [...fig.querySelectorAll<HTMLButtonElement>('[data-scene]')];
  const onScene = (e: Event) => { const id = (e.currentTarget as HTMLElement).dataset.scene; const def = scenes.find((s) => s.id === id); if (def && def !== current) void loadScene(def); };
  sceneButtons.forEach((b) => b.addEventListener('click', onScene));

  await loadScene(scenes[0]!);

  return {
    azimuth: () => controls.getAzimuthalAngle(),
    sample() {
      renderer.render(scene, camera);
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d')!;
      g.drawImage(canvas, 0, 0, 32, 32);
      const px = g.getImageData(0, 0, 32, 32).data;
      let drawn = 0;
      const colours = new Set<number>();
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3]! > 16) { drawn++; colours.add(((px[i]! >> 4) << 8) | ((px[i + 1]! >> 4) << 4) | (px[i + 2]! >> 4)); }
      }
      return { drawn: drawn / 1024, colours: colours.size };
    },
    dispose() {
      stop();
      unloadScene();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener('change', recolor);
      window.removeEventListener('ibbio:prefs', recolor);
      stage.removeEventListener('keydown', onKey);
      for (const [b, fn] of clicks) b.removeEventListener('click', fn);
      labelsBtn.removeEventListener('click', onLabels);
      motionBtn.removeEventListener('click', onIdle);
      sceneButtons.forEach((b) => b.removeEventListener('click', onScene));
      controls.dispose();
      renderer.dispose();
      layer.replaceChildren();
      keyList.replaceChildren();
    },
  };
}
