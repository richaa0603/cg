import { ExternalLink, FileCode2, Star } from "lucide-react";

export type RepoSource = "organization" | "github" | "azure devops" | string;

interface ProjectCardProps {
  name: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  matchPercentage: number;
  source: RepoSource;
  matchedFiles: string[];
  explanation: string;
}

function badgeMeta(source: RepoSource): { label: string; className: string } {
  const normalized = source.toLowerCase();
  if (normalized === "organization" || normalized === "org") {
    return { label: "ORG", className: "source-badge source-badge-org" };
  }
  if (normalized === "azure devops" || normalized === "azuredevops") {
    return { label: "AZURE DEVOPS", className: "source-badge source-badge-azure" };
  }
  return { label: "GITHUB", className: "source-badge source-badge-github" };
}

export default function ProjectCard({
  name,
  description,
  language,
  stars,
  url,
  matchPercentage,
  source,
  matchedFiles,
  explanation,
}: ProjectCardProps) {
  const badge = badgeMeta(source);

  return (
    <article className="repo-card">
      <div className="repo-card-head">
        <div className="repo-card-title-row">
          <h3 className="repo-card-name">{name}</h3>
          <span className={badge.className}>{badge.label}</span>
        </div>
        <span className="score-chip">{matchPercentage}% Match</span>
      </div>

      {description && <p className="cc-card-copy">{description}</p>}

      {explanation && <p className="repo-card-explanation">{explanation}</p>}

      {matchedFiles.length > 0 && (
        <div className="matched-files-wrap">
          <span className="matched-files-label">
            <FileCode2 size={12} /> Matched Files
          </span>
          <div className="tag-row">
            {matchedFiles.map((file) => (
              <span key={file} className="tag-chip">{file}</span>
            ))}
          </div>
        </div>
      )}

      <div className="cc-card-meta">
        <span>{language}</span>
        <span className="stars-meta">
          <Star size={14} /> {stars.toLocaleString()}
        </span>
      </div>

      <a className="cc-link-button repo-open-btn" href={url} target="_blank" rel="noreferrer">
        Open Repository <ExternalLink size={13} />
      </a>
    </article>
  );
}
