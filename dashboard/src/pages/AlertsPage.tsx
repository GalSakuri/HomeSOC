import { useState } from "react";
import { useAlerts } from "../hooks/useAlerts";
import { AlertsPanel } from "../components/dashboard/AlertsPanel";
import { api } from "../api/client";
import { useSettings } from "../contexts/SettingsContext";
import { RefreshCw, Trash2 } from "lucide-react";

export function AlertsPage() {
  const { alerts, loading, refresh, updateStatus } = useAlerts();
  const [clearing, setClearing] = useState(false);
  const { settings } = useSettings();

  const handleClear = async () => {
    if (settings.confirmBeforeClear && !confirm("Clear all alerts? This cannot be undone.")) return;
    setClearing(true);
    try {
      const result = await api.clearAlerts();
      console.log(`Cleared ${result.cleared} alerts`);
      refresh();
    } catch (e) {
      console.error("Failed to clear alerts:", e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-soc-text">Alerts</h2>
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

      {loading ? (
        <p className="text-soc-muted text-sm">Loading...</p>
      ) : (
        <AlertsPanel
          alerts={alerts}
          onAcknowledge={(id) => updateStatus(id, "acknowledged")}
        />
      )}
    </div>
  );
}
