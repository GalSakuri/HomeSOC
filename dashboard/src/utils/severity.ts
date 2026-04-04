import type { Severity } from "../types/events";

export const severityBadge: Record<Severity, string> = {
  critical: "bg-soc-critical/20 text-soc-critical",
  high: "bg-soc-danger/20 text-soc-danger",
  medium: "bg-soc-warning/20 text-soc-warning",
  low: "bg-soc-accent/20 text-soc-accent",
  info: "bg-soc-muted/20 text-soc-muted",
};

export const severityDot: Record<Severity, string> = {
  critical: "bg-soc-critical",
  high: "bg-soc-danger",
  medium: "bg-soc-warning",
  low: "bg-soc-accent",
  info: "bg-soc-muted",
};
