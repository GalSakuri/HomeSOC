import { useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { SecurityEvent } from "../../types/events";
import { useSettings } from "../../contexts/SettingsContext";
import { formatDateTime } from "../../utils/formatTime";
import { severityDot } from "../../utils/severity";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

interface LiveFeedProps {
  events: SecurityEvent[];
  className?: string;
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

export function LiveFeed({ events, className }: LiveFeedProps) {
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
    <Card className={className}>
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-soc-success" />
            Live Event Feed
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-soc-success animate-pulse" />
            <span className="text-xs text-muted-foreground">{events.length} events</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div
          ref={scrollRef}
          className={`space-y-1 overflow-y-auto font-mono text-xs ${
            settings.compactMode ? "space-y-0" : ""
          }`}
        >
          {visibleEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm font-sans">
              Waiting for events...
            </p>
          ) : (
            visibleEvents.map((ev) => (
              <div
                key={ev.id}
                className={`flex items-center gap-2 px-2 hover:bg-background/50 rounded transition-colors ${
                  settings.compactMode ? "py-0.5" : "py-1.5"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityDot[ev.severity]}`} />
                <span className="text-muted-foreground w-28 flex-shrink-0">
                  {formatDateTime(ev.timestamp, settings)}
                </span>
                <Badge variant="outline" className="w-10 flex-shrink-0 justify-center text-[9px] font-bold px-1 py-0 h-4">
                  {categoryLabel[ev.category] || ev.category.toUpperCase()}
                </Badge>
                <span className="text-foreground truncate flex-1">
                  {formatEventSummary(ev)}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
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
