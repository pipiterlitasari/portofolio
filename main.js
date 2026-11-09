import { h, icon, rich, extLink, mediaItem, safeImg, safeUrl, fileExists, prefersReducedMotion } from './lib/dom.js';
import { createLightbox } from './components/Lightbox.js';
import {
  ImageCard, ScreenshotFrame, GalleryBlock, InstagramPostCard,
  MagazineSpotlight, NewspaperViewer, WorkflowDiagram, MetricBlock, LinkTile, Chips,
  EventCard, CarouselCard,
} from './components/cards.js';
import { Road, CaseRoad, ArticleScroller, prose } from './components/road.js';

const CONTENT_URL = 'content/portfolio.json';
const main = document.getElementById('main');
const lightbox = createLightbox(document.querySelector('.lightbox'));
const isVisible = (item) => item && item.visibleInInitialBuild !== false && item.public !== false;

let DATA = null;
const pages = {};
const tabSetters = {};

/* ============================================================ routing */
const PAGES = ['home', 'how-i-work', 'work', 'about'];
function parseHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith('work-')) return { page: 'work', sub: h.slice(5) };
  if (h.startsWith('how-i-work-')) return { page: 'how-i-work', sub: h.slice(11) };
  if (PAGES.includes(h)) return { page: h };
  return { page: 'home' };
}
function hashFor(page, sub) {
  if (!sub) return page === 'home' ? '' : page;
  return `${page}-${sub}`;
}
let pendingAnchor = null;
function go(page, sub, anchor) {
  pendingAnchor = anchor || null;
  const target = hashFor(page, sub);
  if (location.hash.slice(1) === target) route(true);
  else if (target === '') { history.replaceState(null, '', location.pathname + location.search); route(true); }
  else location.hash = target;
}
let currentPage = null;
function route(force = false) {
  const { page, sub } = parseHash();
  const changed = page !== currentPage;
  Object.entries(pages).forEach(([id, el]) => { el.hidden = id !== page; });
  document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === page));
  if (sub && tabSetters[page]) tabSetters[page](sub);
  currentPage = page;
  if (changed || force) {
    const anchor = sub ? pages[page]?.querySelector('[data-tabs-anchor]') : null;
    if (anchor && !changed) anchor.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'auto' });
  }
  revealIn(pages[page]);
  if (pendingAnchor) {
    const el = document.getElementById(pendingAnchor);
    pendingAnchor = null;
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'auto', block: 'start' }));
  }
}

/** Link that switches page (and optional tab) without leaving the site. */
function pageLink({ page, tab, anchor, label, cls = 'link-arrow', iconName = 'arrow' }) {
  const a = h('a', { class: cls, href: `#${hashFor(page, tab) || 'home'}` }, label, iconName ? icon(iconName) : null);
  a.addEventListener('click', (e) => { e.preventDefault(); go(page, tab, anchor); });
  return a;
}

/* ============================================================== helpers */
function head(copy = {}, fallback = '') {
  return h('header', { class: 'section-head', 'data-reveal': '' },
    copy.eyebrow ? h('p', { class: 'eyebrow' }, copy.eyebrow) : null,
    h('h2', { class: 'section-title' }, rich(copy.heading || copy.title || fallback),
      h('span', { class: 'squiggle', 'aria-hidden': 'true' }, icon('squiggle', 'squiggle__svg'))),
    copy.intro ? h('p', { class: 'section-intro' }, copy.intro) : null);
}
function ticker(words) {
  const row = () => h('div', { class: 'ticker__row', 'aria-hidden': 'true' }, words.flatMap((w) => [h('span', {}, w), icon('flower', 'ticker__flower')]));
  return h('div', { class: 'ticker' }, h('p', { class: 'sr-only' }, words.join(', ')),
    h('div', { class: 'ticker__band' }, h('div', { class: 'ticker__move' }, row(), row())));
}
const allProjects = () => new Map([...DATA.featuredProjects, ...(DATA.additionalProjects || [])].map((p) => [p.id, p]));
const gallery = (id) => DATA.galleries.find((g) => g.id === id);

