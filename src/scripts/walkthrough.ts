import { icon } from './icons';
import { SCREENS } from '../lib/screens';
import type { Content, Listing, Prompt, Session, SessionEntry } from '../lib/content';

// ---------------------------------------------------------------------------
// Data & tilstand
// ---------------------------------------------------------------------------

let content: Content = JSON.parse(document.getElementById('content-data')!.textContent!);
let { settings, listings, categories, destinations, prompts } = content;
const params = new URLSearchParams(location.search);

const MONTH = { year: 2026, month: 10 }; // november 2026 (0-indekseret måned)
const DEFAULT_DATES = { start: '2026-11-13', end: '2026-11-16' };

function initialState() {
  return {
    screen: 'explore',
    history: [] as string[],
    category: '',
    homeTab: 'homes',
    query: '',
    destination: '',
    start: '',
    end: '',
    guests: { adults: 0, children: 0, infants: 0, pets: 0 } as Record<string, number>,
    maxPrice: 3000,
    placeType: 'any',
    view: 'list' as 'list' | 'map',
    listingId: '',
    photoIdx: 0,
    wishlist: new Set<string>(),
    priceOpen: false,
    payPlan: 'full',
    booked: null as null | { listingId: string; start: string; end: string; guests: number },
    threadOpen: false,
  };
}

let state = initialState();
const isEmbed = params.has('embed');
// 'test' = think-aloud med deltager (logges), 'free' = forskeren udforsker uden at gemme
let mode: 'test' | 'free' = params.get('mode') === 'free' || isEmbed ? 'free' : 'test';

const phoneEl = document.getElementById('screen')!;
const panelEl = document.getElementById('panel');

// ---------------------------------------------------------------------------
// Hjælpere
// ---------------------------------------------------------------------------

