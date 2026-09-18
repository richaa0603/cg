import { useEffect, useState, type CSSProperties } from "react";
import { ALL_SOURCES, getSourceMeta } from "../../lib/platform";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width = "100%", height = 12, radius = 8, style }: SkeletonProps) {
  return (
    <span
      className="g-skeleton"
      style={{ display: "block", width, height, borderRadius: radius, ...style }}
    />
  );
}

export function RepositoryCardSkeleton() {
  return (
    <article className="g-card g-repository-card g-stack" aria-hidden="true">
      <header className="g-card__head">
        <div className="g-stack g-stack-6" style={{ flex: 1, minWidth: 0 }}>
          <div className="g-row" style={{ gap: 7, alignItems: "center" }}>
            <Skeleton width="48%" height={17} radius={6} />
            <Skeleton width={14} height={14} radius={4} />
          </div>
          <Skeleton width={96} height={13} radius={4} />
          <div className="g-row g-row--wrap" style={{ gap: 14 }}>
            <Skeleton width={110} height={12} radius={4} />
            <Skeleton width={60} height={12} radius={4} />
            <Skeleton width={45} height={12} radius={4} />
          </div>
        </div>
        <Skeleton width={88} height={24} radius={999} />
      </header>

      <div className="g-card__footer" style={{ marginTop: 6, paddingTop: 12 }}>
        <Skeleton width={78} height={28} radius={8} />
        <div className="g-row" style={{ gap: 8 }}>
          <Skeleton width={112} height={28} radius={8} />
        </div>
      </div>
    </article>
  );
}

const DEFAULT_STAGES = [
  "Querying enterprise capability index across GitHub, Azure DevOps & Salesforce…",
  "Computing semantic similarity & matching code references…",
  "Ranking repository readiness & scoring component reuse…",
];

interface LoadingGridProps {
  count?: number;
  label?: string;
  layout?: "list" | "cards";
  showPlatforms?: boolean;
  stages?: string[];
}

export function LoadingGrid({
  count = 3,
  label,
  layout = "list",
  showPlatforms = true,
  stages = DEFAULT_STAGES,
}: LoadingGridProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!stages || stages.length <= 1) return;
    const timer1 = setTimeout(() => setStageIndex(1), 280);
    const timer2 = setTimeout(() => setStageIndex(2), 580);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [stages]);

  const currentLabel = label ?? stages[Math.min(stageIndex, stages.length - 1)];

  return (
    <div className="g-stack g-stack-14" role="status" aria-live="polite">
      <div className="g-row g-row--between g-row--wrap g-loading-banner" style={{ gap: 10 }}>
        <div className="g-row" style={{ gap: 9 }}>
          <span className="g-spinner" aria-hidden="true" />
          <span className="g-loading-status" key={stageIndex}>
            {currentLabel}
          </span>
        </div>

        {showPlatforms && (
          <div className="g-row g-row--wrap" style={{ gap: 7 }}>
            {ALL_SOURCES.map((source) => {
              const meta = getSourceMeta(source);
              return (
                <span
                  key={source}
                  className="g-badge g-badge--loading"
                  style={{ "--src-color": meta.color } as CSSProperties}
                >
                  <span className="g-pulse-dot" />
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className={layout === "list" ? "g-repository-list" : "g-grid g-grid--cards"}>
        {Array.from({ length: count }, (_, i) => (
          <RepositoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
