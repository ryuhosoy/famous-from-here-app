import * as FileSystem from 'expo-file-system/legacy';

import { Celebrity, FavoriteCelebrity, HistoryEntry } from '../types';

const FAVORITES_FILE = `${FileSystem.documentDirectory}favorites.json`;
const HISTORY_FILE = `${FileSystem.documentDirectory}history.json`;

const MAX_FAVORITES = 100;
const MAX_HISTORY = 30;
const OFFLINE_EXTRACT_CHARS = 16000;

async function readJson<T>(uri: string, fallback: T): Promise<T> {
  try {
    if (!FileSystem.documentDirectory) return fallback;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return fallback;
    const raw = await FileSystem.readAsStringAsync(uri);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn('library readJson failed', uri, e);
    return fallback;
  }
}

async function writeJson<T>(uri: string, value: T): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error('documentDirectory is unavailable');
  }
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(value));
}

export function toFavoriteCelebrity(celebrity: Celebrity): FavoriteCelebrity {
  return {
    pageid: celebrity.pageid,
    title: celebrity.title,
    description: celebrity.description ?? null,
    extract: (celebrity.extract ?? '').slice(0, OFFLINE_EXTRACT_CHARS),
    thumbnailUrl: celebrity.thumbnailUrl ?? null,
    pageUrl: celebrity.pageUrl,
    savedAt: Date.now(),
  };
}

export async function loadFavorites(): Promise<FavoriteCelebrity[]> {
  return readJson<FavoriteCelebrity[]>(FAVORITES_FILE, []);
}

export async function saveFavorites(favorites: FavoriteCelebrity[]): Promise<void> {
  await writeJson(FAVORITES_FILE, favorites.slice(0, MAX_FAVORITES));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(HISTORY_FILE, []);
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  await writeJson(HISTORY_FILE, history.slice(0, MAX_HISTORY));
}

export function upsertFavorite(
  favorites: FavoriteCelebrity[],
  celebrity: Celebrity
): FavoriteCelebrity[] {
  const next = favorites.filter((item) => item.pageid !== celebrity.pageid);
  return [toFavoriteCelebrity(celebrity), ...next].slice(0, MAX_FAVORITES);
}

export function removeFavorite(
  favorites: FavoriteCelebrity[],
  pageid: number
): FavoriteCelebrity[] {
  return favorites.filter((item) => item.pageid !== pageid);
}

export function upsertHistory(history: HistoryEntry[], place: string): HistoryEntry[] {
  const trimmed = place.trim();
  if (!trimmed) return history;
  const next = history.filter((item) => item.place !== trimmed);
  return [{ place: trimmed, searchedAt: Date.now() }, ...next].slice(0, MAX_HISTORY);
}