const kr = (n: number) => `${Math.round(n).toLocaleString('da-DK')} ${settings.currency}`;
const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const featured = () => listings.find((l) => l._id === settings.featuredListingId) ?? listings[0];
const listing = () => listings.find((l) => l._id === state.listingId) ?? featured();
const destOf = (l: Listing) => destinations.find((d) => d.name === l.destination);
const guestName = () => session?.participant || settings.personaName || 'Gæst';
const catName = (id: string) => categories.find((c) => c._id === id)?.name ?? '';
const totalGuests = () => state.guests.adults + state.guests.children;
const monthNames = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function nights() {
  if (!state.start || !state.end) return 0;
  return Math.round((+parseDate(state.end) - +parseDate(state.start)) / 86400000);
}
function dateRange(start = state.start, end = state.end) {
  if (!start) return '';
  const s = parseDate(start);
  if (!end) return `${s.getDate()}. ${monthNames[s.getMonth()]}`;
  const e = parseDate(end);
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}.–${e.getDate()}. ${monthNames[e.getMonth()]}`
    : `${s.getDate()}. ${monthNames[s.getMonth()]} – ${e.getDate()}. ${monthNames[e.getMonth()]}`;
}
function guestLabel(n = totalGuests()) {
  return n ? `${n} ${n === 1 ? 'gæst' : 'gæster'}` : '';
}
function priceFor(l: Listing) {
  const n = nights() || 1;
  const base = l.pricePerNight * n;
  const fee = Math.round(((base + l.cleaningFee) * settings.serviceFeePct) / 100);
  return { n, base, cleaning: l.cleaningFee, fee, total: base + l.cleaningFee + fee };
}

function searchResults() {
  let res = listings.filter((l) => !state.destination || l.destination === state.destination);
  if (!res.length) res = [...listings];
  res = res.filter((l) => !totalGuests() || l.guests >= totalGuests());
  return res;
}
function filteredResults() {
  return searchResults().filter(
    (l) =>
      l.pricePerNight <= state.maxPrice &&
      (state.placeType === 'any' || (state.placeType === 'entire' ? l.type.startsWith('Hel') : !l.type.startsWith('Hel'))),
  );
}
// Den fremhævede bolig vises altid først, så guiden kan pege på den
const featuredFirst = (arr: Listing[]) =>
  [...arr].sort((a, b) => Number(b._id === settings.featuredListingId) - Number(a._id === settings.featuredListingId));

// ---------------------------------------------------------------------------
// Fælles UI-stykker
// ---------------------------------------------------------------------------

const ph = (label: string, cls = '') => `<div class="ph ${cls}"><span>${esc(label)}</span></div>`;

function heartBtn(id: string, target = 'heart') {
  const on = state.wishlist.has(id);
  return `<button class="heart ${on ? 'on' : ''}" data-action="heart" data-arg="${id}" data-target="${target}" aria-label="Gem">${on ? icon.heartFill : icon.heart}</button>`;
}

function card(l: Listing, opts: { compact?: boolean } = {}) {
  const meta = state.start ? dateRange() : '13.–16. nov.';
  const p = priceFor(l);
  return `
  <article class="card ${opts.compact ? 'compact' : ''}" data-action="listing" data-arg="${l._id}" data-target="listing-card">
    <div class="card-photo">
      ${ph(l.photoLabels[0] ?? 'Foto')}
      ${l.guestFavourite ? '<span class="badge">Gæstefavorit</span>' : ''}
      ${heartBtn(l._id)}
      ${opts.compact ? '' : `<div class="dots">${l.photoLabels.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>`}
    </div>
    <div class="card-row"><strong>${esc(opts.compact ? l.title : l.location)}</strong><span class="rating">${icon.star} ${l.rating.toFixed(2).replace('.', ',')}</span></div>
    ${opts.compact ? '' : `<div class="muted">${esc(l.title)}</div>`}
    <div class="muted">${esc(meta)}</div>
    <div class="card-price">${
      nights() ? `<u><strong>${kr(p.total)}</strong> i alt</u>` : `<strong>${kr(l.pricePerNight)}</strong> nat`
    }</div>
  </article>`;
}

function tabbar(active: string) {
  const tabs = [
    ['explore', 'Udforsk', icon.search, 'tab-explore'],
    ['wishlists', 'Ønskelister', icon.heart, 'tab-wishlists'],
    ['trips', 'Rejser', icon.logo, 'tab-trips'],
    ['inbox', 'Indbakke', icon.chat, 'tab-inbox'],
    ['profile', 'Profil', icon.user, 'tab-profile'],
  ];
  return `<nav class="tabbar">${tabs
    .map(
      ([id, label, ic, t]) =>
        `<button class="${active === id ? 'on' : ''}" data-action="tab" data-arg="${id}" data-target="${t}">${ic}<span>${label}</span>${
          id === 'inbox' && state.booked ? '<i class="dot"></i>' : ''
        }</button>`,
    )
    .join('')}</nav>`;
}

function searchSummary() {
  const sub = [dateRange(), guestLabel()].filter(Boolean).join(' · ') || 'Når som helst · Tilføj gæster';
  return `
  <div class="topbar">
    <button class="circle" data-action="back" aria-label="Tilbage">${icon.back}</button>
    <button class="summary" data-action="open-search" data-target="search-summary">
      <strong>${esc(state.destination || 'Hvor som helst')}</strong><span>${esc(sub)}</span>
    </button>
    <button class="circle" data-action="open-filters" data-target="filter-button" aria-label="Filtre">${icon.sliders}${
      state.maxPrice < 3000 || state.placeType !== 'any' ? '<i class="dot"></i>' : ''
    }</button>
  </div>`;
}

// ---------------------------------------------------------------------------
// Skærme
// ---------------------------------------------------------------------------

const screens: Record<string, () => string> = {
  explore() {
    const homeTabs = [
      ['homes', 'Hjem', '🏠'],
      ['experiences', 'Oplevelser', '🎈'],
      ['services', 'Tjenester', '🛎️'],
    ];
    let feed = '';
    if (state.category) {
      const items = featuredFirst(listings.filter((l) => l.category === state.category));
      feed = `<h3 class="section-title">${esc(catName(state.category))}</h3>
        <div class="stack">${items.map((l) => card(l)).join('') || '<p class="muted center">Ingen boliger i denne kategori endnu.</p>'}</div>`;
    } else {
      const groups = [...new Set(featuredFirst(listings).map((l) => l.destination))];
      feed = groups
        .map(
          (d, i) => `
        <h3 class="section-title">${i === 0 ? 'Populære boliger i' : i === 1 ? 'Ledige næste måned i' : 'Bo i'} ${esc(d)} ${icon.right}</h3>
        <div class="hscroll">${featuredFirst(listings.filter((l) => l.destination === d)).map((l) => card(l, { compact: true })).join('')}</div>`,
        )
        .join('');
    }
    return `
    <div class="scr">
      <div class="explore-top">
        <button class="searchpill" data-action="open-search" data-target="search-bar">${icon.search}<span>${esc(settings.searchPlaceholder)}</span></button>
        <div class="hometabs">${homeTabs
          .map(([id, l, e]) => `<button class="${state.homeTab === id ? 'on' : ''}" data-action="hometab" data-arg="${id}"><span class="emo">${e}</span>${l}</button>`)
          .join('')}</div>
        <div class="cats">${categories
          .map(
            (c) =>
              `<button class="${state.category === c._id ? 'on' : ''}" data-action="category" data-arg="${c._id}" data-target="category"><span class="emo">${c.icon}</span>${esc(c.name)}</button>`,
          )
          .join('')}</div>
      </div>
      <main class="scr-body">${feed}<div class="spacer"></div></main>
      ${tabbar('explore')}
    </div>`;
  },

  'search-where'() {
    const q = state.query.trim().toLowerCase();
    const sugg = destinations.filter((d) => !q || d.name.toLowerCase().includes(q));
    return searchModal(
      'where',
      `
      <h2>Hvor?</h2>
      <label class="input" data-target="destination-input">${icon.search}<input id="dest-input" placeholder="Søg efter destinationer" value="${esc(state.query)}" autocomplete="off"></label>
      <p class="label">Foreslåede destinationer</p>
      <div class="sugg">${sugg
        .map(
          (d) => `<button data-action="dest" data-arg="${esc(d.name)}" data-target="destination-suggestion">
            <span class="sugg-ic emo">${d.icon}</span><span><strong>${esc(d.name)}</strong><small>${esc(d.subtitle)}</small></span></button>`,
        )
        .join('') || '<p class="muted">Ingen destinationer matcher.</p>'}</div>`,
    );
  },

  'search-when'() {
    const first = new Date(MONTH.year, MONTH.month, 1);
    const offset = (first.getDay() + 6) % 7; // mandag først
    const days = new Date(MONTH.year, MONTH.month + 1, 0).getDate();
    const cells: string[] = [];
    for (let i = 0; i < offset; i++) cells.push('<span></span>');
    for (let d = 1; d <= days; d++) {
      const iso = `${MONTH.year}-${String(MONTH.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sel = iso === state.start || iso === state.end;
      const inRange = state.start && state.end && iso > state.start && iso < state.end;
      const target = iso === DEFAULT_DATES.start ? 'date-start' : iso === DEFAULT_DATES.end ? 'date-end' : '';
      cells.push(
        `<button class="day ${sel ? 'sel' : ''} ${inRange ? 'range' : ''}" data-action="date" data-arg="${iso}" ${target ? `data-target="${target}"` : ''}>${d}</button>`,
      );
    }
    return searchModal(
      'when',
      `
      <h2>Hvornår skal du rejse?</h2>
      <div class="segmented"><button class="on">Datoer</button><button>Måneder</button><button>Fleksibel</button></div>
      <div class="cal">
        <div class="cal-head"><strong>november 2026</strong></div>
        <div class="cal-grid wd">${['m', 't', 'o', 't', 'f', 'l', 's'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid">${cells.join('')}</div>
      </div>
      <div class="chips"><span class="chip on">Præcise datoer</span><span class="chip">± 1 dag</span><span class="chip">± 3 dage</span></div>`,
      `<button class="link" data-action="dates-reset">${state.start ? 'Nulstil' : 'Spring over'}</button>
       <button class="btn dark" data-action="when-next" data-target="when-next">Næste</button>`,
    );
  },

  'search-who'() {
    const rows = [
      ['adults', 'Voksne', '13 år eller ældre'],
      ['children', 'Børn', '2–12 år'],
      ['infants', 'Spædbørn', 'Under 2 år'],
      ['pets', 'Kæledyr', 'Har du en servicehund?'],
    ];
    return searchModal(
      'who',
      `
      <h2>Hvem kommer?</h2>
      ${rows
        .map(
          ([k, l, s]) => `<div class="counter-row">
            <div><strong>${l}</strong><small>${s}</small></div>
            <div class="counter">
              <button data-action="guest" data-arg="${k}:-1" ${state.guests[k] ? '' : 'disabled'}>${icon.minus}</button>
              <span>${state.guests[k]}</span>
              <button data-action="guest" data-arg="${k}:1" data-target="guests-${k}-plus">${icon.plus}</button>
            </div></div>`,
        )
        .join('')}`,
    );
  },

  results() {
    const res = featuredFirst(filteredResults());
    if (state.view === 'map') return screens.map();
    return `
    <div class="scr">
      ${searchSummary()}
      <main class="scr-body">
        <p class="results-count">${res.length} ${res.length === 1 ? 'bolig' : 'boliger'}${state.destination ? ` i ${esc(state.destination)}` : ''} · <span class="muted">Priser inkl. alle gebyrer</span></p>
        <div class="stack">${res.map((l) => card(l)).join('') || emptyResults()}</div>
        <div class="spacer"></div>
      </main>
      <button class="float-pill" data-action="map" data-target="map-toggle">Kort ${icon.map}</button>
    </div>`;
  },

  map() {
    const res = featuredFirst(filteredResults());
    return `
    <div class="scr">
      ${searchSummary()}
      <main class="scr-body mapview">
        <svg class="map-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 70 C 20 60, 30 80, 55 72 S 85 60, 100 66 L100 100 L0 100Z" class="water"/>
          <path d="M10 0 L 30 100 M0 30 L100 45 M60 0 L 75 100 M0 55 L100 20" class="road"/>
        </svg>
        ${res
          .map(
            (l) =>
              `<button class="pin ${l._id === state.listingId ? 'on' : ''}" style="left:${l.mapX}%;top:${l.mapY}%" data-action="listing" data-arg="${l._id}" data-target="map-pin">${kr(l.pricePerNight)}</button>`,
          )
          .join('')}
        <p class="map-note">${res.length} boliger</p>
      </main>
      <button class="float-pill" data-action="list" data-target="list-toggle">Liste ${icon.list}</button>
    </div>`;
  },

  filters() {
    const count = filteredResults().length;
    const bars = [3, 5, 8, 12, 9, 14, 11, 7, 10, 6, 4, 5, 3, 2, 2];
    return `
    <div class="scr modal">
      <div class="topbar center-title">
        <button class="circle plain" data-action="back" aria-label="Luk">${icon.close}</button>
        <strong>Filtre</strong><span class="circle plain"></span>
      </div>
      <main class="scr-body pad">
        <section class="fsec" data-target="filter-type">
          <h3>Type af sted</h3>
          <div class="segmented big">
            ${[['any', 'Alle typer'], ['room', 'Værelse'], ['entire', 'Hel bolig']]
              .map(([id, l]) => `<button class="${state.placeType === id ? 'on' : ''}" data-action="place-type" data-arg="${id}">${l}</button>`)
              .join('')}
          </div>
        </section>
        <section class="fsec" data-target="filter-price">
          <h3>Prisinterval</h3>
          <p class="muted">Pris pr. nat inkl. gebyrer</p>
          <div class="histo">${bars.map((h, i) => `<i style="height:${h * 4}px" class="${(i + 1) * 200 <= state.maxPrice ? 'on' : ''}"></i>`).join('')}</div>
          <input type="range" id="price-range" min="400" max="3000" step="50" value="${state.maxPrice}">
          <div class="price-boxes"><div><small>Minimum</small>400 kr.</div><div><small>Maksimum</small>${state.maxPrice >= 3000 ? '3.000+ kr.' : kr(state.maxPrice)}</div></div>
        </section>
        <section class="fsec">
          <h3>Soverum og senge</h3>
          ${['Soverum', 'Senge', 'Badeværelser'].map((l) => `<div class="counter-row slim"><span>${l}</span><div class="counter"><button disabled>${icon.minus}</button><span>Alle</span><button>${icon.plus}</button></div></div>`).join('')}
        </section>
        <section class="fsec">
          <h3>Faciliteter</h3>
          <div class="chips">${['Wi-fi', 'Køkken', 'Vaskemaskine', 'Gratis parkering', 'Brændeovn', 'Pool'].map((a) => `<span class="chip">${a}</span>`).join('')}</div>
        </section>
      </main>
      <div class="bottombar">
        <button class="link" data-action="filters-reset">Ryd alt</button>
        <button class="btn dark" data-action="filter-apply" data-target="filter-apply">Vis ${count} ${count === 1 ? 'sted' : 'steder'}</button>
      </div>
    </div>`;
  },

  detail() {
    const l = listing();
    const p = priceFor(l);
    const photo = l.photoLabels[state.photoIdx % l.photoLabels.length] ?? 'Foto';
    return `
    <div class="scr">
      <main class="scr-body">
        <div class="gallery" data-action="photo-next" data-target="detail-photos">
          ${ph(photo, 'tall')}
          <div class="gallery-btns">
            <button class="circle white" data-action="back" aria-label="Tilbage">${icon.back}</button>
            <span class="grow"></span>
            <button class="circle white" data-action="noop" aria-label="Del">${icon.share}</button>
            <button class="circle white ${state.wishlist.has(l._id) ? 'liked' : ''}" data-action="heart" data-arg="${l._id}" data-target="detail-heart" aria-label="Gem">${
              state.wishlist.has(l._id) ? icon.heartFill : icon.heart
            }</button>
          </div>
          <span class="counter-tag">${(state.photoIdx % l.photoLabels.length) + 1} / ${l.photoLabels.length}</span>
        </div>
        <div class="pad">
          <h1 class="d-title">${esc(l.title)}</h1>
          <p class="center"><strong>${esc(l.type)} i ${esc(l.location)}</strong><br><span class="muted">${l.guests} gæster · ${l.bedrooms} soverum · ${l.beds} senge · ${l.baths} bad</span></p>
          ${
            l.guestFavourite
              ? `<div class="fav-box"><div class="fav-l">${icon.laurel}<strong>Gæste-<br>favorit</strong>${icon.laurel}</div><small>En af de mest elskede boliger på ${esc(settings.appName)}</small><div class="fav-n"><strong>${l.rating.toFixed(2).replace('.', ',')}</strong><small>★★★★★</small></div><div class="fav-n"><strong>${l.reviewCount}</strong><small>anmeldelser</small></div></div>`
              : `<p class="center">${icon.star} <strong>${l.rating.toFixed(2).replace('.', ',')}</strong> · <u>${l.reviewCount} anmeldelser</u></p>`
          }
          <hr>
          <div class="host" data-target="detail-host">
            <div class="avatar">${esc(l.hostName[0])}${l.superhost ? `<i>${icon.medal}</i>` : ''}</div>
            <div><strong>Vært: ${esc(l.hostName)}</strong><small>${l.superhost ? 'Superhost · ' : ''}${l.hostYears} år som vært</small></div>
          </div>
          <hr>
          <ul class="highlights">
            <li>${icon.door}<div><strong>Selv-check-in</strong><small>Tjek ind med nøgleboksen.</small></div></li>
            <li>${icon.pin}<div><strong>Fantastisk beliggenhed</strong><small>95 % af gæsterne gav beliggenheden 5 stjerner.</small></div></li>
            <li>${icon.calendar}<div><strong>Gratis afbestilling i 48 timer</strong><small>Få fuld refusion, hvis du ombestemmer dig.</small></div></li>
          </ul>
          <hr>
          <p>${esc(l.description)}</p>
          <button class="btn outline sm">Vis mere</button>
          <hr>
          <h3>Hvor du skal sove</h3>
          <div class="hscroll small">${Array.from({ length: l.bedrooms }, (_, i) => `<div class="sleep">${ph('Soverum ' + (i + 1))}<strong>Soverum ${i + 1}</strong><small>${i === 0 ? '1 dobbeltseng' : '1 enkeltseng'}</small></div>`).join('')}</div>
          <hr>
          <section data-target="detail-amenities">
            <h3>Hvad dette sted tilbyder</h3>
            <ul class="amen">${l.amenities.slice(0, 6).map((a) => `<li>${icon.check}${esc(a)}</li>`).join('')}</ul>
            <button class="btn outline full">Vis alle ${l.amenities.length} faciliteter</button>
          </section>
          <hr>
          <section data-target="detail-reviews">
            <h3>${icon.star} ${l.rating.toFixed(2).replace('.', ',')} · ${l.reviewCount} anmeldelser</h3>
            <div class="hscroll small">${l.reviews
              .map(
                (r) => `<div class="review"><small>★★★★★ · ${esc(r.date)}</small><p>${esc(r.text)}</p><div class="rev-a"><span class="avatar s">${esc(r.author[0])}</span><strong>${esc(r.author)}</strong></div></div>`,
              )
              .join('')}</div>
            <button class="btn outline full">Vis alle ${l.reviewCount} anmeldelser</button>
          </section>
          <hr>
          <h3>Hvor du skal være</h3>
          ${ph('Kort · ' + l.location, 'mapph')}
          <p class="muted">${esc(l.location)}</p>
          <div class="spacer"></div>
        </div>
      </main>
      <div class="bottombar">
        <div class="bb-price">${
          nights()
            ? `<u><strong>${kr(p.total)}</strong></u> i alt<small>${dateRange()}</small>`
            : `<strong>${kr(l.pricePerNight)}</strong> nat<small>Tilføj datoer</small>`
        }</div>
        <button class="btn accent" data-action="reserve" data-target="reserve-button">${nights() ? 'Reserver' : 'Tjek tilgængelighed'}</button>
      </div>
    </div>`;
  },

  checkout() {
    const l = listing();
    const p = priceFor(l);
    return `
    <div class="scr">
      <div class="topbar center-title"><button class="circle plain" data-action="back" aria-label="Tilbage">${icon.back}</button><strong>Bekræft og betal</strong><span class="circle plain"></span></div>
      <main class="scr-body pad">
        <div class="mini-listing">
          ${ph(l.photoLabels[0] ?? '', 'thumb')}
          <div><strong>${esc(l.title)}</strong><small>${esc(l.type)}</small><small>${icon.star} ${l.rating.toFixed(2).replace('.', ',')} (${l.reviewCount})${l.superhost ? ' · Superhost' : ''}</small></div>
        </div>
        <div class="box" data-target="trip-dates">
          <div class="row"><div><strong>Datoer</strong><small>${dateRange()}</small></div><button class="link sm" data-action="edit-dates">Rediger</button></div>
          <div class="row"><div><strong>Gæster</strong><small>${guestLabel()}</small></div><button class="link sm" data-action="edit-guests">Rediger</button></div>
        </div>
        <div class="box" data-target="price-details">
          <div class="row" data-action="price-toggle"><div><strong>Samlet pris</strong><small>${kr(p.total)} DKK</small></div><button class="link sm">${state.priceOpen ? 'Skjul' : 'Detaljer'}</button></div>
          ${
            state.priceOpen
              ? `<div class="breakdown">
                  <div><span>${p.n} nætter × ${kr(l.pricePerNight)}</span><span>${kr(p.base)}</span></div>
                  <div><span>Rengøringsgebyr</span><span>${kr(p.cleaning)}</span></div>
                  <div><span>Servicegebyr (${settings.serviceFeePct} %)</span><span>${kr(p.fee)}</span></div>
                  <div class="tot"><span>I alt (DKK)</span><span>${kr(p.total)}</span></div></div>`
              : ''
          }
        </div>
        <div class="box">
          <strong>Vælg hvornår du vil betale</strong>
          ${[
            ['full', `Betal ${kr(p.total)} nu`, ''],
            ['split', 'Betal en del nu, resten senere', `${kr(Math.round(p.total / 2))} i dag, resten 1. nov.`],
          ]
            .map(
              ([id, t, s]) => `<label class="radio" data-action="pay-plan" data-arg="${id}"><span><strong>${t}</strong>${s ? `<small>${s}</small>` : ''}</span><i class="${state.payPlan === id ? 'on' : ''}"></i></label>`,
            )
            .join('')}
        </div>
        <div class="box" data-target="payment-method">
          <div class="row"><div class="paym">${icon.card}<span><strong>Betal med</strong><small>Visa •••• 4242</small></span></div><button class="link sm">Skift</button></div>
        </div>
        <p class="muted small">Gratis afbestilling inden for 48 timer. Ved at vælge knappen nedenfor accepterer jeg husreglerne og ${esc(settings.appName)}s politik for genbooking og refusion.</p>
        <div class="spacer"></div>
      </main>
      <div class="bottombar single"><button class="btn accent full" data-action="pay" data-target="pay-button">Bekræft og betal</button></div>
    </div>`;
  },

  confirmed() {
    const b = state.booked;
    const l = listings.find((x) => x._id === b?.listingId) ?? listing();
    return `
    <div class="scr">
      <main class="scr-body pad confirm">
        <div class="big-check">${icon.check}</div>
        <h1>Du skal til ${esc(l.destination)}!</h1>
        <p class="muted center">Reservation bekræftet. Vi har sendt en kvittering til din e-mail.</p>
        <div class="trip-card">
          ${ph(l.photoLabels[0] ?? '', 'wide')}
          <div class="pad-s"><strong>${esc(l.title)}</strong><small>${dateRange(b?.start, b?.end)} · ${guestLabel(b?.guests)}</small><small>Vært: ${esc(l.hostName)}</small></div>
        </div>
        <button class="btn dark full" data-action="view-trip" data-target="view-trip">Se rejse</button>
      </main>
    </div>`;
  },

  trips() {
    const b = state.booked;
    const l = b && listings.find((x) => x._id === b.listingId);
    return `
    <div class="scr">
      <main class="scr-body pad">
        <h1 class="page-title">Rejser</h1>
        ${
          l
            ? `<p class="label">Kommende</p>
               <div class="trip-card" data-target="trip-card">
                 ${ph(l.photoLabels[0] ?? '', 'wide')}
                 <div class="pad-s"><strong>${esc(l.destination)}</strong><small>${esc(l.title)} · Vært: ${esc(l.hostName)}</small>
                 <div class="trip-dates"><span><small>Check-in</small>${dateRange(b!.start).replace(/\.$/, '')}</span><span><small>Check-ud</small>${dateRange(b!.end)}</span></div></div>
               </div>`
            : `<div class="empty">${icon.logo}<h3>Ingen rejser booket … endnu!</h3><p class="muted">Tid til at støve kufferten af og planlægge dit næste eventyr.</p><button class="btn accent" data-action="open-search">Start søgning</button></div>`
        }
      </main>
      ${tabbar('trips')}
    </div>`;
  },

  wishlists() {
    const saved = listings.filter((l) => state.wishlist.has(l._id));
    return `
    <div class="scr">
      <main class="scr-body pad">
        <h1 class="page-title">Ønskelister</h1>
        <div class="wl-grid">
          <div class="wl" data-target="wishlist-card">${ph('Senest set')}<strong>Senest set</strong><small>I dag</small></div>
          ${saved.length ? `<div class="wl" data-target="wishlist-card">${ph(saved[0].photoLabels[0] ?? '')}<strong>Weekend ved havet</strong><small>${saved.length} gemt</small></div>` : ''}
        </div>
        ${
          saved.length
            ? `<h3 class="section-title">Weekend ved havet</h3><div class="stack">${saved.map((l) => card(l)).join('')}</div>`
            : `<p class="muted">Tryk på hjertet på en bolig for at gemme den her.</p>`
        }
        <div class="spacer"></div>
      </main>
      ${tabbar('wishlists')}
    </div>`;
  },

  inbox() {
    const b = state.booked;
    const l = b && listings.find((x) => x._id === b.listingId);
    if (state.threadOpen && l) {
      return `
      <div class="scr">
        <div class="topbar center-title"><button class="circle plain" data-action="thread-close" aria-label="Tilbage">${icon.back}</button><strong>${esc(l.hostName)}</strong><span class="circle plain"></span></div>
        <main class="scr-body pad thread">
          <p class="muted center small">Reservation bekræftet · ${dateRange(b!.start, b!.end)}</p>
          <div class="bubble">Hej ${esc(guestName())}! Tusind tak for din reservation – jeg glæder mig til at have jer. 😊</div>
          <div class="bubble">Nøglen ligger i nøgleboksen ved hoveddøren, koden sender jeg dagen før. Der er gratis parkering lige foran huset.</div>
          <div class="bubble me">Tak! Vi glæder os rigtig meget 🌊</div>
        </main>
        <div class="bottombar single"><label class="input grow"><input placeholder="Skriv en besked"></label></div>
      </div>`;
    }
    return `
    <div class="scr">
      <main class="scr-body pad">
        <h1 class="page-title">Indbakke</h1>
        <div class="chips"><span class="chip on">Alle</span><span class="chip">Rejser</span><span class="chip">Support</span></div>
        ${
          l
            ? `<button class="thread-row" data-action="thread-open" data-target="message-thread">
                <span class="avatar">${esc(l.hostName[0])}</span>
                <span><strong>${esc(l.hostName)}</strong><small>Nøglen ligger i nøgleboksen ved hoveddøren…</small><small>${esc(l.destination)} · ${dateRange(b!.start, b!.end)}</small></span>
                <i class="dot"></i>
              </button>`
            : `<div class="empty">${icon.chat}<h3>Du har ingen beskeder</h3><p class="muted">Når du kontakter en vært eller sender en reservationsanmodning, vises beskederne her.</p></div>`
        }
      </main>
      ${tabbar('inbox')}
    </div>`;
  },

  profile() {
    return `
    <div class="scr">
      <main class="scr-body pad">
        <h1 class="page-title">Profil</h1>
        <div class="profile-card"><span class="avatar xl">${esc(guestName()[0])}</span><strong>${esc(guestName())}</strong><small>Gæst</small></div>
        <div class="wl-grid"><div class="box center">${ph('Tidligere rejser')}<strong>Tidligere rejser</strong></div><div class="box center">${ph('Forbindelser')}<strong>Forbindelser</strong></div></div>
        <div class="box host-cta"><div><strong>Bliv vært</strong><small>Det er nemt at begynde at være vært og tjene ekstra.</small></div>${ph('', 'thumb')}</div>
        <ul class="menu">${[
          [icon.gear, 'Kontoindstillinger'],
          [icon.help, 'Få hjælp'],
          [icon.user, 'Vis profil'],
          [icon.globe, 'Sprog og oversættelse'],
        ]
          .map(([ic, l]) => `<li>${ic}<span>${l}</span>${icon.right}</li>`)
          .join('')}</ul>
      </main>
      ${tabbar('profile')}
    </div>`;
  },
};

