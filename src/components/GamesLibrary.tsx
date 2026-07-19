import { useRef, useEffect, useState, useMemo } from "react";
import { useLocale } from "../hooks/useLocale";
import { VirtualKeyboard } from "./VirtualKeyboard";
import type { GameEntry, SortMode } from "../types";

interface Props {
  games: GameEntry[];
  loading: boolean;
  onLaunch: (path: string) => void;
  focusIndex: number;
  onFocusChange: (index: number) => void;
  showFocus: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  libColsRef?: React.MutableRefObject<number>;
  favorites: Set<string>;
  onToggleFav: (path: string) => void;
}

export function GamesLibrary({ games, loading, onLaunch, focusIndex, onFocusChange, showFocus, searchInputRef, libColsRef, favorites, onToggleFav }: Props) {
  const { t, plural } = useLocale();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [showKb, setShowKb] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const calc = () => {
      const style = getComputedStyle(el);
      const template = style.gridTemplateColumns;
      const count = template.split(" ").filter((s) => s.trim() && s !== "none").length;
      if (count > 0) setCols(count);
    };
    calc();
    const obs = new ResizeObserver(calc);
    obs.observe(el);
    return () => obs.disconnect();
  }, [games]);

  useEffect(() => { if (libColsRef) libColsRef.current = cols; }, [cols, libColsRef]);

  const sorted = useMemo(() => {
    let list = [...games];
    switch (sortMode) {
      case "name":
        list.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        break;
      case "source":
        list.sort((a, b) => a.source.localeCompare(b.source) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        break;
      case "recent":
        break;
    }
    return list;
  }, [games, sortMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(q));
  }, [sorted, query]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>{t("loading")}...</p>
      </div>
    );
  }

  return (
    <div className="games-library">
      <div className="library-header">
        <h2 className="library-title">{t("library")}</h2>
        <div className="library-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              className="search-input"
              type="text"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { onFocusChange(-1); }}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery("")}>✕</button>
            )}
            <button className="vk-toggle" onClick={() => setShowKb((v) => !v)} title="Virtual keyboard">
              ⌨️
            </button>
          </div>
          <select className="sort-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="name">{t("sort_name")}</option>
            <option value="source">{t("sort_source")}</option>
            <option value="recent">{t("sort_recent")}</option>
          </select>
        </div>
      </div>

      <div className={`library-count ${filtered.length === 0 ? "empty" : ""}`}>
        {filtered.length === 0
          ? t("nothing_found")
          : plural(filtered.length, "game_found")}
      </div>

      <div className="library-grid" ref={gridRef}>
        {filtered.map((game, i) => {
          const isFav = favorites.has(game.path);
          return (
            <div
              key={`${game.source}-${i}`}
              className={`library-card ${showFocus && focusIndex === i ? "focused" : ""} ${isFav ? "fav" : ""}`}
            >
              <button
                className="fav-btn"
                onClick={(e) => { e.stopPropagation(); onToggleFav(game.path); }}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                {isFav ? "★" : "☆"}
              </button>
              <button
                className="library-card-inner"
                onClick={() => onLaunch(game.path)}
              >
                <div className="library-card-cover">
                  {game.cover ? (
                    <img src={game.cover} alt={game.name} className="library-card-img" />
                  ) : (
                    <span className="library-card-placeholder">
                      {game.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="library-card-body">
                  <span className="library-card-name">{game.name}</span>
                  <span className="library-card-source">{game.source}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {showKb && (
        <div className="vk-overlay">
          <VirtualKeyboard
            onInput={(ch) => setQuery((q) => q + ch)}
            onBackspace={() => setQuery((q) => q.slice(0, -1))}
            onClose={() => setShowKb(false)}
          />
        </div>
      )}

      {games.length === 0 && (
        <div className="empty-state">
          <p>{t("not_found")}</p>
          <p className="empty-hint">{t("not_found_hint")}</p>
        </div>
      )}
    </div>
  );
}