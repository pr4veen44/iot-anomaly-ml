// lib/api.ts — typed wrappers around the FastAPI backend

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const BASE = RAW_BASE.replace(/\/$/, "");

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  }
  return res;
}

export interface StreamRow {
  timestamp: number;
  temperature: number;
  humidity: number;
  air_quality: number;
  light: number;
  loudness: number;
  prediction: 1 | -1;
  anomaly_score: number;
  /** Same as backend state — score < threshold ⇒ anomaly */
  threshold: number;
  threshold_source: "calibrated" | "default_sklearn";
  is_ground_truth_anomaly: boolean;
}

export interface Metrics {
  TP: number;
  FP: number;
  TN: number;
  FN: number;
  detection_rate: number;
  false_positive_rate: number;
  accuracy: number;
  total_predictions: number;
}

export interface ModelParams {
  contamination: number;
  n_estimators: number;
  max_samples: number | string | null;
}

export interface ApiStatus {
  running: boolean;
  index: number;
  total_rows: number;
  model_loaded: boolean;
  scaler_loaded: boolean;
  threshold: number;
  threshold_source: "calibrated" | "default_sklearn";
  model_params: ModelParams | null;
  anomaly_intervals: [number, number][];
}

export const api = {
  start:         () => request("/start",          { method: "POST" }),
  reset:         () => request("/reset",          { method: "POST" }),
  injectAnomaly: () => request("/inject-anomaly", { method: "POST" }),
  jumpToAnomaly: (interval_index: number) =>
    request("/jump-to-anomaly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval_index }),
    }),
  jumpToNormal: () =>
    request("/jump-to-normal", { method: "POST" }),
  stream: async (): Promise<StreamRow | null> => {
    const res = await fetch(`${BASE}/stream`);
    if (!res.ok) {
      return null;
    }
    return res.json();
  },
  metrics: async (): Promise<Metrics | null> => {
    const res = await fetch(`${BASE}/metrics`);
    if (!res.ok) {
      return null;
    }
    return res.json();
  },
  status: async (): Promise<ApiStatus | null> => {
    const res = await fetch(`${BASE}/status`);
    if (!res.ok) {
      return null;
    }
    return res.json();
  },
};