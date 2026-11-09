import { h, icon } from '../lib/dom.js';

/**
 * MediaSlider — real slideshow for sets of original pages/sides.
 *  - touch/pointer swipe, arrow buttons, dots, "2 / 4" counter
 *  - keyboard ←/→/Home/End when focused
 *  - tap a page to open the zoom lightbox
 *  - optional desktop facing spread (e.g. pages 2–3 side by side)
 *  - lazy: only loads the active view ± 1 once the slider is near the viewport
 *  - never autoplays
 *
 * options: { slides:[{src,alt}], label, ratio:'983/1390', spread:[2,3]|null, lightbox, spreadQuery }
 */
export function MediaSlider(options) {
  const { lightbox, label = 'Slideshow' } = options;
  const spreadQuery = window.matchMedia(options.spreadQuery || '(min-width: 960px)');
  let slides = [];
  let views = [];
  let current = 0;
  let visible = false;
  let ratio = options.ratio || '3/4';
  let spread = options.spread || null;

  const track = h('div', { class: 'slider__track' });
  const viewport = h('div', { class: 'slider__viewport' }, track);
  const counter = h('p', { class: 'slider__counter', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const dots = h('div', { class: 'slider__dots', role: 'group', 'aria-label': `${label}: choose page` });
  const prev = h('button', { class: 'slider__arrow slider__arrow--prev', type: 'button' },
    icon('left'), h('span', { class: 'sr-only' }, 'Previous page'));
  const next = h('button', { class: 'slider__arrow slider__arrow--next', type: 'button' },
    icon('right'), h('span', { class: 'sr-only' }, 'Next page'));
  const hint = h('p', { class: 'slider__hint' }, 'Swipe, use arrows, or tap a page to zoom');

  const root = h('div', {
    class: 'slider',
    role: 'region',
    'aria-roledescription': 'carousel',
    'aria-label': label,
    tabindex: '0',
  }, h('div', { class: 'slider__frame' }, prev, viewport, next),
  h('div', { class: 'slider__controls' }, counter, dots), hint);

  function buildViews() {
    const n = slides.length;
    const useSpread = spread && spreadQuery.matches && n >= Math.max(...spread);
    if (!useSpread) return slides.map((_, i) => [i]);
    const [a, b] = spread.map((p) => p - 1); // 1-based in JSON
    const out = [];
    for (let i = 0; i < n; i++) {
      if (i === a) { out.push([a, b]); i = b; } else out.push([i]);
    }
    return out;
  }

  function loadAround() {
    if (!visible) return;
    [current - 1, current, current + 1].forEach((v) => {
      const view = track.children[v];
      if (!view) return;
      view.querySelectorAll('img[data-src]').forEach((img) => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    });
  }

  function update(animate = true) {
    track.style.transition = animate ? '' : 'none';
    track.style.transform = `translateX(${-current * 100}%)`;
    const pages = views[current].map((i) => i + 1);
    const pageLabel = pages.length > 1 ? `${pages[0]}–${pages[pages.length - 1]}` : `${pages[0]}`;
    counter.textContent = `${pageLabel} / ${slides.length}`;
    prev.disabled = current === 0;
    next.disabled = current === views.length - 1;
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', i === current ? 'true' : 'false'));
    [...track.children].forEach((v, i) => {
      v.setAttribute('aria-hidden', i === current ? 'false' : 'true');
      v.querySelectorAll('button').forEach((b) => { b.tabIndex = i === current ? 0 : -1; });
    });
    loadAround();
  }

  function render() {
    const activePage = views.length ? views[current][0] : 0;
    views = buildViews();
    current = Math.max(0, views.findIndex((v) => v.includes(activePage)));
    track.replaceChildren();
    dots.replaceChildren();
    views.forEach((pageIdx, vi) => {
      const view = h('div', {
        class: `slider__view${pageIdx.length > 1 ? ' slider__view--spread' : ''}`,
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `Page${pageIdx.length > 1 ? 's' : ''} ${pageIdx.map((i) => i + 1).join('–')} of ${slides.length}`,
      });
      pageIdx.forEach((i) => {
        const s = slides[i];
        const img = h('img', { 'data-src': s.src, alt: s.alt || '', decoding: 'async', draggable: 'false' });
        img.addEventListener('error', () => img.closest('.slider__page')?.classList.add('is-missing'), { once: true });
        const btn = h('button', { class: 'slider__page', type: 'button', style: { aspectRatio: ratio } }, img,
          h('span', { class: 'slider__zoom', 'aria-hidden': 'true' }, icon('zoom')),
          h('span', { class: 'sr-only' }, `Zoom page ${i + 1}`));
        btn.addEventListener('click', (e) => {
          if (root.dataset.dragged === '1') { e.preventDefault(); return; }
          lightbox?.open(slides, i, label);
        });
        view.append(btn);
      });
      track.append(view);
      const dot = h('button', { class: 'slider__dot', type: 'button' },
        h('span', { class: 'sr-only' }, `Go to page ${pageIdx.map((i) => i + 1).join('–')}`));
      dot.addEventListener('click', () => { current = vi; update(); });
      dots.append(dot);
    });
    root.classList.toggle('slider--single', views.length < 2);
    update(false);
  }

  function go(delta) {
    const target = Math.max(0, Math.min(views.length - 1, current + delta));
    if (target !== current) { current = target; update(); }
  }

  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  root.addEventListener('keydown', (e) => {
    if (e.target.closest('.slider__dots')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); current = 0; update(); }
    else if (e.key === 'End') { e.preventDefault(); current = views.length - 1; update(); }
  });

  // Pointer swipe (touch + mouse), vertical scrolling stays native via touch-action: pan-y.
  let start = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    start = { x: e.clientX, y: e.clientY, w: viewport.clientWidth, dx: 0, id: e.pointerId };
    root.dataset.dragged = '0';
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    start.dx = e.clientX - start.x;
    if (Math.abs(start.dx) > 8 && Math.abs(start.dx) > Math.abs(e.clientY - start.y)) {
      root.dataset.dragged = '1';
      if (!viewport.hasPointerCapture(e.pointerId)) viewport.setPointerCapture(e.pointerId);
      track.style.transition = 'none';
      const pct = (start.dx / start.w) * 100;
      track.style.transform = `translateX(calc(${-current * 100}% + ${pct}%))`;
    }
  });
  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const { dx, w } = start;
    start = null;
    if (root.dataset.dragged === '1') {
      if (Math.abs(dx) > Math.min(80, w * 0.18)) go(dx < 0 ? 1 : -1);
      else update();
      setTimeout(() => { root.dataset.dragged = '0'; }, 0);
    }
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);

  spreadQuery.addEventListener('change', () => render());

  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) {
      visible = true;
      loadAround();
      io.disconnect();
    }
  }, { rootMargin: '300px' });
  io.observe(root);

  return {
    el: root,
    setSlides(list, opts = {}) {
      slides = list.filter(Boolean);
      if (opts.ratio) ratio = opts.ratio;
      if ('spread' in opts) spread = opts.spread;
      views = [];
      current = 0;
      render();
    },
  };
}
