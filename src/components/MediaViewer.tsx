import { useEffect, useState, useCallback, useRef } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

interface MediaFile {
  name: string;
  path: string;
  is_image: boolean;
  thumbnail: string | null;
}

interface Props {
  initialTab: "screenshots" | "videos";
  onBack: () => void;
  controller: string;
  onTabChange?: (tab: "screenshots" | "videos") => void;
  showHints: boolean;
  onToggleHints: () => void;
}

const TABS = ["screenshots", "videos"] as const;

function VideoThumbnail({ path, thumbnail }: { path: string; thumbnail: string | null }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.crossOrigin = "anonymous";

    const src = convertFileSrc(path);
    video.src = src;

    let done = false;

    const capture = () => {
      if (done || !mountedRef.current) return;
      done = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setDataUrl(canvas.toDataURL("image/jpeg", 0.4));
      } catch {}
      video.remove();
    };

    video.onloadeddata = () => { video.currentTime = 0.5; };
    video.onseeked = capture;
    video.onerror = capture;

    setTimeout(() => { if (!done) capture(); }, 2000);

    return () => { mountedRef.current = false; video.remove(); };
  }, [path]);

  if (dataUrl) return <img className="media-viewer-thumb" src={dataUrl} alt="" />;
  return <div className="media-viewer-video-thumb"><span>🎥</span></div>;
}

