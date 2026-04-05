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
    <aside className="fixed left-0 top-0 h-screen w-56 bg-soc-surface border-r border-soc-border flex flex-col z-10">
      <div className="px-4 py-5 border-b border-soc-border">
        <div className="flex items-center gap-2">
          <Shield className="w-7 h-7 text-soc-accent" />
          <div>
            <h1 className="text-lg font-bold text-soc-text leading-tight">HomeSOC</h1>
            <p className="text-[11px] text-soc-muted">Security Operations</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-soc-accent/10 text-soc-accent font-medium border-l-2 border-soc-accent pl-2.5"
                  : "text-soc-muted hover:text-soc-text hover:bg-soc-card"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-soc-border">
        <p className="text-[10px] text-soc-muted">HomeSOC v0.1.0</p>
      </div>
    </aside>
  );
}