/* ======================================================= media renderer */
function renderMedia(project) {
  const labels = DATA.slider || {};
  const out = [];
  const add = (el, full = true) => { if (el) { el.classList.add(full ? 'm-full' : 'm-half'); out.push(el); } };
  for (const m of project.media || []) {
    switch (m.type) {
      case 'newspapers': add(NewspaperViewer(DATA, { lightbox, labels })); break;
      case 'gallery': add(GalleryBlock(gallery(m.id), { lightbox }), !!m.full); break;
      case 'workflow': add(WorkflowDiagram(project.workflowDiagram || project.processSteps, 'From direction to published post')); break;
      case 'screenshot': add(ScreenshotFrame(m, { lightbox, url: project.externalUrl }), false); break;
      case 'events': add(h('div', { class: 'events-grid' }, (DATA.events || []).filter(isVisible).map((ev) => EventCard(ev, { lightbox })))); break;
      case 'carousels': {
        const ids = m.ids || [];
        add(h('div', { class: 'carousel-grid', style: { '--cols': Math.min(ids.length, 3) } }, ids.map((id) => CarouselCard(gallery(id), { lightbox }))));
        break;
      }
      case 'instagram': {
        const posts = (project.instagramPostIds || []).map((id) => DATA.instagramExamples.find((p) => p.id === id)).filter(isVisible);
        const extras = (m.extra || []).map((x) => ({ ...x, thumbnail: x.src, organization: posts[0]?.organization || project.client, url: null }));
        const cards = [...extras, ...posts];
        if (cards.length) {
          add(h('div', { class: 'igset' },
            h('div', { class: 'gallery__head' }, h('h4', { class: 'gallery__title' }, m.title || 'Selected posts'),
              h('p', { class: 'gallery__caption' }, 'Cover screenshots. Open the post to see the full carousel or video.')),
            h('div', { class: 'igset__grid', style: { '--cols': Math.min(cards.length, 4) } }, cards.map((p) => InstagramPostCard(p, { lightbox, labels })))));
        }
        break;
      }
      default: add(ImageCard(mediaItem(m, project.title), { lightbox, title: project.title }), false);
    }
  }
  const halves = out.filter((el) => el.classList.contains('m-half'));
  if (halves.length % 2 === 1) halves[halves.length - 1].classList.replace('m-half', 'm-full');
  return out;
}

