import { Timeline } from './timeline';
import { prefersReducedMotion } from './prefs';

export interface StepText { id: string; title: string; caption: string; level?: string }

const PLAY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const PAUSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>';

/**
 * Connect a [data-process] control block to a timeline. Returns a function that detaches it.
 * `keyTarget` gets keyboard shortcuts: Space play/pause, comma/period or [ ] step.
 */
export function wireProcess(
  root: HTMLElement,
  steps: StepText[],
  render: (index: number, t: number) => void,
  opts: { durations?: number[]; keyTarget?: HTMLElement } = {},
): { timeline: Timeline; detach: () => void } {
  const tl = new Timeline(
    steps.map((s, i) => ({ id: s.id, duration: opts.durations?.[i] ?? 4 })),
    render,
    prefersReducedMotion(),
  );
  root.hidden = false;
  const play = root.querySelector<HTMLButtonElement>('[data-p-play]')!;
  const playIcon = root.querySelector<HTMLElement>('[data-p-play-icon]')!;
  const playLabel = root.querySelector<HTMLElement>('[data-p-play-label]')!;
  const prev = root.querySelector<HTMLButtonElement>('[data-p-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-p-next]')!;
  const speed = root.querySelector<HTMLSelectElement>('[data-p-speed]')!;
  const list = root.querySelector<HTMLOListElement>('[data-p-steps]')!;
  const caption = root.querySelector<HTMLElement>('[data-p-caption]')!;
  const reducedNote = root.querySelector<HTMLElement>('[data-p-reduced]')!;

  list.replaceChildren(
    ...steps.map((s, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${i + 1}. ${s.title}`;
      if (s.level === 'AHL' && !/\bAHL\b/.test(s.title)) {
        const tag = document.createElement('span');
        tag.className = 'step-ahl';
        tag.textContent = ' AHL';
        b.append(tag);
      }
      b.addEventListener('click', () => { tl.pause(); tl.seek(i, tl.reduced ? 1 : 0); });
      li.append(b);
      return li;
    }),
  );

  let lastIndex = -1;
  const sync = () => {
    play.disabled = tl.reduced;
    playIcon.innerHTML = tl.playing ? PAUSE : PLAY;
    playLabel.textContent = tl.playing ? 'Pause' : 'Play';
    reducedNote.hidden = !tl.reduced;
    prev.disabled = tl.index === 0 && (tl.reduced || tl.t < 0.05);
    next.disabled = tl.index === steps.length - 1 && tl.t >= 1;
    if (tl.index !== lastIndex) {
      lastIndex = tl.index;
      const s = steps[tl.index]!;
      // Only announce when the step changes, not on every frame.
      caption.innerHTML = '';
      const t = document.createElement('span');
      t.className = 'cap-title';
      t.textContent = `Step ${tl.index + 1} of ${steps.length}: ${s.title}${s.level === 'AHL' && !/\bAHL\b/.test(s.title) ? ' (AHL)' : ''}`;
      const p = document.createElement('p');
      p.textContent = s.caption;
      caption.append(t, p);
      list.querySelectorAll('button').forEach((b, i) => (i === tl.index ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    }
  };
  const off = tl.onChange(sync);
  play.addEventListener('click', () => tl.toggle());
  prev.addEventListener('click', () => tl.prev());
  next.addEventListener('click', () => tl.next());
  speed.addEventListener('change', () => tl.setSpeed(Number(speed.value)));

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); tl.toggle(); }
    else if (e.key === '.' || e.key === ']') { e.preventDefault(); tl.next(); }
    else if (e.key === ',' || e.key === '[') { e.preventDefault(); tl.prev(); }
  };
  opts.keyTarget?.addEventListener('keydown', onKey);
  const onPrefs = () => { tl.setReduced(prefersReducedMotion()); sync(); };
  window.addEventListener('ibbio:prefs', onPrefs);

  return {
    timeline: tl,
    detach: () => {
      tl.pause();
      off();
      opts.keyTarget?.removeEventListener('keydown', onKey);
      window.removeEventListener('ibbio:prefs', onPrefs);
      // Replace the controls with clean copies so a later wireProcess() starts without old listeners.
      for (const el of [play, prev, next, speed]) el.replaceWith(el.cloneNode(true));
      root.hidden = true;
    },
  };
}
