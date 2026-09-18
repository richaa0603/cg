import { ArrowUpRight, Blocks, CircleAlert, Lightbulb, Network, SearchX, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "../components/gitlas/EmptyState";
import { LoadingGrid } from "../components/gitlas/Loading";
import { RepositoryCard } from "../components/gitlas/RepositoryCard";
import { SearchBar } from "../components/gitlas/SearchBar";
import { SourceBadge } from "../components/gitlas/SourceBadge";
import { EXAMPLE_REQUIREMENTS, PLATFORM_STATS } from "../data/mockData";
import { useAsync } from "../hooks/useAsync";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { ALL_SOURCES } from "../lib/platform";
import { searchRepositories } from "../services/gitlasClient";
import type { Repository } from "../types/gitlas";

const VALUE_PROPS = [
  {
    icon: Network,
    title: "One index, every platform",
    body: "GitHub, Azure DevOps and Salesforce are scanned continuously and normalised into a single searchable capability graph.",
  },
  {
    icon: Sparkles,
    title: "Explainable ranking",
    body: "Every result carries a match score and a plain-language explanation naming the files and capabilities that drove it.",
  },
  {
    icon: Blocks,
    title: "Component-level reuse",
    body: "Gitlas extracts individual services, handlers and flows — so you can adopt a class, not just clone a repository.",
  },
  {
    icon: Zap,
    title: "Access without the hunt",
    body: "Owner team, contact and access status ship with every result, and requests route straight to the right approver.",
  },
];

export function HomePage() {
  const routeQuery = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("q") ?? "";
  const [query, setQuery] = useState(routeQuery);
  const [searchSeq, setSearchSeq] = useState(0);
  const { record } = useSearchHistory();
  const fetcher = useCallback((signal: AbortSignal) => searchRepositories(query, { signal }), [query]);
  const asyncKey = `${query}::${searchSeq}`;
  const { status, data, error } = useAsync<Repository[]>(fetcher, asyncKey, query.length > 0);

  const runSearch = (nextQuery: string) => {
    setQuery(nextQuery.trim());
    setSearchSeq((s) => s + 1);
  };

  useEffect(() => {
    const receiveContext = (event: Event) => {
      const requirement = (event as CustomEvent<{ requirement?: string }>).detail?.requirement?.trim();
      if (requirement) runSearch(requirement);
    };
    window.addEventListener("gitlas-context-updated", receiveContext);
    return () => window.removeEventListener("gitlas-context-updated", receiveContext);
  }, []);

  useEffect(() => {
    if (status === "success" && data) record(query, data.length);
  }, [status, data, query, record]);

  return (
    <div className="g-stack g-stack-28">
      <section className="g-hero g-fade-in">
        <div className="g-stack g-stack-20">
          <div className="g-stack g-stack-14" style={{ alignItems: "center" }}>
            <span className="g-hero__eyebrow">
              <Sparkles size={13} /> Enterprise Capability Discovery
            </span>
            <h1 className="g-hero__title">Discover Before You Build</h1>
            <p className="g-hero__sub">
              Describe what you need in plain English. Gitlas searches every connected repository across your
              organisation and tells you what already exists, who owns it, and how to get access.
            </p>
          </div>

          <div className="g-hero__search">
            <SearchBar initialValue={query} size="lg" autoFocus busy={status === "loading"} onSearch={runSearch} />
          </div>

          <div className="g-row g-row--wrap" style={{ justifyContent: "center", gap: 8 }}>
            {ALL_SOURCES.map((s) => (
              <SourceBadge key={s} source={s} />
            ))}
          </div>
        </div>
      </section>

      {query ? (
        <section className="g-stack g-stack-14" aria-live="polite">
          {status === "loading" && <LoadingGrid />}
          {status === "error" && (
            <EmptyState
              icon={<CircleAlert size={26} />}
              title="Search could not complete"
              body={error ?? "The discovery API is unavailable."}
              action={
                <button type="button" className="g-btn g-btn--primary" onClick={() => runSearch(query)}>
                  Retry
                </button>
              }
            />
          )}
          {status === "success" && data && (
            <>
              <div className="g-row g-row--between g-row--wrap">
                <h2 className="g-label">Repository matches</h2>
                <span className="g-muted" style={{ fontSize: 12 }}>
                  {data.length} results
                </span>
              </div>
              {data.length === 0 ? (
                <EmptyState
                  icon={<SearchX size={26} />}
                  title="No repositories found"
                  body="Try describing the capability with broader technical keywords."
                />
              ) : (
                <div className="g-repository-list">
                  {data.map((repository) => (
                    <RepositoryCard
                      key={repository.id}
                      repository={repository}
                      onCapabilitySelect={runSearch}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <>
      <section className="g-stack g-stack-14">
        <div className="g-row" style={{ gap: 8 }}>
          <Lightbulb size={16} style={{ color: "var(--g-brand-3)" }} />
          <h2 className="g-label">Try an example requirement</h2>
        </div>
        <div className="g-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {EXAMPLE_REQUIREMENTS.map((example) => (
            <button
              key={example}
              type="button"
              className="g-card g-card--pad g-card--hover g-row g-row--between"
              style={{ textAlign: "left", cursor: "pointer", gap: 12, alignItems: "center" }}
              onClick={() => runSearch(example)}
            >
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{example}</span>
              <ArrowUpRight size={16} className="g-faint" style={{ flex: "0 0 auto" }} />
            </button>
          ))}
        </div>
      </section>

      <section className="g-stack g-stack-14">
        <h2 className="g-label">Platform statistics</h2>
        <div className="g-grid g-grid--stats">
          {PLATFORM_STATS.map((stat) => (
            <div key={stat.label} className="g-stat g-stack g-stack-4">
              <span className="g-stat__value">{stat.value}</span>
              <span className="g-stat__label">{stat.label}</span>
              <span className="g-stat__hint">{stat.hint}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="g-stack g-stack-14">
        <h2 className="g-label">Why teams use Gitlas</h2>
        <div className="g-grid g-grid--cards">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="g-card g-card--pad g-stack g-stack-10">
              <span
                aria-hidden="true"
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: "rgba(34,211,238,0.12)",
                  border: "1px solid rgba(34,211,238,0.3)",
                  color: "#7fe6f5",
                }}
              >
                <Icon size={17} />
              </span>
              <h3 className="g-card__title" style={{ fontSize: 14.5 }}>
                {title}
              </h3>
              <p className="g-card__desc">{body}</p>
            </article>
          ))}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
