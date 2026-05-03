"use client";
// components/MetricsPanel.tsx
// Confusion matrix + accuracy / detection rate / FPR

import type { Metrics } from "../lib/api";

interface Props { metrics: Metrics | null }

function Stat({ label, value, unit = "%", color = "#e6edf3" }: {
  label: string; value: number; unit?: string; color?: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 bg-surface rounded-lg border border-border">
      <span className="text-[10px] text-muted font-mono uppercase tracking-widest mb-1">
        {label}
      </span>
      <span className="text-2xl font-mono font-bold" style={{ color }}>
        {value.toFixed(1)}<span className="text-sm text-muted">{unit}</span>
      </span>
    </div>
  );
}

export default function MetricsPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="rounded-xl border border-border bg-panel p-5 text-muted text-xs font-mono">
        No metrics yet…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-5 flex flex-col gap-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-muted">
        Evaluation Metrics
      </h3>

      {/* Main 3 stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Accuracy"     value={metrics.accuracy}            color="#00ff9d" />
        <Stat label="Detection Rate" value={metrics.detection_rate}    color="#4ecdc4" />
        <Stat label="False Pos. Rate" value={metrics.false_positive_rate} color="#ffa502" />
      </div>

      {/* Confusion matrix */}
      <div>
        <p className="text-[10px] text-muted font-mono uppercase tracking-widest mb-2">
          Confusion Matrix
        </p>
        <div className="grid grid-cols-2 gap-1 text-center text-xs font-mono">
          <div className="bg-surface rounded p-2 border border-border">
            <div className="text-accent text-lg font-bold">{metrics.TP}</div>
            <div className="text-muted text-[10px]">True Positive</div>
          </div>
          <div className="bg-surface rounded p-2 border border-border">
            <div className="text-warning text-lg font-bold">{metrics.FP}</div>
            <div className="text-muted text-[10px]">False Positive</div>
          </div>
          <div className="bg-surface rounded p-2 border border-border">
            <div className="text-danger text-lg font-bold">{metrics.FN}</div>
            <div className="text-muted text-[10px]">False Negative</div>
          </div>
          <div className="bg-surface rounded p-2 border border-border">
            <div className="text-text text-lg font-bold">{metrics.TN}</div>
            <div className="text-muted text-[10px]">True Negative</div>
          </div>
        </div>
        <p className="text-[10px] text-muted font-mono mt-2 text-right">
          Total: {metrics.total_predictions} predictions
        </p>
      </div>
    </div>
  );
}