"use client";
// components/StatusPanel.tsx
// Large NORMAL / ANOMALY indicator + latest sensor readings

import type { StreamRow } from "../lib/api";

interface Props {
  latest: StreamRow | null;
  isAnomaly: boolean;
}

export default function StatusPanel({ latest, isAnomaly }: Props) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4 transition-all duration-500"
      style={{
        borderColor: isAnomaly ? "#ff4757" : "#00ff9d",
        background: isAnomaly
          ? "linear-gradient(135deg, rgba(255,71,87,0.08) 0%, rgba(22,27,34,1) 60%)"
          : "linear-gradient(135deg, rgba(0,255,157,0.06) 0%, rgba(22,27,34,1) 60%)",
        boxShadow: isAnomaly
          ? "0 0 24px rgba(255,71,87,0.2)"
          : "0 0 24px rgba(0,255,157,0.1)",
      }}
    >
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${isAnomaly ? "animate-pulse_red bg-danger" : "bg-accent"}`}
        />
        <span
          className="text-2xl font-display font-bold tracking-widest"
          style={{ color: isAnomaly ? "#ff4757" : "#00ff9d" }}
        >
          {isAnomaly ? "⚠ ANOMALY" : "✓ NORMAL"}
        </span>
      </div>

      {/* Latest values */}
      {latest && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Temp",     value: `${latest.temperature.toFixed(2)} °C`, color: "#ff6b6b" },
            { label: "Humidity", value: `${latest.humidity.toFixed(2)} %`,     color: "#4ecdc4" },
            { label: "Light",    value: latest.light.toFixed(0),               color: "#ffe66d" },
            { label: "Loudness", value: latest.loudness.toFixed(0),            color: "#a29bfe" },
            { label: "Air Qual", value: latest.air_quality.toFixed(0),         color: "#fd79a8" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[10px] text-muted font-mono uppercase tracking-widest">
                {label}
              </span>
              <span className="text-sm font-mono font-semibold" style={{ color }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {!latest && (
        <p className="text-muted text-sm font-mono">Awaiting first data point…</p>
      )}
    </div>
  );
}