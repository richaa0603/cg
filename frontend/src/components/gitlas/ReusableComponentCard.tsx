import { ExternalLink, Puzzle } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReusableComponent } from "../../types/gitlas";
import { ConfidenceMeter } from "./MatchScore";
import { SourceBadge } from "./SourceBadge";

interface ReusableComponentCardProps {
  component: ReusableComponent;
}

export function ReusableComponentCard({ component }: ReusableComponentCardProps) {
  return (
    <article className="g-card g-card--pad g-card--hover g-stack g-stack-14 g-fade-in">
      <header className="g-row g-row--top" style={{ gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 38,
            height: 38,
            flex: "0 0 38px",
            borderRadius: 11,
            background: "rgba(109,94,252,0.13)",
            border: "1px solid rgba(109,94,252,0.3)",
            color: "#a99cff",
          }}
        >
          <Puzzle size={18} />
        </span>
        <div className="g-stack g-stack-4" style={{ minWidth: 0, flex: 1 }}>
          <h3 className="g-card__title g-mono" style={{ fontSize: 14.5 }}>
            {component.name}
          </h3>
          <div className="g-row g-row--wrap" style={{ gap: 6 }}>
            <span className="g-chip">{component.category}</span>
            <SourceBadge source={component.source} compact />
            {component.language && <span className="g-chip g-chip--tech">{component.language}</span>}
          </div>
        </div>
      </header>

      <p className="g-card__desc">{component.description}</p>

      <ConfidenceMeter value={component.confidence} />

      <div className="g-card__footer">
        <Link
          to={`/repository/${encodeURIComponent(component.repositoryId)}`}
          className="g-faint g-mono"
          style={{ fontSize: 11.5 }}
          title={component.repositoryName}
        >
          {component.repositoryName}
        </Link>
        <a
          className="g-btn g-btn--sm"
          href={component.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={13} /> View source
        </a>
      </div>
    </article>
  );
}
