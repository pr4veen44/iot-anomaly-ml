"use client";
/**
 * app/page.tsx — IoT Anomaly Detection Dashboard
 *
 * Polls GET /stream every 1 second, maintains a 50-point sliding window,
 * and renders all panels: sensor chart, anomaly score, timeline, status,
 * model insight, metrics, and controls.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import LiveSensorChart   from "../components/Livesensorchart";
import AnomalyScoreChart from "../components/Anomalyscorechart";
import AnomalyTimeline   from "../components/Anomalytimeline";
import StatusPanel       from "../components/Statuspanel";
import ModelInsightPanel from "../components/Modelinsightpanel";
import MetricsPanel      from "../components/Metricspanel";
import Controls          from "../components/Controls";
import { api, type StreamRow, type Metrics, type ApiStatus } from "../lib/api";

const WINDOW = 50; // sliding window size

export default function Dashboard() {
  const [running,  setRunning]  = useState(false);
  const [window50, setWindow50] = useState<StreamRow[]>([]);
  const [latest,   setLatest]   = useState<StreamRow | null>(null);
  const [metrics,  setMetrics]  = useState<Metrics | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [serverStatus, setServerStatus] = useState<ApiStatus | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async () => {
    const s = await api.status();
    if (s) setServerStatus(s);
  }, []);

  // ── polling loop ──────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already running

    intervalRef.current = setInterval(async () => {
      try {
        const row = await api.stream();
        if (!row) return;

        setLatest(row);
        setWindow50(prev => {
          const next = [...prev, row];
          return next.length > WINDOW ? next.slice(-WINDOW) : next;
        });
        if (row.prediction === -1) {
          setAnomalyCount(c => c + 1);
        }
        setError(null);
      } catch {
        setError("Backend unreachable. Is the FastAPI server running?");
      }

      // Fetch metrics every ~5 rows (stagger to reduce load)
      const rand = Math.random();
      if (rand < 0.2) {
        const m = await api.metrics();
        if (m) setMetrics(m);
      }
    }, 1000);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── handlers ─────────────────────────────────────────────
  const handleStart = async () => {
    await api.start();
    await refreshStatus();
    setRunning(true);
    startPolling();
  };

  const handlePause = () => {
    setRunning(false);
    stopPolling();
  };

  const handleReset = async () => {
    stopPolling();
    await api.reset();
    await refreshStatus();
    setRunning(false);
    setWindow50([]);
    setLatest(null);
    setMetrics(null);
    setAnomalyCount(0);
    setError(null);
  };

  const handleInject = async () => {
    await api.injectAnomaly();
  };

  const handleJump = async (idx: number) => {
    stopPolling();
    await api.jumpToAnomaly(idx);
    await refreshStatus();
    setWindow50([]);
    setLatest(null);
    setMetrics(null);
    setAnomalyCount(0);
    setRunning(true);
    startPolling();
  };

  const handleJumpNormal = async () => {
    stopPolling();
    await api.jumpToNormal();
    await refreshStatus();
    setWindow50([]);
    setLatest(null);
    setMetrics(null);
    setAnomalyCount(0);
    setRunning(true);
    startPolling();
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const isAnomaly = latest?.prediction === -1;
  const decisionThreshold =
    latest?.threshold ?? serverStatus?.threshold ?? 0;
  const modelParams = serverStatus?.model_params;

  return (
    <div className="min-h-screen bg-surface text-text font-display">
      {/* ── Top header ─────────────────────────────────── */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "rgba(0,255,157,0.1)", border: "1px solid #00ff9d" }}
          >
            🌡
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">
              IoT Anomaly Detection
            </h1>
            <p className="text-[10px] text-muted font-mono">
              Isolation Forest · Real-time ML Inference
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted">
            Points: <span className="text-text">{window50.length}</span>
          </span>
          <span className="text-muted">
            Anomalies: <span className="text-danger">{anomalyCount}</span>
          </span>
          {latest && (
            <span className="text-muted">
              t={new Date(latest.timestamp * 1000).toISOString().slice(11, 19)} UTC
            </span>
          )}
        </div>
      </header>

      {/* ── Error banner ───────────────────────────────── */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg border border-danger/50 bg-danger/10 text-danger text-xs font-mono">
          ⚠ {error}
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────── */}
      <main className="p-6 grid gap-4 grid-cols-1 lg:grid-cols-3">

        {/* ── Column 1-2: Charts ─────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Live sensor chart */}
          <section className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">
                Live Sensor Data
              </h2>
              <span className="text-[10px] font-mono text-muted">
                last {WINDOW} points
              </span>
            </div>
            <LiveSensorChart data={window50} />
          </section>

          {/* Anomaly score graph */}
          <section className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">
                Anomaly Score
              </h2>
              <span className="text-[10px] font-mono text-muted">
                lower = more anomalous · threshold ={" "}
                {decisionThreshold.toFixed(4)}
                {(latest?.threshold_source ?? serverStatus?.threshold_source) ===
                  "default_sklearn" && " (no threshold.pkl — score < 0)"}
              </span>
            </div>
            <AnomalyScoreChart
              data={window50}
              threshold={decisionThreshold}
            />
          </section>

          {/* Anomaly timeline */}
          <section className="rounded-xl border border-border bg-panel p-5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-3">
              Anomaly Timeline
            </h2>
            <AnomalyTimeline data={window50} />
          </section>

        </div>

        {/* ── Column 3: Side panels ──────────────────── */}
        <div className="flex flex-col gap-4">
          <StatusPanel    latest={latest}  isAnomaly={isAnomaly} />
          <ModelInsightPanel
            latest={latest}
            threshold={decisionThreshold}
            thresholdSource={
              latest?.threshold_source ?? serverStatus?.threshold_source
            }
            modelParams={modelParams}
          />
          <MetricsPanel   metrics={metrics} />
          <Controls
            running={running}
            onStart={handleStart}
            onPause={handlePause}
            onInject={handleInject}
            onJump={handleJump}
            onJumpNormal={handleJumpNormal}
            onReset={handleReset}
          />
        </div>

      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-3 text-[10px] text-muted font-mono text-center">
        AnoML-IoT Dataset ·{" "}
        {modelParams ? (
          <>
            Isolation Forest (contamination={String(modelParams.contamination)}
            , n_estimators={modelParams.n_estimators}) ·{" "}
          </>
        ) : (
          "Isolation Forest · "
        )}
        <span className="text-accent">FastAPI + Next.js</span>
      </footer>
    </div>
  );
}