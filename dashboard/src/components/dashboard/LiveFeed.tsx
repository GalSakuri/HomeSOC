import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { SecurityEvent } from "../../types/events";
import { useSettings } from "../../contexts/SettingsContext";
import { formatTime } from "../../utils/formatTime";
import { severityDot } from "../../utils/severity";

interface LiveFeedProps {
  events: SecurityEvent[];
}

const categoryLabel: Record<string, string> = {
  process: "PROC",
  network: "NET",
  file: "FILE",
  auth: "AUTH",
  authz: "AUTHZ",
  service: "SVC",
  system: "SYS",
};

export function LiveFeed({ events }: LiveFeedProps) {
  const { settings } = useSettings();
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleEvents = events.slice(0, settings.maxFeedEvents);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (settings.autoScrollFeed && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, settings.autoScrollFeed]);

  return (
    <div className="bg-soc-card border border-soc-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-soc-text flex items-center gap-2">
          <Activity className="w-4 h-4 text-soc-success" />
          Live Event Feed
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-soc-success animate-pulse" />
          <span className="text-xs text-soc-muted">{events.length} events</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`space-y-1 max-h-[450px] overflow-y-auto font-mono text-xs ${
          settings.compactMode ? "space-y-0" : ""
        }`}
      >
        {visibleEvents.length === 0 ? (
          <p className="text-soc-muted text-center py-8 text-sm font-sans">
            Waiting for events...
          </p>
        ) : (
          visibleEvents.map((ev) => (
            <div
              key={ev.id}
              className={`flex items-center gap-2 px-2 hover:bg-soc-bg/50 rounded transition-colors ${
                settings.compactMode ? "py-0.5" : "py-1.5"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityDot[ev.severity]}`} />
              <span className="text-soc-muted w-14 flex-shrink-0">
                {formatTime(ev.timestamp, settings)}
              </span>
              <span className="text-soc-accent w-10 flex-shrink-0 text-[10px] font-bold">
                {categoryLabel[ev.category] || ev.category.toUpperCase()}
              </span>
              <span className="text-soc-text truncate flex-1">
                {formatEventSummary(ev)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatEventSummary(ev: SecurityEvent): string {
  switch (ev.category) {
    case "process":
      return `${ev.process_name || "?"} (PID:${ev.process_pid || "?"}) ${ev.process_path || ""}`;
    case "network":
      return `${ev.process_name || "?"} → ${ev.dst_ip || "?"}:${ev.dst_port || "?"} (${ev.protocol || "?"})`;
    case "file":
      return `${ev.file_action || "?"} ${ev.file_path || "?"}`;
    case "auth":
      return `${ev.auth_user || "?"} ${ev.auth_success ? "✓" : "✗"} via ${ev.auth_method || "?"}`;
    default:
      return ev.event_type;
  }
}