function emptyResults() {
  return `<div class="empty">${icon.search}<h3>Ingen præcise match</h3><p class="muted">Prøv at ændre eller fjerne nogle af dine filtre.</p><button class="btn outline" data-action="filters-reset">Fjern alle filtre</button></div>`;
}

function searchModal(open: 'where' | 'when' | 'who', body: string, footer?: string) {
  const collapsed = (key: string, label: string, value: string) =>
    `<button class="sbox collapsed" data-action="search-step" data-arg="${key}"><span class="muted">${label}</span><strong>${esc(value)}</strong></button>`;
  return `
  <div class="scr modal search">
    <div class="topbar">
      <button class="circle" data-action="close-search" aria-label="Luk">${icon.close}</button>
      <div class="hometabs mini"><button class="on"><span class="emo">🏠</span>Hjem</button><button><span class="emo">🎈</span>Oplevelser</button><button><span class="emo">🛎️</span>Tjenester</button></div>
    </div>
    <main class="scr-body">
      ${open === 'where' ? `<section class="sbox">${body}</section>` : collapsed('where', 'Hvor', state.destination || 'Hvor som helst')}
      ${open === 'when' ? `<section class="sbox">${body}</section>` : collapsed('when', 'Hvornår', dateRange() || 'Tilføj datoer')}
      ${open === 'who' ? `<section class="sbox">${body}</section>` : collapsed('who', 'Hvem', guestLabel() || 'Tilføj gæster')}
    </main>
    <div class="bottombar">
      ${footer ?? `<button class="link" data-action="search-clear">Ryd alt</button><button class="btn accent" data-action="search" data-target="search-button">${icon.search} Søg</button>`}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Handlinger
// ---------------------------------------------------------------------------

function go(screen: string) {
  if (screen === state.screen) return;
  state.history.push(state.screen);
  state.screen = screen;
}

function act(action: string, arg = '') {
  switch (action) {
    case 'tab':
      state.history = [];
      state.screen = arg;
      state.threadOpen = false;
      break;
    case 'back':
      state.screen = state.history.pop() ?? 'explore';
      break;
    case 'hometab':
      state.homeTab = arg;
      break;
    case 'category':
      state.category = state.category === arg ? '' : arg;
      break;
    case 'open-search':
      go('search-where');
      break;
    case 'close-search':
      state.screen = state.history.pop() ?? 'explore';
      while (state.screen.startsWith('search-')) state.screen = state.history.pop() ?? 'explore';
      break;
    case 'search-step':
      state.screen = `search-${arg}`;
      break;
    case 'dest':
      state.destination = arg;
      state.query = '';
      state.screen = 'search-when';
      break;
    case 'date': {
      if (!state.start || state.end || arg <= state.start) {
        state.start = arg;
        state.end = '';
      } else state.end = arg;
      break;
    }
    case 'dates-reset':
      if (state.start) state.start = state.end = '';
      else state.screen = 'search-who';
      break;
    case 'when-next':
      state.screen = 'search-who';
      break;
    case 'guest': {
      const [k, d] = arg.split(':');
      state.guests[k] = Math.max(0, state.guests[k] + Number(d));
      if (k !== 'adults' && state.guests[k] > 0 && !state.guests.adults) state.guests.adults = 1;
      break;
    }
    case 'search-clear':
      state.destination = state.start = state.end = state.query = '';
      state.guests = { adults: 0, children: 0, infants: 0, pets: 0 };
      state.screen = 'search-where';
      break;
    case 'search':
      state.view = 'list';
      state.history = state.history.filter((s) => !s.startsWith('search-'));
      state.screen = 'results';
      break;
    case 'open-filters':
      go('filters');
      break;
    case 'place-type':
      state.placeType = arg;
      break;
    case 'filters-reset':
      state.placeType = 'any';
      state.maxPrice = 3000;
      break;
    case 'filter-apply':
      state.screen = state.history.pop() ?? 'results';
      break;
    case 'map':
      state.view = 'map';
      state.screen = 'map';
      break;
    case 'list':
      state.view = 'list';
      state.screen = 'results';
      break;
    case 'listing':
      state.listingId = arg;
      state.photoIdx = 0;
      go('detail');
      break;
    case 'heart':
      state.wishlist.has(arg) ? state.wishlist.delete(arg) : state.wishlist.add(arg);
      break;
    case 'photo-next':
      state.photoIdx++;
      break;
    case 'reserve':
      if (!nights()) Object.assign(state, DEFAULT_DATES);
      if (!state.guests.adults) state.guests.adults = 2;
      go('checkout');
      break;
    case 'edit-dates':
      go('search-when');
      break;
    case 'edit-guests':
      go('search-who');
      break;
    case 'price-toggle':
      state.priceOpen = !state.priceOpen;
      break;
    case 'pay-plan':
      state.payPlan = arg;
      break;
    case 'pay':
      state.booked = { listingId: listing()._id, start: state.start, end: state.end, guests: totalGuests() };
      state.history = [];
      state.screen = 'confirmed';
      break;
    case 'view-trip':
      state.history = [];
      state.screen = 'trips';
      break;
    case 'thread-open':
      state.threadOpen = true;
      break;
    case 'thread-close':
      state.threadOpen = false;
      break;
  }
}

// Sørger for at en skærm kan vises direkte (Studio-preview og "hop til skærm")
function ensureStateFor(screen: string) {
  const after = (list: string[]) => list.includes(screen);
  const postSearch = ['results', 'filters', 'map', 'detail', 'checkout', 'confirmed', 'trips', 'inbox'];
  if (after(['search-when', 'search-who', ...postSearch]) && !state.destination) state.destination = featured().destination;
  if (after(['search-who', ...postSearch]) && !nights()) Object.assign(state, DEFAULT_DATES);
  if (after(postSearch) && !state.guests.adults) state.guests.adults = 2;
  if (after(['detail', 'checkout', 'confirmed', 'trips', 'inbox']) && !state.listingId) state.listingId = featured()._id;
  if (after(['confirmed', 'trips', 'inbox']) && !state.booked)
    state.booked = { listingId: state.listingId, start: state.start, end: state.end, guests: totalGuests() };
  state.view = screen === 'map' ? 'map' : 'list';
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let lastScreen = '';
let seeObserver: IntersectionObserver | null = null;

function render() {
  const body = phoneEl.querySelector('.scr-body');
  const keepScroll = state.screen === lastScreen && body ? body.scrollTop : 0;
  phoneEl.innerHTML = (screens[state.screen] ?? screens.explore)();
  document.body.classList.toggle('accent-on', settings.showAccent);
  const scr = phoneEl.querySelector('.scr');
  const changed = state.screen !== lastScreen;
  if (changed) scr?.classList.add(scr.classList.contains('modal') ? 'enter-up' : 'enter');
  const newBody = phoneEl.querySelector('.scr-body');
  if (newBody) newBody.scrollTop = keepScroll;
  lastScreen = state.screen;

  // Studio kan markere det element, et spørgsmål udløses af
  const hl = params.get('highlight');
  if (hl) phoneEl.querySelector(`[data-target="${hl}"]`)?.classList.add('hotspot');

  if (changed) {
    logEvent('screen', state.screen);
    promptsFor('arrive').filter((p) => p.screen === state.screen).forEach(queuePrompt);
    const cur = document.getElementById('cur-screen');
    if (cur) cur.textContent = screenLabel(state.screen);
    if (mode === 'free') renderPanel();
  }
  watchSeePrompts();
}

// Spørgsmål af typen 'see' udløses, når elementet er synligt i telefonen
function watchSeePrompts() {
  seeObserver?.disconnect();
  if (!session) return;
  const wanted = promptsFor('see').filter((p) => p.screen === state.screen && !asked.has(p._id));
  if (!wanted.length) return;
  seeObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const target = (e.target as HTMLElement).dataset.target;
        wanted.filter((p) => p.trigger === target).forEach(queuePrompt);
      }
    },
    { root: phoneEl.querySelector('.scr-body'), threshold: 0.6 },
  );
  for (const p of wanted) phoneEl.querySelectorAll(`[data-target="${p.trigger}"]`).forEach((el) => seeObserver!.observe(el));
}

function screenLabel(id: string) {
  return SCREENS.find((s) => s.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Think-aloud-session
// ---------------------------------------------------------------------------

const SESSION_KEY = 'think-aloud-session';
let session: Session | null = null;
let finishing = false;
let pending: Prompt[] = [];
const asked = new Set<string>();
const drafts = { thought: '', answer: '', final: '' };
let participantDraft = '';
const voiceUsed = { thought: false, answer: false, final: false };

const promptsFor = (when: Prompt['when']) =>
  (session ? prompts : []).filter((p) => p.when === when);
const uid = () => Math.random().toString(36).slice(2, 10);

function queuePrompt(p: Prompt) {
  if (!session || asked.has(p._id)) return;
  asked.add(p._id);
  pending.push(p);
  logEvent('action', `prompt:${p._id}`);
  renderPanel();
  document.querySelector('.q-card')?.classList.add('pop');
}

function logEvent(type: 'screen' | 'action', detail: string) {
  if (!session) return;
  session.events.push({ t: Date.now(), type, screen: state.screen, detail: type === 'action' ? detail : undefined });
  saveSession();
}

function addEntry(type: SessionEntry['type'], text: string, source: SessionEntry['source'], prompt?: { _id: string; question: string }) {
  if (!session || !text.trim()) return;
  session.entries.push({ _id: uid(), t: Date.now(), type, screen: state.screen, promptId: prompt?._id, question: prompt?.question, text: text.trim(), source });
  saveSession();
}

let saveTimer = 0;
function saveSession(immediate = false) {
  if (!session) return;
  clearTimeout(saveTimer);
  const send = () => {
    session!.updatedAt = Date.now();
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
    return fetch(`/api/sessions/${session!._id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(session) });
  };
  if (immediate) return send();
  saveTimer = window.setTimeout(send, 600);
}

