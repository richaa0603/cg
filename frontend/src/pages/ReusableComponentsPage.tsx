import { Blocks, SearchX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "../components/gitlas/EmptyState";
import { LoadingGrid } from "../components/gitlas/Loading";
import { ReusableComponentCard } from "../components/gitlas/ReusableComponentCard";
import { SearchBar } from "../components/gitlas/SearchBar";
import { useAsync } from "../hooks/useAsync";
import { getReusableComponents } from "../services/gitlasClient";
import type { ReusableComponent } from "../types/gitlas";

export function ReusableComponentsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const fetcher = useCallback((signal: AbortSignal) => getReusableComponents(query, { signal }), [query]);
  const { status, data } = useAsync<ReusableComponent[]>(fetcher, query);

  const categories = useMemo(() => {
    const set = new Set((data ?? []).map((c) => c.category as string));
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    return category === "All" ? data : data.filter((c) => c.category === category);
  }, [data, category]);

  return (
    <div className="g-stack g-stack-20">
      <div className="g-stack g-stack-10">
        <h1 className="g-page-title">Reusable Components</h1>
        <p className="g-page-sub">
          Individual classes, services and flows extracted from indexed repositories, each scored by how confidently
          Gitlas believes it can be reused without modification.
        </p>
      </div>

      <SearchBar
        initialValue={query}
        placeholder="Filter components — e.g. authentication, notifications, upload…"
        busy={status === "loading"}
        onSearch={setQuery}
      />

      {status === "loading" ? (
        <LoadingGrid count={3} layout="cards" label="Extracting reusable components across indexed repositories…" showPlatforms={false} />
      ) : (
        <>
          <div className="g-row g-row--wrap" style={{ gap: 8 }}>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`g-btn g-btn--sm${category === c ? " g-btn--primary" : ""}`}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<SearchX size={26} />}
              title="No components in this view"
              body="Nothing matched the current filter. Clear the category filter or search for a broader capability such as “authentication”."
              action={
                <button
                  type="button"
                  className="g-btn g-btn--primary"
                  onClick={() => {
                    setCategory("All");
                    setQuery("");
                  }}
                >
                  Reset filters
                </button>
              }
            />
          ) : (
            <>
              <p className="g-faint g-row" style={{ gap: 7, fontSize: 12.5 }}>
                <Blocks size={14} /> {visible.length} components available for reuse
              </p>
              <div className="g-grid g-grid--cards">
                {visible.map((c) => (
                  <ReusableComponentCard key={c.id} component={c} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