/* ================================================================ HOME */
function HomePage() {
  const site = DATA.site;
  const hero = site.hero;
  const portrait = mediaItem(site.portrait, site.portraitAlt);
  const heroEl = h('section', { class: 'hero hero--v6', 'aria-labelledby': 'hero-title' },
    h('div', { class: 'hero__inner' },
      h('div', { class: 'hero__text' },
        h('p', { class: 'hero__hello' }, "Hi, I'm ", h('strong', {}, site.owner)),
        h('h1', { class: 'hero__hook', id: 'hero-title' }, rich(hero.headline)),
        h('p', { class: 'hero__role' }, hero.role),
        h('p', { class: 'hero__support' }, hero.supporting),
        h('div', { class: 'hero__buttons' },
          pageLink({ page: hero.primaryCta.page, label: hero.primaryCta.label, cls: 'btn btn--primary' }),
          pageLink({ page: hero.secondaryCta.page, label: hero.secondaryCta.label, cls: 'btn btn--ghost' }))),
      h('div', { class: 'hero__media' },
        h('span', { class: 'hero__blob', 'aria-hidden': 'true' }),
        icon('flower', 'hero__flower hero__flower--a'),
        portrait ? h('div', { class: 'hero__portrait' }, safeImg({ src: portrait.src, alt: portrait.alt, fetchpriority: 'high', width: '1254', height: '1254' })) : null,
        icon('flower', 'hero__flower hero__flower--b'),
        h('div', { class: 'stickers' }, (hero.stickers || []).map((s, i) => {
          const st = h('a', { class: `sticker sticker--f${i + 1}`, href: `#${hashFor('work', s.tab)}`, title: `See ${s.label.toLowerCase()} work` }, s.label);
          st.addEventListener('click', (e) => { e.preventDefault(); if (st.dataset.moved === '1') return; go('work', s.tab, s.anchor); });
          return st;
        })))),
    ticker(hero.ticker || []));
  enableStickerDrag(heroEl);

  const ex = site.homeExperience;
  const clients = h('section', { class: 'section homeexp' },
    h('div', { class: 'wrap' },
      head({ eyebrow: ex.eyebrow, heading: ex.heading }),
      h('div', { class: 'xp__grid' }, ex.items.map((x) => h('div', { 'data-reveal': '' },
        pageLink({ page: 'work', tab: x.tab, cls: 'xp', iconName: null, label: [
          h('span', { class: 'xp__period' }, x.period),
          h('span', { class: 'xp__org' }, x.org),
          x.for ? h('span', { class: 'xp__for' }, x.for) : null,
          h('span', { class: 'xp__role' }, x.role),
          h('span', { class: 'xp__cta' }, 'See the work', icon('arrow'))] })))),
      h('div', { class: 'xp__skills', 'data-reveal': '' }, h('h3', {}, ex.skillsTitle), Chips(ex.skills, 'chip')),
      h('p', { class: 'xp__more' }, pageLink({ page: 'about', label: 'More about me' }))));

  const road = site.road;
  const roadEl = h('section', { class: 'section roadsec' },
    h('div', { class: 'wrap' },
      head({ eyebrow: road.eyebrow, heading: road.heading, intro: road.intro }),
      Road(road.steps, { mode: 'proof', lightbox }),
      h('p', { class: 'roadsec__cta' }, pageLink({ page: 'how-i-work', label: 'Follow the road on four projects', cls: 'btn btn--orange' }))));

  const hl = h('section', { class: 'section highlights' },
    h('div', { class: 'wrap' },
      head({ eyebrow: 'Highlights', heading: 'One highlight from *every place I’ve worked*', intro: 'Pick one and explore everything I did there.' }),
      h('div', { class: 'hl__grid' }, site.highlights.map((x) => {
        const card = h('a', { class: 'hl', href: `#${hashFor(x.go.page, x.go.tab)}`, 'data-reveal': '' },
          x.image ? h('span', { class: 'hl__img' }, safeImg({ src: x.image, alt: '', loading: 'lazy' }, null), h('span', { class: 'hl__company' }, x.company)) : null,
          h('span', { class: 'hl__body' },
            h('span', { class: 'hl__kicker' }, x.kicker),
            h('span', { class: 'hl__stat' }, x.stat),
            h('span', { class: 'hl__title' }, x.title),
            h('span', { class: 'hl__text' }, x.text),
            h('span', { class: 'hl__cta' }, `Explore ${x.company}`, icon('arrow'))));
        card.addEventListener('click', (e) => { e.preventDefault(); go(x.go.page, x.go.tab, x.go.anchor); });
        return card;
      }))));

  const a = DATA.articles || {};
  const mix = [];
  const pools = [a.gawibapakat || [], a.kaleka || [], a.maggnesia || [], (a.zahir || []).filter((x) => x.thumbnail), a.starfarm || []];
  for (let i = 0; mix.length < 18 && i < 20; i++) pools.forEach((p) => { if (p[i] && mix.length < 18) mix.push(p[i]); });
  const fresh = h('section', { class: 'section fresh' },
    h('div', { class: 'wrap' },
      head({ eyebrow: 'Published writing', heading: 'Read something *I wrote.*', intro: 'Straight from the sites they were published on. Scroll sideways, tap to read the original.' }),
      ArticleScroller(mix, { showSource: true }),
      h('p', { class: 'fresh__cta' }, pageLink({ page: 'work', label: 'See all work by company' }))));

  return h('div', { class: 'page page--home' }, heroEl, hl, roadEl, fresh, clients);
}

