"use client";
// components/LiveSensorChart.tsx
// Multi-line chart: Temperature, Humidity, Light, Loudness (last 50 points)

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid, ReferenceLine,
} from "recharts";
import type { StreamRow } from "../lib/api";

interface Props {
  data: StreamRow[];
}

const LINES = [
  { key: "temperature", color: "#ff6b6b", label: "Temp (°C)" },
  { key: "humidity",    color: "#4ecdc4", label: "Humidity (%)" },
  { key: "light",       color: "#ffe66d", label: "Light" },
  { key: "loudness",    color: "#a29bfe", label: "Loudness" },
];

// Format UNIX timestamp → HH:MM:SS
function fmtTime(ts: number) {
  return new Date(ts * 1000).toISOString().slice(11, 19);
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-border rounded p-3 text-xs font-mono">
      <p className="text-muted mb-1">{fmtTime(label)}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="text-text">{Number(p.value).toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
}

export default function LiveSensorChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, fontFamily: "Space Grotesk" }}
        />
        {LINES.map(({ key, color, label }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            name={label}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
        {/* Highlight anomaly rows with a red reference band */}
        {data.map((row, i) =>
          row.prediction === -1 ? (
            <ReferenceLine
              key={`anom-${i}`}
              x={row.timestamp}
              stroke="rgba(255,71,87,0.25)"
              strokeWidth={6}
            />
          ) : null
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}