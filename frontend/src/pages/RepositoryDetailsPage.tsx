import { ArrowLeft, Building2, Cpu, ExternalLink, KeyRound, Mail, SearchX, Star } from "lucide-react";
import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AccessBadge } from "../components/gitlas/AccessBadge";
import { CapabilityChips, TechChips } from "../components/gitlas/CapabilityChip";
import { EmptyState } from "../components/gitlas/EmptyState";
import { ExplanationPanel } from "../components/gitlas/ExplanationPanel";
import { LoadingGrid } from "../components/gitlas/Loading";
import { MatchScore } from "../components/gitlas/MatchScore";
import { ReusableComponentCard } from "../components/gitlas/ReusableComponentCard";
import { SourceBadge } from "../components/gitlas/SourceBadge";
import { useAsync } from "../hooks/useAsync";
import { getSourceMeta, openRepository, resolveRepositoryUrl } from "../lib/platform";
import { getComponentsForRepository, getRepositoryById } from "../services/gitlasClient";
import type { Repository, ReusableComponent } from "../types/gitlas";

export function RepositoryDetailsPage() {
  const { repositoryId = "" } = useParams();
  const navigate = useNavigate();

  const repoFetcher = useCallback(() => getRepositoryById(repositoryId), [repositoryId]);
  const componentFetcher = useCallback(() => getComponentsForRepository(decodeURIComponent(repositoryId)), [repositoryId]);

  const { status, data: repository } = useAsync<Repository | null>(repoFetcher, repositoryId, Boolean(repositoryId));
  const { data: components } = useAsync<ReusableComponent[]>(componentFetcher, repositoryId, Boolean(repositoryId));

  if (status === "loading" || status === "idle") {
    return <LoadingGrid count={2} label="Loading repository profile…" />;
  }

  if (!repository) {
    return (
      <EmptyState
        icon={<SearchX size={26} />}
        title="Repository not found"
        body="This repository is not in the Gitlas index, or the link is out of date. Run a new discovery search to find current matches."
        action={
          <button type="button" className="g-btn g-btn--primary" onClick={() => navigate("/search")}>
            Back to search
          </button>
        }
      />
    );
  }

  const sourceMeta = getSourceMeta(repository.source);

  return (
    <div className="g-stack g-stack-20">
      <button type="button" className="g-btn g-btn--ghost g-btn--sm" onClick={() => navigate(-1)} style={{ alignSelf: "flex-start" }}>
        <ArrowLeft size={14} /> Back
      </button>

      <section className="g-card g-card--pad g-stack g-stack-20 g-fade-in">
        <header className="g-card__head">
          <div className="g-stack g-stack-10" style={{ minWidth: 0 }}>
            <div className="g-row g-row--wrap" style={{ gap: 8 }}>
              <SourceBadge source={repository.source} />
              <AccessBadge status={repository.accessStatus} />
            </div>
            <h1 className="g-page-title g-mono" style={{ fontSize: 22, wordBreak: "break-word" }}>
              {repository.repositoryName}
            </h1>
            <p className="g-page-sub">{repository.description}</p>
          </div>
          <MatchScore score={repository.matchScore} />
        </header>

        <div className="g-row g-row--wrap" style={{ gap: 10 }}>
          <button type="button" className="g-btn g-btn--primary" onClick={() => openRepository(repository)}>
            <ExternalLink size={15} /> Open in {sourceMeta.label}
          </button>
          <Link className="g-btn" to={`/access/${encodeURIComponent(repository.id)}`}>
            <KeyRound size={15} /> Manage access
          </Link>
          {repository.ownerContact && (
            <a className="g-btn" href={`mailto:${repository.ownerContact}`}>
              <Mail size={15} /> Contact {repository.ownerTeam}
            </a>
          )}
        </div>
      </section>

      <div className="g-grid g-grid--split">
        <div className="g-stack g-stack-20">
          <section className="g-card g-card--pad g-stack g-stack-10">
            <h2 className="g-label">
              <Cpu size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Technology stack
            </h2>
            <TechChips stack={repository.technologyStack} />
          </section>

          <section className="g-card g-card--pad g-stack g-stack-10">
            <h2 className="g-label">Capabilities</h2>
            <CapabilityChips
              capabilities={repository.capabilities}
              onSelect={(c) => navigate(`/search?q=${encodeURIComponent(c)}`)}
            />
          </section>

          <ExplanationPanel
            explanation={repository.explanation}
            matchedFiles={repository.matchedFiles}
            title="Discovery rationale"
          />

          <section className="g-stack g-stack-14">
            <h2 className="g-label">Reusable components in this repository</h2>
            {components && components.length > 0 ? (
              <div className="g-grid g-grid--cards">
                {components.map((c) => (
                  <ReusableComponentCard key={c.id} component={c} />
                ))}
              </div>
            ) : (
              <p className="g-faint" style={{ fontSize: 12.5 }}>
                No components have been extracted from this repository yet.
              </p>
            )}
          </section>
        </div>

        <aside className="g-card g-card--pad g-stack g-stack-14">
          <h2 className="g-label">
            <Building2 size={12} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            Repository profile
          </h2>
          <dl className="g-kv">
            <dt className="g-kv__k">Platform</dt>
            <dd>{sourceMeta.label}</dd>

            <dt className="g-kv__k">Owner team</dt>
            <dd>{repository.ownerTeam}</dd>

            <dt className="g-kv__k">Contact</dt>
            <dd>{repository.ownerContact ?? "—"}</dd>

            <dt className="g-kv__k">Access status</dt>
            <dd>
              <AccessBadge status={repository.accessStatus} />
            </dd>

            <dt className="g-kv__k">Primary language</dt>
            <dd>{repository.language ?? "—"}</dd>

            <dt className="g-kv__k">Stars</dt>
            <dd>
              {typeof repository.stars === "number" ? (
                <span className="g-row" style={{ gap: 5 }}>
                  <Star size={12} /> {repository.stars}
                </span>
              ) : (
                "—"
              )}
            </dd>

            <dt className="g-kv__k">Last updated</dt>
            <dd>{repository.lastUpdated ?? "—"}</dd>

            <dt className="g-kv__k">URL</dt>
            <dd style={{ wordBreak: "break-all" }}>
              <a
                className="g-mono"
                style={{ color: "var(--g-brand-2)", fontSize: 11.5 }}
                href={resolveRepositoryUrl(repository)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {resolveRepositoryUrl(repository)}
              </a>
            </dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