function enableStickerDrag(root) {
  root.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.sticker');
    if (!el) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX - (parseFloat(el.dataset.x) || 0);
    const sy = e.clientY - (parseFloat(el.dataset.y) || 0);
    el.classList.add('is-dragging');
    el.dataset.moved = '0';
    const move = (ev) => { const x = ev.clientX - sx; const y = ev.clientY - sy; if (Math.abs(x - (parseFloat(el.dataset.x) || 0)) + Math.abs(y - (parseFloat(el.dataset.y) || 0)) > 3) el.dataset.moved = '1'; el.dataset.x = x; el.dataset.y = y; el.style.translate = `${x}px ${y}px`; };
    const up = () => { el.classList.remove('is-dragging'); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}

/* ========================================================== HOW I WORK */
function HowPage() {
  const site = DATA.site;
  const steps = site.road.steps;
  const cases = (DATA.caseStudies || []).filter((c) => c.road);
  const slug = (c) => c.id.replace('cs-', '');

  const tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Projects' });
  const panel = h('div', { class: 'how__panel', role: 'tabpanel' });
  const show = (c) => {
    [...tabs.children].forEach((t) => { const on = t.dataset.id === slug(c); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    const r = c.road;
    const metrics = r.metrics ? h('div', { class: 'how__metrics' },
      h('dl', {}, r.metrics.map((m) => h('div', {}, h('dt', {}, m.label), h('dd', {}, m.value)))),
      r.metricsNote ? h('p', { class: 'how__note' }, r.metricsNote) : null) : null;
    panel.replaceChildren(
      h('div', { class: 'how__case' },
        h('p', { class: 'how__client' }, c.client),
        h('h3', { class: 'how__title' }, c.title),
        h('p', { class: 'how__problem' }, h('span', {}, 'The challenge'), r.problem)),
      CaseRoad(steps, r.steps),
      h('div', { class: 'how__foot' },
        h('div', { class: 'how__part' }, h('p', { class: 'how__label' }, 'My part'), h('p', {}, prose(c.contribution || ''))),
        metrics),
      h('p', { class: 'how__see' }, pageLink({ page: 'work', tab: r.workTab, label: 'See the finished work' })));
    revealIn(panel);
  };
  cases.forEach((c) => {
    const t = h('button', { class: 'tab', role: 'tab', type: 'button', 'data-id': slug(c) }, c.road.tab);
    t.addEventListener('click', () => go('how-i-work', slug(c)));
    tabs.append(t);
  });
  tabSetters['how-i-work'] = (sub) => { const c = cases.find((x) => slug(x) === sub); if (c) show(c); };
  if (cases[0]) show(cases[0]);

  return h('div', { class: 'page page--how' },
    h('section', { class: 'section how' },
      h('div', { class: 'wrap' },
        head({ eyebrow: 'How I work', heading: 'Same road, *different journeys.*', intro: 'Every project passes the same five stops. What happens at each one depends on the people, the topic and the format. Pick a project and walk through it.' }),
        h('div', { class: 'how__method' }, Road(steps, { mode: 'questions' })),
        h('div', { class: 'how__tabs', 'data-tabs-anchor': '' }, tabs),
        panel)));
}

/* ================================================================ WORK */
function ProjectBlock(p, title) {
  const media = renderMedia(p);
  return h('article', { class: 'wblock', id: `w-${p.id}` },
    h('header', { class: 'wblock__head', 'data-reveal': '' },
      h('h3', { class: 'wblock__title' }, title || p.title),
      p.description || p.summary ? h('p', { class: 'wblock__desc' }, p.description || p.summary) : null,
      (p.publicRole || p.role) ? h('p', { class: 'wblock__role' }, h('strong', {}, 'My part: '), p.publicRole || p.role) : null),
    media.length ? h('div', { class: 'case__media wblock__media' }, media) : null);
}

function WorkBlock(b) {
  const projects = allProjects();
  switch (b.type) {
    case 'project': { const p = projects.get(b.id); return p ? ProjectBlock(p, b.title) : null; }
    case 'articles': return h('article', { class: 'wblock', id: `w-articles-${b.source}` }, ArticleScroller((b.sources || [b.source]).flatMap((s) => (DATA.articles || {})[s] || []), { title: b.title, more: b.more, showSource: !!b.sources }));
    case 'magazines': return h('article', { class: 'wblock', id: 'w-magazines' }, h('header', { class: 'wblock__head' }, h('h3', { class: 'wblock__title' }, 'Corporate magazines')), MagazineSpotlight(DATA, { lightbox, labels: DATA.slider || {} }));
    case 'fakfak': {
      const g = gallery('kaleka-li-fakfak');
      if (!g) return null;
      return h('article', { class: 'wblock', id: 'w-fakfak' },
        h('header', { class: 'wblock__head' }, h('h3', { class: 'wblock__title' }, 'Fakfak · press release to carousel'),
          h('p', { class: 'wblock__desc' }, g.summary)),
        h('div', { class: 'case__media wblock__media' },
          h('div', { class: 'm-half' }, CarouselCard(g, { lightbox })),
          h('div', { class: 'coverage m-half' },
            h('h4', { class: 'gallery__title' }, 'Media coverage'),
            h('div', { class: 'coverage__list' }, (g.coverage || []).map((c) => LinkTile({ title: c.label, organization: 'News coverage', url: c.url, kind: 'Coverage' }))),
            h('div', { class: 'coverage__links' }, (g.links || []).map((l) => extLink(l.url, l.label, { cls: 'btn btn--small' }))))));
    }
    case 'case-media': {
      const c = (DATA.caseStudies || []).find((x) => x.id === b.id);
      if (!c) return null;
      const media = renderMedia(c);
      return h('article', { class: 'wblock' }, h('header', { class: 'wblock__head' }, h('h3', { class: 'wblock__title' }, 'From plan to published post')),
        h('div', { class: 'case__media wblock__media' }, media));
    }
    case 'results': {
      const rs = (b.results || []).map((t) => (DATA.results || []).find((r) => r.title === t)).filter(isVisible);
      if (!rs.length) return null;
      return h('article', { class: 'wblock' },
        h('header', { class: 'wblock__head' }, h('h3', { class: 'wblock__title' }, 'Numbers'),
          h('p', { class: 'wblock__desc' }, 'From documented reporting periods. They show reach and response, not that one person caused them.')),
        h('div', { class: 'insights__grid' }, rs.map((r) => MetricBlock(r, { lightbox }))));
    }
    case 'links': return h('article', { class: 'wblock' }, h('header', { class: 'wblock__head' }, h('h3', { class: 'wblock__title' }, b.title)),
      h('div', { class: 'links__grid' }, b.items.map((i) => LinkTile({ title: i.title, organization: '', url: i.url, kind: 'Article' }))));
    default: return null;
  }
}

function WorkPage() {
  const tabsDef = DATA.site.workTabs || [];
  const tabs = h('div', { class: 'tabs tabs--work', role: 'tablist', 'aria-label': 'Companies' });
  const select = h('select', { class: 'tabs__select', id: 'work-company', 'aria-label': 'Choose a company' });
  const panels = {};
  const showTab = (id) => {
    if (!panels[id]) {
      const t = tabsDef.find((x) => x.id === id);
      if (!t) return;
      panels[id] = h('div', { class: 'wtab', role: 'tabpanel' },
        h('header', { class: 'wtab__head', 'data-reveal': '' },
          h('p', { class: 'wtab__meta' }, [t.period, t.role].filter(Boolean).join(' · ')),
          h('h2', { class: 'wtab__title' }, t.label, t.clients ? h('span', { class: 'wtab__clients' }, ` ${t.clients}`) : null),
          h('p', { class: 'wtab__intro' }, t.intro)),
        h('div', { class: 'wtab__blocks' }, t.blocks.map(WorkBlock).filter(Boolean)));
      body.append(panels[id]);
    }
    Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== id; });
    [...tabs.children].forEach((b) => { const on = b.dataset.id === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    select.value = id;
    revealIn(panels[id]);
  };
  tabsDef.forEach((t) => {
    const b = h('button', { class: 'tab', role: 'tab', type: 'button', 'data-id': t.id }, t.label);
    b.addEventListener('click', () => go('work', t.id));
    tabs.append(b);
    select.append(h('option', { value: t.id }, t.label));
  });
  select.addEventListener('change', () => go('work', select.value));
  const body = h('div', { class: 'work__body' });
  tabSetters.work = (sub) => showTab(sub);
  showTab(tabsDef[0]?.id);

  return h('div', { class: 'page page--work' },
    h('section', { class: 'section workpage' },
      h('div', { class: 'wrap' },
        head({ eyebrow: 'Work', heading: 'Pick a company, *see the work.*', intro: 'Every client and employer gets its own tab: what I did there, the work itself, and the numbers where I have them.' }),
        h('div', { class: 'work__tabs', 'data-tabs-anchor': '' }, tabs, select),
        body)));
}

/* =============================================================== ABOUT */
function AboutPage() {
  const site = DATA.site;
  const a = site.aboutPage;
  const portrait = mediaItem(site.portrait, site.portraitAlt);
  return h('div', { class: 'page page--about' },
    h('section', { class: 'section aboutpage' },
      h('div', { class: 'wrap aboutpage__grid' },
        h('div', { class: 'aboutpage__side', 'data-reveal': '' },
          portrait ? h('div', { class: 'aboutpage__photo' }, safeImg({ src: portrait.src, alt: portrait.alt, loading: 'lazy' }, null)) : null,
          h('p', { class: 'aboutpage__role' }, site.hero.role)),
        h('div', { class: 'aboutpage__story', 'data-reveal': '' },
          h('p', { class: 'eyebrow' }, a.eyebrow),
          h('h2', { class: 'section-title' }, rich(a.heading)),
          a.story.map((p, i) => h('p', { class: i === a.story.length - 1 ? 'aboutpage__pitch' : null }, p)),
          a.quote ? h('p', { class: 'aboutpage__last' }, a.quote) : null,
          a.cta ? (() => {
            const btn = h('a', { class: 'btn btn--orange', href: '#contact' }, a.cta, icon('arrow'));
            btn.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('contact').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); });
            return h('p', { class: 'aboutpage__cta' }, btn);
          })() : null))),
    h('section', { class: 'section timelinesec' },
      h('div', { class: 'wrap' },
        head({ eyebrow: 'Timeline', heading: 'Where I’ve *been.*' }),
        h('ol', { class: 'tl' }, a.timeline.map((t) => {
          const tab = site.clients.find((c) => t.org.startsWith(c.name))?.tab;
          return h('li', { class: 'tl__item', 'data-reveal': '' },
            h('span', { class: 'tl__dot', 'aria-hidden': 'true' }),
            h('p', { class: 'tl__year' }, t.year),
            h('h3', { class: 'tl__org' }, t.org),
            h('p', { class: 'tl__role' }, t.role),
            h('p', { class: 'tl__what' }, t.what),
            tab ? pageLink({ page: 'work', tab, label: 'See the work', cls: 'tl__link' }) : null);
        })),
        h('div', { class: 'tools', 'data-reveal': '' },
          h('div', {}, h('h3', {}, 'Tools'), Chips(site.toolsLine || [], 'chip chip--tool')),
          h('div', {}, h('h3', {}, 'Languages'), Chips(site.skillsAndTools?.languages || [], 'chip chip--soft'),
            site.aiStatement ? h('p', { class: 'tools__ai' }, site.aiStatement) : null)))));
}

