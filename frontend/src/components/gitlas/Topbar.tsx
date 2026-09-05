import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";

const TITLES: { match: (path: string) => boolean; title: string; sub: string }[] = [
  { match: (p) => p === "/", title: "Discover", sub: "Find what already exists before you build it" },
  { match: (p) => p.startsWith("/search"), title: "Search Results", sub: "Ranked capability matches across your enterprise" },
  { match: (p) => p.startsWith("/repository"), title: "Repository Details", sub: "Ownership, stack, capabilities and access" },
  { match: (p) => p.startsWith("/components"), title: "Reusable Components", sub: "Extracted, scored and ready to adopt" },
  { match: (p) => p.startsWith("/access"), title: "Access Requests", sub: "Route requests to the owning team" },
];

export function Topbar() {
  const { pathname } = useLocation();
  const entry = TITLES.find((t) => t.match(pathname));

  return (
    <header className="g-topbar">
      <div className="g-stack">
        <span className="g-topbar__title">{entry?.title ?? "Gitlas"}</span>
        <span className="g-topbar__sub">{entry?.sub ?? "Enterprise Capability Discovery"}</span>
      </div>
      <span className="g-badge g-source-badge" style={{ "--src-color": "var(--g-brand-2)" } as CSSProperties}>
        <Sparkles size={12} /> AI ranking active
      </span>
    </header>
  );
}
