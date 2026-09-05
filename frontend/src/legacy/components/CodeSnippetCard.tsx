interface CodeSnippetCardProps {
  assetName: string;
  codeType: string;
  language: string;
  repository: string;
  reuseScore: string;
  githubLink: string;
}

export default function CodeSnippetCard({
  assetName,
  codeType,
  language,
  repository,
  reuseScore,
  githubLink,
}: CodeSnippetCardProps) {
  return (
    <article className="cc-card">
      <h3>{assetName}</h3>
      <div className="cc-card-meta">
        <span>{codeType}</span>
        <span>{language}</span>
      </div>
      <div className="cc-card-meta">
        <span>{repository}</span>
        <span className="score-chip">Reuse: {reuseScore}</span>
      </div>
      <a className="cc-link-button" href={githubLink} target="_blank" rel="noreferrer">
        GitHub Link
      </a>
    </article>
  );
}
