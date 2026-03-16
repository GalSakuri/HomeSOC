import { AgentStatus } from "../components/dashboard/AgentStatus";

export function AgentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soc-text">Agents</h2>
      <AgentStatus showRemove />
    </div>
  );
}
