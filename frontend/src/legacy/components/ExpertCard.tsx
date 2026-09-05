interface ExpertCardProps {
  name: string;
  title: string;
  contributionScore: string;
  repositoriesContributed: number;
  tags: string[];
}

export default function ExpertCard({
  name,
  title,
  contributionScore,
  repositoriesContributed,
  tags,
}: ExpertCardProps) {
  return (
    <article className="cc-card">
      <h3>{name}</h3>
      <p className="cc-card-copy">{title}</p>
      <div className="cc-card-meta">
        <span>Contribution: {contributionScore}</span>
        <span>Repositories: {repositoriesContributed}</span>
      </div>
      <div className="tag-row">
        {tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
