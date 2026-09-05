import type { CSSProperties } from "react";
import { getSourceMeta } from "../../lib/platform";

interface SourceBadgeProps {
  source: string;
  compact?: boolean;
}

export function SourceBadge({ source, compact = false }: SourceBadgeProps) {
  const meta = getSourceMeta(source);
  const style = { "--src-color": meta.color } as CSSProperties;

  return (
    <span className="g-badge g-source-badge" style={style} title={`Source: ${meta.label}`}>
      <span className="g-source-badge__dot" aria-hidden="true" />
      {compact ? meta.short : meta.label}
    </span>
  );
}
