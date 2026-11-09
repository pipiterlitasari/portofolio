import { h, icon } from '../lib/dom.js';

/**
 * Accessible zoom viewer built on <dialog>.
 * open(slides, index, title) – slides: [{src, alt, caption?}]
 * Keyboard: ←/→ navigate, Escape closes (native), Z or +/- toggles zoom.
 */
export function createLightbox(dialog) {
  let slides = [];
  let index = 0;
  let title = '';
  let zoomed = false;
  let opener = null;

  const titleEl = h('p', { class: 'lightbox__title', id: 'lightbox-title' });
  const counter = h('p', { class: 'lightbox__counter', 'aria-live': 'polite' });
  const img = h('img', { class: 'lightbox__img', alt: '' });
  const stage = h('div', { class: 'lightbox__stage', tabindex: '-1' }, img);
  const caption = h('p', { class: 'lightbox__caption' });

  const zoomBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-pressed': 'false' },
    icon('zoom'), h('span', { class: 'sr-only' }, 'Zoom'));
  const closeBtn = h('button', { class: 'icon-btn', type: 'button' },
    icon('close'), h('span', { class: 'sr-only' }, 'Close viewer'));
  const prevBtn = h('button', { class: 'icon-btn lightbox__nav lightbox__nav--prev', type: 'button' },
    icon('left'), h('span', { class: 'sr-only' }, 'Previous'));
  const nextBtn = h('button', { class: 'icon-btn lightbox__nav lightbox__nav--next', type: 'button' },
    icon('right'), h('span', { class: 'sr-only' }, 'Next'));

  dialog.setAttribute('aria-labelledby', 'lightbox-title');
  dialog.append(
    h('div', { class: 'lightbox__bar' },
      h('div', {}, titleEl, counter),
      h('div', { class: 'lightbox__actions' }, zoomBtn, closeBtn)),
    h('div', { class: 'lightbox__body' }, prevBtn, stage, nextBtn),
    caption,
  );

  function setZoom(on) {
    zoomed = on;
    stage.classList.toggle('is-zoomed', on);
    zoomBtn.setAttribute('aria-pressed', String(on));
    zoomBtn.querySelector('.sr-only').textContent = on ? 'Zoom out' : 'Zoom in';
    if (!on) { stage.scrollTop = 0; stage.scrollLeft = 0; }
  }

  function render() {
    const s = slides[index];
    img.src = s.src;
    img.alt = s.alt || '';
    titleEl.textContent = title;
    const many = slides.length > 1;
    counter.textContent = many ? `${index + 1} / ${slides.length}` : '';
    caption.textContent = s.caption || s.alt || '';
    prevBtn.hidden = !many;
    nextBtn.hidden = !many;
    setZoom(false);
  }

  function go(delta) {
    if (slides.length < 2) return;
    index = (index + delta + slides.length) % slides.length;
    render();
  }

  // Click-to-zoom at pointer position; drag to pan while zoomed.
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moved: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || !zoomed) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    stage.scrollLeft = drag.sl - dx;
    stage.scrollTop = drag.st - dy;
  });
  stage.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved && e.target === img) {
      const rect = img.getBoundingClientRect();
      const rx = (e.clientX - rect.left) / rect.width;
      const ry = (e.clientY - rect.top) / rect.height;
      setZoom(!zoomed);
      if (zoomed) {
        requestAnimationFrame(() => {
          stage.scrollLeft = rx * img.scrollWidth - stage.clientWidth / 2;
          stage.scrollTop = ry * img.scrollHeight - stage.clientHeight / 2;
        });
      }
    }
    drag = null;
  });

  zoomBtn.addEventListener('click', () => setZoom(!zoomed));
  closeBtn.addEventListener('click', () => dialog.close());
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'z' || e.key === '+' || e.key === '-') setZoom(!zoomed);
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('has-modal');
    img.removeAttribute('src');
    if (opener && document.contains(opener)) opener.focus();
  });

  return {
    open(list, start = 0, label = '') {
      slides = list.filter(Boolean);
      if (!slides.length) return;
      index = Math.max(0, Math.min(start, slides.length - 1));
      title = label;
      opener = document.activeElement;
      render();
      document.documentElement.classList.add('has-modal');
      dialog.showModal();
      closeBtn.focus();
    },
  };
}
