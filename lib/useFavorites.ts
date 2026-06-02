"use client";

import { useCallback, useEffect, useState } from "react";
import type { School } from "./types";

// Favorites are intentionally client-only: they live in the browser's
// localStorage so the deployed (read-only) Vercel build keeps nothing
// per-user. Clearing the browser data clears the favorites.
const STORAGE_KEY = "schoolscope:favorites";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? new Set(ids.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export function useFavorites() {
  // Start empty so server and first client render match (no hydration
  // mismatch), then hydrate from localStorage on mount.
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavorites(read());
    // Keep multiple tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // storage may be unavailable (private mode / quota) — favorites just
      // won't persist across reloads in that case.
    }
  }, []);

  const toggleFavorite = useCallback(
    (id: School["id"]) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        const key = String(id);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isFavorite = useCallback(
    (id: School["id"]) => favorites.has(String(id)),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
