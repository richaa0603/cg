import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/executive": {
    title: "Executive Summary",
    subtitle: "AI-generated delivery intelligence across all dimensions.",
  },
  "/overview": {
    title: "Overview",
    subtitle: "Project summary, domain, and detected technologies.",
  },
  "/projects": {
    title: "Similar Projects",
    subtitle: "High-signal repositories discovered via GitHub Search API.",
  },
  "/components": {
    title: "Reusable Components",
    subtitle: "Reusable implementation blocks with confidence scoring.",
  },
  "/architecture": {
    title: "Architecture",
    subtitle: "Recommended delivery architecture with technology rationale.",
  },
  "/implementation-plan": {
    title: "Implementation Plan",
    subtitle: "Phased roadmap with complexity and execution focus.",
  },
  "/experts": {
    title: "Experts",
    subtitle: "Suggested domain and platform specialists.",
  },
  "/code-assets": {
    title: "Code Assets",
    subtitle: "Curated reusable code artifacts for acceleration.",
  },
  "/delivery-risks": {
    title: "Delivery Risks",
    subtitle: "Gaps and risks inferred from requirement analysis.",
  },
  "/knowledge-graph": {
    title: "Knowledge Graph",
    subtitle: "Requirement-to-capability dependency graph for implementation planning.",
  },
  "/copilot-chat": {
    title: "Copilot Chat",
    subtitle: "Interactive planning assistant for architecture, components, and delivery strategy.",
  },
};

export default function Navbar() {
  const { pathname } = useLocation();

  const copy = useMemo(() => {
    return titleMap[pathname] ?? titleMap["/overview"];
  }, [pathname]);

  return (
    <header className="navbar-shell">
      <div>
        <h1 className="navbar-title">{copy.title}</h1>
        <p className="navbar-subtitle">{copy.subtitle}</p>
      </div>
      <div className="navbar-chip">
        <Sparkles size={14} />
        Copilot Insights
      </div>
    </header>
  );
}
