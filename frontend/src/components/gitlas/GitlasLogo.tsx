import { GitBranch } from "lucide-react";

interface GitlasLogoProps {
  size?: "sm" | "lg";
  showWordmark?: boolean;
  tagline?: string;
}

export function GitlasLogo({ size = "sm", showWordmark = true, tagline }: GitlasLogoProps) {
  return (
    <div className="g-brand">
      <span className={`g-brand__mark${size === "lg" ? " g-brand__mark--lg" : ""}`} aria-hidden="true">
        <GitBranch size={size === "lg" ? 28 : 20} strokeWidth={2.2} />
      </span>
      {showWordmark && (
        <span className="g-stack g-sidebar__labels">
          <span className="g-brand__name">Gitlas</span>
          <span className="g-brand__tag">{tagline ?? "Capability Discovery"}</span>
        </span>
      )}
    </div>
  );
}
