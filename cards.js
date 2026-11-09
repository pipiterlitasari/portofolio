import { h, append, icon, rich, extLink, mediaItem, safeImg, safeUrl, fileExists } from '../lib/dom.js';
import { MediaSlider } from './MediaSlider.js';

/* ---------------------------------------------------------------- Chips */
export const Chips = (items = [], cls = 'chip') =>
  items.length ? h('ul', { class: 'chips', role: 'list' }, items.map((t) => h('li', { class: cls }, t))) : null;

/* ------------------------------------------------------- ProjectCard */
/** Collage card for the Selected Work grid. Text-first when there is no preview image. */
export function ProjectCard(project, { index = 0, onNavigate } = {}) {
  const preview = mediaItem(project.preview, project.previewAlt || `${project.title} preview`);
  const href = safeUrl(project.detailTarget) || `#${project.id}`;
  const card = h('a', {
    class: `pcard pcard--${index + 1}${preview ? '' : ' pcard--text'}`,
    href,
    'data-reveal': '',
  });
  if (preview) {
    const fig = h('span', { class: 'pcard__media' });
    fig.append(safeImg({ src: preview.src, alt: '', loading: index < 2 ? 'eager' : 'lazy' }, fig));
    card.append(fig);
  } else if (project.textCardStat) {
    card.append(h('span', { class: 'pcard__stat', 'aria-hidden': 'true' }, project.textCardStat));
  }
  card.append(h('span', { class: 'pcard__body' },
    h('span', { class: 'pcard__num', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
    h('span', { class: 'pcard__org' }, [project.organization, project.client].filter(Boolean).join(' · ')),
    h('span', { class: 'pcard__title' }, project.title),
    project.dates ? h('span', { class: 'pcard__meta' }, project.dates) : null,
    h('span', { class: 'pcard__desc' }, project.description),
    h('span', { class: 'pcard__cta' }, 'See the work', icon('arrow')),
  ));
  if (onNavigate) card.addEventListener('click', () => onNavigate(project));
  return card;
}

/* -------------------------------------------------- ExpandableProcess */
export function ExpandableProcess(steps = [], { summary = 'How this project came together', open = false } = {}) {
  if (!steps?.length) return null;
  return h('details', { class: 'process', open },
    h('summary', {}, h('span', {}, summary), h('span', { class: 'process__count' }, `${steps.length} stages`)),
    h('ol', { class: 'process__list' }, steps.map((s) => h('li', {}, s))));
}

/* ----------------------------------------------------------- ImageCard */
/** Single zoomable image (no fake slider). Removed entirely if the file is missing. */
export function ImageCard(item, { lightbox, title = '', cls = '' } = {}) {
  const media = mediaItem(item);
  if (!media) return null;
  const fig = h('figure', { class: `imgcard ${cls}` });
  const btn = h('button', { class: 'imgcard__btn', type: 'button' },
    safeImg({ src: media.src, alt: media.alt, loading: 'lazy' }, fig),
    h('span', { class: 'imgcard__zoom', 'aria-hidden': 'true' }, icon('zoom')),
    h('span', { class: 'sr-only' }, `Zoom: ${media.alt}`));
  btn.addEventListener('click', () => lightbox?.open([media], 0, title || media.caption || ''));
  fig.append(btn);
  if (media.caption) fig.append(h('figcaption', {}, media.caption));
  return fig;
}

/* ------------------------------------------------------ ScreenshotFrame */
/** Tall website screenshot inside a scrollable browser frame + zoom. */
export function ScreenshotFrame(item, { lightbox, url } = {}) {
  const media = mediaItem(item);
  if (!media) return null;
  const fig = h('figure', { class: 'browser' });
  let host = '';
  try { host = url ? new URL(url).host : ''; } catch { host = ''; }
  const scroller = h('div', { class: 'browser__scroll', tabindex: '0', 'aria-label': `${media.alt} (scrollable)`, role: 'region' },
    safeImg({ src: media.src, alt: media.alt, loading: 'lazy' }, fig));
  const zoom = h('button', { class: 'btn btn--small btn--ghost', type: 'button' }, icon('zoom'), h('span', {}, 'Open full size'));
  zoom.addEventListener('click', () => lightbox?.open([media], 0, media.caption || 'Website screenshot'));
  fig.append(
    h('div', { class: 'browser__bar', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), host ? h('span', {}, host) : null),
    scroller,
    h('figcaption', {}, media.caption ? h('span', {}, media.caption) : null, zoom));
  return fig;
}

/* ---------------------------------------------------- GalleryBlock */
/** Renders a JSON gallery by its display mode: slider (real sides/pages), grid (overview screenshots), single. */
export function GalleryBlock(gallery, { lightbox }) {
  if (!gallery?.slides?.length) return null;
  const slides = gallery.slides.map((s, i) => mediaItem(s, `${gallery.title}, ${gallery.display === 'grid' ? 'image' : 'side'} ${i + 1} of ${gallery.slides.length}`));
  const head = h('div', { class: 'gallery__head' },
    h('h4', { class: 'gallery__title' }, gallery.title),
    gallery.caption ? h('p', { class: 'gallery__caption' }, gallery.caption) : null);
  const wrap = h('div', { class: `gallery gallery--${gallery.display}` }, head);

  if (gallery.display === 'slider' && slides.length > 1) {
    const slider = MediaSlider({ label: gallery.title, lightbox, ratio: gallery.ratio || '1222/864' });
    slider.setSlides(slides);
    wrap.append(slider.el);
  } else {
    const grid = h('div', { class: 'gallery__grid' });
    slides.forEach((s) => grid.append(ImageCard(s, { lightbox, title: gallery.title })));
    wrap.append(grid);
  }
  if (gallery.roleCredit) wrap.append(h('p', { class: 'credit' }, gallery.roleCredit));
  return wrap;
}

/* ------------------------------------------------- InstagramPostCard */
export function InstagramPostCard(post, { lightbox, labels = {}, review = false }) {
  const thumb = mediaItem(post.thumbnail, `${post.organization} Instagram post: ${post.title}`);
  const card = h('article', { class: 'igcard', 'data-reveal': '' });
  if (thumb) {
    const btn = h('button', { class: 'igcard__thumb', type: 'button' },
      safeImg({ src: thumb.src, alt: thumb.alt, loading: 'lazy' }, null),
      h('span', { class: 'igcard__zoom', 'aria-hidden': 'true' }, icon('zoom')),
      h('span', { class: 'sr-only' }, `Zoom screenshot: ${post.title}`));
    btn.addEventListener('click', () => lightbox?.open([{ ...thumb, caption: `${post.title} · single post cover screenshot` }], 0, post.organization));
    card.append(btn);
  }
  const link = post.url ? extLink(post.url, labels.instagramButtonText || 'View on Instagram', { cls: 'btn btn--small' }) : null;
  card.append(h('div', { class: 'igcard__body' },
    h('p', { class: 'igcard__org' }, post.organization),
    h('h4', { class: 'igcard__title' }, post.title),
    h('p', { class: 'igcard__format' }, post.format),
    post.publicCredit ? h('p', { class: 'igcard__credit' }, post.publicCredit) : null,
    link,
    review && !post.url ? h('p', { class: 'review-tag' }, 'Instagram URL pending') : null));
  return card;
}

/* ------------------------------------------------- MagazineIssueCard */
/** One issue: real cover (when supplied) followed by real sample spreads, as a slideshow. */
export function MagazineIssueCard(issue, group, { lightbox, labels = {} }) {
  const label = `${group.series} ${issue.edition}`;
  const slides = [
    issue.cover ? mediaItem(issue.cover, `${label} cover: ${issue.title}`) : null,
    ...(issue.samplePages || []).map((pg) => mediaItem(pg, label)),
  ].filter(Boolean);
  if (!slides.length) return null;
  slides.forEach((sl) => { if (!sl.caption && sl === slides[0] && issue.cover) sl.caption = `Cover · ${issue.title}`; });
  const media = slides.length > 1
    ? (() => { const sl = MediaSlider({ label, lightbox, ratio: '4/3' }); sl.setSlides(slides); return sl.el; })()
    : ImageCard({ ...slides[0], caption: null }, { lightbox, title: label });
  const written = (issue.samplePages || []).map((pg) => pg.caption).filter((c, i, arr) => c && arr.indexOf(c) === i);
  return h('article', { class: 'magcard', 'data-reveal': '' },
    h('div', { class: 'magcard__body' },
      h('p', { class: 'magcard__series' }, `${group.series} · ${group.organization} · ${issue.edition}`),
      h('h4', {}, issue.title),
      written.length ? h('ul', { class: 'magcard__written' }, written.map((c) => h('li', {}, c))) : null),
    media,
    issue.url ? extLink(issue.url, labels.magazineButtonText || 'Read the full magazine', { cls: 'link-arrow' }) : null);
}

/* ------------------------------------------------- MagazineFeature */
/** Editorial overview + issue cards for issues that have a real cover or real sample pages. */
export function MagazineFeature(data, { lightbox, labels, review }) {
  const feature = data.site.magazineFeature || {};
  const groups = data.magazineGroups || [];
  const totalIssues = groups.reduce((n, g) => n + (g.issues?.length || 0), 0);

  const stats = h('div', { class: 'magfeature__stats' },
    h('p', { class: 'magfeature__stat' }, h('span', { class: 'magfeature__big' }, String(totalIssues)),
      h('span', { class: 'magfeature__biglabel' }, `issues across ${groups.length} corporate magazines`)),
    h('ul', { class: 'magfeature__series', role: 'list' }, groups.map((g) =>
      h('li', {},
        h('span', { class: 'magfeature__count' }, String(g.issues?.length || 0)),
        h('span', {}, h('strong', {}, g.series), h('span', {}, g.organization))))));

  const practices = h('ol', { class: 'magfeature__practices' }, (feature.practices || []).map((p) =>
    h('li', {}, h('strong', {}, p.name), h('span', {}, p.text))));

  const cards = [];
  groups.filter((g) => g.visibleInInitialBuild).forEach((g) => g.issues
    .filter((i) => (i.cover || i.samplePages?.length) && i.showCoverCard !== false)
    .forEach((i) => cards.push(MagazineIssueCard(i, g, { lightbox, labels }))));
  const valid = cards.filter(Boolean);

  return h('div', { class: 'magfeature' },
    stats,
    feature.lede ? h('p', { class: 'magfeature__lede' }, feature.lede) : null,
    practices,
    valid.length ? h('div', { class: 'magfeature__issues' },
      h('h4', { class: 'gallery__title' }, 'A few pages I wrote'), h('div', { class: 'magfeature__grid' }, valid)) : null,
    h('div', { class: 'magfeature__foot' },
      feature.healthNote ? h('p', { class: 'note' }, feature.healthNote) : null,
      extLink(data.articleLinks?.wton_catalog, 'Browse the WTON Magazine catalog', { cls: 'link-arrow' })),
    review && !valid.length ? h('p', { class: 'review-tag' }, 'No issue samples yet') : null);
}

/* ------------------------------------------------------- EventCard */
export function EventCard(ev, { lightbox }) {
  const img = mediaItem(ev.image, ev.imageAlt || ev.title);
  const all = [img, ...(ev.thumbs || []).map((t) => mediaItem(t))].filter(Boolean);
  const media = h('div', { class: 'eventcard__media' });
  all.forEach((m, i) => {
    const btn = h('button', { class: `eventcard__img${i === 0 ? ' eventcard__img--main' : ''}`, type: 'button' },
      safeImg({ src: m.src, alt: m.alt, loading: 'lazy' }, null),
      h('span', { class: 'sr-only' }, `Zoom: ${m.alt}`));
    btn.addEventListener('click', () => lightbox?.open(all, i, ev.title));
    media.append(btn);
  });
  media.dataset.count = String(all.length);
  return h('article', { class: 'eventcard', id: ev.id, 'data-reveal': '' },
    media,
    h('div', { class: 'eventcard__body' },
      h('p', { class: 'eventcard__meta' }, [ev.date, ev.place].filter(Boolean).join(' · ')),
      h('h4', { class: 'eventcard__title' }, ev.title),
      ev.role ? h('p', { class: 'eventcard__role' }, h('strong', {}, 'My part: '), ev.role) : null,
      (ev.links || []).length ? h('div', { class: 'eventcard__links' },
        ev.links.map((l) => extLink(l.url, l.label, { cls: 'link-arrow' }))) : null));
}

/* ----------------------------------------------------- CarouselCard */
/** A complete social carousel (all real slides) with platform badge and links. */
export function CarouselCard(gallery, { lightbox }) {
  if (!gallery?.slides?.length) return null;
  const slides = gallery.slides.map((s, i) => mediaItem(s, `${gallery.title}, slide ${i + 1} of ${gallery.slides.length}`));
  const slider = MediaSlider({ label: gallery.title, lightbox, ratio: gallery.ratio || '4/5' });
  slider.setSlides(slides);
  const links = (gallery.links || []).map((l) => extLink(l.url, l.label, { cls: 'btn btn--small' }));
  const coverage = gallery.coverage?.length ? h('p', { class: 'carousel__coverage' }, h('strong', {}, 'Press release coverage: '),
    gallery.coverage.flatMap((c, i) => [i ? ' · ' : '', extLink(c.url, c.label, { cls: 'inline-link', iconName: null })])) : null;
  return h('article', { class: 'carousel', 'data-reveal': '' },
    h('div', { class: 'carousel__head' },
      h('span', { class: `platform platform--${(gallery.platform || '').toLowerCase().replace(/[^a-z]/g, '')}` }, gallery.platform),
      h('h4', { class: 'carousel__title' }, gallery.title),
      gallery.summary ? h('p', { class: 'carousel__summary' }, gallery.summary) : null),
    slider.el,
    coverage,
    links.length ? h('div', { class: 'carousel__links' }, links) : null);
}

/* --------------------------------------------------- NewspaperViewer */
export function NewspaperViewer(data, { lightbox, labels, review }) {
  const papers = (data.newspapers || []).filter((n) => n.slides?.length && n.visibleInInitialBuild !== false);
  if (!papers.length) return null;
  const spread = data.slider?.desktopNewspaperFacingPages || null;
  const slider = MediaSlider({ label: 'Suara Bapakat', lightbox, ratio: '983/1390', spread });
  const meta = h('div', { class: 'paper__meta' });
  const tabs = h('div', { class: 'paper__editions', role: 'group', 'aria-label': 'Choose an edition' });

  let token = 0;
  async function select(paper, btn) {
    const mine = ++token;
    [...tabs.children].forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const ratio = ['ed04', 'ed05', 'ed06'].includes(paper.id) ? '1191/1700' : '983/1390';
    slider.el.setAttribute('aria-label', `Suara Bapakat ${paper.label}`);
    slider.setSlides(paper.slides.map((s, i) => mediaItem(s, `Suara Bapakat ${paper.label}, page ${i + 1} of ${paper.slides.length}`)), { ratio, spread });
    meta.replaceChildren();
    append(meta, [
      h('p', { class: 'paper__label' }, `Suara Bapakat · ${paper.label}`),
      h('p', { class: 'paper__badges' },
        paper.roleCredit ? h('span', { class: 'badge' }, paper.roleCredit) : null,
        paper.publicStatusLabel ? h('span', { class: 'badge badge--warn' }, paper.publicStatusLabel) : null),
      review && paper.note ? h('p', { class: 'review-tag' }, paper.note) : null]);
    if (paper.pdf && await fileExists(paper.pdf) && mine === token) {
      meta.append(h('p', { class: 'paper__pdf' },
        extLink(paper.pdf, labels.pdfButtonText || 'View full PDF', { cls: 'btn btn--small', iconName: 'pdf' }),
        h('span', { class: 'muted' }, `${paper.totalPages || paper.slides.length}-page web preview`)));
    }
  }

  papers.forEach((paper, i) => {
    const cover = mediaItem(paper.slides[0]);
    const btn = h('button', { class: 'paper__edition', type: 'button', 'aria-pressed': 'false' },
      h('span', { class: 'paper__thumb' }, h('img', { src: cover.src, alt: '', loading: 'lazy', decoding: 'async' })),
      h('span', { class: 'paper__ed' }, paper.label.replace('Edition', 'Ed.')),
      paper.publicStatusLabel ? h('span', { class: 'paper__flag' }, 'Revision') : null);
    btn.addEventListener('click', () => select(paper, btn));
    tabs.append(btn);
    if (i === 0) select(paper, btn);
  });

  return h('div', { class: 'paper' }, tabs, h('div', { class: 'paper__stage' }, slider.el, meta));
}

/* ---------------------------------------------------- WorkflowDiagram */
export function WorkflowDiagram(steps = [], title = 'How the work flowed') {
  if (!steps.length) return null;
  return h('figure', { class: 'flow' },
    h('figcaption', {}, title),
    h('ol', { class: 'flow__list' }, steps.map((s, i) => h('li', {}, h('span', { class: 'flow__n' }, String(i + 1)), h('span', {}, s)))));
}

/* --------------------------------------------------------- SkillGroup */
export function SkillGroup(group, variant = 'skill') {
  return h('div', { class: `skillgroup skillgroup--${variant}`, 'data-reveal': '' },
    h('h3', {}, group.group),
    Chips(group.items, variant === 'tool' ? 'chip chip--tool' : 'chip'));
}

/* -------------------------------------------------------- MetricBlock */
export function MetricBlock(result, { lightbox } = {}) {
  const metrics = result.metrics || [];
  const fmt = new Intl.NumberFormat('en-US');
  const items = metrics.map((m) => h('div', { class: 'metric' },
    h('dt', {}, m.label),
    h('dd', {},
      h('span', { class: 'metric__value' }, typeof m.value === 'number' ? fmt.format(m.value) : m.value),
      m.change ? h('span', { class: 'metric__change' }, m.change)
        : typeof m.changePct === 'number' ? h('span', { class: 'metric__change' }, `+${fmt.format(m.changePct)}%`) : null)));
  const images = (result.images || []).map((im) => mediaItem(im)).filter(Boolean);
  const thumbs = images.length ? h('div', { class: 'result__images' }, images.map((im, i) => {
    const b = h('button', { class: 'result__thumb', type: 'button' }, safeImg({ src: im.src, alt: im.alt, loading: 'lazy' }, null),
      h('span', { class: 'sr-only' }, `Zoom: ${im.alt}`));
    b.addEventListener('click', () => lightbox?.open(images, i, result.title));
    return b;
  })) : null;
  const head = h('header', {}, h('h3', {}, result.title), h('p', { class: 'result__period' }, result.period));
  const dl = items.length ? h('dl', { class: 'result__metrics' }, items) : null;
  const hl = result.highlights?.length ? h('ul', { class: 'result__highlights' }, result.highlights.map((t) => h('li', {}, t))) : null;
  const foot = h('div', { class: 'result__foot' },
    result.qualification ? h('p', { class: 'result__qual' }, result.qualification) : null,
    result.source ? h('p', { class: 'result__source' }, h('strong', {}, 'Source: '), result.source) : null);
  if (result.wide) {
    return h('article', { class: 'result result--wide', 'data-reveal': '' },
      h('div', { class: 'result__col' }, head, dl),
      h('div', { class: 'result__col' }, hl, thumbs, foot));
  }
  return h('article', { class: 'result', 'data-reveal': '', 'data-metrics': String(metrics.length) }, head, dl, hl, thumbs, foot);
}

/* -------------------------------------------------------- Text tiles */
export function TextTile(item, { review } = {}) {
  const role = item.publicRole || item.myRole || item.role;
  const steps = item.workflow || item.process || item.processSteps || [];
  const links = (item.externalUrls || []).map((u) => extLink(typeof u === 'string' ? u : u.url, (u.label) || 'View', { cls: 'link-arrow' }));
  if (item.externalUrl) links.push(extLink(item.externalUrl, 'View', { cls: 'link-arrow' }));
  return h('article', { class: 'tile', id: item.id || null, 'data-reveal': '' },
    h('p', { class: 'tile__org' }, [item.organization, item.client].filter(Boolean).join(' · ')),
    h('h4', { class: 'tile__title' }, item.title),
    item.summary || item.description ? h('p', {}, item.summary || item.description) : null,
    role ? h('p', { class: 'tile__role' }, h('strong', {}, 'My part: '), role) : null,
    steps.length ? Chips(steps, 'chip chip--ghost') : null,
    links.filter(Boolean).length ? h('div', { class: 'tile__links' }, links) : null,
    review && item.sourceAssetsPending?.length ? h('p', { class: 'review-tag' }, `Pending: ${item.sourceAssetsPending.join(', ')}`) : null);
}

export function LinkTile({ title, organization, url, note, kind }) {
  const href = safeUrl(url);
  if (!href) return null;
  return h('a', { class: 'linktile', href, target: '_blank', rel: 'noopener noreferrer', 'data-reveal': '' },
    h('span', { class: 'linktile__kind' }, kind || 'Link'),
    h('span', { class: 'linktile__title' }, title),
    h('span', { class: 'linktile__org' }, organization),
    note ? h('span', { class: 'linktile__note' }, note) : null,
    icon('external', 'icon linktile__icon'),
    h('span', { class: 'sr-only' }, ' (opens in a new tab)'));
}

export { rich };

/* ------------------------------------------------- MagazineSpotlight */
/** Lab Kreatif spotlight: stats band, one issue previewed in depth, other real covers as a compact row. */
export function MagazineSpotlight(data, { lightbox, labels = {} }) {
  const s = data.site.labSpotlight || {};
  const feature = data.site.magazineFeature || {};
  const groups = data.magazineGroups || [];
  const totalIssues = groups.reduce((n, g) => n + (g.issues?.length || 0), 0);
  const issues = [];
  groups.filter((g) => g.visibleInInitialBuild).forEach((g) => g.issues
    .filter((i) => i.cover || i.samplePages?.length).forEach((i) => issues.push({ i, g })));
  const want = s.detailedIssue || {};
  const main = issues.find(({ i, g }) => g.series === want.series && i.edition === want.edition) || issues[0];
  const others = issues.filter((x) => x !== main);

  const stats = h('div', { class: 'magfeature__stats' },
    h('p', { class: 'magfeature__stat' }, h('span', { class: 'magfeature__big' }, String(totalIssues)),
      h('span', { class: 'magfeature__biglabel' }, `issues across ${groups.length} corporate publications`)),
    h('ul', { class: 'magfeature__series', role: 'list' }, groups.map((g) =>
      h('li', {}, h('span', { class: 'magfeature__count' }, String(g.issues?.length || 0)),
        h('span', {}, h('strong', {}, g.series), h('span', {}, g.organization))))));

  const slidesFor = ({ i, g }) => [
    i.cover ? { ...mediaItem(i.cover, `${g.series} ${i.edition} cover: ${i.title}`), caption: `Cover · ${i.title}` } : null,
    ...(i.samplePages || []).map((p) => mediaItem(p, `${g.series} ${i.edition}`)),
  ].filter(Boolean);

  const coverRow = others.length ? h('div', { class: 'magcovers', style: { '--cols': others.length } }, others.map((x) => {
    const slides = slidesFor(x);
    const cover = slides[0];
    const written = [...new Set((x.i.samplePages || []).map((p) => p.caption).filter(Boolean))];
    const btn = h('button', { class: 'magcovers__btn', type: 'button' },
      safeImg({ src: cover.src, alt: cover.alt, loading: 'lazy' }, null),
      h('span', { class: 'imgcard__zoom', 'aria-hidden': 'true' }, icon('zoom')),
      h('span', { class: 'sr-only' }, `Open ${x.g.series} ${x.i.edition}: cover and pages I wrote`));
    btn.addEventListener('click', () => lightbox?.open(slides, 0, `${x.g.series} · ${x.i.edition}`));
    return h('article', { class: 'magcovers__item', 'data-reveal': '' },
      btn,
      h('p', { class: 'magcard__series' }, `${x.g.series} · ${x.i.edition}`),
      h('h4', {}, x.i.title),
      written.length ? h('ul', { class: 'magcard__written' }, written.map((c) => h('li', {}, c))) : null,
      x.i.url ? extLink(x.i.url, labels.magazineButtonText || 'Read the full magazine', { cls: 'link-arrow' }) : null);
  })) : null;

  return h('div', { class: 'magfeature m-full' },
    stats,
    main ? h('div', { class: 'magfeature__issues' },
      h('h4', { class: 'gallery__title' }, 'Issue preview · cover and pages I wrote'),
      MagazineIssueCard(main.i, main.g, { lightbox, labels })) : null,
    coverRow ? h('div', { class: 'magfeature__issues' }, h('h4', { class: 'gallery__title' }, 'More issues · tap a cover to see the pages'), coverRow) : null,
    h('div', { class: 'magfeature__foot' },
      feature.healthNote ? h('p', { class: 'note' }, feature.healthNote) : null,
      extLink(data.articleLinks?.wton_catalog, 'Browse the WTON Magazine catalog', { cls: 'link-arrow' })));
}
