import { CircleAlert, Funnel, SearchX, Telescope } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/gitlas/EmptyState";
import { LoadingGrid } from "../components/gitlas/Loading";
import { RepositoryCard } from "../components/gitlas/RepositoryCard";
import { SearchBar } from "../components/gitlas/SearchBar";
import { SourceBadge } from "../components/gitlas/SourceBadge";
import { useAsync } from "../hooks/useAsync";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { ALL_SOURCES, getSourceMeta } from "../lib/platform";
import { searchRepositories } from "../services/gitlasClient";
import type { Repository, RepositorySource } from "../types/gitlas";

export function SearchResultsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q") ?? "";
  const [activeSources, setActiveSources] = useState<RepositorySource[]>([]);
  const { record } = useSearchHistory();

  const fetcher = useCallback((signal: AbortSignal) => searchRepositories(query, { signal }), [query]);
  const { status, data, error } = useAsync<Repository[]>(fetcher, query, query.trim().length > 0);

  useEffect(() => {
    if (status === "success" && data) record(query, data.length);
  }, [status, data, query, record]);

  const results = useMemo(() => {
    if (!data) return [];
    if (activeSources.length === 0) return data;
    return data.filter((r) => activeSources.includes(r.source));
  }, [data, activeSources]);

  const countsBySource = useMemo(() => {
    const counts = new Map<RepositorySource, number>();
    (data ?? []).forEach((r) => counts.set(r.source, (counts.get(r.source) ?? 0) + 1));
    return counts;
  }, [data]);

  const toggleSource = (source: RepositorySource) => {
    setActiveSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );
  };

  const runSearch = (next: string) => {
    setActiveSources([]);
    setParams({ q: next });
  };

  return (
    <div className="g-stack g-stack-20">
      <SearchBar initialValue={query} busy={status === "loading"} onSearch={runSearch} />

      {status === "idle" && (
        <EmptyState
          icon={<Telescope size={26} />}
          title="Start with a requirement"
          body="Describe the capability you need — for example “employee leave approval with email notifications” — and Gitlas will rank matching repositories across every connected platform."
          action={
            <button type="button" className="g-btn g-btn--primary" onClick={() => navigate("/")}>
              Browse examples
            </button>
          }
        />
      )}

      {status === "loading" && <LoadingGrid />}

      {status === "error" && (
        <EmptyState
          icon={<CircleAlert size={26} />}
          title="Search could not complete"
          body={error ?? "The discovery index is unreachable. Check the API connection and try again."}
          action={
            <button type="button" className="g-btn g-btn--primary" onClick={() => setParams({ q: query })}>
              Retry search
            </button>
          }
        />
      )}

      {status === "success" && data && (
        <>
          <div className="g-row g-row--between g-row--wrap" style={{ gap: 12 }}>
            <p className="g-muted" style={{ fontSize: 13 }}>
              <strong style={{ color: "var(--g-text)" }}>{results.length}</strong> of {data.length} matches for{" "}
              <span className="g-mono" style={{ color: "var(--g-brand-2)" }}>
                “{query}”
              </span>
            </p>
            <div className="g-row g-row--wrap" style={{ gap: 8 }}>
              <span className="g-row g-label" style={{ gap: 6 }}>
                <Funnel size={13} /> Source
              </span>
              {ALL_SOURCES.map((source) => {
                const active = activeSources.includes(source);
                const count = countsBySource.get(source) ?? 0;
                return (
                  <button
                    key={source}
                    type="button"
                    className={`g-btn g-btn--sm${active ? " g-btn--primary" : ""}`}
                    onClick={() => toggleSource(source)}
                    aria-pressed={active}
                    disabled={count === 0}
                  >
                    {getSourceMeta(source).label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon={<SearchX size={26} />}
              title="No repositories match these filters"
              body="Try clearing the source filters, or rephrase the requirement using the capability you need rather than a product name."
              action={
                <button type="button" className="g-btn" onClick={() => setActiveSources([])}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="g-grid g-grid--cards">
              {results.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  onCapabilitySelect={(capability) => runSearch(capability)}
                />
              ))}
            </div>
          )}

          <aside className="g-card g-card--pad g-row g-row--wrap" style={{ gap: 10, justifyContent: "center" }}>
            <span className="g-faint" style={{ fontSize: 12 }}>
              Results aggregated from
            </span>
            {ALL_SOURCES.map((s) => (
              <SourceBadge key={s} source={s} />
            ))}
          </aside>
        </>
      )}
    </div>
  );
}
