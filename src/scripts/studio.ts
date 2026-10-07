import { SCREENS } from '../lib/screens';
import type { Content, Session, SessionEntry } from '../lib/content';

// ---------------------------------------------------------------------------
// Skema – beskriver dokumenttyperne ligesom et Sanity-schema
// ---------------------------------------------------------------------------

type Doc = Record<string, any> & { _id: string };
type FieldType = 'string' | 'text' | 'number' | 'boolean' | 'select' | 'reference' | 'tags' | 'reviews';

interface Field {
  name: string;
  title: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  group?: string;
  options?: (doc: Doc) => { value: string; title: string }[];
  min?: number;
  max?: number;
  step?: number;
}

interface DocType {
  name: string;
  title: string;
  singular: string;
  icon: string;
  idPrefix: string;
  orderable?: boolean;
  groups?: { name: string; title: string }[];
  fields: Field[];
  preview: (doc: Doc, i: number) => { title: string; subtitle: string; media: string };
  previewUrl: (doc: Doc, i: number) => string;
  blank: () => Omit<Doc, '_id'>;
}

let content: Content;
let sessions: Session[] = [];

const WHEN: Record<string, string> = { arrive: 'Ved ankomst til skærmen', tap: 'Ved tryk på element', see: 'Når elementet bliver synligt' };
const LENSES: Record<string, string> = {
  speed: 'Hurtigt valg & forbrug',
  frictionless: 'Friktionsløshed',
  trust: 'Tillid & tryghed',
  associative: 'Associativt potentiale',
  friction: 'Bevidst friktion',
  local: 'Lokalsamfund & nabolag',
};

const screenOptions = () => SCREENS.map((s) => ({ value: s.id, title: s.label }));
const targetOptions = (doc: Doc) => [
  { value: '', title: '— Intet —' },
  ...(SCREENS.find((s) => s.id === doc.screen)?.targets ?? []).map((t) => ({ value: t.id, title: t.label })),
];