/* ============================================================= CONTACT */
function Contact() {
  const site = DATA.site;
  const c = site.contact || {};
  const copy = site.sectionCopy?.contact || {};
  return h('section', { class: 'section contact', id: 'contact', 'aria-labelledby': 'contact-h' },
    h('div', { class: 'contact__wave', 'aria-hidden': 'true' }),
    h('div', { class: 'wrap contact__inner' },
      h('div', {},
        h('p', { class: 'eyebrow eyebrow--light' }, 'Contact'),
        h('h2', { class: 'section-title', id: 'contact-h' }, rich(copy.title || 'Contact')),
        copy.intro ? h('p', { class: 'contact__intro' }, copy.intro) : null),
      h('div', { class: 'contact__actions' },
        c.email ? h('a', { class: 'contact__email', href: `mailto:${c.email}` }, c.email) : null,
        h('div', { class: 'contact__buttons' },
          c.email ? h('a', { class: 'btn btn--orange', href: `mailto:${c.email}` }, 'Email me', icon('arrow')) : null,
          extLink(c.linkedin, 'LinkedIn', { cls: 'btn btn--light' })))),
    icon('flower', 'contact__flower'));
}

/* ================================================================= Nav */
function renderNav(site) {
  const list = document.getElementById('nav-links');
  const toggle = document.querySelector('.nav__toggle');
  const close = () => { toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('nav-open'); };
  list.replaceChildren(...site.navigation.map((n) => {
    const a = h('a', { href: n.page === 'contact' ? '#contact' : `#${n.page}`, class: n.page === 'contact' ? 'nav__cta' : null, 'data-nav': n.page }, n.label);
    a.addEventListener('click', (e) => {
      e.preventDefault(); close();
      if (n.page === 'contact') document.getElementById('contact').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      else go(n.page);
    });
    return h('li', {}, a);
  }));
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  const brand = document.querySelector('.nav__brand');
  brand.addEventListener('click', (e) => { e.preventDefault(); go('home'); });
  document.querySelector('[data-slot="owner-short"]').textContent = site.owner.split(' ')[0];
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
}

