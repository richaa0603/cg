import { motion } from "framer-motion";
import { useArchitecture } from "../hooks/useAIData";
import ArchitectureCard from "../components/ArchitectureCard";

export default function ArchitecturePage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const { status, data, error, retry } = useArchitecture(requirement);

  if (!requirement) return <div className="empty-panel">No requirement captured. Use the popup to Analyze first.</div>;
  if (status === "loading" || status === "idle") return <div className="cc-card"><div className="cc-skeleton cc-skeleton-title" /><div className="cc-skeleton cc-skeleton-line" /></div>;
  if (status === "error") return (
    <article className="cc-card">
      <h3>Unable to load architecture</h3>
      <p className="cc-card-copy">{error}</p>
      <button type="button" className="exec-retry-btn" onClick={retry}>Retry</button>
    </article>
  );

  const stack = data ? [data.frontend, data.backend, data.database, data.cloud] : [];
  const justification = data
    ? `${data.frontend} enables fast UI composition. ${data.backend} handles domain-centric APIs. ${data.database} provides relational integrity. ${data.cloud} delivers scalable managed infrastructure.`
    : "";

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="page-grid">
      <ArchitectureCard stack={stack} justification={justification} />
    </motion.section>
  );
}
