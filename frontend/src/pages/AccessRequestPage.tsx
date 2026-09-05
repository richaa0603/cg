import { BadgeCheck, ExternalLink, KeyRound, Mail, Send, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AccessBadge } from "../components/gitlas/AccessBadge";
import { SourceBadge } from "../components/gitlas/SourceBadge";
import { MOCK_REPOSITORIES } from "../data/mockData";
import { openRepository } from "../lib/platform";
import { submitAccessRequest } from "../services/gitlasClient";
import type { Repository } from "../types/gitlas";

export function AccessRequestPage() {
  const { repositoryId } = useParams();
  const navigate = useNavigate();

  const selected = useMemo<Repository | null>(() => {
    if (!repositoryId) return null;
    const decoded = decodeURIComponent(repositoryId);
    return MOCK_REPOSITORIES.find((r) => r.id === decoded) ?? null;
  }, [repositoryId]);

  if (selected) {
    return <AccessRequestForm repository={selected} onDone={() => navigate("/access")} />;
  }

  return (
    <div className="g-stack g-stack-20">
      <div className="g-stack g-stack-10">
        <h1 className="g-page-title">Access Requests</h1>
        <p className="g-page-sub">
          Every indexed repository is mapped to an owning team. Request access or contact the owners directly — Gitlas
          routes the request to the correct approver for that platform.
        </p>
      </div>

      <div className="g-grid g-grid--cards">
        {MOCK_REPOSITORIES.map((repo) => (
          <article key={repo.id} className="g-card g-card--pad g-card--hover g-stack g-stack-14">
            <header className="g-stack g-stack-6">
              <div className="g-row g-row--wrap" style={{ gap: 8 }}>
                <SourceBadge source={repo.source} />
                <AccessBadge status={repo.accessStatus} />
              </div>
              <h3 className="g-card__title g-mono" style={{ fontSize: 14.5 }}>
                {repo.repositoryName}
              </h3>
            </header>

            <dl className="g-kv" style={{ gridTemplateColumns: "110px minmax(0,1fr)", fontSize: 12.5 }}>
              <dt className="g-kv__k">Owner team</dt>
              <dd className="g-row" style={{ gap: 6 }}>
                <Users size={12} /> {repo.ownerTeam}
              </dd>
              <dt className="g-kv__k">Contact</dt>
              <dd style={{ wordBreak: "break-all" }}>{repo.ownerContact ?? "—"}</dd>
            </dl>

            <div className="g-card__footer">
              {repo.accessStatus === "granted" ? (
                <span className="g-row g-faint" style={{ gap: 6, fontSize: 12 }}>
                  <BadgeCheck size={14} style={{ color: "var(--g-ok)" }} /> You already have access
                </span>
              ) : (
                <Link className="g-btn g-btn--primary g-btn--sm" to={`/access/${encodeURIComponent(repo.id)}`}>
                  <KeyRound size={13} /> Request access
                </Link>
              )}
              <div className="g-row" style={{ gap: 8 }}>
                {repo.ownerContact && (
                  <a className="g-btn g-btn--sm" href={`mailto:${repo.ownerContact}`}>
                    <Mail size={13} /> Contact
                  </a>
                )}
                <button type="button" className="g-btn g-btn--sm" onClick={() => openRepository(repo)}>
                  <ExternalLink size={13} /> Open
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

interface AccessRequestFormProps {
  repository: Repository;
  onDone: () => void;
}

function AccessRequestForm({ repository, onDone }: AccessRequestFormProps) {
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { ticketId: id } = await submitAccessRequest({
        repositoryId: repository.id,
        repositoryName: repository.repositoryName,
        ownerTeam: repository.ownerTeam,
        justification,
      });
      setTicketId(id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="g-stack g-stack-20" style={{ maxWidth: 720 }}>
      <button type="button" className="g-btn g-btn--ghost g-btn--sm" onClick={onDone} style={{ alignSelf: "flex-start" }}>
        ← All access requests
      </button>

      <section className="g-card g-card--pad g-stack g-stack-20 g-fade-in">
        <header className="g-stack g-stack-10">
          <div className="g-row g-row--wrap" style={{ gap: 8 }}>
            <SourceBadge source={repository.source} />
            <AccessBadge status={repository.accessStatus} />
          </div>
          <h1 className="g-page-title" style={{ fontSize: 20 }}>
            Request access
          </h1>
          <p className="g-mono g-muted" style={{ fontSize: 13, wordBreak: "break-word" }}>
            {repository.repositoryName}
          </p>
        </header>

        <dl className="g-kv">
          <dt className="g-kv__k">Repository</dt>
          <dd className="g-mono" style={{ wordBreak: "break-word" }}>
            {repository.repositoryName}
          </dd>
          <dt className="g-kv__k">Owner team</dt>
          <dd>{repository.ownerTeam}</dd>
          <dt className="g-kv__k">Access status</dt>
          <dd>
            <AccessBadge status={repository.accessStatus} />
          </dd>
        </dl>

        {ticketId ? (
          <div className="g-explain g-stack g-stack-10">
            <h2 className="g-explain__head">
              <BadgeCheck size={14} /> Request submitted
            </h2>
            <p className="g-explain__body">
              Ticket <strong className="g-mono">{ticketId}</strong> has been routed to {repository.ownerTeam}. You will be
              notified once an approver responds.
            </p>
            <div className="g-row" style={{ gap: 8 }}>
              <button type="button" className="g-btn g-btn--primary g-btn--sm" onClick={onDone}>
                Done
              </button>
              {repository.ownerContact && (
                <a className="g-btn g-btn--sm" href={`mailto:${repository.ownerContact}`}>
                  <Mail size={13} /> Contact team
                </a>
              )}
            </div>
          </div>
        ) : (
          <form className="g-stack g-stack-14" onSubmit={submit}>
            <label className="g-stack g-stack-6">
              <span className="g-label">Business justification</span>
              <textarea
                className="g-textarea"
                required
                value={justification}
                placeholder="Explain which capability you intend to reuse and for which initiative."
                onChange={(e) => setJustification(e.target.value)}
              />
            </label>
            <div className="g-row g-row--wrap" style={{ gap: 10 }}>
              <button type="submit" className="g-btn g-btn--primary" disabled={submitting || !justification.trim()}>
                {submitting ? <span className="g-spinner" aria-hidden="true" /> : <Send size={15} />}
                {submitting ? "Submitting…" : "Request access"}
              </button>
              {repository.ownerContact && (
                <a className="g-btn" href={`mailto:${repository.ownerContact}`}>
                  <Mail size={15} /> Contact team
                </a>
              )}
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
