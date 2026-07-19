import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GameEntry } from "../types";

export function useGames() {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const scan = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<GameEntry[]>("scan_games");
      setGames(result);
    } catch (e) {
      console.error("Failed to scan games:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await invoke<string[]>("get_favorites");
      setFavorites(new Set(favs));
    } catch {}
  }, []);

  useEffect(() => { scan(); loadFavorites(); }, [scan, loadFavorites]);

  const launch = async (path: string) => {
    try {
      await invoke("launch_game", { path });
    } catch (e) {
      console.error("Failed to launch:", e);
    }
  };

  const toggleFav = useCallback(async (path: string) => {
    const now = await invoke<boolean>("toggle_favorite", { path });
    setFavorites((prev) => {
      const next = new Set(prev);
      if (now) next.add(path); else next.delete(path);
      return next;
    });
  }, []);

  return { games, loading, launch, refresh: scan, favorites, toggleFav, loadFavorites };
}
