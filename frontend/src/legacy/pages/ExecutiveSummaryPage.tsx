import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAIContext } from "../hooks/useAIData";
import { generateExecutiveSummary, isGeminiEnabled } from "../services/geminiService";
import type { AIContext } from "../services/aiClient";

const DELIVERY_PHASES = [
  { phase: "Phase 1", label: "Requirements & Discovery" },
  { phase: "Phase 2", label: "Architecture & Design" },
  { phase: "Phase 3", label: "Backend Services" },
  { phase: "Phase 4", label: "Frontend Development" },
  { phase: "Phase 5", label: "Testing & QA" },
  { phase: "Phase 6", label: "Deployment & Go-Live" },
];

function healthScore(ctx: AIContext): number {
  const riskPenalty = Math.min(ctx.risks.length * 7, 42);
  const componentBonus = Math.min(ctx.components.length * 3, 18);
  const projectBonus = ctx.projects.length > 0 ? 10 : 0;
  return Math.max(0, Math.min(100, 72 + componentBonus + projectBonus - riskPenalty));
}

function healthColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

function Skeleton() {
  return (
    <div className="exec-skeleton">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="cc-card exec-skel-card">
          <div className="cc-skeleton cc-skeleton-title" />
          <div className="cc-skeleton cc-skeleton-line" />
          <div className="cc-skeleton cc-skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

function ErrorPanel({ message, retry }: { message: string; retry: () => void }) {
  return (
    <article className="cc-card exec-error">
      <h3>Unable to Load AI Insights</h3>
      <p className="cc-card-copy">{message}</p>
      <button type="button" className="exec-retry-btn" onClick={retry}>
        Retry
      </button>
    </article>
  );
}

function EmptyPanel() {
  return (
    <article className="empty-panel">
      <p>No requirement captured yet. Use the extension popup and click Analyze.</p>
    </article>
  );
}

export default function ExecutiveSummaryPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const { status, ctx, error, retry } = useAIContext(requirement);

  const [geminiMd, setGeminiMd] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "success" || !ctx || !isGeminiEnabled()) return;
    setGeminiLoading(true);
    generateExecutiveSummary(requirement, ctx)
      .then((md) => { setGeminiMd(md); setGeminiLoading(false); })
      .catch((err: unknown) => {
        setGeminiError(err instanceof Error ? err.message : String(err));
        setGeminiLoading(false);
      });
  }, [status, ctx, requirement]);

  if (!requirement) return <EmptyPanel />;
  if (status === "loading" || status === "idle") return <Skeleton />;
  if (status === "error") return <ErrorPanel message={error ?? "Unknown error"} retry={retry} />;
  if (!ctx) return null;

  const score = healthScore(ctx);
  const scoreColor = healthColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="exec-grid"
    >
      {/* Health Score */}
      <article className="cc-card exec-health-card">
        <h3>Project Health Score</h3>
        <div className="exec-score-ring" style={{ "--score-color": scoreColor } as React.CSSProperties}>
          <span className="exec-score-value" style={{ color: scoreColor }}>{score}</span>
          <span className="exec-score-denom">/&nbsp;100</span>
        </div>
        <p className="cc-card-copy exec-score-label">
          {score >= 80 ? "Well-scoped. Proceed with delivery." : score >= 60 ? "Moderate gaps. Review risks before sprint." : "High risk. Address gaps before proceeding."}
        </p>
      </article>

      {/* Recommended Stack */}
      <article className="cc-card">
        <h3>Recommended Stack</h3>
        <div className="exec-stack-grid">
          {Object.entries(ctx.architecture).map(([layer, tech]) => (
            <div key={layer} className="exec-stack-item">
              <span className="exec-stack-layer">{layer}</span>
              <span className="exec-stack-tech">{tech}</span>
            </div>
          ))}
        </div>
      </article>

      {/* Top Reusable Components */}
      <article className="cc-card">
        <h3>Top Reusable Components</h3>
        <div className="tag-row exec-comp-row">
          {ctx.components.slice(0, 8).map((comp) => (
            <span key={comp} className="exec-comp-chip">{comp}</span>
          ))}
        </div>
        {ctx.components.length === 0 && (
          <p className="cc-card-copy">No components identified yet.</p>
        )}
      </article>

      {/* Critical Risks */}
      <article className="cc-card">
        <h3>Critical Risks</h3>
        <ul className="exec-risk-list">
          {ctx.risks.slice(0, 6).map((risk) => (
            <li key={risk} className="exec-risk-item">
              <span className="exec-risk-dot" />
              {risk}
            </li>
          ))}
        </ul>
        {ctx.risks.length === 0 && <p className="cc-card-copy">No critical risks detected.</p>}
      </article>

      {/* Delivery Timeline */}
      <article className="cc-card exec-timeline-card">
        <h3>Delivery Timeline</h3>
        <div className="exec-timeline">
          {DELIVERY_PHASES.map((item, idx) => (
            <div key={item.phase} className="exec-phase">
              <div className="exec-phase-dot">{idx + 1}</div>
              <div className="exec-phase-info">
                <span className="exec-phase-label">{item.phase}</span>
                <span className="exec-phase-name">{item.label}</span>
              </div>
              {idx < DELIVERY_PHASES.length - 1 && <div className="exec-phase-connector" />}
            </div>
          ))}
        </div>
      </article>

      {/* Top Similar Projects */}
      {ctx.projects.length > 0 && (
        <article className="cc-card">
          <h3>Top Similar Projects</h3>
          <div className="exec-project-list">
            {ctx.projects.slice(0, 5).map((p) => (
              <div key={p.repository} className="exec-project-row">
                <a
                  href={p.url ?? `https://github.com/${p.repository}`}
                  target="_blank"
                  rel="noreferrer"
                  className="exec-project-name"
                >
                  {p.repository}
                </a>
                <div className="exec-project-meta">
                  <span className="tag-chip">{p.language}</span>
                  <span className="score-chip">{p.score}% match</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Recommended Experts */}
      {ctx.experts.length > 0 && (
        <article className="cc-card">
          <h3>Recommended Experts</h3>
          <div className="exec-experts">
            {ctx.experts.slice(0, 5).map((e) => (
              <div key={e.name} className="exec-expert-row">
                <span className="exec-expert-name">{e.name}</span>
                <div className="exec-expert-bar-wrap">
                  <div className="exec-expert-bar" style={{ width: `${e.score}%` }} />
                </div>
                <span className="exec-expert-score">{e.score}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Gemini Executive Summary */}
      {isGeminiEnabled() && (
        <article className="cc-card exec-gemini-card">
          <h3>AI Executive Briefing</h3>
          {geminiLoading && <p className="cc-card-copy">Generating executive summary…</p>}
          {geminiError && <p className="cc-card-copy" style={{ color: "#f87171" }}>{geminiError}</p>}
          {geminiMd && (
            <div
              className="exec-gemini-content"
              dangerouslySetInnerHTML={{ __html: geminiMarkdownToHtml(geminiMd) }}
            />
          )}
        </article>
      )}
    </motion.div>
  );
}

// Lightweight Markdown → HTML (headings, bold, lists only — no external dep needed)
function geminiMarkdownToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h5>$1</h5>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/>")
    .replace(/\n/g, " ");
}
