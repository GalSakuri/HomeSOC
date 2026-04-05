import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  Shield, ChevronDown, ChevronRight, Bell,
  Cpu, FileText, Globe, Lock, Monitor, HelpCircle,
} from "lucide-react";
import { DetectionRule } from "../types/events";
import { severityBadge } from "../utils/severity";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

// ── Category config ────────────────────────────────────────────────────────

type Category = "process" | "file" | "network" | "auth" | "system" | "other";

const CATEGORY_CONFIG: Record<Category, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  process:  { label: "Process",        icon: Cpu,       color: "text-violet-400", bg: "bg-violet-500/10" },
  file:     { label: "File System",    icon: FileText,  color: "text-orange-400", bg: "bg-orange-500/10" },
  network:  { label: "Network",        icon: Globe,     color: "text-blue-400",   bg: "bg-blue-500/10"   },
  auth:     { label: "Authentication", icon: Lock,      color: "text-emerald-400",bg: "bg-emerald-500/10"},
  system:   { label: "System",         icon: Monitor,   color: "text-sky-400",    bg: "bg-sky-500/10"    },
  other:    { label: "Other",          icon: HelpCircle,color: "text-slate-400",  bg: "bg-slate-500/10"  },
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];
const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-yellow-500",
  low:      "bg-blue-500",
  info:     "bg-slate-500",
};

const TYPE_BADGE: Record<string, string> = {
  single:      "bg-primary/10 text-primary",
  threshold:   "bg-purple-500/20 text-purple-400",
  correlation: "bg-cyan-500/20 text-cyan-400",
};

function getCategory(rule: DetectionRule): Category {
  const cat = (rule.conditions?.category as string | undefined) ?? "";
  if (cat === "process") return "process";
  if (cat === "file")    return "file";
  if (cat === "network") return "network";
  if (cat === "auth" || cat === "authz") return "auth";
  if (cat === "system" || cat === "service") return "system";
  return "other";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SeveritySummary({ rules }: { rules: DetectionRule[] }) {
  const counts = rules.reduce<Record<string, number>>((acc, r) => {
    acc[r.severity] = (acc[r.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {SEVERITY_ORDER.filter((s) => counts[s]).map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[s]}`} />
          <span className="text-[10px] text-muted-foreground">{counts[s]} {s}</span>
        </div>
      ))}
    </div>
  );
}

function RuleRow({ rule }: { rule: DetectionRule }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/40 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        }

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium group-hover:text-primary transition-colors truncate">
            {rule.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-md ${TYPE_BADGE[rule.type] ?? TYPE_BADGE.single}`}>
            {rule.type}
          </span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${severityBadge[rule.severity] ?? severityBadge.info}`}>
            {rule.severity}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-background/40 space-y-3">
          {rule.alert_on && (
            <div className="flex gap-2.5 p-3 rounded-md bg-primary/5 border border-primary/20">
              <Bell className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-0.5">Alerts when</p>
                <p className="text-xs text-foreground/90 leading-relaxed">{rule.alert_on}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-1">Rule ID</span>
              <span className="text-foreground font-mono text-[11px]">{rule.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Type</span>
              <span className="text-foreground capitalize">{rule.type}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Platform</span>
              <span className="text-foreground">{rule.platform || "All"}</span>
            </div>
            {rule.type === "threshold" && (
              <>
                <div>
                  <span className="text-muted-foreground block mb-1">Window</span>
                  <span className="text-foreground">{rule.window_seconds}s</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Threshold</span>
                  <span className="text-foreground">{rule.threshold} events</span>
                </div>
              </>
            )}
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Conditions</span>
            <pre className="text-xs text-foreground font-mono bg-background/60 rounded-lg p-3 overflow-x-auto">
              {JSON.stringify(rule.conditions, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, rules }: { category: Category; rules: DetectionRule[] }) {
  const [open, setOpen] = useState(false);
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;

  // Sort rules by severity within the category
  const sorted = [...rules].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <Card className="overflow-hidden">
      {/* Category header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors border-b border-border/50 select-none"
        onClick={() => setOpen(!open)}
      >
        <div className={`p-1.5 rounded-md ${cfg.bg}`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
          <span className="text-xs text-muted-foreground ml-2">{rules.length} rule{rules.length !== 1 ? "s" : ""}</span>
        </div>
        <SeveritySummary rules={rules} />
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
        }
      </div>

      {/* Rule rows */}
      {open && (
        <div>
          {sorted.map((rule) => <RuleRow key={rule.id} rule={rule} />)}
        </div>
      )}
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: Category[] = ["process", "file", "network", "auth", "system", "other"];

export function RulesPage() {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRules()
      .then(setRules)
      .catch((e) => console.error("Failed to load rules:", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading rules...</div>;
  }

  // Group by derived category
  const grouped = rules.reduce<Partial<Record<Category, DetectionRule[]>>>((acc, rule) => {
    const cat = getCategory(rule);
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(rule);
    return acc;
  }, {});

  const activeCategories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Detection Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rules.length} rules across {activeCategories.length} categories
          </p>
        </div>
        {/* Category pill summary */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {activeCategories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            return (
              <div key={cat} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${cfg.bg} ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                <span>{cfg.label}</span>
                <span className="opacity-60">({grouped[cat]!.length})</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {activeCategories.map((cat) => (
          <CategorySection key={cat} category={cat} rules={grouped[cat]!} />
        ))}
      </div>

      {rules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Shield className="w-10 h-10 opacity-20" />
          <p>No detection rules loaded</p>
        </div>
      )}
    </div>
  );
}