const TYPES: DocType[] = [
  {
    name: 'prompts',
    title: 'Spørgsmål',
    singular: 'Spørgsmål',
    icon: '?',
    idPrefix: 'q',
    orderable: true,
    groups: [
      { name: 'ask', title: 'Spørgsmål' },
      { name: 'research', title: 'Analyse' },
    ],
    fields: [
      { name: 'question', title: 'Spørgsmål til deltageren', type: 'text', required: true, group: 'ask', description: 'Vises i think-aloud-panelet ved siden af telefonen.' },
      { name: 'screen', title: 'Skærm', type: 'select', required: true, options: screenOptions, group: 'ask' },
      {
        name: 'when', title: 'Hvornår vises spørgsmålet?', type: 'select', required: true, group: 'ask',
        options: () => Object.entries(WHEN).map(([value, title]) => ({ value, title })),
      },
      { name: 'trigger', title: 'Element', type: 'select', options: targetOptions, group: 'ask', description: 'Bruges når spørgsmålet vises ved tryk på eller synlighed af et element.' },
      { name: 'lens', title: 'Analyselinse', type: 'select', group: 'research', options: () => Object.entries(LENSES).map(([value, title]) => ({ value, title })) },
      { name: 'observation', title: 'Forskerens note', type: 'text', group: 'research', description: 'Din analytiske note – vises kun i Studio, ikke for deltageren.' },
    ],
    preview: (d, i) => ({
      title: d.question || 'Uden spørgsmål',
      subtitle: `${SCREENS.find((s) => s.id === d.screen)?.label ?? ''} · ${WHEN[d.when] ?? ''}`,
      media: String(i + 1),
    }),
    previewUrl: (d) =>
      `/?embed=1&screen=${d.screen}${d.trigger && d.when !== 'arrive' ? `&highlight=${d.trigger}` : ''}`,
    blank: () => ({ question: '', screen: 'explore', when: 'arrive', trigger: '', lens: '', observation: '' }),
  },
  {
    name: 'listings',
    title: 'Boliger',
    singular: 'Bolig',
    icon: '⌂',
    idPrefix: 'listing',
    groups: [
      { name: 'content', title: 'Indhold' },
      { name: 'details', title: 'Detaljer' },
      { name: 'price', title: 'Pris' },
      { name: 'host', title: 'Vært' },
      { name: 'reviews', title: 'Anmeldelser' },
    ],
    fields: [
      { name: 'title', title: 'Titel', type: 'string', required: true, group: 'content' },
      { name: 'location', title: 'Lokation', type: 'string', required: true, group: 'content', description: 'Fx "Skagen, Danmark".' },
      {
        name: 'destination', title: 'Destination', type: 'reference', required: true, group: 'content',
        description: 'Bruges til at matche søgninger.',
        options: () => content.destinations.map((d) => ({ value: d.name, title: d.name })),
      },
      {
        name: 'category', title: 'Kategori', type: 'reference', group: 'content',
        options: () => content.categories.map((c) => ({ value: c._id, title: `${c.icon} ${c.name}` })),
      },
      { name: 'description', title: 'Beskrivelse', type: 'text', group: 'content' },
      { name: 'photoLabels', title: 'Fotos', type: 'tags', group: 'content', description: 'Lowfi: hver label bliver til en placeholder i galleriet.' },
      {
        name: 'type', title: 'Type af sted', type: 'select', group: 'details',
        options: () => ['Hele bolig', 'Hele lejlighed', 'Hele hytte', 'Hel husbåd', 'Privat værelse'].map((v) => ({ value: v, title: v })),
      },
      { name: 'guests', title: 'Gæster', type: 'number', min: 1, group: 'details' },
      { name: 'bedrooms', title: 'Soverum', type: 'number', min: 0, group: 'details' },
      { name: 'beds', title: 'Senge', type: 'number', min: 1, group: 'details' },
      { name: 'baths', title: 'Badeværelser', type: 'number', min: 0, group: 'details' },
      { name: 'amenities', title: 'Faciliteter', type: 'tags', group: 'details' },
      { name: 'mapX', title: 'Kortposition X (%)', type: 'number', min: 0, max: 100, group: 'details' },
      { name: 'mapY', title: 'Kortposition Y (%)', type: 'number', min: 0, max: 100, group: 'details' },
      { name: 'pricePerNight', title: 'Pris pr. nat', type: 'number', required: true, min: 0, step: 10, group: 'price' },
      { name: 'cleaningFee', title: 'Rengøringsgebyr', type: 'number', min: 0, step: 10, group: 'price' },
      { name: 'guestFavourite', title: 'Gæstefavorit', type: 'boolean', group: 'price', description: 'Viser badget "Gæstefavorit".' },
      { name: 'hostName', title: 'Værtens navn', type: 'string', required: true, group: 'host' },
      { name: 'hostYears', title: 'År som vært', type: 'number', min: 0, group: 'host' },
      { name: 'superhost', title: 'Superhost', type: 'boolean', group: 'host' },
      { name: 'rating', title: 'Bedømmelse', type: 'number', min: 0, max: 5, step: 0.01, group: 'reviews' },
      { name: 'reviewCount', title: 'Antal anmeldelser', type: 'number', min: 0, group: 'reviews' },
      { name: 'reviews', title: 'Udvalgte anmeldelser', type: 'reviews', group: 'reviews' },
    ],
    preview: (d) => ({ title: d.title || 'Uden titel', subtitle: `${d.location ?? ''} · ${Number(d.pricePerNight || 0).toLocaleString('da-DK')} kr./nat`, media: '⌂' }),
    previewUrl: (d) => `/?embed=1&screen=detail&listing=${encodeURIComponent(d._id)}`,
    blank: () => ({
      title: '', location: '', destination: content.destinations[0]?.name ?? '', category: '', type: 'Hele bolig',
      guests: 2, bedrooms: 1, beds: 1, baths: 1, pricePerNight: 1000, cleaningFee: 250, rating: 5, reviewCount: 0,
      hostName: '', hostYears: 1, superhost: false, guestFavourite: false, description: '', amenities: ['Wi-fi', 'Køkken'],
      photoLabels: ['Facade', 'Stue'], mapX: 50, mapY: 50, reviews: [],
    }),
  },
  {
    name: 'categories',
    title: 'Kategorier',
    singular: 'Kategori',
    icon: '▦',
    idPrefix: 'cat',
    orderable: true,
    fields: [
      { name: 'name', title: 'Navn', type: 'string', required: true },
      { name: 'icon', title: 'Ikon', type: 'string', description: 'En emoji – vises i gråtoner i lowfi-designet.' },
    ],
    preview: (d) => ({ title: d.name || 'Uden navn', subtitle: `${content.listings.filter((l) => l.category === d._id).length} boliger`, media: d.icon || '▦' }),
    previewUrl: (d) => `/?embed=1&screen=explore&category=${encodeURIComponent(d._id)}`,
    blank: () => ({ name: '', icon: '🏠' }),
  },
  {
    name: 'destinations',
    title: 'Destinationer',
    singular: 'Destination',
    icon: '⌖',
    idPrefix: 'dest',
    orderable: true,
    fields: [
      { name: 'name', title: 'Navn', type: 'string', required: true, description: 'Skal matche feltet "Destination" på boligerne.' },
      { name: 'subtitle', title: 'Undertekst', type: 'string' },
      { name: 'icon', title: 'Ikon', type: 'string' },
    ],
    preview: (d) => ({ title: d.name || 'Uden navn', subtitle: d.subtitle ?? '', media: d.icon || '⌖' }),
    previewUrl: () => `/?embed=1&screen=search-where`,
    blank: () => ({ name: '', subtitle: '', icon: '📍' }),
  },
];

const SETTINGS_TYPE: DocType = {
  name: 'settings',
  title: 'Indstillinger',
  singular: 'Indstillinger',
  icon: '⚙',
  idPrefix: 'settings',
  fields: [
    { name: 'researchQuestion', title: 'Forskningsspørgsmål', type: 'text', description: 'Til dig selv og teamet – vises ikke for deltagerne.' },
    { name: 'testTask', title: 'Opgave til deltageren', type: 'text', required: true, description: 'Vises på startskærmen og øverst i panelet under hele testen.' },
    { name: 'finalQuestion', title: 'Afsluttende spørgsmål', type: 'text', required: true },
    {
      name: 'featuredListingId', title: 'Fremhævet bolig', type: 'reference', required: true,
      description: 'Vises først i resultater og på forsiden.',
      options: () => content.listings.map((l) => ({ value: l._id, title: l.title })),
    },
    { name: 'appName', title: 'App-navn', type: 'string' },
    { name: 'searchPlaceholder', title: 'Tekst i søgefeltet', type: 'string' },
    { name: 'currency', title: 'Valuta', type: 'string' },
    { name: 'serviceFeePct', title: 'Servicegebyr (%)', type: 'number', min: 0, max: 30 },
    { name: 'showAccent', title: 'Vis accentfarve', type: 'boolean', description: 'Slå fra for et helt gråtonet wireframe.' },
  ],
  preview: () => ({ title: 'Indstillinger', subtitle: '', media: '⚙' }),
  previewUrl: () => `/?embed=1&screen=explore`,
  blank: () => ({}),
};

// ---------------------------------------------------------------------------
// Tilstand. Kladder gemmes lokalt (som Sanity-drafts) indtil de publiceres.
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'studio-drafts';
let drafts: Record<string, Doc> = {};
try {
  drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}');
} catch {}
const persistDrafts = () => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {}
};

