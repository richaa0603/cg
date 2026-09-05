import { NavLink } from "react-router-dom";
import {
  Activity,
  Blocks,
  Bot,
  BriefcaseBusiness,
  FileCode2,
  GitBranchPlus,
  Home,
  LayoutPanelTop,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const menu = [
  { label: "Executive Summary", to: "/executive", icon: Sparkles },
  { label: "Overview", to: "/overview", icon: Home },
  { label: "Similar Projects", to: "/projects", icon: BriefcaseBusiness },
  { label: "Reusable Components", to: "/components", icon: Blocks },
  { label: "Architecture", to: "/architecture", icon: LayoutPanelTop },
  { label: "Implementation Plan", to: "/implementation-plan", icon: Activity },
  { label: "Experts", to: "/experts", icon: Users },
  { label: "Code Assets", to: "/code-assets", icon: FileCode2 },
  { label: "Delivery Risks", to: "/delivery-risks", icon: ShieldAlert },
  { label: "Knowledge Graph", to: "/knowledge-graph", icon: GitBranchPlus },
  { label: "Copilot Chat", to: "/copilot-chat", icon: Bot },
];

export default function Sidebar() {
  return (
    <aside className="sidebar-shell">
      <motion.div
        className="sidebar-brand"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="sidebar-logo">CC</div>
        <div>
          <p className="sidebar-name">Consultant Copilot</p>
          <p className="sidebar-tag">GitHub Delivery Intelligence</p>
        </div>
      </motion.div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "sidebar-link is-active" : "sidebar-link"
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
