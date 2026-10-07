// Registry over alle app-skærme og de elementer (targets) et think-aloud-spørgsmål kan udløses af.
// Bruges både af appen (data-target attributter) og af Studio (dropdowns i spørgsmåls-editoren).

export interface ScreenDef {
  id: string;
  label: string;
  targets: { id: string; label: string }[];
}

export const SCREENS: ScreenDef[] = [
  {
    id: 'explore',
    label: 'Udforsk (forside)',
    targets: [
      { id: 'search-bar', label: 'Søgefelt' },
      { id: 'category', label: 'Kategori-ikon' },
      { id: 'listing-card', label: 'Boligkort' },
      { id: 'heart', label: 'Hjerte (gem)' },
      { id: 'tab-wishlists', label: 'Fane: Ønskelister' },
    ],
  },
  {
    id: 'search-where',
    label: 'Søg: Hvor?',
    targets: [
      { id: 'destination-input', label: 'Destinationsfelt' },
      { id: 'destination-suggestion', label: 'Foreslået destination' },
    ],
  },
  {
    id: 'search-when',
    label: 'Søg: Hvornår?',
    targets: [
      { id: 'date-start', label: 'Ankomstdato' },
      { id: 'date-end', label: 'Afrejsedato' },
      { id: 'when-next', label: 'Knap: Næste' },
    ],
  },
  {
    id: 'search-who',
    label: 'Søg: Hvem?',
    targets: [
      { id: 'guests-adults-plus', label: 'Voksne +' },
      { id: 'guests-children-plus', label: 'Børn +' },
      { id: 'search-button', label: 'Knap: Søg' },
    ],
  },
  {
    id: 'results',
    label: 'Søgeresultater',
    targets: [
      { id: 'search-summary', label: 'Søgeoversigt' },
      { id: 'filter-button', label: 'Filterknap' },
      { id: 'listing-card', label: 'Boligkort' },
      { id: 'map-toggle', label: 'Knap: Kort' },
    ],
  },
  {
    id: 'filters',
    label: 'Filtre',
    targets: [
      { id: 'filter-price', label: 'Prisinterval' },
      { id: 'filter-type', label: 'Type af sted' },
      { id: 'filter-apply', label: 'Knap: Vis steder' },
    ],
  },
  {
    id: 'map',
    label: 'Kortvisning',
    targets: [
      { id: 'map-pin', label: 'Prisnål' },
      { id: 'list-toggle', label: 'Knap: Liste' },
    ],
  },
  {
    id: 'detail',
    label: 'Boligdetaljer',
    targets: [
      { id: 'detail-photos', label: 'Fotogalleri' },
      { id: 'detail-host', label: 'Vært' },
      { id: 'detail-amenities', label: 'Faciliteter' },
      { id: 'detail-reviews', label: 'Anmeldelser' },
      { id: 'detail-heart', label: 'Hjerte (gem)' },
      { id: 'reserve-button', label: 'Knap: Reserver' },
    ],
  },
  {
    id: 'checkout',
    label: 'Bekræft og betal',
    targets: [
      { id: 'trip-dates', label: 'Rejsedetaljer' },
      { id: 'payment-method', label: 'Betalingsmetode' },
      { id: 'price-details', label: 'Prisdetaljer' },
      { id: 'pay-button', label: 'Knap: Bekræft og betal' },
    ],
  },
  {
    id: 'confirmed',
    label: 'Reservation bekræftet',
    targets: [{ id: 'view-trip', label: 'Knap: Se rejse' }],
  },
  {
    id: 'trips',
    label: 'Rejser',
    targets: [{ id: 'trip-card', label: 'Rejsekort' }, { id: 'tab-inbox', label: 'Fane: Indbakke' }],
  },
  {
    id: 'wishlists',
    label: 'Ønskelister',
    targets: [{ id: 'wishlist-card', label: 'Ønskeliste' }],
  },
  {
    id: 'inbox',
    label: 'Indbakke',
    targets: [{ id: 'message-thread', label: 'Besked fra vært' }],
  },
  {
    id: 'profile',
    label: 'Profil',
    targets: [],
  },
];