function startSession(participant: string) {
  session = { _id: `s-${Date.now().toString(36)}-${uid().slice(0, 4)}`, participant, startedAt: Date.now(), updatedAt: Date.now(), entries: [], events: [] };
  state = initialState();
  lastScreen = '';
  pending = [];
  asked.clear();
  renderPanel();
  render();
}

// Deltageren kan ikke læse fra serveren (kræver Studio-login), så en afbrudt session genoptages fra browseren
function resumeSession() {
  let s: Session | null = null;
  try {
    s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {}
  if (!s || s.finishedAt) return;
  session = s;
  s.events.filter((e) => e.detail?.startsWith('prompt:')).forEach((e) => asked.add(e.detail!.slice(7)));
}

async function finishSession() {
  if (!session) return;
  addEntry('final', drafts.final, voiceUsed.final ? 'voice' : 'text', { _id: 'final', question: settings.finalQuestion });
  session.finishedAt = Date.now();
  await saveSession(true);
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  finishing = false;
  renderPanel(true);
}

// ---------------------------------------------------------------------------
// Diktering (Web Speech API) – virker i Chrome, Edge og Safari
// ---------------------------------------------------------------------------

const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let rec: any = null;
let recField = '';

function toggleMic(field: keyof typeof drafts) {
  if (rec) {
    rec.stop();
    return;
  }
  const ta = document.getElementById(`ta-${field}`) as HTMLTextAreaElement | null;
  if (!ta) return;
  const base = ta.value ? ta.value.replace(/\s*$/, ' ') : '';
  let finalText = '';
  rec = new SpeechRec();
  rec.lang = 'da-DK';
  rec.continuous = true;
  rec.interimResults = true;
  recField = field;
  rec.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
      else interim += e.results[i][0].transcript;
    }
    const el = document.getElementById(`ta-${field}`) as HTMLTextAreaElement | null;
    drafts[field] = base + finalText + interim;
    if (el) el.value = drafts[field];
  };
  rec.onend = () => {
    rec = null;
    recField = '';
    updateMicButtons();
  };
  rec.onerror = () => rec?.stop();
  rec.start();
  voiceUsed[field] = true;
  updateMicButtons();
}

