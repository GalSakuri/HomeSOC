import { AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, Severity } from "../../types/events";
import { useSettings } from "../../contexts/SettingsContext";
import { formatTime } from "../../utils/formatTime";
import { severityBadge } from "../../utils/severity";

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
}

const severityStyles: Record<Severity, string> = {
  critical: "border-l-soc-critical bg-soc-critical/5",
  high: "border-l-soc-danger bg-soc-danger/5",
  medium: "border-l-soc-warning bg-soc-warning/5",
  low: "border-l-soc-accent bg-soc-accent/5",
  info: "border-l-soc-muted bg-soc-muted/5",
};

export function AlertsPanel({ alerts, onAcknowledge }: AlertsPanelProps) {
  const { settings } = useSettings();

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-soc-text flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-soc-warning" />
          Active Alerts
        </h3>
        <span className="text-xs text-soc-muted">{alerts.length} open</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-soc-muted text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-soc-success opacity-50" />
            No active alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-2 rounded-r-lg p-3 ${severityStyles[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded ${severityBadge[alert.severity]}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs text-soc-muted">
                      {formatTime(alert.created_at, settings)}
                    </span>
                  </div>
                  <p className="text-sm text-soc-text truncate">
                    {alert.rule_name}
                  </p>
                  {alert.description && (
                    <p className="text-xs text-soc-muted mt-1 line-clamp-2">
                      {alert.description}
                    </p>
                  )}
                </div>
                {onAcknowledge && alert.status === "open" && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="text-xs text-soc-accent hover:text-soc-accent/80 px-2 py-1 rounded border border-soc-border hover:bg-soc-accent/10 transition-colors"
                  >
                    ACK
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
