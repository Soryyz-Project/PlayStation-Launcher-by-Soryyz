import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const BG_OPTIONS = [
  { label: "1", value: "S1.mp4" },
  { label: "2", value: "S2.mp4" },
  { label: "3", value: "S3.mp4" },
  { label: "4", value: "S4.mp4" },
  { label: "5", value: "S5.mp4" },
  { label: "6", value: "S6.mp4" },
];

interface AppConfig {
  game_paths: string[];
  auto_launch: boolean;
  minimize_to_tray: boolean;
  bg_video: string;
}

interface Props {
  onRefreshGames: () => void;
}

export function SettingsScreen({ onRefreshGames }: Props) {
  const [config, setConfig] = useState<AppConfig>({
    game_paths: [],
    auto_launch: false,
    minimize_to_tray: true,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke<AppConfig>("get_config").then(setConfig).catch(console.error);
  }, []);

  const save = () => {
    invoke("set_config", { config }).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefreshGames();
    });
  };

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
            onChange={(e) => setConfig({ ...config, minimize_to_tray: e.target.checked })}
          />
        </label>

        <label className="settings-row">
          <span>Автозапуск лаунчера</span>
          <input
            type="checkbox"
            checked={config.auto_launch}
            onChange={(e) => setConfig({ ...config, auto_launch: e.target.checked })}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Оформление</h3>
        <label className="settings-row">
          <span>Фоновое видео</span>
          <select
            className="settings-select"
            value={config.bg_video || "S1.mp4"}
            onChange={(e) => setConfig({ ...config, bg_video: e.target.value })}
          >
            {BG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
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
                setConfig({ ...config, game_paths: next });
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
                setConfig({ ...config, game_paths: [...config.game_paths, selected] });
              }
            } catch {}
          }}
        >
          + Добавить папку
        </button>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">О программе</h3>
        <div className="settings-about">
          <p>PS5 Launcher v0.1.0</p>
          <p>Лаунчер для ПК в стиле PS5</p>
          <p>Сделано на Rust + Tauri + React</p>
        </div>
      </section>

      <button className="settings-save-btn" onClick={save}>
        {saved ? "✓ Сохранено" : "Сохранить"}
      </button>
    </div>
  );
}
