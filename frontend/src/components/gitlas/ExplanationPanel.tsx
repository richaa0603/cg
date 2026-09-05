import { Sparkles } from "lucide-react";
import type { CodeReference } from "../../types/gitlas";

interface ExplanationPanelProps {
  explanation: string;
  matchedFiles?: CodeReference[];
  title?: string;
}

export function ExplanationPanel({ explanation, matchedFiles = [], title = "Why this matches" }: ExplanationPanelProps) {
  if (!explanation && matchedFiles.length === 0) return null;

  return (
    <section className="g-explain">
      <h3 className="g-explain__head">
        <Sparkles size={13} strokeWidth={2.4} />
        {title}
      </h3>
      {explanation && <p className="g-explain__body">{explanation}</p>}
      {matchedFiles.length > 0 && (
        <ul className="g-explain__files">
          {matchedFiles.map((f) => (
            <li key={f.path} className="g-explain__file">
              <code className="g-mono">{f.path}</code>
              {f.reason && <span className="g-faint">— {f.reason}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