function updateMicButtons() {
  document.querySelectorAll<HTMLButtonElement>('[data-mic]').forEach((b) => {
    const on = b.dataset.mic === recField;
    b.classList.toggle('rec', on);
    b.innerHTML = on ? '■ Stop' : '🎙 Sig det højt';
  });
}

// ---------------------------------------------------------------------------
// Panelet ved siden af telefonen
// ---------------------------------------------------------------------------

const micBtn = (field: string) => (SpeechRec ? `<button class="mic" data-mic="${field}" type="button">🎙 Sig det højt</button>` : '');
const timeOf = (t: number) => new Date(t).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

function renderPanel(done = false) {
  const phone = document.querySelector('.phone');
  phone?.classList.toggle('locked', mode === 'test' && !session && !isEmbed);
  if (!panelEl) return;

  if (mode === 'free') {
    panelEl.innerHTML = `
      <div class="panel-card">
        <p class="eyebrow">Forskervisning · gemmes ikke</p>
        <h2>Udforsk prototypen</h2>
        <p>Klik frit rundt. Du er nu på: <strong>${esc(screenLabel(state.screen))}</strong></p>
      </div>
      <p class="eyebrow">Hop til skærm</p>
      <div class="screen-jump">${SCREENS.map((s) => `<button class="${s.id === state.screen ? 'on' : ''}" data-jump="${s.id}">${esc(s.label)}</button>`).join('')}</div>
      <div class="nav"><button class="ghost" data-reset>↺ Nulstil appen</button><button class="ghost" data-to-test>Tilbage til testen →</button></div>`;
    return;
  }

  if (done) {
    panelEl.innerHTML = `
      <div class="panel-card center-card">
        <p class="big-emoji">🙏</p>
        <h2>Tak for din deltagelse!</h2>
        <p>Dine tanker og svar er gemt. Du kan lukke vinduet nu.</p>
        <button class="ghost mt" data-new>Start en ny session</button>
      </div>`;
    return;
  }

  if (!session) {
    panelEl.innerHTML = `
      <div class="panel-card">
        <p class="eyebrow">Think-aloud-test</p>
        <h2>Velkommen 👋</h2>
        <p>Du skal bruge en prototype af Airbnb-appen. Det er appen, vi tester – ikke dig.</p>
        <div class="task"><strong>Din opgave</strong><p>${esc(settings.testTask)}</p></div>
        <ul class="howto">
          <li>Sig eller skriv, hvad du tænker – også det, der virker ubetydeligt.</li>
          <li>Undervejs dukker der spørgsmål op. Du kan altid springe over.</li>
          <li>Tryk <em>Jeg er færdig</em>, når du har booket – eller vil stoppe.</li>
        </ul>
        <label class="field-l" for="participant">Dit navn eller deltager-ID</label>
        <input id="participant" class="text-in" placeholder="Fx Deltager 4" autocomplete="off" value="${esc(participantDraft)}">
        <button class="primary full mt" data-start>Start testen</button>
      </div>
      <button class="link-btn" data-free>Udforsk uden at gemme (forsker)</button>`;
    return;
  }

  if (finishing) {
    panelEl.innerHTML = `
      <div class="panel-card">
        <p class="eyebrow">Sidste spørgsmål</p>
        <h2>${esc(settings.finalQuestion)}</h2>
        <textarea id="ta-final" class="ta" rows="5" placeholder="Skriv dit svar …">${esc(drafts.final)}</textarea>
        <div class="row-btns">${micBtn('final')}<span class="grow"></span></div>
        <div class="nav"><button class="ghost" data-unfinish>← Tilbage til appen</button><button class="primary" data-finish>Afslut og gem</button></div>
      </div>`;
    return;
  }

  const q = pending[0];
  const mine = session.entries.slice(-3).reverse();
  panelEl.innerHTML = `
    <div class="session-head">
      <span class="avatar s">${esc(session.participant[0] ?? '?')}</span>
      <span class="grow"><strong>${esc(session.participant)}</strong><small>Startet ${timeOf(session.startedAt)}</small></span>
      <span class="rec-dot" title="Sessionen gemmes løbende"></span>
    </div>
    <div class="task mini"><strong>Opgave</strong><p>${esc(settings.testTask)}</p></div>
    ${
      q
        ? `<div class="panel-card q-card">
            <p class="eyebrow">💬 Spørgsmål ${pending.length > 1 ? `· ${pending.length} venter` : ''}</p>
            <h2>${esc(q.question)}</h2>
            <textarea id="ta-answer" class="ta" rows="3" placeholder="Skriv dit svar …">${esc(drafts.answer)}</textarea>
            <div class="row-btns">${micBtn('answer')}<span class="grow"></span><button class="ghost sm" data-skip>Spring over</button><button class="primary sm" data-answer>Gem svar</button></div>
          </div>`
        : ''
    }
    <div class="panel-card thought-card">
      <h2>Hvad tænker du lige nu?</h2>
      <textarea id="ta-thought" class="ta" rows="3" placeholder="Skriv – eller tryk på mikrofonen og sig det højt …">${esc(drafts.thought)}</textarea>
      <div class="row-btns">${micBtn('thought')}<span class="grow"></span><button class="primary sm" data-thought>Gem tanke</button></div>
      <small class="where">Gemmes sammen med skærmen: <span id="cur-screen">${esc(screenLabel(state.screen))}</span></small>
    </div>
    ${
      mine.length
        ? `<div class="log"><p class="eyebrow">Dine seneste noter (${session.entries.length})</p>${mine
            .map((e) => `<p><span>${timeOf(e.t)}</span>${esc(e.text.length > 90 ? e.text.slice(0, 90) + '…' : e.text)}</p>`)
            .join('')}</div>`
        : ''
    }
    ${session.booked ? '<p class="booked-note">✓ Du har booket. Tryk <strong>Jeg er færdig</strong>, når du er klar.</p>' : ''}
    <button class="ghost full" data-done>Jeg er færdig</button>`;
  updateMicButtons();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

phoneEl.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('input') || (mode === 'test' && !session && !isEmbed)) return;
  const actionEl = t.closest<HTMLElement>('[data-action]');
  const targetEl = t.closest<HTMLElement>('[data-target]');
  const action = actionEl?.dataset.action ?? '';
  if (action) {
    act(action, actionEl!.dataset.arg);
    logEvent('action', `${action}${actionEl!.dataset.arg ? ':' + actionEl!.dataset.arg : ''}`);
    if (action === 'pay' && session) {
      session.booked = listing().title;
      saveSession();
      renderPanel();
    }
  }
  // Spørgsmål til det, der blev trykket på, kommer før spørgsmål til den næste skærm
  if (targetEl) promptsFor('tap').filter((p) => p.trigger === targetEl.dataset.target).forEach(queuePrompt);
  render();
});

