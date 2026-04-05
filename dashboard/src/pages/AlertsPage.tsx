import { useAlerts } from "../hooks/useAlerts";
import { AlertsPanel } from "../components/dashboard/AlertsPanel";
import { api } from "../api/client";
import { useClearData } from "../hooks/useClearData";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";

export function AlertsPage() {
  const { alerts, loading, refresh, updateStatus } = useAlerts();
  const { clearing, handleClear } = useClearData(api.clearAlerts, refresh, "alerts");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Alerts</h2>
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" onClick={handleClear} disabled={clearing}>
            <Trash2 className="w-3 h-3" />
            {clearing ? "Clearing..." : "Clear All"}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <AlertsPanel
          alerts={alerts}
          onAcknowledge={(id) => updateStatus(id, "acknowledged")}
        />
      )}
    </div>
  );
}
