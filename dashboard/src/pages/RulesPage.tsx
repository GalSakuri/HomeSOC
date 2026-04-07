import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import {
  AlertTriangle, AlertCircle, Info, Play, Save, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronRight,
  Cpu, FileText, Globe, Lock, Monitor, HelpCircle,
} from "lucide-react";
import { DetectionRule } from "../types/events";

// ── Helpers ────────────────────────────────────────────────────────────────

function hashId(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i);
  return String(Math.abs(h) % 9000 + 1000);
}

function formatRuleId(id: string): string {
  return `SEC-RU-${hashId(id)}`;
}

type Category = "process" | "file" | "network" | "auth" | "system" | "other";

function getCategory(rule: DetectionRule): Category {
  const cat = (rule.conditions?.category as string | undefined) ?? "";
  if (cat === "process") return "process";
  if (cat === "file") return "file";
  if (cat === "network") return "network";
  if (cat === "auth" || cat === "authz") return "auth";
  if (cat === "system" || cat === "service") return "system";
  return "other";
}

const CATEGORY_CONFIG: Record<Category, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  tag: string;
}> = {
  process: { label: "Process",        icon: Cpu,        color: "text-violet-400", bg: "bg-violet-500/10", tag: "PROCESS"  },
  file:    { label: "File System",    icon: FileText,   color: "text-orange-400", bg: "bg-orange-500/10", tag: "FILE SYS" },
  network: { label: "Network",        icon: Globe,      color: "text-blue-400",   bg: "bg-blue-500/10",   tag: "NETWORK"  },
  auth:    { label: "Authentication", icon: Lock,       color: "text-emerald-400",bg: "bg-emerald-500/10",tag: "AUTH LOG" },
  system:  { label: "System",         icon: Monitor,    color: "text-sky-400",    bg: "bg-sky-500/10",    tag: "SYSTEM"   },
  other:   { label: "Other",          icon: HelpCircle, color: "text-slate-400",  bg: "bg-slate-500/10",  tag: "OTHER"    },
};

const CATEGORY_ORDER: Category[] = ["process", "file", "network", "auth", "system", "other"];

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

const MITRE_MAP: Record<Category, { id: string; tactic: string; desc: string }> = {
  auth:    { id: "T1110", tactic: "credential_access",   desc: "Adversaries may use brute force to guess passwords and gain initial access." },
  network: { id: "T1071", tactic: "command_and_control", desc: "Adversaries may communicate using application layer protocols to avoid detection." },
  process: { id: "T1059", tactic: "execution",           desc: "Adversaries may abuse command and script interpreters to execute commands." },
  file:    { id: "T1005", tactic: "collection",          desc: "Adversaries may search local system sources to find files of interest." },
  system:  { id: "T1543", tactic: "persistence",         desc: "Adversaries may create or modify system-level processes to execute malicious code." },
  other:   { id: "T1082", tactic: "discovery",           desc: "Adversaries may attempt to get detailed information about the operating system." },
};

// ── Severity icon ──────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="w-4 h-4 text-soc-critical flex-shrink-0" />;
    case "high":
      return <AlertTriangle className="w-4 h-4 text-soc-danger flex-shrink-0" />;
    case "medium":
      return <AlertCircle className="w-4 h-4 text-soc-warning flex-shrink-0" />;
    case "low":
      return <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-soc-muted flex-shrink-0" />;
  }
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-soc-critical/20 text-soc-critical",
  high:     "bg-soc-danger/20 text-soc-danger",
  medium:   "bg-soc-warning/20 text-soc-warning",
  low:      "bg-blue-500/20 text-blue-400",
  info:     "bg-soc-muted/20 text-soc-muted",
};

// ── Rule list item ─────────────────────────────────────────────────────────

