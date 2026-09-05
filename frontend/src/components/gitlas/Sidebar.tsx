import { Blocks, KeyRound, Radar, ScanSearch, Telescope } from "lucide-react";
import { NavLink } from "react-router-dom";
import { GitlasLogo } from "./GitlasLogo";

const PRIMARY_NAV = [
  { to: "/", label: "Discover", icon: Telescope, end: true },
  { to: "/search", label: "Search Results", icon: ScanSearch, end: false },
  { to: "/components", label: "Reusable Components", icon: Blocks, end: false },
  { to: "/access", label: "Access Requests", icon: KeyRound, end: false },
];

export function Sidebar() {
  return (
    <aside className="g-sidebar">
      <NavLink to="/" aria-label="Gitlas home">
        <GitlasLogo />
      </NavLink>

      <nav className="g-sidebar__nav" aria-label="Primary">
        <span className="g-sidebar__section">Platform</span>
        {PRIMARY_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? "g-navlink is-active" : "g-navlink")}
            title={label}
          >
            <Icon size={16} strokeWidth={2} />
            <span className="g-sidebar__labels">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="g-sidebar__footer">
        <div className="g-row" style={{ gap: 8, marginBottom: 6 }}>
          <Radar size={14} style={{ color: "var(--g-brand-2)" }} />
          <strong style={{ fontSize: 12, color: "var(--g-text)" }}>3 platforms connected</strong>
        </div>
        GitHub · Azure DevOps · Salesforce
      </div>
    </aside>
  );
}
