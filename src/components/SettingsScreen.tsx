import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const BG_OPTIONS = [
  { label: "1", value: "S1.mp4" },
  { label: "2", value: "S2.mp4" },
  { label: "3", value: "S3.mp4" },
  { label: "4", value: "S4.mp4" },
  { label: "5", value: "S5.mp4" },
  { label: "6", value: "S6.mp4" },
  { label: "7", value: "S7.mp4" },
  { label: "8", value: "S8.mp4" },
];

interface AppConfig {
  game_paths: string[];
  auto_launch: boolean;
  minimize_to_tray: boolean;
  bg_video: string;
  bg_video_enabled: boolean;
  bg_dimmed: number;
}

interface Props {
  onRefreshGames: () => void;
}

export function SettingsScreen({ onRefreshGames }: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    invoke<AppConfig>("get_config").then((cfg) => {
      setConfig({
        game_paths: cfg.game_paths || [],
        auto_launch: cfg.auto_launch ?? false,
        minimize_to_tray: cfg.minimize_to_tray ?? true,
        bg_video: cfg.bg_video || "S1.mp4",
        bg_video_enabled: cfg.bg_video_enabled ?? true,
        bg_dimmed: cfg.bg_dimmed ?? 0.8,
      });
    }).catch(console.error);
  }, []);

  const save = useCallback((updated: AppConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      invoke("set_config", { config: updated }).catch(console.error);
      onRefreshGames();
    }, 200);
  }, [onRefreshGames]);

  const update = useCallback((patch: Partial<AppConfig>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, [save]);

  if (!config) return null;

  return (
    <div className="settings-screen">
      <h2 className="settings-title">Настройки</h2>

      <section className="settings-section">
        <h3 className="settings-section-title">Общие</h3>

        <label className="settings-row">
          <span>Сворачивать в трей при запуске игры</span>
          <input
            type="checkbox"
            checked={config.minimize_to_tray}
            onChange={(e) => update({ minimize_to_tray: e.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span>Автозапуск лаунчера</span>
          <input
            type="checkbox"
            checked={config.auto_launch}
            onChange={(e) => update({ auto_launch: e.target.checked })}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Оформление</h3>

        <label className="settings-row">
          <span>Фоновое видео</span>
          <input
            type="checkbox"
            checked={config.bg_video_enabled}
            onChange={(e) => update({ bg_video_enabled: e.target.checked })}
          />
        </label>

        {config.bg_video_enabled && (
          <>
            <div className="bg-selector">
              {BG_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`bg-card ${config.bg_video === o.value ? "active" : ""}`}
                  onClick={() => update({ bg_video: o.value })}
                >
                  <div className="bg-card-preview">
                    <span className="bg-card-num">{o.label}</span>
                    {config.bg_video === o.value && <span className="bg-card-check">▶</span>}
                  </div>
                </button>
              ))}
            </div>

            <div className="settings-row">
              <span>Затемнение</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="settings-slider"
                value={config.bg_dimmed}
                onChange={(e) => update({ bg_dimmed: parseFloat(e.target.value) })}
              />
              <span className="settings-slider-value">{Math.round(config.bg_dimmed * 100)}%</span>
            </div>
          </>
        )}
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Пути к играм</h3>
        <p className="settings-hint">
          Лаунчер автоматически сканирует Steam, Epic Games и установленные программы.
          Добавьте дополнительные папки с играми вручную.
        </p>

        {config.game_paths.map((p, i) => (
          <div key={i} className="settings-path-row">
            <span className="settings-path">{p}</span>
            <button
              className="settings-remove-btn"
              onClick={() => {
                const next = config.game_paths.filter((_, j) => j !== i);
                update({ game_paths: next });
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="settings-add-btn"
          onClick={async () => {
            try {
              const selected = await open({ directory: true, multiple: false });
              if (selected) {
                update({ game_paths: [...config.game_paths, selected] });
              }
            } catch {}
          }}
        >
          + Добавить папку
        </button>
      </section>
    </div>
  );
}
