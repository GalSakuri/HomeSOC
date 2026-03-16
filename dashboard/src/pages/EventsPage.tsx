import { useState } from "react";
import { useEvents } from "../hooks/useEvents";
import { EventTable } from "../components/events/EventTable";
import { api } from "../api/client";
import { useSettings } from "../contexts/SettingsContext";
import { RefreshCw, Trash2 } from "lucide-react";

export function EventsPage() {
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [clearing, setClearing] = useState(false);
  const { settings } = useSettings();

  const params: Record<string, string | number> = { limit: 200 };
  if (category) params.category = category;
  if (severity) params.severity = severity;

  const { events, loading, refresh } = useEvents(params);

  const handleClear = async () => {
    if (settings.confirmBeforeClear && !confirm("Clear all events? This cannot be undone.")) return;
    setClearing(true);
    try {
      const result = await api.clearEvents();
      console.log(`Cleared ${result.cleared} events`);
      refresh();
    } catch (e) {
      console.error("Failed to clear events:", e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-soc-text">Security Events</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-1.5 text-xs text-soc-danger hover:text-soc-danger/80 px-3 py-1.5 rounded-lg border border-soc-danger/30 hover:bg-soc-danger/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            {clearing ? "Clearing..." : "Clear All"}
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs text-soc-accent hover:text-soc-accent/80 px-3 py-1.5 rounded-lg border border-soc-border hover:bg-soc-accent/10 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-soc-card border border-soc-border rounded-lg px-3 py-1.5 text-sm text-soc-text"
        >
          <option value="">All Categories</option>
          <option value="process">Process</option>
          <option value="network">Network</option>
          <option value="file">File</option>
          <option value="auth">Auth</option>
          <option value="service">Service</option>
          <option value="system">System</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="bg-soc-card border border-soc-border rounded-lg px-3 py-1.5 text-sm text-soc-text"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
      </div>

      <EventTable events={events} loading={loading} />
    </div>
  );
}
