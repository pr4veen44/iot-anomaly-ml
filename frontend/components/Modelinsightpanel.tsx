"use client";
// components/ModelInsightPanel.tsx
// Shows anomaly score + bar + explanation

import type { StreamRow, ModelParams } from "../lib/api";

interface Props {
  latest: StreamRow | null;
  threshold: number;
  thresholdSource?: "calibrated" | "default_sklearn";
  modelParams: ModelParams | null | undefined;
}

export default function ModelInsightPanel({
  latest,
  threshold,
  thresholdSource,
  modelParams,
}: Props) {
  const score = latest?.anomaly_score ?? 0;

  // Map score to a 0-100 "danger" gauge
  // Isolation Forest scores typically range from ~ -0.5 to +0.5
  // Negative = anomalous; we clamp and invert for visual
  const clampedScore = Math.max(-0.5, Math.min(0.5, score));
  const danger = Math.round(((-clampedScore + 0.5) / 1.0) * 100); // 0 = normal, 100 = max anomaly

  const barColor = danger > 60 ? "#ff4757" : danger > 40 ? "#ffa502" : "#00ff9d";

  return (
    <div className="rounded-xl border border-border bg-panel p-5 flex flex-col gap-4">
      <h3 className="text-xs font-mono uppercase tracking-widest text-muted">
        Model Insight
      </h3>

      {/* Score value */}
      <div className="flex items-end gap-2">
        <span
          className="text-3xl font-mono font-bold"
          style={{ color: barColor }}
        >
          {score.toFixed(4)}
        </span>
        <span className="text-xs text-muted font-mono mb-1">anomaly score</span>
      </div>

      {/* Gauge bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted font-mono mb-1">
          <span>Normal ↓</span>
          <span>Anomalous ↑</span>
        </div>
        <div className="w-full h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${danger}%`, background: barColor }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted font-mono mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-surface rounded-lg p-3 text-xs text-muted font-mono border border-border">
        <p className="text-accent font-semibold mb-1">How it works</p>
        <p>
          Isolation Forest isolates observations by randomly splitting features.
          Anomalous points are easier to isolate → shorter average path length
          → <span className="text-warning">lower score</span>.
        </p>
        <p className="mt-2">
          Rule: score &lt; {threshold.toFixed(4)} →{" "}
          <span className="text-danger">ANOMALY</span>
          {thresholdSource === "default_sklearn" && (
            <span className="text-warning">
              {" "}
              (fallback — add threshold.pkl from Colab for calibrated cutoff)
            </span>
          )}
        </p>
        <p className="mt-1 text-[10px]">
          {modelParams ? (
            <>
              Model: IsolationForest · contamination={String(modelParams.contamination)}{" "}
              · n_estimators={modelParams.n_estimators}
            </>
          ) : (
            "Model: not loaded on server"
          )}
        </p>
      </div>
    </div>
  );
}