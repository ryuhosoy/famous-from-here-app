import { useCallback, useEffect, useRef, useState } from 'react';

import { Celebrity, FavoriteCelebrity, HistoryEntry } from '../types';
import {
  loadFavorites,
  loadHistory,
  removeFavorite,
  saveFavorites,
  saveHistory,
  upsertFavorite,
  upsertHistory,
} from './library';

export function useLibrary() {
  const [favorites, setFavorites] = useState<FavoriteCelebrity[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const favoritesRef = useRef<FavoriteCelebrity[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [favs, hist] = await Promise.all([loadFavorites(), loadHistory()]);
      if (!cancelled) {
        favoritesRef.current = favs;
        historyRef.current = hist;
        setFavorites(favs);
        setHistory(hist);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFavorite = useCallback(
    (pageid: number) => favorites.some((item) => item.pageid === pageid),
    [favorites]
  );

  const toggleFavorite = useCallback((celebrity: Celebrity) => {
    const prev = favoritesRef.current;
    const exists = prev.some((item) => item.pageid === celebrity.pageid);
    const next = exists ? removeFavorite(prev, celebrity.pageid) : upsertFavorite(prev, celebrity);
    favoritesRef.current = next;
    setFavorites(next);
    void saveFavorites(next).catch((e) => console.warn('saveFavorites failed', e));
  }, []);

  const refreshFavorite = useCallback((celebrity: Celebrity) => {
    const prev = favoritesRef.current;
    if (!prev.some((item) => item.pageid === celebrity.pageid)) return;
    const next = upsertFavorite(prev, celebrity);
    favoritesRef.current = next;
    setFavorites(next);
    void saveFavorites(next).catch((e) => console.warn('refreshFavorite failed', e));
  }, []);

  const addHistory = useCallback((place: string) => {
    const next = upsertHistory(historyRef.current, place);
    historyRef.current = next;
    setHistory(next);
    void saveHistory(next).catch((e) => console.warn('saveHistory failed', e));
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setHistory([]);
    void saveHistory([]).catch((e) => console.warn('clearHistory failed', e));
  }, []);

  return {
    ready,
    favorites,
    history,
    isFavorite,
    toggleFavorite,
    refreshFavorite,
    addHistory,
    clearHistory,
  };
}
