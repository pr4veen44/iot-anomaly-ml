"use client";
// components/AnomalyScoreChart.tsx
// Area chart showing anomaly_score over time — spikes indicate anomalies

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import type { StreamRow } from "../lib/api";

interface Props {
  data: StreamRow[];
  /** Backend decision rule: anomaly when score < threshold */
  threshold: number;
}

function fmtTime(ts: number) {
  return new Date(ts * 1000).toISOString().slice(11, 19);
}

function CustomTooltip(
  props: {
    active?: boolean;
    payload?: readonly { value?: number }[];
    label?: number;
    threshold: number;
  }
) {
  const { active, payload, label, threshold } = props;
  if (!active || !payload?.length) return null;
  const score = Number(payload[0]?.value);
  const isAnomaly = score < threshold;
  return (
    <div className="bg-panel border border-border rounded p-3 text-xs font-mono">
      <p className="text-muted mb-1">{fmtTime(Number(label))}</p>
      <p style={{ color: isAnomaly ? "#ff4757" : "#00ff9d" }}>
        Score: {score?.toFixed(4)}
      </p>
      <p className="text-muted text-[10px] mt-1">
        {isAnomaly ? "⚠ Anomalous" : "✓ Normal"} (vs threshold {threshold.toFixed(4)})
      </p>
    </div>
  );
}

export default function AnomalyScoreChart({ data, threshold }: Props) {
  // Gradient: red for negative scores (anomaly), green for positive
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00ff9d" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00ff9d" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={fmtTime}
          tick={{ fill: "#8b949e", fontSize: 10, fontFamily: "JetBrains Mono" }}
          interval="preserveStartEnd"
          minTickGap={60}
        />
        <YAxis
          tick={{ fill: "#8b949e", fontSize: 10, fontFamily: "JetBrains Mono" }}
          width={48}
          tickFormatter={(v) => v.toFixed(2)}
        />
        <Tooltip
          content={(props) => (
            <CustomTooltip
              active={props.active}
              payload={props.payload as readonly { value?: number }[] | undefined}
              label={props.label as number | undefined}
              threshold={threshold}
            />
          )}
        />
        <ReferenceLine
          y={threshold}
          stroke="#ffa502"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{
            value: `threshold ${threshold.toFixed(3)}`,
            fill: "#ffa502",
            fontSize: 9,
          }}
        />
        <Area
          type="monotone"
          dataKey="anomaly_score"
          stroke="#00ff9d"
          fill="url(#scoreGrad)"
          strokeWidth={1.5}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.prediction === -1) {
              return <circle key={cx} cx={cx} cy={cy} r={3} fill="#ff4757" stroke="none" />;
            }
            return <g key={cx} />;
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}