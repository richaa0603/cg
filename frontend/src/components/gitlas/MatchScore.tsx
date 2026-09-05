import type { CSSProperties } from "react";

interface MatchScoreProps {
  score: number;
  label?: string;
}

function ringColor(score: number): string {
  if (score >= 80) return "var(--g-ok)";
  if (score >= 60) return "var(--g-brand-2)";
  if (score >= 40) return "var(--g-warn)";
  return "var(--g-text-faint)";
}

export function MatchScore({ score, label = "Match" }: MatchScoreProps) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const style = { "--pct": pct, "--ring-color": ringColor(pct) } as CSSProperties;

  return (
    <div className="g-score" title={`${pct}% match to your requirement`}>
      <div className="g-score__ring" style={style} role="img" aria-label={`${pct} percent match`}>
        <span className="g-score__value">{pct}</span>
      </div>
      <span className="g-score__label">{label}</span>
    </div>
  );
}

interface ConfidenceMeterProps {
  value: number;
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="g-stack g-stack-6">
      <div className="g-row g-row--between">
        <span className="g-label">Confidence</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{pct}%</span>
      </div>
      <div className="g-meter">
        <div className="g-meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
