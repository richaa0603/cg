import { ChevronDown, KeyRound, Lock, Send, Star, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { openRepository } from "../../lib/platform";
import { submitAccessRequest } from "../../services/gitlasClient";
import type { Repository } from "../../types/gitlas";
import { CapabilityChips } from "./CapabilityChip";
import { ExplanationPanel } from "./ExplanationPanel";
import { SourceBadge } from "./SourceBadge";

interface RepositoryCardProps {
  repository: Repository;
  onCapabilitySelect?: (capability: string) => void;
}

export function RepositoryCard({ repository, onCapabilitySelect }: RepositoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const requestAccess = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setRequestError(null);
    try {
      const response = await submitAccessRequest({
        repositoryId: repository.id,
        repositoryName: repository.repositoryName,
        ownerTeam: repository.ownerTeam,
        justification,
      });
      setTicketId(response.ticketId);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Access request could not be submitted");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="g-card g-repository-card g-stack g-fade-in">
      <header className="g-card__head">
        <div className="g-stack g-stack-6" style={{ minWidth: 0 }}>
          <div className="g-row" style={{ gap: 7, alignItems: "center" }}>
            <button
              type="button"
              className="g-repository-card__name g-card__title g-mono"
              onClick={() => openRepository(repository)}
              title={`Open ${repository.repositoryName}`}
            >
              {repository.repositoryName}
            </button>
            {repository.accessStatus !== "granted" && (
              <Lock size={14} className="g-repository-card__lock" aria-label="Access required" />
            )}
          </div>
          <span className="g-repository-card__score">Score: {Math.round(repository.matchScore)}%</span>
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
        <SourceBadge source={repository.source} />
      </header>

      <div className="g-row g-row--wrap" style={{ gap: 8 }}>
        <CapabilityChips capabilities={repository.capabilities} max={3} onSelect={onCapabilitySelect} />
      </div>

      {expanded && (
        <div className="g-repository-card__details g-stack g-stack-14">
          <p className="g-card__desc">{repository.description}</p>

          <div className="g-stack g-stack-6">
            <span className="g-label">Matching components</span>
            <CapabilityChips capabilities={repository.capabilities} onSelect={onCapabilitySelect} />
          </div>

          <ExplanationPanel explanation={repository.explanation} matchedFiles={repository.matchedFiles} />

          {requestOpen && !ticketId && (
            <form className="g-stack g-stack-10" onSubmit={requestAccess}>
              <label className="g-stack g-stack-6">
                <span className="g-label">Access justification</span>
                <textarea
                  className="g-textarea"
                  required
                  value={justification}
                  placeholder="How will you reuse this repository?"
                  onChange={(event) => setJustification(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="g-btn g-btn--primary g-btn--sm"
                disabled={submitting || !justification.trim()}
                style={{ alignSelf: "flex-start" }}
              >
                {submitting ? <span className="g-spinner" aria-hidden="true" /> : <Send size={14} />}
                {submitting ? "Submitting" : "Submit request"}
              </button>
              {requestError && (
                <p className="g-card__desc" role="alert" style={{ color: "var(--g-danger)" }}>
                  {requestError}
                </p>
              )}
            </form>
          )}

          {ticketId && (
            <p className="g-explain__body" role="status">
              Access request <strong className="g-mono">{ticketId}</strong> was sent to {repository.ownerTeam}.
            </p>
          )}
        </div>
      )}

      <div className="g-card__footer">
        <button
          type="button"
          className="g-btn g-btn--ghost g-btn--sm"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronDown size={15} className={expanded ? "g-chevron is-open" : "g-chevron"} />
          {expanded ? "Collapse" : "Expand"}
        </button>
        <div className="g-row g-row--wrap" style={{ gap: 8, justifyContent: "flex-end" }}>
          {repository.accessStatus !== "granted" && !ticketId && (
            <button
              type="button"
              className="g-btn g-btn--primary g-btn--sm"
              onClick={() => {
                setExpanded(true);
                setRequestOpen(true);
              }}
            >
              <KeyRound size={14} /> Request access
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
