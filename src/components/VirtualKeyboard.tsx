import { useState, useCallback, useEffect } from "react";

interface Props {
  onInput: (char: string) => void;
  onBackspace: () => void;
  onClose: () => void;
}

const LAYOUTS: Record<string, string[][]> = {
  ru: [
    ["й","ц","у","к","е","н","г","ш","щ","з","х","ъ"],
    ["ф","ы","в","а","п","р","о","л","д","ж","э"],
    ["я","ч","с","м","и","т","ь","б","ю","ё"],
  ],
  en: [
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m"],
  ],
};

export function VirtualKeyboard({ onInput, onBackspace, onClose }: Props) {
  const [lang, setLang] = useState<"ru" | "en">("en");
  const [shift, setShift] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "Backspace") onBackspace();
    else if (e.key.length === 1 && /[a-zA-Zа-яА-Я]/.test(e.key)) {
      onInput(e.key.toLowerCase());
    }
  }, [onClose, onBackspace, onInput]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const rows = LAYOUTS[lang] || LAYOUTS.en;

  return (
    <div className="virtual-keyboard">
      <div className="vk-row vk-func-row">
        <button className="vk-key vk-wide" onClick={() => setLang(lang === "ru" ? "en" : "ru")}>
          {lang === "ru" ? "EN" : "RU"}
        </button>
        <button className="vk-key vk-wide" onClick={() => setShift((s) => !s)}>
          ⇧
        </button>
        <button className="vk-key vk-wide" onClick={onBackspace}>
          ⌫
        </button>
        <button className="vk-key vk-wide vk-close" onClick={onClose}>
          ✕
        </button>
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="vk-row">
          {row.map((ch) => (
            <button key={ch} className="vk-key" onClick={() => onInput(ch)}>
              {shift ? ch.toUpperCase() : ch}
            </button>
          ))}
        </div>
      ))}
      <div className="vk-row">
        <button className="vk-key vk-space" onClick={() => onInput(" ")} />
      </div>
    </div>
  );
}