import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Monitor,
  Shield,
  Settings,
  BookOpen,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/events", icon: Activity, label: "Events" },
  { to: "/alerts", icon: AlertTriangle, label: "Alerts" },
  { to: "/agents", icon: Monitor, label: "Agents" },
  { to: "/rules", icon: Shield, label: "Rules" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/guide", icon: BookOpen, label: "Guide & FAQ" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-14 bg-soc-surface border-r border-soc-border flex flex-col z-10 items-center">
      <div className="h-12 border-b border-soc-border w-full flex items-center justify-center">
        <Shield className="w-6 h-6 text-soc-accent" />
      </div>

      <nav className="flex-1 py-3 flex flex-col items-center gap-0.5 w-full px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center justify-center w-10 h-10 rounded-md transition-colors ${
                isActive
                  ? "bg-soc-accent/10 text-soc-accent border-l-2 border-soc-accent"
                  : "text-soc-muted hover:text-soc-text hover:bg-soc-card"
              }`
            }
          >
            <Icon className="w-4 h-4" />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
