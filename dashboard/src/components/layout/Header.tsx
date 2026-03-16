import { Wifi, WifiOff, Loader2, Pause } from "lucide-react";
import type { ConnectionStatus } from "../../hooks/useWebSocket";

interface HeaderProps {
  status: ConnectionStatus;
  onToggle: () => void;
}

const statusConfig: Record<
  ConnectionStatus,
  { icon: React.ReactNode; label: string; border: string; hover: string; text: string }
> = {
  live: {
    icon: <Wifi className="w-3.5 h-3.5 text-soc-success" />,
    label: "Live",
    border: "border-soc-success/30",
    hover: "hover:bg-soc-success/10",
    text: "text-soc-success",
  },
  connecting: {
    icon: <Loader2 className="w-3.5 h-3.5 text-soc-warning animate-spin" />,
    label: "Connecting…",
    border: "border-soc-warning/30",
    hover: "hover:bg-soc-warning/10",
    text: "text-soc-warning",
  },
  paused: {
    icon: <Pause className="w-3.5 h-3.5 text-soc-warning" />,
    label: "Paused",
    border: "border-soc-warning/30",
    hover: "hover:bg-soc-warning/10",
    text: "text-soc-warning",
  },
  disconnected: {
    icon: <WifiOff className="w-3.5 h-3.5 text-soc-danger" />,
    label: "Disconnected",
    border: "border-soc-danger/30",
    hover: "hover:bg-soc-danger/10",
    text: "text-soc-danger",
  },
};

export function Header({ status, onToggle }: HeaderProps) {
  const cfg = statusConfig[status];

  return (
    <header className="h-12 bg-soc-surface border-b border-soc-border flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${cfg.border} ${cfg.hover}`}
          title={
            status === "live" || status === "connecting"
              ? "Click to pause live feed"
              : "Click to reconnect live feed"
          }
        >
          {cfg.icon}
          <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
        </button>
        <div className="w-px h-5 bg-soc-border" />
        <span className="text-xs text-soc-muted">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </header>
  );
}
