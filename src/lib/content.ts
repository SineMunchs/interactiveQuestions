import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getStore } from '@netlify/blobs';
import seedContent from '../../data/content.json';

// Al indhold ligger i én JSON-fil, som admin (/admin) læser og skriver via /api/content.
// På Netlify kan man ikke skrive til filer, så dér gemmes data i Netlify Blobs.
// Lokalt (uden Netlify-miljø) bruges filerne i data/ som hidtil.
const CONTENT_PATH = join(process.cwd(), 'data', 'content.json');

function blobStore() {
  try {
    return getStore({ name: 'data', consistency: 'strong' });
  } catch {
    return null; // Intet Netlify-miljø → brug filer
  }
}

async function readData<T>(key: string, path: string, fallback: T): Promise<T> {
  const store = blobStore();
  if (store) return ((await store.get(key, { type: 'json' })) as T | null) ?? fallback;
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function writeData(key: string, path: string, data: unknown): Promise<void> {
  const store = blobStore();
  if (store) await store.setJSON(key, data);
  else await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

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
  return readData('content', CONTENT_PATH, seedContent as Content);
}

export async function saveContent(content: Content): Promise<void> {
  await writeData('content', CONTENT_PATH, content);
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
  return readData<Session[]>('sessions', SESSIONS_PATH, []);
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await writeData('sessions', SESSIONS_PATH, sessions);
}