let typeName = '';
let docId = '';
let group = '';
let view: 'edit' | 'preview' | 'split' = window.innerWidth > 1400 ? 'split' : 'edit';
let lastPublished: Record<string, number> = {};

const $ = (s: string) => document.querySelector(s) as HTMLElement;
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const typeDef = () => (typeName === 'settings' ? SETTINGS_TYPE : TYPES.find((t) => t.name === typeName));
const key = (t = typeName, id = docId) => `${t}/${id}`;

function publishedDoc(t = typeName, id = docId): Doc | undefined {
  if (t === 'settings') return { _id: 'settings', ...content.settings };
  return (content[t as keyof Content] as Doc[]).find((d) => d._id === id);
}
const currentDoc = () => drafts[key()] ?? publishedDoc();
const isDirty = () => !!drafts[key()];
const docsOf = (t: string): Doc[] => {
  const pub = content[t as keyof Content] as Doc[];
  const fresh = Object.entries(drafts)
    .filter(([k]) => k.startsWith(`${t}/`) && !pub.some((d) => `${t}/${d._id}` === k))
    .map(([, d]) => d);
  return [...pub.map((d) => drafts[`${t}/${d._id}`] ?? d), ...fresh];
};

// Indholdet som preview'et skal vise: publiceret + alle kladder
function mergedContent(): Content {
  const c: Content = structuredClone(content);
  for (const t of TYPES) (c as any)[t.name] = docsOf(t.name);
  if (drafts['settings/settings']) {
    const { _id, ...s } = drafts['settings/settings'];
    c.settings = s as Content['settings'];
  }
  return c;
}

// ---------------------------------------------------------------------------
// Rendering af panes
// ---------------------------------------------------------------------------

function renderStructure() {
  const answerCount = sessions.reduce((n, x) => n + x.entries.length, 0);
  const item = (t: DocType, count?: number) =>
    `<a href="#${t.name}" class="item ${typeName === t.name ? 'on' : ''}"><span class="ic">${t.icon}</span><span class="grow">${t.title}</span>${
      count !== undefined ? `<span class="count">${count}</span>` : ''
    }<span class="chev">›</span></a>`;
  $('#pane-structure').innerHTML = `
    <header class="pane-head"><strong>Indhold</strong></header>
    <nav class="pane-list">
      <p class="pane-label">Svar fra deltagere</p>
      ${resultItem('sessions', 'Sessioner', '◷', sessions.length)}
      ${resultItem('answers', 'Svar pr. spørgsmål', '❝', answerCount)}
      ${resultItem('search', 'Søg i svar', '⌕')}
      <div class="sep"></div>
      <p class="pane-label">Indhold</p>
      ${TYPES.map((t) => item(t, docsOf(t.name).length)).join('')}
      <div class="sep"></div>
      ${item(SETTINGS_TYPE)}
    </nav>`;
}

function renderList() {
  if (isResults()) return renderResultsList();
  const t = typeDef();
  const pane = $('#pane-list');
  if (!t || t.name === 'settings') {
    pane.hidden = true;
    return;
  }
  pane.hidden = false;
  const docs = docsOf(t.name);
  const q = (pane.querySelector('#list-search') as HTMLInputElement | null)?.value?.toLowerCase() ?? '';
  pane.innerHTML = `
    <header class="pane-head">
      <a class="back-link" href="#" aria-label="Tilbage">‹</a>
      <strong>${t.title}</strong>
      <button class="icon-btn" data-create title="Opret ny ${t.singular.toLowerCase()}">＋</button>
    </header>
    <div class="list-search"><input id="list-search" placeholder="Søg i ${t.title.toLowerCase()}" value="${esc(q)}"></div>
    <nav class="pane-list docs">
      ${docs
        .map((d, i) => ({ d, i, p: t.preview(d, i) }))
        .filter(({ p }) => !q || `${p.title} ${p.subtitle}`.toLowerCase().includes(q))
        .map(({ d, i, p }) => {
          const k = `${t.name}/${d._id}`;
          const isNew = !publishedDoc(t.name, d._id);
          return `<a href="#${t.name}/${encodeURIComponent(d._id)}" class="item doc ${docId === d._id ? 'on' : ''}">
            <span class="media">${esc(p.media)}</span>
            <span class="grow txt"><strong>${esc(p.title)}</strong><small>${esc(p.subtitle)}</small></span>
            ${drafts[k] ? `<span class="state ${isNew ? 'new' : 'draft'}" title="${isNew ? 'Ikke publiceret' : 'Ændringer ikke publiceret'}"></span>` : ''}
            ${
              t.orderable && !q
                ? `<span class="order"><button data-move="${i}:-1" title="Flyt op" ${i === 0 ? 'disabled' : ''}>▲</button><button data-move="${i}:1" title="Flyt ned" ${i === docs.length - 1 ? 'disabled' : ''}>▼</button></span>`
                : ''
            }
          </a>`;
        })
        .join('')}
    </nav>`;
  const input = pane.querySelector('#list-search') as HTMLInputElement;
  if (q) {
    input.focus();
    input.setSelectionRange(q.length, q.length);
  }
}

function fieldError(f: Field, v: unknown) {
  if (f.required && (v === '' || v === undefined || v === null)) return 'Påkrævet';
  if (f.type === 'number' && v !== '' && v !== undefined) {
    if (f.min !== undefined && Number(v) < f.min) return `Skal være mindst ${f.min}`;
    if (f.max !== undefined && Number(v) > f.max) return `Må højst være ${f.max}`;
  }
  return '';
}
const errors = (doc: Doc) => (typeDef()?.fields ?? []).map((f) => [f, fieldError(f, doc[f.name])] as const).filter(([, e]) => e);

