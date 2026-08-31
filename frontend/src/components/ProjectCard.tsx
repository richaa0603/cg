import { Star } from "lucide-react";

interface ProjectCardProps {
  name: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  matchPercentage: number;
}

export default function ProjectCard({
  name,
  description,
  language,
  stars,
  url,
  matchPercentage,
}: ProjectCardProps) {
  return (
    <article className="cc-card">
      <div className="cc-card-head">
        <h3>{name}</h3>
        <span className="score-chip">{matchPercentage}% Match</span>
      </div>
      <p className="cc-card-copy">{description}</p>
      <div className="cc-card-meta">
        <span>{language}</span>
        <span className="stars-meta">
          <Star size={14} /> {stars.toLocaleString()}
        </span>
      </div>
      <a className="cc-link-button" href={url} target="_blank" rel="noreferrer">
        View Repository
      </a>
    </article>
  );
}