function RuleListItem({
  rule,
  formattedId,
  isSelected,
  onSelect,
}: {
  rule: DetectionRule;
  formattedId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const sevBadge = SEVERITY_BADGE[rule.severity] ?? SEVERITY_BADGE.info;

  return (
    <div
      onClick={onSelect}
      className={`pl-8 pr-3 py-2.5 cursor-pointer border-b border-soc-border/30 transition-colors ${
        isSelected
          ? "bg-soc-surface-high border-l-2 border-l-soc-accent"
          : "hover:bg-soc-surface-high/50"
      }`}
    >
      <div className="flex items-center gap-2">
        <SeverityIcon severity={rule.severity} />
        <p className="text-[13px] font-medium text-soc-text truncate flex-1 leading-tight">
          {rule.name}
        </p>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 pl-6">
        <span className="text-[10px] text-soc-muted font-mono">{formattedId}</span>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sevBadge}`}>
          {rule.severity}
        </span>
      </div>
    </div>
  );
}

// ── Category group ─────────────────────────────────────────────────────────

function CategoryGroup({
  category,
  rules,
  selectedId,
  formattedIds,
  onSelect,
}: {
  category: Category;
  rules: DetectionRule[];
  selectedId: string | null;
  formattedIds: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;

  const sorted = [...rules].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div>
      {/* Category header */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-soc-surface-high/40 transition-colors border-b border-soc-border/40"
      >
        <div className={`p-1 rounded ${cfg.bg} flex-shrink-0`}>
          <Icon className={`w-3 h-3 ${cfg.color}`} />
        </div>
        <span className={`text-[11px] font-bold uppercase tracking-wide flex-1 ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="text-[11px] text-soc-muted font-mono">{rules.length}</span>
        {open
          ? <ChevronDown className="w-3 h-3 text-soc-muted flex-shrink-0" />
          : <ChevronRight className="w-3 h-3 text-soc-muted flex-shrink-0" />
        }
      </div>

      {/* Rules */}
      {open && sorted.map((rule) => (
        <RuleListItem
          key={rule.id}
          rule={rule}
          formattedId={formattedIds[rule.id]}
          isSelected={rule.id === selectedId}
          onSelect={() => onSelect(rule.id)}
        />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function RulesPage() {
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.getRules()
      .then((r) => {
        setRules(r);
        if (r.length > 0) setSelectedId(r[0].id);
      })
      .catch((e) => console.error("Failed to load rules:", e))
      .finally(() => setLoading(false));
  }, []);

  const [yamlSource, setYamlSource] = useState<string>("");
  const [yamlLoading, setYamlLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "error">("idle");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string; alerts_triggered: number;
  } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedRule = rules.find((r) => r.id === selectedId) ?? null;
  const formattedIds = Object.fromEntries(rules.map((r) => [r.id, formatRuleId(r.id)]));
  const selectedCategory = selectedRule ? getCategory(selectedRule) : null;
  const mitre = selectedCategory ? MITRE_MAP[selectedCategory] : null;

  // Fetch real YAML from backend when selection changes
  useEffect(() => {
    if (!selectedId) { setYamlSource(""); return; }
    setYamlLoading(true);
    setTestResult(null);
    setSaveStatus("idle");
    api.getRuleSource(selectedId)
      .then((r) => setYamlSource(r.yaml))
      .catch(() => setYamlSource("# Could not load rule source"))
      .finally(() => setYamlLoading(false));
  }, [selectedId]);

  const lineCount = yamlSource.split("\n").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-soc-muted font-mono text-sm">
        Loading rules...
      </div>
    );
  }

  return (
    <div className="flex overflow-hidden border-t border-soc-border" style={{ height: "calc(100vh - 48px)" }}>

      {/* ── Left panel: Active rules list ─────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-soc-surface border-r border-soc-border overflow-hidden">
        {/* Header — h-12 matches the main header + sidebar top section height */}
        <div className="h-12 px-4 border-b border-soc-border flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] font-bold tracking-widest text-soc-muted uppercase">
            Active Rules
          </span>
          <span className="text-[11px] bg-soc-surface-high px-2 py-0.5 rounded text-soc-text font-mono">
            {rules.length} Total
          </span>
        </div>

        {/* Grouped rule list */}
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const grouped = rules.reduce<Partial<Record<Category, DetectionRule[]>>>((acc, rule) => {
              const cat = getCategory(rule);
              if (!acc[cat]) acc[cat] = [];
              acc[cat]!.push(rule);
              return acc;
            }, {});
            const activeCategories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);
            if (activeCategories.length === 0) {
              return (
                <div className="flex items-center justify-center py-16 text-soc-muted text-sm">
                  No rules loaded
                </div>
              );
            }
            return activeCategories.map((cat) => (
              <CategoryGroup
                key={cat}
                category={cat}
                rules={grouped[cat]!}
                selectedId={selectedId}
                formattedIds={formattedIds}
                onSelect={setSelectedId}
              />
            ));
          })()}
        </div>
      </div>

      {/* ── Center panel: YAML editor ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-soc-bg overflow-hidden">
        {selectedRule ? (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-soc-border bg-soc-surface flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[11px] font-bold tracking-widest text-soc-muted uppercase">Editing:</span>
                <span className="text-sm font-mono text-soc-accent truncate">{selectedRule.source_file}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Test Rule */}
                <button
                  disabled={testing}
                  onClick={async () => {
                    setTesting(true);
                    setTestResult(null);
                    try {
                      const r = await api.testRule(selectedRule.id);
                      setTestResult(r);
                    } catch {
                      setTestResult({ status: "error", alerts_triggered: 0 });
                    } finally {
                      setTesting(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-soc-surface-high text-soc-text hover:bg-soc-surface-highest rounded transition-colors disabled:opacity-50"
                >
                  {testing
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Play className="w-3 h-3 text-soc-accent" />}
                  Test Rule
                </button>

                {/* Save Rule */}
                <button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    setSaveStatus("idle");
                    try {
                      await api.saveRule(selectedRule.id, yamlSource);
                      setSaveStatus("ok");
                    } catch {
                      setSaveStatus("error");
                    } finally {
                      setSaving(false);
                      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors disabled:opacity-50 ${
                    saveStatus === "ok"    ? "bg-soc-accent/20 text-soc-accent" :
                    saveStatus === "error" ? "bg-soc-critical/20 text-soc-critical" :
                    "bg-soc-accent text-soc-bg hover:bg-soc-accent/90"
                  }`}
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" />
                    : saveStatus === "ok"    ? <CheckCircle className="w-3 h-3" />
                    : saveStatus === "error" ? <XCircle className="w-3 h-3" />
                    : <Save className="w-3 h-3" />}
                  {saveStatus === "ok" ? "Saved!" : saveStatus === "error" ? "Error" : "Save Rule"}
                </button>
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div className={`flex items-center gap-2.5 px-4 py-2 border-b flex-shrink-0 text-[12px] ${
                testResult.status === "error"
                  ? "bg-soc-critical/10 border-soc-critical/30"
                  : "bg-soc-accent/10 border-soc-accent/30"
              }`}>
                {testResult.status === "error"
                  ? <XCircle className="w-3.5 h-3.5 text-soc-critical flex-shrink-0" />
                  : <CheckCircle className="w-3.5 h-3.5 text-soc-accent flex-shrink-0" />}
                <span className={testResult.status === "error" ? "text-soc-critical" : "text-soc-accent"}>
                  {testResult.status === "error"
                    ? "Test failed — backend unreachable"
                    : testResult.alerts_triggered > 0
                      ? `Test fired — ${testResult.alerts_triggered} alert${testResult.alerts_triggered !== 1 ? "s" : ""} generated. Check the Alerts panel.`
                      : "Test event sent — rule did not fire (conditions may not have been satisfied)."}
                </span>
                <button onClick={() => setTestResult(null)} className="ml-auto text-soc-muted hover:text-soc-text">✕</button>
              </div>
            )}

            {/* Editable YAML */}
            <div className="flex-1 overflow-hidden flex pt-3">
              {/* Line numbers */}
              <div className="w-12 flex-shrink-0 text-right pr-3 select-none overflow-hidden">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="font-mono text-[12px] text-soc-muted/40 leading-[1.7]">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Textarea */}
              {yamlLoading ? (
                <div className="flex-1 flex items-start pt-1 text-soc-muted font-mono text-[13px]">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 mt-0.5" /> Loading…
                </div>
              ) : (
                <textarea
                  className="flex-1 bg-transparent font-mono text-[13px] text-soc-text leading-[1.7] resize-none outline-none pr-6 overflow-auto"
                  value={yamlSource}
                  onChange={(e) => { setYamlSource(e.target.value); setSaveStatus("idle"); }}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-soc-muted font-mono text-sm">
            Select a rule to view
          </div>
        )}
      </div>

      {/* ── Right panel: Attributes ────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 flex flex-col bg-soc-surface border-l border-soc-border overflow-hidden">
        {selectedRule && (
          <>
            {/* Attributes */}
            <div className="px-4 pt-4 pb-2 border-b border-soc-border/60 flex-shrink-0">
              <p className="text-[10px] font-bold tracking-widest text-soc-muted uppercase mb-3">
                Attributes
              </p>
              <div className="space-y-2.5 text-[12px]">
                <div className="flex justify-between items-center">
                  <span className="text-soc-muted">Version</span>
                  <span className="font-mono text-soc-accent">1.0.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-soc-muted">Last Run</span>
                  <span className="text-soc-text">—</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-soc-muted">Matches (24h)</span>
                  <span className="text-soc-danger font-mono">—</span>
                </div>
              </div>
            </div>

            {/* Threat Intel */}
            {mitre && (
              <div className="px-4 pt-4 pb-3 flex-shrink-0">
                <p className="text-[10px] font-bold tracking-widest text-soc-muted uppercase mb-3">
                  Threat Intel
                </p>
                <div className="rounded-md bg-soc-surface-high p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-soc-critical flex-shrink-0" />
                    <span className="text-[11px] font-bold text-soc-text tracking-wide">
                      MITRE {mitre.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-soc-muted leading-relaxed italic">
                    "{mitre.desc}"
                  </p>
                </div>
              </div>
            )}

            {/* Alert on */}
            {selectedRule.alert_on && (
              <div className="px-4 pt-2 pb-4 flex-shrink-0">
                <p className="text-[10px] font-bold tracking-widest text-soc-muted uppercase mb-2">
                  Alert Trigger
                </p>
                <p className="text-[11px] text-soc-text leading-relaxed">
                  {selectedRule.alert_on}
                </p>
              </div>
            )}

            <div className="flex-1" />

            {/* Performance footer */}
            <div className="m-3 p-2.5 rounded-md bg-soc-bg border border-soc-border/40">
              <p className="text-[10px] font-mono text-soc-muted">
                Performance Impact:{" "}
                <span className="text-soc-accent">LOW</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
