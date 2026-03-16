import type { Settings } from "../contexts/SettingsContext";

/** Format as time only (e.g. "14:30:05") — used in live feed, alerts */
export function formatTime(ts: string, settings: Settings): string {
  const d = new Date(ts);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: settings.timeFormat === "12h",
  };
  if (settings.showTimestampSeconds) {
    opts.second = "2-digit";
  }
  return d.toLocaleTimeString("en-US", opts);
}

/** Format as date + time (e.g. "Mar 16, 14:30:05") — used in event table */
export function formatDateTime(ts: string, settings: Settings): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = formatTime(ts, settings);
  return `${date}, ${time}`;
}
