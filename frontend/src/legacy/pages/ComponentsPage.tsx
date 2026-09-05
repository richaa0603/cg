import { motion } from "framer-motion";
import { useReusableComponents } from "../hooks/useAIData";
import ComponentCard from "../components/ComponentCard";

export default function ComponentsPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const { status, data, error, retry } = useReusableComponents(requirement);

  if (!requirement) return <div className="empty-panel">No requirement captured. Use the popup to Analyze first.</div>;
  if (status === "loading" || status === "idle") return <PageSkeleton />;
  if (status === "error") return <ErrorCard message={error!} retry={retry} />;
  if (!data?.length) return <div className="empty-panel">No reusable components identified for this requirement.</div>;

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="page-grid">
      {data.map((name) => (
        <ComponentCard key={name} name={name} description="" repositoriesUsing={0} reuseScore="" />
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
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  return (
    <article className="cc-card">
      <h3>Unable to load components</h3>
      <p className="cc-card-copy">{message}</p>
      <button type="button" className="exec-retry-btn" onClick={retry}>Retry</button>
    </article>
  );
}