function renderFooter(site) {
  document.querySelector('.site-footer').replaceChildren(h('div', { class: 'wrap footer__inner' },
    h('p', {}, `© ${new Date().getFullYear()} ${site.owner}`),
    site.sectionCopy?.footer ? h('p', { class: 'footer__credit' }, site.sectionCopy.footer) : null));
}

/* ============================================================ Reveal */
let io = null;
function revealIn(root) {
  if (!root) return;
  const els = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  document.documentElement.classList.add('js-reveal');
  io ||= new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });
  els.forEach((e) => io.observe(e));
}

/* ============================================================== Boot */
async function boot() {
  try {
    const res = await fetch(CONTENT_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    DATA = await res.json();
  } catch (err) {
    main.replaceChildren(h('p', { class: 'noscript' }, 'Could not load content/portfolio.json. Serve this folder over HTTP (npm run dev) rather than opening the file directly.'));
    console.error(err);
    return;
  }
  const site = DATA.site;
  Object.entries(site.design?.palette || {}).forEach(([k, v]) => document.documentElement.style.setProperty(`--${k}`, v));
  document.title = `${site.owner} · Writer & Communications Professional`;
  renderNav(site);
  pages.home = HomePage();
  pages['how-i-work'] = HowPage();
  pages.work = WorkPage();
  pages.about = AboutPage();
  main.replaceChildren(...Object.values(pages), Contact());
  renderFooter(site);
  window.addEventListener('hashchange', () => route());
  route(true);
}

boot();
