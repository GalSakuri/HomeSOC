import { useDashboardSummary } from "../hooks/useEvents";
import { useWebSocket } from "../hooks/useWebSocket";
import { StatCards } from "../components/dashboard/StatCards";
import { EventTimeline } from "../components/dashboard/EventTimeline";
import { AlertsPanel } from "../components/dashboard/AlertsPanel";
import { AgentStatus } from "../components/dashboard/AgentStatus";
import { LiveFeed } from "../components/dashboard/LiveFeed";
import { CategoryBreakdown } from "../components/dashboard/CategoryBreakdown";

export function DashboardPage() {
  const { summary } = useDashboardSummary();
  const { liveEvents, liveAlerts } = useWebSocket();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soc-text">Security Overview</h2>

      <StatCards summary={summary} />

      <EventTimeline events={liveEvents} />

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <LiveFeed events={liveEvents} />
        </div>
        <div className="space-y-4">
          <AlertsPanel alerts={liveAlerts.length > 0 ? liveAlerts : summary?.recent_alerts || []} />
          <AgentStatus />
        </div>
      </div>

      <CategoryBreakdown summary={summary} />
    </div>
  );
}