export function MediaViewer({ initialTab, onBack, controller, onTabChange, showHints, onToggleHints }: Props) {
  const [tabIdx, setTabIdx] = useState(initialTab === "videos" ? 1 : 0);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const cacheRef = useRef<Record<string, MediaFile[]>>({});

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setTabIdx(initialTab === "videos" ? 1 : 0);
  }, [initialTab]);

  const load = useCallback((idx: number) => {
    const key = TABS[idx];
    if (cacheRef.current[key]) {
      setFiles(cacheRef.current[key]);
      return;
    }
    invoke<MediaFile[]>("get_media_files", { dirType: key })
      .then((res) => {
        if (mountedRef.current) {
          cacheRef.current[key] = res;
          setFiles(res);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(tabIdx); }, [tabIdx, load]);

  const switchTab = useCallback((idx: number) => {
    if (idx === tabIdx) return;
    setTabIdx(idx);
    setSelected(null);
    setPreview(null);
    onTabChange?.(TABS[idx]);
  }, [tabIdx, onTabChange]);

  const del = useCallback(async (path: string) => {
    try {
      await invoke("delete_media_file", { path });
      const key = TABS[tabIdx];
      cacheRef.current[key] = (cacheRef.current[key] || []).filter((f) => f.path !== path);
      setFiles(cacheRef.current[key]);
      setSelected(null);
      setConfirmDelete(null);
    } catch {}
  }, [tabIdx]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (confirmDelete) {
        if (e.key === "Escape") setConfirmDelete(null);
        else if (e.key === "Enter") { del(confirmDelete); }
        return;
      }
      if (preview) {
        if (e.key === "Escape" || e.key === "Backspace") { setPreview(null); }
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") { onBack(); }
      if (e.key === "Delete" && selected !== null && files[selected]) { setConfirmDelete(files[selected].path); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onBack, preview, selected, files, confirmDelete, del]);

  const handleGamepadAction = useCallback(
    (action: string) => {
      if (!mountedRef.current) return;
      if (confirmDelete) {
        if (action === "back") setConfirmDelete(null);
        else if (action === "delete") setConfirmDelete(null);
        else if (action === "confirm" && confirmDelete) del(confirmDelete);
        return;
      }
      if (preview) {
        if (action === "back" || action === "confirm") setPreview(null);
        else if (action === "delete" && preview) setConfirmDelete(preview.path);
        return;
      }
      switch (action) {
        case "back": onBack(); break;
        case "left":
          setSelected((i) => (i === null || i <= 0 ? null : i - 1)); break;
        case "right":
          setSelected((i) =>
            i === null ? (files.length > 0 ? 0 : null) : Math.min(i + 1, files.length - 1)
          ); break;
        case "up":
          if (selected !== null) setSelected(Math.max(selected - 4, 0)); break;
        case "down":
          if (selected !== null) setSelected(Math.min(selected + 4, files.length - 1)); break;
        case "confirm":
          if (selected !== null && files[selected]) setPreview(files[selected]); break;
        case "delete":
          if (selected !== null && files[selected]) setConfirmDelete(files[selected].path); break;
        case "lb": switchTab(tabIdx === 0 ? 0 : tabIdx - 1); break;
        case "rb": switchTab(tabIdx === TABS.length - 1 ? tabIdx : tabIdx + 1); break;
        case "toggle_hints": onToggleHints(); break;
      }
    },
    [onBack, files, selected, preview, tabIdx, switchTab, confirmDelete, del, onToggleHints]
  );

  useEffect(() => {
    const poll = setInterval(() => {
      const gp = navigator.getGamepads();
      const gamepad = Array.from(gp).find((g) => g !== null);
      if (!gamepad) return;
      for (const cb of callbacks.current) cb(gamepad);
    }, 80);
    const callbacks: { current: ((gp: Gamepad) => void)[] } = { current: [] };
    const prev = new Map<string, number>();
    const check = (gp: Gamepad) => {
      const btnMap: [string, number][] = [
        ["confirm", 0], ["back", 1], ["delete", 2], ["toggle_hints", 3], ["lb", 4], ["rb", 5],
      ];
      for (const [action, idx] of btnMap) {
        const pressed = gp.buttons[idx]?.pressed ?? false;
        const k = `${action}-${gp.index}`;
        const p = prev.get(k) ?? 0;
        if (pressed && p === 0) { handleGamepadAction(action); prev.set(k, 1); }
        else if (!pressed) { prev.set(k, 0); }
      }
      const ax = gp.axes;
      const dpad: [number, number, string][] = [
        [0, -0.5, "left"], [0, 0.5, "right"], [1, -0.5, "up"], [1, 0.5, "down"],
      ];
      for (const [axis, threshold, action] of dpad) {
        const val = ax[axis] ?? 0;
        if (Math.abs(val) > Math.abs(threshold)) {
          const dir = val < 0 ? "neg" : "pos";
          const dk = `${axis}-${dir}`;
          const p = prev.get(dk) ?? 0;
          if (p === 0) { handleGamepadAction(action); prev.set(dk, 1); }
        } else {
          [0, 1].forEach((a) => { prev.delete(`${a}-neg`); prev.delete(`${a}-pos`); });
        }
      }
    };
    callbacks.current.push(check);
    return () => clearInterval(poll);
  }, [handleGamepadAction]);

  if (confirmDelete) {
    return (
      <div className="preview-overlay">
        <div className="confirm-dialog">
          <div className="confirm-title">Вы уверены?</div>
          <div className="confirm-actions">
            <button className="confirm-btn confirm-no" onClick={() => setConfirmDelete(null)}>
              Нет
            </button>
            <button className="confirm-btn confirm-yes" onClick={() => del(confirmDelete)}>
              Да
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="preview-overlay" onClick={() => setPreview(null)}>
        <div className="preview-frame">
          {preview.is_image && preview.thumbnail ? (
            <img className="preview-image" src={preview.thumbnail} alt={preview.name} onClick={(e) => e.stopPropagation()} />
          ) : (
            <div className="preview-video-wrap" onClick={(e) => e.stopPropagation()}>
              <span className="preview-video-icon">🎥</span>
              <span className="preview-filename">{preview.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentFiles = files;

  return (
    <div className="media-viewer">
      {currentFiles.length === 0 ? (
        <div className="media-viewer-empty">
          <p>Нет файлов</p>
          <p className="empty-hint">Добавьте {tabIdx === 0 ? "изображения" : "видео"} в папку</p>
        </div>
      ) : (
        <div className="media-viewer-grid">
          {currentFiles.map((file, i) => (
            <div
              key={file.path}
              className={`media-viewer-item ${selected === i ? "selected" : ""}`}
              onClick={() => setSelected(i)}
              onDoubleClick={() => setPreview(file)}
            >
              {file.is_image && file.thumbnail ? (
                <img className="media-viewer-thumb" src={file.thumbnail} alt={file.name} />
              ) : (
                <VideoThumbnail path={file.path} thumbnail={file.thumbnail} />
              )}
              <span className="media-viewer-name">{file.name}</span>
              {selected === i && (
                <button className="media-viewer-del" onClick={(e) => { e.stopPropagation(); setConfirmDelete(file.path); }}>🗑</button>
              )}
            </div>
          ))}
        </div>
      )}

      <footer className={`bottom-bar ${showHints ? "visible" : ""}`}>
        <div className="bottom-bar-inner" style={{ justifyContent: "center", gap: 40 }}>
          <div className="bottom-hint">
            <span className="hint-icon">{(controller === "ps" ? "✕" : controller === "xbox" ? "A" : "Enter")}</span>
            <span>Открыть</span>
          </div>
          <div className="bottom-hint">
            <span className="hint-icon">{(controller === "ps" ? "○" : controller === "xbox" ? "B" : "Esc")}</span>
            <span>Назад</span>
          </div>
          <div className="bottom-hint">
            <span className="hint-icon">{(controller === "ps" ? "□" : controller === "xbox" ? "X" : "Del")}</span>
            <span>Удалить</span>
          </div>
          <div className="bottom-hint">
            <span className="hint-icon">{(controller === "ps" ? "△" : controller === "xbox" ? "Y" : "Y")}</span>
            <span>Скрыть</span>
          </div>
          <div className="bottom-hint">
            <span className="hint-icon">◆</span>
            <span>Навигация</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
