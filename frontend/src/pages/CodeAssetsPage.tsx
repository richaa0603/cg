import { motion } from "framer-motion";
import CodeSnippetCard from "../components/CodeSnippetCard";

const assets = [
  {
    assetName: "JWT Middleware",
    codeType: "Middleware",
    language: "C#",
    repository: "org/hrms-platform",
    reuseScore: "94%",
    githubLink: "https://github.com/search?q=jwt+middleware+dotnet&type=repositories",
  },
  {
    assetName: "File Upload API",
    codeType: "REST API",
    language: "TypeScript",
    repository: "org/document-service",
    reuseScore: "88%",
    githubLink: "https://github.com/search?q=file+upload+api+typescript&type=repositories",
  },
  {
    assetName: "Employee CRUD Service",
    codeType: "Domain Service",
    language: "C#",
    repository: "org/employee-core",
    reuseScore: "91%",
    githubLink: "https://github.com/search?q=employee+crud+service+dotnet&type=repositories",
  },
  {
    assetName: "Approval Workflow Implementation",
    codeType: "Workflow Engine",
    language: "TypeScript",
    repository: "org/workflow-center",
    reuseScore: "86%",
    githubLink: "https://github.com/search?q=approval+workflow+typescript&type=repositories",
  },
  {
    assetName: "Notification Service",
    codeType: "Messaging Service",
    language: "C#",
    repository: "org/notify-hub",
    reuseScore: "93%",
    githubLink: "https://github.com/search?q=notification+service+dotnet&type=repositories",
  },
];

function inferAssetFocus(requirement: string): string[] {
  const text = requirement.toLowerCase();
  const focus: string[] = [];

  if (text.includes("attendance")) {
    focus.push("Attendance domain entities and APIs");
  }
  if (text.includes("dashboard") || text.includes("report")) {
    focus.push("Dashboard widgets and reporting adapters");
  }
  if (text.includes("approval") || text.includes("workflow")) {
    focus.push("Approval workflow state machine");
  }
  if (text.includes("auth") || text.includes("role")) {
    focus.push("Authentication and role-permission checks");
  }

  return focus.length > 0 ? focus : ["API scaffolds", "Validation middleware", "Observability hooks"];
}

export default function CodeAssetsPage() {
  const requirement = localStorage.getItem("projectRequirement") ?? "";
  const focusAreas = inferAssetFocus(requirement);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="page-grid"
    >
      <article className="cc-card">
        <h3>Asset Focus Areas</h3>
        <div className="tag-row">
          {focusAreas.map((focus) => (
            <span className="tag-chip" key={focus}>
              {focus}
            </span>
          ))}
        </div>
      </article>

      {assets.map((asset) => (
        <CodeSnippetCard key={asset.assetName} {...asset} />
      ))}
    </motion.section>
  );
}
