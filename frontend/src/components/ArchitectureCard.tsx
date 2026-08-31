interface ArchitectureCardProps {
  stack: string[];
  justification: string;
}

export default function ArchitectureCard({
  stack,
  justification,
}: ArchitectureCardProps) {
  return (
    <article className="cc-card architecture-card">
      <div className="architecture-flow">
        {stack.map((layer, index) => (
          <div key={layer}>
            <div className="architecture-node">{layer}</div>
            {index < stack.length - 1 ? <div className="architecture-arrow">↓</div> : null}
          </div>
        ))}
      </div>
      <p className="cc-card-copy">{justification}</p>
    </article>
  );
}
