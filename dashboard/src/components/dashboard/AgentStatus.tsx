import { Monitor, X, Square, Play } from "lucide-react";
import { AgentInfo } from "../../types/events";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client";
import { useWebSocket } from "../../hooks/useWebSocket";

interface AgentStatusProps {
  showRemove?: boolean;
}

export function AgentStatus({ showRemove = false }: AgentStatusProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const { agentVersion } = useWebSocket();

  const load = useCallback(async () => {
    try {
      const data = await api.getAgents();
      setAgents(data as unknown as AgentInfo[]);
    } catch (e) {
      console.error("Failed to load agents:", e);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Re-fetch agents instantly when an agent_status WebSocket message arrives
  useEffect(() => {
    if (agentVersion > 0) load();
  }, [agentVersion, load]);

  const handleRemove = async (id: string, hostname: string) => {
    if (!confirm(`Remove agent "${hostname}" (${id})?`)) return;
    try {
      await api.deleteAgent(id);
      load();
    } catch (e) {
      console.error("Failed to remove agent:", e);
    }
  };

  const handleStop = async (id: string, hostname: string) => {
    if (!confirm(`Stop agent "${hostname}"? It will stop collecting logs.`)) return;
    try {
      await api.stopAgent(id);
      load();
    } catch (e) {
      console.error("Failed to stop agent:", e);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeAgent(id);
      load();
    } catch (e) {
      console.error("Failed to resume agent:", e);
    }
  };

  const platformIcon: Record<string, string> = {
    macos: "",
    windows: "🪟",
    linux: "🐧",
  };

  const statusConfig: Record<string, { dot: string; text: string; label: string }> = {
    online: { dot: "bg-soc-success animate-pulse", text: "text-soc-success", label: "online" },
    stopped: { dot: "bg-soc-danger", text: "text-soc-danger", label: "stopped" },
    offline: { dot: "bg-soc-muted", text: "text-soc-muted", label: "offline" },
    unknown: { dot: "bg-soc-muted", text: "text-soc-muted", label: "unknown" },
  };

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-soc-text flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4 text-soc-accent" />
        Agents
      </h3>

      <div className="space-y-3">
        {agents.length === 0 ? (
          <p className="text-sm text-soc-muted text-center py-4">
            No agents registered
          </p>
        ) : (
          agents.map((agent) => {
            const sc = statusConfig[agent.status] || statusConfig.unknown;
            const isOnline = agent.status === "online";
            const isStopped = agent.status === "stopped";

            return (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 bg-soc-bg/50 rounded-lg border border-soc-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {platformIcon[agent.platform] || "💻"}
                  </span>
                  <div>
                    <p className="text-sm text-soc-text font-medium">
                      {agent.hostname}
                    </p>
                    <p className="text-xs text-soc-muted">
                      {agent.platform} &middot; {agent.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                    <span className={`text-xs ${sc.text}`}>{sc.label}</span>
                  </div>

                  {/* Stop button — shown when agent is online */}
                  {isOnline && (
                    <button
                      onClick={() => handleStop(agent.id, agent.hostname)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-soc-danger hover:bg-soc-danger/10 border border-soc-danger/30 transition-colors"
                      title="Stop agent — stops collecting logs"
                    >
                      <Square className="w-3 h-3" />
                      Stop
                    </button>
                  )}

                  {/* Resume button — shown when agent is stopped */}
                  {isStopped && (
                    <button
                      onClick={() => handleResume(agent.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-soc-success hover:bg-soc-success/10 border border-soc-success/30 transition-colors"
                      title="Resume agent — start collecting logs again"
                    >
                      <Play className="w-3 h-3" />
                      Resume
                    </button>
                  )}

                  {showRemove && (
                    <button
                      onClick={() => handleRemove(agent.id, agent.hostname)}
                      className="p-1 rounded hover:bg-soc-danger/10 text-soc-muted hover:text-soc-danger transition-colors"
                      title="Remove agent"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