function renderInput(f: Field, doc: Doc) {
  const v = doc[f.name];
  const name = `name="${f.name}"`;
  switch (f.type) {
    case 'text':
      return `<textarea ${name} rows="4">${esc(v)}</textarea>`;
    case 'number':
      return `<input type="number" ${name} value="${esc(v)}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} step="${f.step ?? 1}">`;
    case 'boolean':
      return `<label class="switch"><input type="checkbox" ${name} ${v ? 'checked' : ''}><i></i><span>${v ? 'Til' : 'Fra'}</span></label>`;
    case 'select':
    case 'reference': {
      const opts = f.options?.(doc) ?? [];
      const missing = v && !opts.some((o) => o.value === v);
      return `<div class="${f.type === 'reference' ? 'ref' : ''}"><select ${name}>
        ${f.type === 'reference' && !f.required ? '<option value="">— Ingen —</option>' : ''}
        ${missing ? `<option value="${esc(v)}" selected>⚠ ${esc(v)} (findes ikke)</option>` : ''}
        ${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}
      </select></div>`;
    }
    case 'tags':
      return `<div class="tags">${(v ?? [])
        .map((t: string, i: number) => `<span class="tag">${esc(t)}<button type="button" data-tag-remove="${f.name}:${i}" aria-label="Fjern">×</button></span>`)
        .join('')}<input data-tag-add="${f.name}" placeholder="Tilføj og tryk Enter"></div>`;
    case 'reviews':
      return `<div class="array">${(v ?? [])
        .map(
          (r: any, i: number) => `<div class="array-item">
            <div class="row2"><label>Navn<input data-review="${i}:author" value="${esc(r.author)}"></label><label>Dato<input data-review="${i}:date" value="${esc(r.date)}"></label></div>
            <label>Tekst<textarea rows="2" data-review="${i}:text">${esc(r.text)}</textarea></label>
            <button type="button" class="remove" data-review-remove="${i}">Fjern</button></div>`,
        )
        .join('')}<button type="button" class="add" data-review-add>＋ Tilføj anmeldelse</button></div>`;
    default:
      return `<input type="text" ${name} value="${esc(v)}">`;
  }
}

function renderEditor() {
  if (isResults()) return renderResultsEditor();
  const t = typeDef();
  const pane = $('#pane-editor');
  const doc = t && currentDoc();
  if (!t || !doc) {
    pane.innerHTML = `<div class="empty-pane"><p>${t ? `Vælg ${t.singular.toLowerCase()} i listen – eller opret en ny.` : 'Vælg en dokumenttype til venstre.'}</p></div>`;
    pane.classList.remove('with-preview');
    return;
  }
  const idx = t.name === 'settings' ? 0 : docsOf(t.name).findIndex((d) => d._id === doc._id);
  const p = t.preview(doc, idx);
  const groups = t.groups ?? [];
  if (groups.length && !groups.some((g) => g.name === group)) group = groups[0].name;
  const fields = t.fields.filter((f) => !groups.length || f.group === group);
  const errs = errors(doc);

  pane.classList.toggle('with-preview', view === 'split');
  pane.innerHTML = `
    <div class="doc-pane">
      <header class="pane-head doc-head">
        <a class="back-link" href="#${t.name === 'settings' ? '' : t.name}" aria-label="Tilbage">‹</a>
        <span class="media sm">${esc(p.media)}</span>
        <strong class="grow">${esc(p.title)}</strong>
        <div class="views">
          <button class="${view === 'edit' ? 'on' : ''}" data-view="edit">Redigér</button>
          <button class="${view === 'preview' ? 'on' : ''}" data-view="preview">Preview</button>
          <button class="${view === 'split' ? 'on' : ''}" data-view="split" title="Delt visning">◫</button>
        </div>
        ${
          t.name !== 'settings'
            ? `<details class="menu"><summary class="icon-btn" title="Flere handlinger">⋯</summary><div>
                <button data-duplicate>Duplikér</button>
                ${isDirty() && publishedDoc() ? '<button data-discard>Kassér ændringer</button>' : ''}
                <button class="danger" data-delete>Slet</button></div></details>`
            : isDirty()
              ? `<button class="icon-btn" data-discard title="Kassér ændringer">↺</button>`
              : ''
        }
      </header>
      ${
        view !== 'preview'
          ? `${groups.length ? `<div class="groups">${groups.map((g) => `<button class="${g.name === group ? 'on' : ''}" data-group="${g.name}">${g.title}</button>`).join('')}</div>` : ''}
             <form class="form" autocomplete="off">
               ${fields
                 .map((f) => {
                   const err = fieldError(f, doc[f.name]);
                   return `<div class="field ${err ? 'invalid' : ''}" data-field="${f.name}">
                     <label class="f-label">${esc(f.title)}${f.required ? ' <span class="req">*</span>' : ''}</label>
                     ${f.description ? `<p class="f-desc">${esc(f.description)}</p>` : ''}
                     ${renderInput(f, doc)}
                     <p class="f-err">${err ? `⚠ ${esc(err)}` : ''}</p>
                   </div>`;
                 })
                 .join('')}
             </form>`
          : ''
      }
      <footer class="doc-foot">
        <span class="status">${statusLabel(errs.length)}</span>
        <button class="publish" data-publish ${!isDirty() || errs.length ? 'disabled' : ''}>${isDirty() ? 'Publicer' : 'Publiceret'}</button>
      </footer>
    </div>
    ${view !== 'edit' ? `<div class="preview-pane"><div class="preview-head"><span>Preview · ${esc(t.singular)}</span><a href="${t.previewUrl(doc, idx).replace('embed=1&', '')}" target="_blank">Åbn ↗</a></div><iframe id="preview" src="${t.previewUrl(doc, idx)}" title="Preview"></iframe></div>` : ''}`;
}

