// Lowfi stregikoner (24x24, currentColor)
const p = (d: string, extra = '') =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icon = {
  search: p('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  heart: p('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  heartFill: p('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill="currentColor"/>'),
  logo: p('<path d="M12 4c-1 0-1.6.7-2.2 2L5 16c-.8 1.8.3 3.7 2.2 3.7 1.6 0 3-1.2 4.8-3.2 1.8 2 3.2 3.2 4.8 3.2 1.9 0 3-1.9 2.2-3.7L14.2 6C13.6 4.7 13 4 12 4Z"/><path d="M12 16.5c-1.4-1.7-2.2-3.2-2.2-4.4a2.2 2.2 0 0 1 4.4 0c0 1.2-.8 2.7-2.2 4.4Z"/>'),
  chat: p('<path d="M5 5h14v10H9l-4 4V5Z"/>'),
  user: p('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-5 8-5s6.5 1 8 5"/>'),
  back: p('<path d="m15 18-6-6 6-6"/>'),
  right: p('<path d="m9 18 6-6-6-6"/>'),
  close: p('<path d="M6 6l12 12M18 6 6 18"/>'),
  share: p('<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>'),
  sliders: p('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  map: p('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/>'),
  list: p('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  star: p('<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6L12 4Z" fill="currentColor"/>', 'width="12" height="12"'),
  plus: p('<path d="M12 6v12M6 12h12"/>', 'width="16" height="16"'),
  minus: p('<path d="M6 12h12"/>', 'width="16" height="16"'),
  check: p('<path d="m5 12 5 5 9-10"/>'),
  key: p('<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8M16 6l2 2"/>'),
  door: p('<path d="M6 20V4h12v16M4 20h16M14 12h.01"/>'),
  calendar: p('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  card: p('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>'),
  globe: p('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16"/>'),
  medal: p('<circle cx="12" cy="9" r="5"/><path d="m9 13-2 7 5-2 5 2-2-7"/>'),
  bed: p('<path d="M3 18V8M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.5"/>'),
  pin: p('<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z"/><circle cx="12" cy="10" r="2"/>'),
  gear: p('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
  help: p('<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 16.5h.01"/>'),
  laurel: p('<path d="M7 5c-3 3-3 9 1 13M17 5c3 3 3 9-1 13M5 9l2 1M4.5 13l2.3.4M19 9l-2 1M19.5 13l-2.3.4"/>'),
};
