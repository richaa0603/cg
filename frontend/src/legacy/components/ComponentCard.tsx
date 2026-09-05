interface ComponentCardProps {
  name: string;
  description: string;
  repositoriesUsing: number;
  reuseScore: string;
}

export default function ComponentCard({
  name,
  description,
  repositoriesUsing,
  reuseScore,
}: ComponentCardProps) {
  return (
    <article className="cc-card">
      <h3>{name}</h3>
      <p className="cc-card-copy">{description}</p>
      <div className="cc-card-meta">
        <span>Repos using: {repositoriesUsing}</span>
        <span className="score-chip">Reuse Score: {reuseScore}</span>
      </div>
    </article>
  );
}
