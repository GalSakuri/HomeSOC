import { Activity, AlertTriangle, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardSummary } from "../../types/events";
import { Card } from "../ui/card";

interface StatCardsProps {
  summary: DashboardSummary | null;
}

export function StatCards({ summary }: StatCardsProps) {
  const navigate = useNavigate();

  const hasAlerts = !!(summary?.total_alerts_open);

  const stats = [
    {
      label: "Events (24h)",
      value: summary?.total_events_24h ?? 0,
      icon: Activity,
      color: "text-primary",
      accent: "border-l-primary",
      to: "/events",
    },
    {
      label: "Open Alerts",
      value: summary?.total_alerts_open ?? 0,
      icon: AlertTriangle,
      color: hasAlerts ? "text-destructive" : "text-soc-success",
      accent: hasAlerts ? "border-l-destructive" : "border-l-soc-success",
      to: "/alerts",
    },
    {
      label: "Agents Online",
      value: `${summary?.agents_online ?? 0} / ${summary?.agents_total ?? 0}`,
      icon: Monitor,
      color: "text-soc-success",
      accent: "border-l-soc-success",
      to: "/agents",
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {stats.map(({ label, value, icon: Icon, color, accent, to }) => (
        <Card
          key={label}
          onClick={() => navigate(to)}
          className={`cursor-pointer border-l-2 ${accent} hover:bg-card/80 transition-all hover:shadow-md flex-1 flex flex-col justify-center`}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
