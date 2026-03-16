import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Shield, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Severity } from "../types/events";

interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  platform: string | null;
  type: string;
  conditions: Record<string, unknown>;
  window_seconds: number | null;
  threshold: number | null;
  source_file: string;
}

const severityBadge: Record<string, string> = {
  critical: "bg-soc-critical/20 text-soc-critical",
  high: "bg-soc-danger/20 text-soc-danger",
  medium: "bg-soc-warning/20 text-soc-warning",
  low: "bg-soc-accent/20 text-soc-accent",
  info: "bg-soc-muted/20 text-soc-muted",
};

const typeBadge: Record<string, string> = {
  single: "bg-soc-accent/10 text-soc-accent",
  threshold: "bg-purple-500/20 text-purple-400",
  correlation: "bg-cyan-500/20 text-cyan-400",
};

export function RulesPage() {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api
      .getRules()
      .then((data) => setRules(data as unknown as DetectionRule[]))
      .catch((e) => console.error("Failed to load rules:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-soc-muted">
        Loading rules...
      </div>
    );
  }

  // Group rules by source file
  const grouped = rules.reduce<Record<string, DetectionRule[]>>((acc, rule) => {
    const file = rule.source_file || "unknown";
    if (!acc[file]) acc[file] = [];
    acc[file].push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-soc-text">Detection Rules</h2>
        <span className="text-xs text-soc-muted">
          {rules.length} rules loaded
        </span>
      </div>

      {Object.entries(grouped).map(([file, fileRules]) => (
        <div key={file} className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-soc-muted">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-mono">{file}</span>
            <span className="text-soc-muted/50">
              ({fileRules.length} rule{fileRules.length > 1 ? "s" : ""})
            </span>
          </div>

          {fileRules.map((rule) => {
            const isExpanded = expanded === rule.id;
            return (
              <div
                key={rule.id}
                className="bg-soc-card border border-soc-border rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-soc-bg/30 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : rule.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-soc-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-soc-muted flex-shrink-0" />
                  )}

                  <Shield className="w-4 h-4 text-soc-accent flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-soc-text font-medium">
                      {rule.name}
                    </p>
                    <p className="text-xs text-soc-muted mt-0.5 truncate">
                      {rule.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rule.platform && (
                      <span className="text-[10px] text-soc-muted bg-soc-bg/50 px-1.5 py-0.5 rounded font-mono">
                        {rule.platform}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${typeBadge[rule.type] || typeBadge.single}`}
                    >
                      {rule.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadge[rule.severity] || severityBadge.medium}`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-soc-border p-4 bg-soc-bg/40 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-soc-muted block mb-1">Rule ID</span>
                        <span className="text-soc-text font-mono">{rule.id}</span>
                      </div>
                      <div>
                        <span className="text-soc-muted block mb-1">Type</span>
                        <span className="text-soc-text capitalize">{rule.type}</span>
                      </div>
                      <div>
                        <span className="text-soc-muted block mb-1">Platform</span>
                        <span className="text-soc-text">{rule.platform || "All"}</span>
                      </div>
                      {rule.type === "threshold" && (
                        <>
                          <div>
                            <span className="text-soc-muted block mb-1">Window</span>
                            <span className="text-soc-text">{rule.window_seconds}s</span>
                          </div>
                          <div>
                            <span className="text-soc-muted block mb-1">Threshold</span>
                            <span className="text-soc-text">{rule.threshold} events</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-soc-muted block mb-1">Conditions</span>
                      <pre className="text-xs text-soc-text font-mono bg-soc-bg/60 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(rule.conditions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
