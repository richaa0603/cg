import { motion } from "framer-motion";
import { useSimilarProjects } from "../hooks/useAIData";
import ProjectCard from "../components/ProjectCard";

export default function ProjectsPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const { status, data, error, retry } = useSimilarProjects(requirement);

  if (!requirement) return <div className="empty-panel">No requirement captured. Use the popup to Analyze first.</div>;
  if (status === "loading" || status === "idle") return <PageSkeleton />;
  if (status === "error") return <ErrorCard message={error!} retry={retry} />;
  if (!data?.length) return <div className="empty-panel">No similar projects found for this requirement.</div>;

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="page-grid">
      {data.map((p) => (
        <ProjectCard key={p.repository} name={p.repository} description="" language={p.language} stars={p.stars} url={p.url ?? ""} matchPercentage={p.score} />
      ))}
    </motion.section>
  );
}

function PageSkeleton() {
  return (
    <div className="page-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="cc-card">
          <div className="cc-skeleton cc-skeleton-title" />
          <div className="cc-skeleton cc-skeleton-line" />
          <div className="cc-skeleton cc-skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  return (
    <article className="cc-card">
      <h3>Unable to load results</h3>
      <p className="cc-card-copy">{message}</p>
      <button type="button" className="exec-retry-btn" onClick={retry}>Retry</button>
    </article>
  );
}
