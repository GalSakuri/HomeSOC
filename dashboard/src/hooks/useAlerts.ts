import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api/client";
import { Alert } from "../types/events";

export function useAlerts(params?: Record<string, string | number>) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts(params);
      setAlerts(data);
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      await api.updateAlert(id, status);
      refresh();
    },
    [refresh]
  );

  return { alerts, loading, refresh, updateStatus };
}
