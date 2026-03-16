import { Activity, AlertTriangle, Monitor, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSummary } from "../../types/events";

interface StatCardsProps {
  summary: DashboardSummary | null;
}

export function StatCards({ summary }: StatCardsProps) {
  const navigate = useNavigate();

  const stats = [
    {
      label: "Events (24h)",
      value: summary?.total_events_24h ?? 0,
      icon: Activity,
      color: "text-soc-accent",
      bg: "bg-soc-accent/10",
      to: "/events",
    },
    {
      label: "Open Alerts",
      value: summary?.total_alerts_open ?? 0,
      icon: AlertTriangle,
      color: summary?.total_alerts_open ? "text-soc-danger" : "text-soc-success",
      bg: summary?.total_alerts_open ? "bg-soc-danger/10" : "bg-soc-success/10",
      to: "/alerts",
    },
    {
      label: "Agents Online",
      value: `${summary?.agents_online ?? 0} / ${summary?.agents_total ?? 0}`,
      icon: Monitor,
      color: "text-soc-success",
      bg: "bg-soc-success/10",
      to: "/agents",
    },
    {
      label: "Detection Rules",
      value: summary?.rules_count ?? 0,
      icon: Shield,
      color: "text-soc-warning",
      bg: "bg-soc-warning/10",
      to: "/rules",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, bg, to }) => (
        <div
          key={label}
          onClick={() => navigate(to)}
          className="bg-soc-card border border-soc-border rounded-xl p-4 cursor-pointer hover:border-soc-accent/40 hover:bg-soc-card/80 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-soc-muted uppercase tracking-wider">
              {label}
            </span>
            <div className={`${bg} p-1.5 rounded-lg`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-soc-text">{value}</p>
        </div>
      ))}
    </div>
  );
}
