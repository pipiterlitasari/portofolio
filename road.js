import { h, icon, mediaItem, safeImg, safeUrl } from '../lib/dom.js';

/** Bold-only mini markup: "**x**" -> <strong>. */
export function prose(text = '') {
  return String(text).split('**').map((part, i) => (i % 2 ? h('strong', {}, part) : part));
}

const ROAD_PATH = 'M0,64 C120,40 220,92 360,70 S600,36 720,62 S900,90 1000,58';

function roadSvg(cls = 'road__asphalt') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', '0 0 1000 120');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const mk = (attrs) => { const p = document.createElementNS(ns, 'path'); Object.entries(attrs).forEach(([k, v]) => p.setAttribute(k, v)); svg.append(p); };
  mk({ d: ROAD_PATH, class: 'road__edge' });
  mk({ d: ROAD_PATH, class: 'road__surface' });
  mk({ d: ROAD_PATH, class: 'road__line' });
  return svg;
}

/** A road sign: round head with icon, plaque with the stop name, pole. */
export function Sign(step, i, { as = 'div', active = false, onClick } = {}) {
  const el = h(as, {
    class: `sign${active ? ' is-active' : ''}`,
    type: as === 'button' ? 'button' : null,
    'aria-pressed': as === 'button' ? String(active) : null,
    style: { '--i': i },
  },
  h('span', { class: 'sign__head' }, icon(step.icon || 'flower', 'sign__icon'), h('span', { class: 'sign__n', 'aria-hidden': 'true' }, String(i + 1))),
  h('span', { class: 'sign__plaque' }, step.name),
  h('span', { class: 'sign__pole', 'aria-hidden': 'true' }));
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

/**
 * The road. mode "proof": each stop shows its question and a proof image (Home).
 * mode "questions": stops show only the question (compact method overview).
 */
export function Road(steps, { mode = 'proof', lightbox } = {}) {
  const stops = steps.map((s, i) => {
    const proof = mode === 'proof' ? mediaItem(s.proof) : null;
    let proofEl = null;
    if (proof) {
      const btn = h('button', { class: 'stop__proof', type: 'button' },
        safeImg({ src: proof.src, alt: proof.alt, loading: 'lazy' }, null),
        h('span', { class: 'sr-only' }, `Zoom: ${proof.alt}`));
      btn.addEventListener('click', () => lightbox?.open([{ ...proof }], 0, s.name));
      proofEl = h('figure', { class: 'stop__figure' }, btn, proof.caption ? h('figcaption', {}, proof.caption) : null);
    }
    return h('li', { class: 'stop', 'data-reveal': '' },
      Sign(s, i),
      h('div', { class: 'stop__body' },
        h('p', { class: 'stop__q' }, s.question),
        proofEl));
  });
  return h('div', { class: `road road--${mode}` },
    h('div', { class: 'road__track', 'aria-hidden': 'true' }, roadSvg()),
    h('ol', { class: 'road__stops' }, stops));
}

/** Case stepper: the same road, clickable, one stop's text shown at a time. */
export function CaseRoad(steps, texts, { onStep } = {}) {
  let active = 0;
  const panel = h('div', { class: 'caseroad__panel', 'aria-live': 'polite' });
  const signs = h('div', { class: 'caseroad__signs', role: 'group', 'aria-label': 'Steps' });
  const prev = h('button', { class: 'caseroad__nav', type: 'button' }, '← Previous');
  const next = h('button', { class: 'caseroad__nav caseroad__nav--next', type: 'button' }, 'Next →');
  const render = () => {
    [...signs.children].forEach((b, i) => { b.classList.toggle('is-active', i === active); b.setAttribute('aria-pressed', String(i === active)); b.classList.toggle('is-done', i < active); });
    const s = steps[active];
    panel.replaceChildren(
      h('p', { class: 'caseroad__step' }, `Stop ${active + 1} of ${steps.length} · ${s.name}`),
      h('p', { class: 'caseroad__q' }, s.question),
      h('p', { class: 'caseroad__text' }, prose(texts[s.id] || '')));
    prev.disabled = active === 0;
    next.disabled = active === steps.length - 1;
    onStep?.(active);
  };
  steps.forEach((s, i) => signs.append(Sign(s, i, { as: 'button', onClick: () => { active = i; render(); } })));
  prev.addEventListener('click', () => { if (active > 0) { active -= 1; render(); } });
  next.addEventListener('click', () => { if (active < steps.length - 1) { active += 1; render(); } });
  render();
  return h('div', { class: 'caseroad' },
    h('div', { class: 'caseroad__road' }, h('div', { class: 'road__track', 'aria-hidden': 'true' }, roadSvg()), signs),
    panel,
    h('div', { class: 'caseroad__navs' }, prev, next));
}

/** Horizontal scroller of real published articles, linking to the original page. */
export function ArticleScroller(items = [], { title, more, showSource = false } = {}) {
  const valid = items.filter((a) => safeUrl(a.url));
  if (!valid.length) return null;
  const track = h('div', { class: 'scroller__track', tabindex: '0', role: 'list', 'aria-label': title || 'Articles' },
    valid.map((a) => h('a', { class: `acard${a.thumbnail ? '' : ' acard--text'}`, href: a.url, target: '_blank', rel: 'noopener noreferrer', role: 'listitem' },
      a.thumbnail
        ? h('span', { class: 'acard__img' }, safeImg({ src: a.thumbnail, alt: '', loading: 'lazy', width: '560', height: '350' }, null))
        : h('span', { class: 'acard__img acard__img--blank', 'aria-hidden': 'true' }, h('span', {}, a.source)),
      h('span', { class: 'acard__body' },
        h('span', { class: 'acard__src' }, [showSource ? a.source : null, a.date ? a.date.slice(0, 4) : null].filter(Boolean).join(' · ') || a.source),
        h('span', { class: 'acard__title' }, a.title),
        h('span', { class: 'sr-only' }, ' (opens in a new tab)')))));
  const scrollBy = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: 'smooth' });
  const left = h('button', { class: 'scroller__btn', type: 'button', 'aria-label': 'Scroll left' }, icon('left'));
  const right = h('button', { class: 'scroller__btn', type: 'button', 'aria-label': 'Scroll right' }, icon('right'));
  left.addEventListener('click', () => scrollBy(-1));
  right.addEventListener('click', () => scrollBy(1));
  return h('div', { class: 'scroller' },
    h('div', { class: 'scroller__head' },
      title ? h('h4', { class: 'scroller__title' }, title, h('span', { class: 'scroller__count' }, String(valid.length))) : null,
      h('div', { class: 'scroller__btns' }, left, right)),
    track,
    more && safeUrl(more.url) ? h('a', { class: 'link-arrow scroller__more', href: more.url, target: '_blank', rel: 'noopener noreferrer' }, more.label, icon('external')) : null);
}
