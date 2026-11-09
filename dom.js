// Tiny DOM helpers. All text goes through createTextNode, so JSON content is never parsed as HTML.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, String(v));
        else el.style[prop] = v;
      }
    }
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function icon(name, cls = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

/** Renders "Text with *accent* words" -> accent words in Playfair italic. */
export function rich(text = '') {
  const parts = String(text).split('*');
  return parts.map((part, i) => (i % 2 ? h('em', { class: 'accent' }, part) : part));
}

/** Only allow http(s), mailto and local relative asset paths. */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (/^(assets|content)\//.test(trimmed)) return trimmed;
  if (/^#[\w-]+$/.test(trimmed)) return trimmed;
  return null;
}

export function extLink(url, label, { cls = 'btn btn--small', iconName = 'external' } = {}) {
  const href = safeUrl(url);
  if (!href) return null;
  const isExternal = /^https?:/i.test(href);
  return h('a', {
    class: cls,
    href,
    target: isExternal || href.endsWith('.pdf') ? '_blank' : null,
    rel: isExternal || href.endsWith('.pdf') ? 'noopener noreferrer' : null,
  }, h('span', {}, label), iconName ? icon(iconName) : null,
  isExternal ? h('span', { class: 'sr-only' }, ' (opens in a new tab)') : null);
}

/** Normalise media entries: accepts "path" strings or {src|path, alt}. */
export function mediaItem(entry, fallbackAlt = '') {
  if (!entry) return null;
  if (typeof entry === 'string') return { src: entry, alt: fallbackAlt };
  const src = entry.src || entry.path;
  return src ? { ...entry, src, alt: entry.alt || fallbackAlt } : null;
}

/** <img> that silently removes its wrapper if the file is missing. */
export function safeImg(attrs, removeOnError) {
  const img = h('img', { decoding: 'async', ...attrs });
  img.addEventListener('error', () => {
    const target = removeOnError || img;
    target.remove();
  }, { once: true });
  return img;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Check a local file exists (used for PDFs / CVs before rendering a button). */
const existsCache = new Map();
export function fileExists(path) {
  if (!path) return Promise.resolve(false);
  if (/^https?:/i.test(path)) return Promise.resolve(true);
  if (!existsCache.has(path)) {
    existsCache.set(path, fetch(path, { method: 'HEAD' }).then((r) => r.ok).catch(() => false));
  }
  return existsCache.get(path);
}
