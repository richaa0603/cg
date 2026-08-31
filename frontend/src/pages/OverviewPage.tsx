import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

function detectTechnologies(requirement: string): string[] {
  const text = requirement.toLowerCase();
  const candidates = [
    { keyword: "react", label: "React" },
    { keyword: ".net", label: ".NET" },
    { keyword: "postgres", label: "PostgreSQL" },
    { keyword: "azure", label: "Azure" },
    { keyword: "typescript", label: "TypeScript" },
  ];

  const detected = candidates
    .filter((item) => text.includes(item.keyword))
    .map((item) => item.label);

  return detected.length > 0 ? detected : ["React", ".NET", "PostgreSQL", "Azure"];
}

export default function OverviewPage() {
  const [requirement, setRequirement] = useState(localStorage.getItem("projectRequirement") ?? "");

  useEffect(() => {
    const onUpdate = () => {
      setRequirement(localStorage.getItem("projectRequirement") ?? "");
    };

    window.addEventListener("cc-context-updated", onUpdate as EventListener);
    return () => window.removeEventListener("cc-context-updated", onUpdate as EventListener);
  }, []);

  const technologies = useMemo(() => detectTechnologies(requirement), [requirement]);

  const summary = useMemo(() => {
    if (!requirement.trim()) {
      return "No requirement captured yet. Use the extension popup Analyze flow to hydrate this view.";
    }

    return `This initiative targets a delivery-ready platform with focus on scalable services, maintainable UI, and reusable modules. Requirement context: ${requirement.slice(0, 180)}${requirement.length > 180 ? "..." : ""}`;
  }, [requirement]);

  const domain = useMemo(() => {
    const text = requirement.toLowerCase();
    if (text.includes("hr") || text.includes("employee") || text.includes("payroll")) {
      return "HRMS Platform";
    }
    if (text.includes("insurance") || text.includes("claim")) {
      return "Insurance Platform";
    }
    return "Enterprise Platform";
  }, [requirement]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-grid"
    >
      <article className="cc-card">
        <h3>Project Requirement</h3>
        <p className="cc-card-copy">{requirement || "No requirement provided."}</p>
      </article>

      <article className="cc-card">
        <h3>Project Summary</h3>
        <p className="cc-card-copy">{summary}</p>
      </article>

      <article className="cc-card">
        <h3>Project Domain</h3>
        <p className="cc-card-copy">{domain}</p>
      </article>

      <article className="cc-card">
        <h3>Technologies Detected</h3>
        <div className="tag-row">
          {technologies.map((tech) => (
            <span key={tech} className="tag-chip">
              {tech}
            </span>
          ))}
        </div>
      </article>
    </motion.section>
  );
}
