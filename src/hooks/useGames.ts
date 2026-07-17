import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GameEntry } from "../types";

export function useGames() {
  const [games, setGames] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { scan(); }, [scan]);

  const launch = async (path: string) => {
    try {
      await invoke("launch_game", { path });
    } catch (e) {
      console.error("Failed to launch:", e);
    }
  };

  return { games, loading, launch, refresh: scan };
}
