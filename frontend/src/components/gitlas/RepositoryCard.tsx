import { ExternalLink, Star, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { openRepository } from "../../lib/platform";
import type { Repository } from "../../types/gitlas";
import { AccessBadge } from "./AccessBadge";
import { CapabilityChips } from "./CapabilityChip";
import { ExplanationPanel } from "./ExplanationPanel";
import { MatchScore } from "./MatchScore";
import { SourceBadge } from "./SourceBadge";

interface RepositoryCardProps {
  repository: Repository;
  onCapabilitySelect?: (capability: string) => void;
}

export function RepositoryCard({ repository, onCapabilitySelect }: RepositoryCardProps) {
  const navigate = useNavigate();

  return (
    <article className="g-card g-card--pad g-card--hover g-stack g-stack-14 g-fade-in">
      <header className="g-card__head">
        <div className="g-stack g-stack-6" style={{ minWidth: 0 }}>
          <div className="g-row g-row--wrap" style={{ gap: 8 }}>
            <SourceBadge source={repository.source} />
            <AccessBadge status={repository.accessStatus} />
          </div>
          <h3 className="g-card__title g-mono">{repository.repositoryName}</h3>
          <div className="g-row g-row--wrap g-faint" style={{ gap: 14, fontSize: 12 }}>
            <span className="g-row" style={{ gap: 5 }}>
              <Users size={12} /> {repository.ownerTeam}
            </span>
            {repository.language && <span>{repository.language}</span>}
            {typeof repository.stars === "number" && (
              <span className="g-row" style={{ gap: 5 }}>
                <Star size={12} /> {repository.stars}
              </span>
            )}
          </div>
        </div>
        <MatchScore score={repository.matchScore} />
      </header>

      <p className="g-card__desc">{repository.description}</p>

      <div className="g-stack g-stack-6">
        <span className="g-label">Capabilities</span>
        <CapabilityChips capabilities={repository.capabilities} max={5} onSelect={onCapabilitySelect} />
      </div>

      <ExplanationPanel explanation={repository.explanation} matchedFiles={repository.matchedFiles} />

      <div className="g-card__footer">
        <span className="g-faint" style={{ fontSize: 11.5 }}>
          {repository.lastUpdated ? `Updated ${repository.lastUpdated}` : "Indexed by Gitlas"}
        </span>
        <div className="g-row" style={{ gap: 8 }}>
          <button
            type="button"
            className="g-btn g-btn--sm"
            onClick={() => navigate(`/repository/${encodeURIComponent(repository.id)}`)}
          >
            Details
          </button>
          <button type="button" className="g-btn g-btn--primary g-btn--sm" onClick={() => openRepository(repository)}>
            <ExternalLink size={14} /> Open
          </button>
        </div>
      </div>
    </article>
  );
}
