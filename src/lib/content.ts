import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Al indhold ligger i én JSON-fil, som admin (/admin) læser og skriver via /api/content.
const CONTENT_PATH = join(process.cwd(), 'data', 'content.json');

export interface Settings {
  appName: string;
  personaName: string;
  researchQuestion: string;
  testTask: string;
  finalQuestion: string;
  searchPlaceholder: string;
  currency: string;
  serviceFeePct: number;
  featuredListingId: string;
  showAccent: boolean;
}

export interface Category {
  _id: string;
  name: string;
  icon: string;
}

export interface Destination {
  _id: string;
  name: string;
  subtitle: string;
  icon: string;
}

export interface Review {
  author: string;
  date: string;
  text: string;
}

export interface Listing {
  _id: string;
  title: string;
  location: string;
  destination: string;
  category: string;
  type: string;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  pricePerNight: number;
  cleaningFee: number;
  rating: number;
  reviewCount: number;
  hostName: string;
  hostYears: number;
  superhost: boolean;
  guestFavourite: boolean;
  description: string;
  amenities: string[];
  photoLabels: string[];
  mapX: number;
  mapY: number;
  reviews: Review[];
}

// Think-aloud-spørgsmål der dukker op, når deltageren når en skærm, trykker på eller ser et element
export interface Prompt {
  _id: string;
  question: string;
  screen: string;
  when: 'arrive' | 'tap' | 'see';
  trigger: string;
  lens: string;
  observation: string;
}

export interface Content {
  settings: Settings;
  categories: Category[];
  destinations: Destination[];
  listings: Listing[];
  prompts: Prompt[];
}

export type CollectionKey = 'categories' | 'destinations' | 'listings' | 'prompts';
export const COLLECTIONS: CollectionKey[] = ['prompts', 'listings', 'categories', 'destinations'];

export async function getContent(): Promise<Content> {
  return JSON.parse(await readFile(CONTENT_PATH, 'utf-8'));
}

export async function saveContent(content: Content): Promise<void> {
  await writeFile(CONTENT_PATH, JSON.stringify(content, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Think-aloud-sessioner (deltagernes svar)
// ---------------------------------------------------------------------------

const SESSIONS_PATH = join(process.cwd(), 'data', 'sessions.json');

export interface SessionEntry {
  _id: string;
  t: number;
  type: 'thought' | 'answer' | 'final';
  screen: string;
  promptId?: string;
  question?: string;
  text: string;
  source: 'text' | 'voice';
}

export interface SessionEvent {
  t: number;
  type: 'screen' | 'action';
  screen: string;
  detail?: string;
}

export interface Session {
  _id: string;
  participant: string;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  booked?: string;
  entries: SessionEntry[];
  events: SessionEvent[];
}

export async function getSessions(): Promise<Session[]> {
  try {
    return JSON.parse(await readFile(SESSIONS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await writeFile(SESSIONS_PATH, JSON.stringify(sessions, null, 2) + '\n', 'utf-8');
}
