import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api/client";
import { SecurityEvent, DashboardSummary } from "../types/events";
import { useSettings } from "../contexts/SettingsContext";

export function useEvents(params?: Record<string, string | number>) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(params);
      setEvents(data);
    } catch (e) {
      console.error("Failed to fetch events:", e);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { events, loading, refresh };
}

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();

  const refresh = useCallback(async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (e) {
      console.error("Failed to fetch summary:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, settings.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refresh, settings.refreshInterval]);

  return { summary, loading, refresh };
}