function statusLabel(errCount: number) {
  if (errCount) return `<i class="dot red"></i>${errCount} ${errCount === 1 ? 'fejl' : 'fejl'} skal rettes`;
  if (isDirty()) return `<i class="dot orange"></i>${publishedDoc() ? 'Ændringer ikke publiceret' : 'Ikke publiceret endnu'}`;
  const ts = lastPublished[key()];
  return `<i class="dot green"></i>Publiceret${ts ? ` ${new Date(ts).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}` : ''}`;
}

// Opdaterer footer og liste uden at gen-tegne formularen (bevarer fokus)
function refreshChrome() {
  const doc = currentDoc();
  if (!doc) return;
  const errs = errors(doc);
  const foot = document.querySelector('.doc-foot');
  if (foot) {
    foot.querySelector('.status')!.innerHTML = statusLabel(errs.length);
    const btn = foot.querySelector('[data-publish]') as HTMLButtonElement;
    btn.disabled = !isDirty() || !!errs.length;
    btn.textContent = isDirty() ? 'Publicer' : 'Publiceret';
  }
  document.querySelectorAll<HTMLElement>('.field').forEach((el) => {
    const f = typeDef()!.fields.find((x) => x.name === el.dataset.field)!;
    const err = fieldError(f, doc[f.name]);
    el.classList.toggle('invalid', !!err);
    el.querySelector('.f-err')!.textContent = err ? `⚠ ${err}` : '';
  });
  const p = typeDef()!.preview(doc, 0);
  const title = document.querySelector('.doc-head strong');
  if (title) title.textContent = p.title;
  renderList();
  renderStructure();
  sendDraftToPreview();
}

let previewTimer = 0;
function sendDraftToPreview() {
  clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    const frame = document.getElementById('preview') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ type: 'draft-content', content: mergedContent() }, location.origin);
  }, 120);
}

function render() {
  renderStructure();
  renderList();
  renderEditor();
  document.body.dataset.depth = typeName === 'settings' || typeName === 'search' ? 'settings' : docId ? '3' : typeName ? '2' : '1';
}

// ---------------------------------------------------------------------------
// Redigering
// ---------------------------------------------------------------------------

function edit(mutator: (d: Doc) => void, rerender = false) {
  const d = structuredClone(currentDoc()!);
  mutator(d);
  const pub = publishedDoc();
  if (pub && JSON.stringify(pub) === JSON.stringify(d)) delete drafts[key()];
  else drafts[key()] = d;
  persistDrafts();
  if (rerender) {
    renderEditor();
    refreshChrome();
  } else refreshChrome();
}

function coerce(f: Field, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (f.type === 'number') return el.value === '' ? '' : Number(el.value);
  if (f.type === 'boolean') return (el as HTMLInputElement).checked;
  return el.value;
}

const editor = $('#pane-editor');

editor.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === 'answer-search') {
    searchQuery = el.value;
    return renderSearchResults();
  }
  if (el.id === 'search-type') {
    searchType = el.value;
    return renderSearchResults();
  }
  if (el.dataset.review) {
    const [i, prop] = el.dataset.review.split(':');
    return edit((d) => (d.reviews[Number(i)][prop] = el.value));
  }
  const f = typeDef()?.fields.find((x) => x.name === el.name);
  if (!f) return;
  // Når skærmen skifter, skal hotspot-listen opdateres
  const structural = f.type === 'boolean' || (typeName === 'prompts' && f.name === 'screen');
  edit((d) => {
    d[f.name] = coerce(f, el);
    if (typeName === 'prompts' && f.name === 'screen' && !targetOptions(d).some((o) => o.value === d.trigger)) d.trigger = '';
  }, structural);
});

editor.addEventListener('keydown', (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.tagAdd && e.key === 'Enter') {
    e.preventDefault();
    const v = el.value.trim();
    if (!v) return;
    edit((d) => (d[el.dataset.tagAdd!] = [...(d[el.dataset.tagAdd!] ?? []), v]), true);
    (editor.querySelector(`[data-tag-add="${el.dataset.tagAdd}"]`) as HTMLInputElement)?.focus();
  }
});

editor.addEventListener('submit', (e) => e.preventDefault());

editor.addEventListener('click', async (e) => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b) return;
  if (isResults()) return resultsClick(b);
  if (b.dataset.view) {
    view = b.dataset.view as typeof view;
    renderEditor();
  } else if (b.dataset.group) {
    group = b.dataset.group;
    renderEditor();
  } else if (b.dataset.tagRemove) {
    const [name, i] = b.dataset.tagRemove.split(':');
    edit((d) => d[name].splice(Number(i), 1), true);
  } else if (b.hasAttribute('data-review-add')) {
    edit((d) => (d.reviews = [...(d.reviews ?? []), { author: '', date: '', text: '' }]), true);
  } else if (b.dataset.reviewRemove) {
    edit((d) => d.reviews.splice(Number(b.dataset.reviewRemove), 1), true);
  } else if (b.hasAttribute('data-publish')) {
    await publish();
  } else if (b.hasAttribute('data-discard')) {
    delete drafts[key()];
    persistDrafts();
    if (!publishedDoc()) location.hash = typeName;
    render();
  } else if (b.hasAttribute('data-duplicate')) {
    const t = typeDef()!;
    const id = `${t.idPrefix}-${Date.now().toString(36)}`;
    const copy = { ...structuredClone(currentDoc()!), _id: id };
    if ('title' in copy) copy.title = `${copy.title} (kopi)`;
    else if ('name' in copy) copy.name = `${copy.name} (kopi)`;
    drafts[`${t.name}/${id}`] = copy;
    persistDrafts();
    location.hash = `${t.name}/${id}`;
  } else if (b.hasAttribute('data-delete')) {
    const p = typeDef()!.preview(currentDoc()!, 0);
    if (!confirm(`Slet "${p.title}"? Det kan ikke fortrydes.`)) return;
    if (publishedDoc()) await api('DELETE', `${typeName}/${encodeURIComponent(docId)}`);
    delete drafts[key()];
    persistDrafts();
    await reload();
    toast(`"${p.title}" er slettet`);
    location.hash = typeName;
  }
});

