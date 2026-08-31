import { motion } from "framer-motion";
import { useRisks } from "../hooks/useAIData";

export default function DeliveryRisksPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const { status, data, error, retry } = useRisks(requirement);

  if (!requirement) return <div className="empty-panel">No requirement captured. Use the popup to Analyze first.</div>;
  if (status === "loading" || status === "idle") return <PageSkeleton />;
  if (status === "error") return (
    <article className="cc-card">
      <h3>Unable to load risks</h3>
      <p className="cc-card-copy">{error}</p>
      <button type="button" className="exec-retry-btn" onClick={retry}>Retry</button>
    </article>
  );
  if (!data?.length) return <div className="empty-panel">No delivery risks identified.</div>;

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="page-grid">
      {data.map((risk) => (
        <article key={risk} className="cc-card risk-card">
          <h3>{risk}</h3>
          <p className="cc-card-copy">Add explicit scope for this capability to reduce downstream delivery risk.</p>
        </article>
      ))}
    </motion.section>
  );
}

function PageSkeleton() {
  return (
    <div className="page-grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="cc-card risk-card"><div className="cc-skeleton cc-skeleton-title" /><div className="cc-skeleton cc-skeleton-line short" /></div>
      ))}
    </div>
  );
}
