import type { AgentInfo, Alert, DashboardSummary, DetectionRule, SecurityEvent } from "../types/events";

const BASE_URL = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getDashboardSummary: () => request<DashboardSummary>("/dashboard/summary"),

  getEvents: (params?: Record<string, string | number>) => {
    const query = params ? "?" + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : "";
    return request<SecurityEvent[]>(`/events${query}`);
  },

  getEvent: (id: string) => request<SecurityEvent>(`/events/${id}`),

  getAlerts: (params?: Record<string, string | number>) => {
    const query = params ? "?" + new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : "";
    return request<Alert[]>(`/alerts${query}`);
  },

  updateAlert: (id: string, status: string) =>
    request(`/alerts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  getAgents: () => request<AgentInfo[]>("/agents"),

  registerAgent: (agent: {
    agent_id: string;
    hostname: string;
    platform: string;
    ip_address?: string;
  }) =>
    request<{ status: string; agent_id: string }>("/agents", {
      method: "POST",
      body: JSON.stringify(agent),
    }),

  getAgentSetup: (agentId: string, platform: string) =>
    request<{
      api_key: string;
      backend_url: string;
      agent_id: string;
      platform: string;
      commands: { label: string; description: string; cmd: string }[];
      notes: string[];
    }>(`/setup/agent-instructions?agent_id=${encodeURIComponent(agentId)}&platform=${encodeURIComponent(platform)}`),

  getRules: () => request<DetectionRule[]>("/rules"),

  deleteAgent: (id: string) =>
    request<{ deleted: string }>(`/agents/${id}`, { method: "DELETE" }),

  stopAgent: (id: string) =>
    request<{ status: string; agent_id: string }>(`/agents/${id}/stop`, { method: "POST" }),

  resumeAgent: (id: string) =>
    request<{ status: string; agent_id: string }>(`/agents/${id}/resume`, { method: "POST" }),

  clearEvents: () =>
    request<{ cleared: number }>("/events", { method: "DELETE" }),

  clearAlerts: () =>
    request<{ cleared: number }>("/alerts", { method: "DELETE" }),

  generateTestEvents: (count: number = 10) =>
    request<{ events_generated: number; alerts_triggered: number }>(`/demo/generate?count=${count}`, { method: "POST" }),
};
