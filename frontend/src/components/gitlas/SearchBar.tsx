import { ArrowRight, Clock, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchHistory } from "../../hooks/useSearchHistory";

interface SearchBarProps {
  initialValue?: string;
  size?: "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  busy?: boolean;
  onSearch: (query: string) => void;
}

export function SearchBar({
  initialValue = "",
  size = "md",
  placeholder = "Describe the capability you need…",
  autoFocus = false,
  busy = false,
  onSearch,
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { history, remove, clear } = useSearchHistory();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setValue(initialValue), [initialValue]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setHistoryOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setHistoryOpen(false);
    onSearch(q);
  };

  const pick = (query: string) => {
    setValue(query);
    setHistoryOpen(false);
    onSearch(query);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <form className={`g-search${size === "lg" ? " g-search--lg" : ""}`} onSubmit={submit} role="search">
        <Search size={18} className="g-faint" aria-hidden="true" />
        <input
          className="g-search__input"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Search enterprise capabilities"
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setHistoryOpen(history.length > 0)}
        />
        {value && (
          <button
            type="button"
            className="g-btn g-btn--ghost g-btn--sm"
            onClick={() => setValue("")}
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
        <button type="submit" className="g-btn g-btn--primary" disabled={busy || !value.trim()}>
          {busy ? <span className="g-spinner" aria-hidden="true" /> : <ArrowRight size={16} />}
          {busy ? "Searching" : "Discover"}
        </button>
      </form>

      {historyOpen && history.length > 0 && (
        <div
          className="g-card g-card--pad g-stack g-stack-10 g-fade-in"
          style={{ position: "absolute", insetInline: 0, top: "calc(100% + 8px)", zIndex: 30 }}
        >
          <div className="g-row g-row--between">
            <span className="g-label">Recent searches</span>
            <button type="button" className="g-btn g-btn--ghost g-btn--sm" onClick={clear}>
              <Trash2 size={13} /> Clear all
            </button>
          </div>
          <ul className="g-stack g-stack-4">
            {history.map((entry) => (
              <li key={entry.id} className="g-row g-row--between" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="g-btn g-btn--ghost g-btn--sm"
                  style={{ flex: 1, justifyContent: "flex-start", textAlign: "left", fontWeight: 500 }}
                  onClick={() => pick(entry.query)}
                >
                  <Clock size={13} className="g-faint" />
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={entry.query}
                  >
                    {entry.query}
                  </span>
                </button>
                <span className="g-badge g-badge--neutral">{entry.resultCount} hits</span>
                <button
                  type="button"
                  className="g-btn g-btn--ghost g-btn--sm"
                  onClick={() => remove(entry.id)}
                  aria-label={`Remove "${entry.query}" from history`}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