async function publish() {
  const doc = currentDoc();
  if (!doc || !isDirty() || errors(doc).length) return;
  const btn = document.querySelector('[data-publish]') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Publicerer…';
  const { _id, ...rest } = doc;
  await api('PUT', typeName === 'settings' ? 'settings' : `${typeName}/${encodeURIComponent(docId)}`, typeName === 'settings' ? rest : doc);
  delete drafts[key()];
  persistDrafts();
  lastPublished[key()] = Date.now();
  await reload();
  renderEditor();
  refreshChrome();
  toast('Publiceret ✓');
}

// ---------------------------------------------------------------------------
// Liste: opret, sortér, søg
// ---------------------------------------------------------------------------

$('#pane-list').addEventListener('click', async (e) => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b) return;
  e.preventDefault();
  if (b.hasAttribute('data-export-all')) return exportCSV(sessions, 'think-aloud-alle-sessioner');
  if (b.hasAttribute('data-refresh')) {
    await reload();
    return render();
  }
  const t = typeDef()!;
  if (b.hasAttribute('data-create')) {
    const id = `${t.idPrefix}-${Date.now().toString(36)}`;
    drafts[`${t.name}/${id}`] = { _id: id, ...t.blank() } as Doc;
    persistDrafts();
    location.hash = `${t.name}/${id}`;
  } else if (b.dataset.move) {
    const [i, dir] = b.dataset.move.split(':').map(Number);
    const ids = docsOf(t.name).map((d) => d._id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    await api('POST', `${t.name}/order`, ids);
    await reload();
    render();
    toast('Rækkefølge gemt');
  }
});
$('#pane-list').addEventListener('input', (e) => {
  if ((e.target as HTMLElement).id === 'list-search') renderList();
});

// ---------------------------------------------------------------------------
// Svar fra deltagere: sessioner, svar pr. spørgsmål og søgning
// ---------------------------------------------------------------------------

const RESULT_VIEWS = ['sessions', 'answers', 'search'];
const isResults = () => RESULT_VIEWS.includes(typeName);
let searchQuery = '';
let searchType = 'all';

