import { useState, useRef, useEffect } from "react";
import { useTheme, themes } from "./ThemeContext";
import { Palette, Check } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-xl bg-[var(--accent)] hover:bg-[var(--muted)] flex items-center justify-center transition-all cursor-pointer"
        title="Change theme"
      >
        <Palette className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-3 w-60"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <p className="text-muted-foreground mb-2.5 px-2" style={{ fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Theme
          </p>
          <div className="space-y-0.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  theme === t.id ? "bg-[var(--accent)]" : "hover:bg-[var(--accent)]"
                }`}
              >
                <div className="flex items-center -space-x-1.5">
                  {t.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border-2"
                      style={{ backgroundColor: c, borderColor: "var(--card)", zIndex: 3 - i }}
                    />
                  ))}
                </div>
                <span className="text-foreground flex-1 text-left" style={{ fontSize: "0.85rem" }}>
                  {t.name}
                </span>
                {theme === t.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
