import { motion } from "framer-motion";

const phases = [
  { phase: "Phase 1", task: "Requirements & Design", complexity: "Medium" },
  { phase: "Phase 2", task: "Authentication", complexity: "High" },
  { phase: "Phase 3", task: "Employee Profiles", complexity: "Medium" },
  { phase: "Phase 4", task: "Leave Management", complexity: "High" },
  { phase: "Phase 5", task: "Reporting", complexity: "Medium" },
  { phase: "Phase 6", task: "Deployment", complexity: "Medium" },
];

export default function ImplementationPlanPage() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="page-grid"
    >
      {phases.map((item) => (
        <article key={item.phase} className="cc-card roadmap-card">
          <div className="roadmap-phase">{item.phase}</div>
          <h3>{item.task}</h3>
          <p className="cc-card-copy">Estimated Complexity: {item.complexity}</p>
        </article>
      ))}
    </motion.section>
  );
}