phoneEl.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id === 'dest-input') {
    state.query = t.value;
    const pos = t.selectionStart;
    render();
    const inp = document.getElementById('dest-input') as HTMLInputElement | null;
    inp?.focus();
    inp?.setSelectionRange(pos, pos);
  }
  if (t.id === 'price-range') {
    state.maxPrice = Number(t.value);
    render();
    (document.getElementById('price-range') as HTMLInputElement | null)?.focus();
  }
});

panelEl?.addEventListener('input', (e) => {
  const t = e.target as HTMLTextAreaElement;
  if (t.id === 'participant') participantDraft = t.value;
  const field = t.id?.replace('ta-', '') as keyof typeof drafts;
  if (field in drafts) drafts[field] = t.value;
});

panelEl?.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('button');
  if (!b) return;
  const d = b.dataset;
  if (d.mic) return toggleMic(d.mic as keyof typeof drafts);
  rec?.stop();
  if ('start' in d) {
    const name = participantDraft.trim();
    if (!name) {
      document.getElementById('participant')?.classList.add('invalid');
      document.getElementById('participant')?.focus();
      return;
    }
    startSession(name);
  } else if ('answer' in d || 'skip' in d) {
    const q = pending.shift()!;
    if ('answer' in d) addEntry('answer', drafts.answer, voiceUsed.answer ? 'voice' : 'text', q);
    else logEvent('action', `skip:${q._id}`);
    drafts.answer = '';
    voiceUsed.answer = false;
    renderPanel();
  } else if ('thought' in d) {
    addEntry('thought', drafts.thought, voiceUsed.thought ? 'voice' : 'text');
    drafts.thought = '';
    voiceUsed.thought = false;
    renderPanel();
  } else if ('done' in d) {
    finishing = true;
    renderPanel();
  } else if ('unfinish' in d) {
    finishing = false;
    renderPanel();
  } else if ('finish' in d) {
    finishSession();
  } else if ('new' in d) {
    session = null;
    Object.assign(drafts, { thought: '', answer: '', final: '' });
    state = initialState();
    lastScreen = '';
    render();
    renderPanel();
  } else if ('free' in d) {
    mode = 'free';
    renderPanel();
  } else if ('toTest' in d) {
    mode = 'test';
    state = initialState();
    render();
    renderPanel();
  } else if (d.jump) {
    ensureStateFor(d.jump);
    go(d.jump);
    render();
  } else if ('reset' in d) {
    state = initialState();
    render();
  }
});

// ---------------------------------------------------------------------------
// Start – understøtter ?screen=X&listing=ID&highlight=target (bruges af Studio-preview)
// ---------------------------------------------------------------------------

async function init() {
  if (params.get('screen')) {
    if (params.get('listing')) state.listingId = params.get('listing')!;
    ensureStateFor(params.get('screen')!);
    state.screen = params.get('screen')!;
  }
  if (params.get('category')) state.category = params.get('category')!;
  if (mode === 'test') resumeSession();
  render();
  renderPanel();
}
init();

// Studio sender upublicerede kladder hertil, så preview opdateres mens man skriver
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.type !== 'draft-content') return;
  content = e.data.content;
  ({ settings, listings, categories, destinations, prompts } = content);
  render();
});
if (window.parent !== window) window.parent.postMessage({ type: 'preview-ready' }, location.origin);
