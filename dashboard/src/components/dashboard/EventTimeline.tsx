import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SecurityEvent } from "../../types/events";
import { useMemo } from "react";
import { socVar } from "../../utils/themeColors";

interface EventTimelineProps {
  events: SecurityEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  // Read CSS vars for chart colors
  const colors = useMemo(
    () => ({
      accent: socVar("accent"),
      danger: socVar("danger"),
      border: socVar("border"),
      muted: socVar("muted"),
      card: socVar("card"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const chartData = useMemo(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const buckets: { time: string; events: number; alerts: number }[] = [];
    const bucketMap = new Map<number, { events: number; alerts: number }>();

    for (let i = 59; i >= 0; i--) {
      const t = new Date(now - i * 60000);
      const minuteKey = Math.floor(t.getTime() / 60000);
      const label = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
      bucketMap.set(minuteKey, { events: 0, alerts: 0 });
      buckets.push({ time: label, events: 0, alerts: 0 });
    }

    const minuteKeys = Array.from(bucketMap.keys());

    for (const ev of events) {
      const ts = new Date(ev.timestamp).getTime();
      if (ts < oneHourAgo) continue;

      const minuteKey = Math.floor(ts / 60000);
      const bucket = bucketMap.get(minuteKey);
      if (bucket) {
        bucket.events++;
        if (ev.severity === "high" || ev.severity === "critical") {
          bucket.alerts++;
        }
      }
    }

    minuteKeys.forEach((key, i) => {
      const data = bucketMap.get(key)!;
      buckets[i].events = data.events;
      buckets[i].alerts = data.alerts;
    });

    return buckets;
  }, [events]);

  const maxValue = Math.max(1, ...chartData.map((d) => d.events));

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-soc-text">
          Event Timeline (Last Hour)
        </h3>
        <span className="text-xs text-soc-muted">
          {events.length} events loaded
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.danger} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.danger} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
          <XAxis
            dataKey="time"
            stroke={colors.muted}
            fontSize={10}
            tickLine={false}
            interval={9}
          />
          <YAxis
            stroke={colors.muted}
            fontSize={10}
            tickLine={false}
            domain={[0, Math.ceil(maxValue * 1.2)]}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="events"
            stroke={colors.accent}
            fill="url(#eventGrad)"
            strokeWidth={2}
            name="Events"
          />
          <Area
            type="monotone"
            dataKey="alerts"
            stroke={colors.danger}
            fill="url(#alertGrad)"
            strokeWidth={2}
            name="High/Critical"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
