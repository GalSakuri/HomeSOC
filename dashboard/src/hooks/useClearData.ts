import { useState, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";

export function useClearData(
  clearFn: () => Promise<{ cleared: number }>,
  onSuccess: () => void,
  label: string,
) {
  const [clearing, setClearing] = useState(false);
  const { settings } = useSettings();

  const handleClear = useCallback(async () => {
    if (settings.confirmBeforeClear && !confirm(`Clear all ${label}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      await clearFn();
      onSuccess();
    } catch (e) {
      console.error(`Failed to clear ${label}:`, e);
    } finally {
      setClearing(false);
    }
  }, [clearFn, onSuccess, label, settings.confirmBeforeClear]);

  return { clearing, handleClear };
}
