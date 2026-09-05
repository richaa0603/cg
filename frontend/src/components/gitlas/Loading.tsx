interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: number;
}

export function Skeleton({ width = "100%", height = 12, radius = 8 }: SkeletonProps) {
  return <span className="g-skeleton" style={{ display: "block", width, height, borderRadius: radius }} />;
}

export function RepositoryCardSkeleton() {
  return (
    <article className="g-card g-card--pad g-stack g-stack-14" aria-hidden="true">
      <div className="g-row g-row--between g-row--top">
        <div className="g-stack g-stack-10" style={{ flex: 1 }}>
          <Skeleton width="62%" height={16} />
          <Skeleton width="34%" height={11} />
        </div>
        <Skeleton width={52} height={52} radius={26} />
      </div>
      <Skeleton height={11} />
      <Skeleton width="82%" height={11} />
      <div className="g-row" style={{ gap: 6 }}>
        <Skeleton width={78} height={22} radius={999} />
        <Skeleton width={96} height={22} radius={999} />
        <Skeleton width={64} height={22} radius={999} />
      </div>
      <Skeleton height={58} radius={12} />
    </article>
  );
}

interface LoadingGridProps {
  count?: number;
  label?: string;
}

export function LoadingGrid({ count = 4, label = "Scanning connected platforms…" }: LoadingGridProps) {
  return (
    <div className="g-stack g-stack-14" role="status" aria-live="polite">
      <div className="g-row g-faint" style={{ fontSize: 12.5 }}>
        <span className="g-spinner" aria-hidden="true" />
        {label}
      </div>
      <div className="g-grid g-grid--cards">
        {Array.from({ length: count }, (_, i) => (
          <RepositoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