const ENTRY_LABEL: Record<SessionEntry['type'], string> = { answer: 'Svar', thought: 'Tanke', final: 'Afsluttende svar' };
const screenName = (id: string) => SCREENS.find((s) => s.id === id)?.label ?? id;
const promptById = (id: string) => content.prompts.find((p) => p._id === id);
const fmtDate = (t: number) => new Date(t).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const offset = (s: Session, t: number) => {
  const sec = Math.max(0, Math.round((t - s.startedAt) / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
const allEntries = () => sessions.flatMap((s) => s.entries.map((e) => ({ s, e })));

function resultItem(name: string, title: string, ic: string, count?: number) {
  return `<a href="#${name}" class="item ${typeName === name ? 'on' : ''}"><span class="ic">${ic}</span><span class="grow">${title}</span>${
    count !== undefined ? `<span class="count">${count}</span>` : ''
  }<span class="chev">›</span></a>`;
}

function entryCard(s: Session, e: SessionEntry, opts: { showWho?: boolean; showQuestion?: boolean; highlight?: string } = {}) {
  let text = esc(e.text);
  if (opts.highlight) {
    const re = new RegExp(`(${opts.highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    text = text.replace(re, '<mark>$1</mark>');
  }
  return `<article class="entry ${e.type}">
    <header>
      <span class="etype">${ENTRY_LABEL[e.type]}</span>
      ${opts.showWho ? `<a class="who" href="#sessions/${encodeURIComponent(s._id)}">${esc(s.participant)}</a>` : ''}
      <span class="grow"></span>
      ${e.source === 'voice' ? '<span title="Dikteret">🎙</span>' : ''}
      <span class="muted-s">${esc(screenName(e.screen))} · ${offset(s, e.t)}</span>
    </header>
    ${opts.showQuestion && e.question ? `<p class="q">${esc(e.question)}</p>` : ''}
    <p class="etext">${text}</p>
  </article>`;
}

function renderResultsList() {
  const pane = $('#pane-list');
  if (typeName === 'search') {
    pane.hidden = true;
    return;
  }
  pane.hidden = false;
  if (typeName === 'sessions') {
    pane.innerHTML = `
      <header class="pane-head">
        <a class="back-link" href="#" aria-label="Tilbage">‹</a>
        <strong>Sessioner</strong>
        <span class="grow"></span>
        <button class="icon-btn" data-refresh title="Hent nye svar">↻</button>
        <button class="icon-btn" data-export-all title="Eksportér alle svar som CSV" ${sessions.length ? '' : 'disabled'}>⤓</button>
      </header>
      <nav class="pane-list docs">
        ${
          sessions.length
            ? sessions
                .map((x) => {
                  const a = x.entries.filter((e) => e.type === 'answer').length;
                  const th = x.entries.filter((e) => e.type === 'thought').length;
                  return `<a href="#sessions/${encodeURIComponent(x._id)}" class="item doc ${docId === x._id ? 'on' : ''}">
                    <span class="media">${esc(x.participant[0] ?? '?')}</span>
                    <span class="grow txt"><strong>${esc(x.participant)}</strong><small>${fmtDate(x.startedAt)} · ${a} svar · ${th} tanker</small></span>
                    ${x.finishedAt ? '' : '<span class="state new" title="I gang / ikke afsluttet"></span>'}
                  </a>`;
                })
                .join('')
            : `<div class="empty-note"><p><strong>Ingen sessioner endnu.</strong></p><p>Send deltagerne linket til testen:</p><code>${location.origin}/</code></div>`
        }
      </nav>`;
    return;
  }
  // Svar pr. spørgsmål
  const entries = allEntries();
  const count = (fn: (e: SessionEntry) => boolean) => entries.filter(({ e }) => fn(e)).length;
  const rows = [
    ...content.prompts.map((p, i) => ({ id: p._id, title: p.question, sub: screenName(p.screen), media: String(i + 1), n: count((e) => e.promptId === p._id) })),
    { id: 'thoughts', title: 'Frie tanker', sub: 'Alt hvad deltagerne har tænkt højt, grupperet efter skærm', media: '💭', n: count((e) => e.type === 'thought') },
    { id: 'final', title: 'Afsluttende spørgsmål', sub: settings().finalQuestion, media: '✓', n: count((e) => e.type === 'final') },
  ];
  pane.innerHTML = `
    <header class="pane-head"><a class="back-link" href="#" aria-label="Tilbage">‹</a><strong>Svar pr. spørgsmål</strong></header>
    <nav class="pane-list docs">${rows
      .map(
        (r) => `<a href="#answers/${r.id}" class="item doc ${docId === r.id ? 'on' : ''}">
          <span class="media">${r.media}</span>
          <span class="grow txt"><strong>${esc(r.title)}</strong><small>${esc(r.sub)}</small></span>
          <span class="count ${r.n ? '' : 'zero'}">${r.n}</span></a>`,
      )
      .join('')}</nav>`;
}

const settings = () => content.settings;

function renderResultsEditor() {
  const pane = $('#pane-editor');
  pane.classList.remove('with-preview');
  if (typeName === 'search') return renderSearch(pane);
  if (!docId) {
    pane.innerHTML = `<div class="empty-pane"><p>${typeName === 'sessions' ? 'Vælg en session for at se deltagerens tidslinje.' : 'Vælg et spørgsmål for at se alle svar.'}</p></div>`;
    return;
  }
  if (typeName === 'sessions') return renderSession(pane);
  return renderAnswers(pane);
}

function renderSession(pane: HTMLElement) {
  const s = sessions.find((x) => x._id === docId);
  if (!s) {
    pane.innerHTML = '<div class="empty-pane"><p>Sessionen findes ikke.</p></div>';
    return;
  }
  const end = s.finishedAt ?? s.updatedAt;
  type Row = { t: number; html: string };
  const rows: Row[] = [];
  let lastScreen = '';
  for (const ev of s.events) {
    if (ev.type === 'screen' && ev.screen !== lastScreen) {
      lastScreen = ev.screen;
      rows.push({ t: ev.t, html: `<div class="tl-screen"><span>→ ${esc(screenName(ev.screen))}</span><time>${offset(s, ev.t)}</time></div>` });
    } else if (ev.detail?.startsWith('prompt:')) {
      const p = promptById(ev.detail.slice(7));
      rows.push({ t: ev.t, html: `<div class="tl-event">💬 Spørgsmål vist: <em>${esc(p?.question ?? ev.detail.slice(7))}</em><time>${offset(s, ev.t)}</time></div>` });
    } else if (ev.detail?.startsWith('skip:')) {
      rows.push({ t: ev.t, html: `<div class="tl-event">↷ Sprang spørgsmålet over<time>${offset(s, ev.t)}</time></div>` });
    }
  }
  for (const e of s.entries) rows.push({ t: e.t + 0.5, html: entryCard(s, e, { showQuestion: true }) });
  rows.sort((a, b) => a.t - b.t);
  const n = (type: string) => s.entries.filter((e) => e.type === type).length;
  pane.innerHTML = `
    <div class="doc-pane">
      <header class="pane-head doc-head">
        <a class="back-link" href="#sessions" aria-label="Tilbage">‹</a>
        <span class="media sm">${esc(s.participant[0] ?? '?')}</span>
        <strong class="grow">${esc(s.participant)}</strong>
        <button class="btn-s" data-export-one>⤓ CSV</button>
        <button class="btn-s danger" data-del-session>Slet</button>
      </header>
      <div class="report">
        <dl class="meta">
          <div><dt>Startet</dt><dd>${fmtDate(s.startedAt)}</dd></div>
          <div><dt>Varighed</dt><dd>${offset(s, end)} min</dd></div>
          <div><dt>Status</dt><dd>${s.finishedAt ? '✓ Afsluttet' : '◌ Ikke afsluttet'}</dd></div>
          <div><dt>Booket</dt><dd>${esc(s.booked ?? '—')}</dd></div>
          <div><dt>Svar · tanker</dt><dd>${n('answer')} · ${n('thought')}</dd></div>
        </dl>
        <h3 class="report-h">Tidslinje</h3>
        <div class="timeline">${rows.map((r) => r.html).join('') || '<p class="muted-s">Ingen aktivitet endnu.</p>'}</div>
      </div>
    </div>`;
}

function renderAnswers(pane: HTMLElement) {
  const p = promptById(docId);
  const title = p?.question ?? (docId === 'thoughts' ? 'Frie tanker' : settings().finalQuestion);
  const list = allEntries().filter(({ e }) =>
    docId === 'thoughts' ? e.type === 'thought' : docId === 'final' ? e.type === 'final' : e.promptId === docId,
  );
  const shown = p ? sessions.filter((s) => s.events.some((ev) => ev.detail === `prompt:${p._id}`)).length : 0;
  const skipped = p ? sessions.filter((s) => s.events.some((ev) => ev.detail === `skip:${p._id}`)).length : 0;
  let body = '';
  if (docId === 'thoughts') {
    // Gruppér frie tanker efter skærm i appens rækkefølge
    body = SCREENS.map((sc) => {
      const items = list.filter(({ e }) => e.screen === sc.id);
      return items.length ? `<h3 class="report-h">${esc(sc.label)} <span class="count">${items.length}</span></h3>${items.map(({ s, e }) => entryCard(s, e, { showWho: true })).join('')}` : '';
    }).join('');
  } else {
    body = list.map(({ s, e }) => entryCard(s, e, { showWho: true })).join('');
  }
  pane.innerHTML = `
    <div class="doc-pane">
      <header class="pane-head doc-head">
        <a class="back-link" href="#answers" aria-label="Tilbage">‹</a>
        <strong class="grow">${esc(title)}</strong>
        ${p ? `<a class="btn-s" href="#prompts/${encodeURIComponent(p._id)}">Redigér spørgsmål</a>` : ''}
      </header>
      <div class="report">
        ${
          p && (p.observation || p.lens)
            ? `<div class="note">${p.lens ? `<span class="lens">${esc(LENSES[p.lens] ?? p.lens)}</span>` : ''}<p>${esc(p.observation)}</p></div>`
            : ''
        }
        <div class="stats">
          <span><strong>${list.length}</strong> ${docId === 'thoughts' ? 'tanker' : 'svar'}</span>
          ${p ? `<span><strong>${shown}</strong> fik spørgsmålet</span><span><strong>${skipped}</strong> sprang over</span>` : ''}
        </div>
        ${body || '<p class="muted-s">Ingen svar endnu.</p>'}
      </div>
    </div>`;
}

function renderSearch(pane: HTMLElement) {
  pane.innerHTML = `
    <div class="doc-pane">
      <header class="pane-head doc-head"><a class="back-link" href="#" aria-label="Tilbage">‹</a><strong class="grow">Søg i svar</strong></header>
      <div class="report">
        <div class="search-bar">
          <input id="answer-search" placeholder="Søg fx 'nabolag', 'pris', 'lokal' …" value="${esc(searchQuery)}" autocomplete="off">
          <select id="search-type">
            ${[['all', 'Alle typer'], ['answer', 'Svar'], ['thought', 'Tanker'], ['final', 'Afsluttende']].map(([v, l]) => `<option value="${v}" ${searchType === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="stats"><span id="search-count"></span></div>
        <div id="search-results"></div>
      </div>
    </div>`;
  renderSearchResults();
  const input = pane.querySelector('#answer-search') as HTMLInputElement;
  input.focus();
  input.setSelectionRange(searchQuery.length, searchQuery.length);
}

function renderSearchResults() {
  const q = searchQuery.trim().toLowerCase();
  const hits = allEntries()
    .filter(({ e }) => (searchType === 'all' || e.type === searchType) && (!q || `${e.text} ${e.question ?? ''}`.toLowerCase().includes(q)))
    .sort((a, b) => b.e.t - a.e.t);
  $('#search-count').innerHTML = `<strong>${hits.length}</strong> ${hits.length === 1 ? 'resultat' : 'resultater'}`;
  $('#search-results').innerHTML =
    hits.map(({ s, e }) => entryCard(s, e, { showWho: true, showQuestion: true, highlight: q })).join('') ||
    '<p class="muted-s">Ingen svar matcher.</p>';
}

async function resultsClick(b: HTMLButtonElement) {
  if (b.hasAttribute('data-export-one')) {
    const s = sessions.find((x) => x._id === docId);
    if (s) exportCSV([s], `think-aloud-${s.participant}`);
  } else if (b.hasAttribute('data-del-session')) {
    const s = sessions.find((x) => x._id === docId);
    if (!s || !confirm(`Slet sessionen med "${s.participant}"? Alle svar slettes permanent.`)) return;
    await fetch(`/api/sessions/${encodeURIComponent(s._id)}`, { method: 'DELETE' });
    await reload();
    toast('Session slettet');
    location.hash = 'sessions';
  }
}

// CSV med semikolon og BOM, så den åbner korrekt i dansk Excel
function exportCSV(list: Session[], name: string) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['session', 'deltager', 'type', 'spørgsmål', 'skærm', 'tekst', 'kilde', 'tidspunkt', 'sekunder_fra_start'];
  const rows = list.flatMap((s) =>
    s.entries.map((e) =>
      [s._id, s.participant, ENTRY_LABEL[e.type], e.question ?? '', screenName(e.screen), e.text, e.source === 'voice' ? 'diktat' : 'skrevet', new Date(e.t).toISOString(), Math.round((e.t - s.startedAt) / 1000)]
        .map(cell)
        .join(';'),
    ),
  );
  const blob = new Blob(['﻿' + [head.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/[^\wæøåÆØÅ-]+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Diverse
// ---------------------------------------------------------------------------

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`/api/content/${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) location.href = '/login?next=/admin';
  if (!res.ok) {
    toast('Noget gik galt – prøv igen', true);
    throw new Error(await res.text());
  }
  return res.json();
}

async function reload() {
  const [c, se] = await Promise.all([fetch('/api/content'), fetch('/api/sessions')]);
  if (c.status === 401 || se.status === 401) {
    location.href = '/login?next=/admin';
    return;
  }
  [content, sessions] = await Promise.all([c.json(), se.json()]);
  sessions.sort((a, b) => b.startedAt - a.startedAt);
}

let toastTimer = 0;
function toast(msg: string, error = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast show ${error ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.className = 'toast'), 2200);
}

function route() {
  const [t, id] = location.hash.slice(1).split('/');
  typeName = t ?? '';
  docId = t === 'settings' ? 'settings' : id ? decodeURIComponent(id) : '';
  render();
}

window.addEventListener('hashchange', route);
window.addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.type === 'preview-ready') sendDraftToPreview();
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    publish();
  }
});
window.addEventListener('beforeunload', () => persistDrafts());

reload().then(() => {
  if (!location.hash) location.hash = 'sessions';
  route();
});
