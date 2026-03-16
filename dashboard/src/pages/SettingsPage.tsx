import { Activity, Bell, Layout, RotateCcw, Clock, Columns2, Sliders } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";

const feedLimits = [50, 100, 200, 500];
const refreshOptions = [5, 10, 15, 30, 60];

export function SettingsPage() {
  const { settings, update, reset } = useSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-soc-text">Settings</h2>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-soc-muted hover:text-soc-danger transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to defaults
        </button>
      </div>

      {/* Display */}
      <Section icon={<Sliders className="w-4 h-4" />} title="Display">
        <SettingRow label="Compact Mode" description="Reduce padding and spacing for denser information display">
          <Toggle checked={settings.compactMode} onChange={(v) => update("compactMode", v)} />
        </SettingRow>
      </Section>

      {/* Live Feed */}
      <Section icon={<Activity className="w-4 h-4" />} title="Live Feed">
        <SettingRow label="Max Visible Events" description="Number of events shown in the live feed panel">
          <SegmentedControl
            options={feedLimits.map((n) => ({ value: n, label: String(n) }))}
            selected={settings.maxFeedEvents}
            onChange={(v) => update("maxFeedEvents", v)}
          />
        </SettingRow>

        <SettingRow label="Auto-Scroll" description="Automatically scroll to newest events in the feed">
          <Toggle checked={settings.autoScrollFeed} onChange={(v) => update("autoScrollFeed", v)} />
        </SettingRow>
      </Section>

      {/* Time & Display */}
      <Section icon={<Clock className="w-4 h-4" />} title="Time & Display">
        <SettingRow label="Time Format" description="How timestamps are displayed across the dashboard">
          <div className="flex gap-2">
            {(["24h", "12h"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => update("timeFormat", fmt)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  settings.timeFormat === fmt
                    ? "border-soc-accent bg-soc-accent/10 text-soc-accent"
                    : "border-soc-border text-soc-muted hover:text-soc-text"
                }`}
              >
                {fmt === "24h" ? "24-hour" : "12-hour"}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Show Seconds" description="Include seconds in event timestamps">
          <Toggle checked={settings.showTimestampSeconds} onChange={(v) => update("showTimestampSeconds", v)} />
        </SettingRow>
      </Section>

      {/* Dashboard */}
      <Section icon={<Layout className="w-4 h-4" />} title="Dashboard">
        <SettingRow label="Refresh Interval" description="How often the dashboard summary auto-refreshes (seconds)">
          <SegmentedControl
            options={refreshOptions.map((n) => ({ value: n, label: `${n}s` }))}
            selected={settings.refreshInterval}
            onChange={(v) => update("refreshInterval", v)}
          />
        </SettingRow>

        <SettingRow label="Confirm Before Clear" description="Ask for confirmation before clearing events or alerts">
          <Toggle checked={settings.confirmBeforeClear} onChange={(v) => update("confirmBeforeClear", v)} />
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section icon={<Bell className="w-4 h-4" />} title="Notifications">
        <SettingRow
          label="Alert Notifications"
          description="Show browser notifications for high and critical severity alerts"
        >
          <Toggle
            checked={settings.notifyOnHighAlerts}
            onChange={(v) => {
              if (v && Notification.permission !== "granted") {
                Notification.requestPermission().then((perm) => {
                  update("notifyOnHighAlerts", perm === "granted");
                });
              } else {
                update("notifyOnHighAlerts", v);
              }
            }}
          />
        </SettingRow>
      </Section>

      {/* About */}
      <div className="bg-soc-card border border-soc-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Columns2 className="w-4 h-4 text-soc-muted" />
          <div>
            <p className="text-sm font-medium text-soc-text">HomeSOC v0.1.0</p>
            <p className="text-xs text-soc-muted mt-0.5">
              Home Security Operations Center — Local network security monitoring
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable sub-components ── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-soc-border">
        <span className="text-soc-accent">{icon}</span>
        <h3 className="text-sm font-medium text-soc-text">{title}</h3>
      </div>
      <div className="divide-y divide-soc-border">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-6">
      <div className="min-w-0">
        <p className="text-sm text-soc-text">{label}</p>
        <p className="text-xs text-soc-muted mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${
        checked ? "bg-soc-accent" : "bg-soc-border"
      }`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}

function SegmentedControl<T extends number>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-soc-border overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 text-xs transition-colors ${
            selected === opt.value
              ? "bg-soc-accent text-white"
              : "text-soc-muted hover:text-soc-text hover:bg-soc-surface"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
