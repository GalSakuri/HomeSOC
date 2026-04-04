import { SecurityEvent } from "../../types/events";
import { useState, useMemo, useCallback } from "react";
import { useSettings } from "../../contexts/SettingsContext";
import { formatDateTime } from "../../utils/formatTime";
import { severityBadge } from "../../utils/severity";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface EventTableProps {
  events: SecurityEvent[];
  loading?: boolean;
}

type SortDir = "asc" | "desc" | null;

export function EventTable({ events, loading }: EventTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const { settings } = useSettings();

  const toggleSort = useCallback(() => {
    setSortDir((prev) => {
      if (prev === null) return "desc";
      if (prev === "desc") return "asc";
      return null;
    });
  }, []);

  const sortedEvents = useMemo(() => {
    if (!sortDir) return events;
    return [...events].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [events, sortDir]);

  if (loading) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center">
        <p className="text-soc-muted">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-soc-border text-left">
            <th
              className="px-4 py-3 text-xs text-soc-muted font-medium uppercase cursor-pointer select-none hover:text-soc-text transition-colors"
              onClick={toggleSort}
            >
              <span className="flex items-center gap-1.5">
                Date & Time
                {sortDir === "desc" ? (
                  <ArrowDown className="w-3 h-3 text-soc-accent" />
                ) : sortDir === "asc" ? (
                  <ArrowUp className="w-3 h-3 text-soc-accent" />
                ) : (
                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                )}
              </span>
            </th>
            <th className="px-4 py-3 text-xs text-soc-muted font-medium uppercase">Severity</th>
            <th className="px-4 py-3 text-xs text-soc-muted font-medium uppercase">Category</th>
            <th className="px-4 py-3 text-xs text-soc-muted font-medium uppercase">Type</th>
            <th className="px-4 py-3 text-xs text-soc-muted font-medium uppercase">Process</th>
            <th className="px-4 py-3 text-xs text-soc-muted font-medium uppercase">Details</th>
            <th className="px-4 py-3 text-xs text-soc-muted font-medium uppercase">Source</th>
          </tr>
        </thead>
        <tbody>
          {sortedEvents.map((ev) => (
            <>
              <tr
                key={ev.id}
                className="border-b border-soc-border/50 hover:bg-soc-bg/50 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
              >
                <td className="px-4 py-2.5 text-xs text-soc-muted font-mono whitespace-nowrap">
                  {formatDateTime(ev.timestamp, settings)}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadge[ev.severity]}`}>
                    {ev.severity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-soc-text">{ev.category}</td>
                <td className="px-4 py-2.5 text-xs text-soc-text font-mono">{ev.event_type}</td>
                <td className="px-4 py-2.5 text-xs text-soc-accent">{ev.process_name || "—"}</td>
                <td className="px-4 py-2.5 text-xs text-soc-text truncate max-w-[200px]">
                  {getEventDetail(ev)}
                </td>
                <td className="px-4 py-2.5 text-xs text-soc-muted">{ev.source}</td>
              </tr>
              {expanded === ev.id && (
                <tr key={`${ev.id}-detail`}>
                  <td colSpan={7} className="px-4 py-3 bg-soc-bg/80">
                    <pre className="text-xs text-soc-muted font-mono whitespace-pre-wrap max-h-48 overflow-auto">
                      {JSON.stringify(ev, null, 2)}
                    </pre>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
      {events.length === 0 && (
        <p className="text-soc-muted text-sm text-center py-8">No events found</p>
      )}
    </div>
  );
}

function getEventDetail(ev: SecurityEvent): string {
  if (ev.dst_ip) return `${ev.dst_ip}:${ev.dst_port}`;
  if (ev.file_path) return ev.file_path;
  if (ev.auth_user) return `${ev.auth_user} ${ev.auth_success ? "OK" : "FAIL"}`;
  if (ev.process_path) return ev.process_path;
  return "—";
}
