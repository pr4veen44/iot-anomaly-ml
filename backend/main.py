"""
AI-Based IoT Anomaly Detection System — FastAPI Backend
Author: Senior Full-Stack + ML Engineer

Endpoints:
  POST /start           → Begin streaming
  GET  /stream          → Return next row (call every 1s)
  POST /inject-anomaly  → Force anomalous values into next row
  POST /reset           → Reset index pointer
  POST /jump-to-anomaly → Jump to 5 rows before a chosen anomaly interval
  POST /jump-to-normal   → Jump to first ground-truth-normal row (outside labeled intervals)
  GET  /metrics         → Return TP/FP/TN/FN + derived rates
"""

import os
import pickle
import threading
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

DATA_PATH   = os.path.join(os.path.dirname(__file__), "data", "iot_dataset.csv")
MODEL_PATH     = os.path.join(os.path.dirname(__file__), "model.pkl")
SCALER_PATH    = os.path.join(os.path.dirname(__file__), "scaler.pkl")
THRESHOLD_PATH = os.path.join(os.path.dirname(__file__), "threshold.pkl")

# UNIX timestamp ranges for known anomaly intervals
# Day 1  = 2021-06-15 ;  Day 2 = 2021-06-16  (UTC)
# June 15, 2021 00:00:00 UTC → 1623715200
_D1 = 1623715200          # June 15
_D2 = 1623715200 + 86400  # June 16

ANOMALY_INTERVALS = [
    # Day 1 — 18:21:46 → 19:37:16
    (_D1 + 18*3600 + 21*60 + 46,   _D1 + 19*3600 + 37*60 + 16),
    # Day 2 — 02:26:36 → 04:15:56
    (_D2 +  2*3600 + 26*60 + 36,   _D2 +  4*3600 + 15*60 + 56),
    # Day 2 — 08:54:46 → 10:45:36
    (_D2 +  8*3600 + 54*60 + 46,   _D2 + 10*3600 + 45*60 + 36),
]

FEATURES = ["Temperature", "Humidity", "Air Quality", "Light", "Loudness"]

# ─────────────────────────────────────────────
# APP + GLOBAL STATE
# ─────────────────────────────────────────────

app = FastAPI(title="IoT Anomaly Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

state = {
    "running":         False,
    "index":           0,
    "inject_next":     False,   # inject synthetic anomaly on next call
    "df":              None,    # full DataFrame
    "model":           None,
    "scaler":          None,
    "threshold":       0.0,    # score < threshold → ANOMALY (loaded from threshold.pkl)
    "threshold_source": "default_sklearn",  # "calibrated" if threshold.pkl loaded
    # Confusion-matrix counters (reset on /reset)
    "TP": 0, "FP": 0, "TN": 0, "FN": 0,
}
lock = threading.Lock()

# ─────────────────────────────────────────────
# STARTUP: load data + model
# ─────────────────────────────────────────────

@app.on_event("startup")
def load_resources():
    """Load CSV, trained model, and scaler on startup."""
    # ── Dataset ──────────────────────────────
    if not os.path.exists(DATA_PATH):
        print(f"[WARN] Dataset not found at {DATA_PATH}. /stream will fail until data is placed.")
    else:
        df = pd.read_csv(DATA_PATH)
        df.columns = df.columns.str.strip()
        # Rename 'Time' → lowercase for consistency
        if "Time" in df.columns:
            df.rename(columns={"Time": "timestamp"}, inplace=True)
        state["df"] = df
        print(f"[INFO] Loaded dataset: {len(df)} rows")

    # ── Model + Scaler + Threshold ──────────────
    for path, key in [(MODEL_PATH, "model"), (SCALER_PATH, "scaler")]:
        if not os.path.exists(path):
            print(f"[WARN] {key}.pkl not found at {path}. Train in Colab first.")
        else:
            with open(path, "rb") as f:
                state[key] = pickle.load(f)
            print(f"[INFO] Loaded {key} from {path}")

    if os.path.exists(THRESHOLD_PATH):
        with open(THRESHOLD_PATH, "rb") as f:
            state["threshold"] = pickle.load(f)
        state["threshold_source"] = "calibrated"
        print(f"[INFO] Loaded threshold: {state['threshold']:.6f}")
    else:
        state["threshold_source"] = "default_sklearn"
        print(
            "[WARN] threshold.pkl not found — using threshold=0.0 "
            "(sklearn-style: score < 0 ⇒ anomaly). "
            "Copy threshold.pkl from Colab if you trained with a calibrated threshold."
        )

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def is_in_anomaly_interval(ts: float) -> bool:
    """Return True if timestamp falls inside any known anomaly interval."""
    for start, end in ANOMALY_INTERVALS:
        if start <= ts <= end:
            return True
    return False


def predict_row(row_values: np.ndarray):
    """
    Scale the feature vector and run Isolation Forest.

    Uses the calibrated threshold from threshold.pkl (score < threshold → anomaly)
    instead of sklearn's default, which can be miscalibrated when training
    on a filtered (clean) dataset.

    Returns:
        prediction    : 1 (normal) or -1 (anomaly)
        anomaly_score : float — lower = more anomalous
    """
    scaler    = state["scaler"]
    model     = state["model"]
    threshold = state["threshold"]

    if scaler is None or model is None:
        # Fallback for demo without model files
        score = float(np.random.uniform(-0.2, 0.2))
        pred  = -1 if score < threshold else 1
        return pred, score

    X = row_values.reshape(1, -1)
    X_scaled = scaler.transform(X)
    score = float(model.decision_function(X_scaled)[0])
    # Use calibrated threshold — NOT model.predict() which uses the
    # contamination-derived internal threshold from training time.
    pred = -1 if score < threshold else 1
    return pred, score


def update_confusion_matrix(prediction: int, timestamp: float):
    """Update TP/FP/TN/FN based on prediction vs ground truth."""
    ground_truth_anomaly = is_in_anomaly_interval(timestamp)

    if prediction == -1 and ground_truth_anomaly:
        state["TP"] += 1
    elif prediction == -1 and not ground_truth_anomaly:
        state["FP"] += 1
    elif prediction == 1 and not ground_truth_anomaly:
        state["TN"] += 1
    elif prediction == 1 and ground_truth_anomaly:
        state["FN"] += 1

# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@app.post("/start")
def start_stream():
    """Begin (or resume) streaming from the current index."""
    with lock:
        if state["df"] is None:
            raise HTTPException(status_code=503, detail="Dataset not loaded")
        state["running"] = True
    return {"status": "started", "index": state["index"]}


@app.post("/reset")
def reset_stream():
    """Reset index pointer and confusion-matrix counters."""
    with lock:
        state["running"] = False
        state["index"]   = 0
        state["inject_next"] = False
        for key in ("TP", "FP", "TN", "FN"):
            state[key] = 0
    return {"status": "reset"}


@app.post("/inject-anomaly")
def inject_anomaly():
    """
    Flag the next /stream call to return synthetically anomalous values.
    Simulates a sensor spike for demo purposes.
    """
    with lock:
        state["inject_next"] = True
    return {"status": "inject queued"}


class JumpRequest(BaseModel):
    interval_index: int = 0  # 0, 1, or 2


@app.post("/jump-to-anomaly")
def jump_to_anomaly(req: JumpRequest):
    """
    Move the index pointer to ~5 rows BEFORE the chosen anomaly interval.
    interval_index: 0 = Day1, 1 = Day2-morning, 2 = Day2-late
    """
    with lock:
        if state["df"] is None:
            raise HTTPException(status_code=503, detail="Dataset not loaded")

        idx = req.interval_index
        if idx < 0 or idx >= len(ANOMALY_INTERVALS):
            raise HTTPException(status_code=400, detail="interval_index must be 0, 1, or 2")

        target_ts = ANOMALY_INTERVALS[idx][0]  # start of the anomaly window
        df = state["df"]

        # Find the row whose timestamp is closest to target_ts
        diffs   = (df["timestamp"] - target_ts).abs()
        closest = int(diffs.idxmin())

        # Jump 5 rows before, clamped to 0
        new_index = max(0, closest - 5)
        state["index"]   = new_index
        state["running"] = True
        state["TP"] = state["FP"] = state["TN"] = state["FN"] = 0

    return {"status": "jumped", "new_index": new_index, "target_ts": target_ts}


@app.post("/jump-to-normal")
def jump_to_normal():
    """
    Move the index to the first row whose timestamp is outside all known
    anomaly intervals (ground-truth normal). Resets confusion-matrix counters.
    """
    with lock:
        if state["df"] is None:
            raise HTTPException(status_code=503, detail="Dataset not loaded")

        df = state["df"]
        n = len(df)
        positions = [
            i
            for i in range(n)
            if not is_in_anomaly_interval(float(df.iloc[i]["timestamp"]))
        ]
        if not positions:
            raise HTTPException(
                status_code=400,
                detail="No rows outside labeled anomaly intervals",
            )
        new_index = positions[0]
        ts_at = float(df.iloc[new_index]["timestamp"])

        state["index"] = new_index
        state["running"] = True
        state["inject_next"] = False
        state["TP"] = state["FP"] = state["TN"] = state["FN"] = 0

    return {
        "status": "jumped",
        "new_index": new_index,
        "timestamp": ts_at,
    }


@app.get("/stream")
def stream_next():
    """
    Return the next row of sensor data with ML prediction.
    The frontend should poll this every 1 second.
    """
    with lock:
        if not state["running"]:
            raise HTTPException(status_code=400, detail="Streaming not started. Call /start first.")
        if state["df"] is None:
            raise HTTPException(status_code=503, detail="Dataset not loaded")

        df  = state["df"]
        idx = state["index"]

        if idx >= len(df):
            state["running"] = False
            raise HTTPException(status_code=204, detail="End of dataset")

        row = df.iloc[idx]
        state["index"] += 1

    # ── Prepare feature vector ────────────────
    if state["inject_next"]:
        # Synthetic spike: crank temperature and loudness way up
        feat = np.array([
            row["Temperature"] + 15.0,
            row["Humidity"]    + 20.0,
            row["Air Quality"] + 50.0,
            row["Light"]       + 300.0,
            row["Loudness"]    + 200.0,
        ], dtype=float)
        with lock:
            state["inject_next"] = False
    else:
        feat = np.array(
            [row[f] for f in FEATURES], dtype=float
        )

    prediction, anomaly_score = predict_row(feat)
    ts = float(row["timestamp"])
    update_confusion_matrix(prediction, ts)

    return {
        "timestamp":    ts,
        "temperature":  float(feat[0]),
        "humidity":     float(feat[1]),
        "air_quality":  float(feat[2]),
        "light":        float(feat[3]),
        "loudness":     float(feat[4]),
        "prediction":   prediction,
        "anomaly_score": anomaly_score,
        "threshold":    float(state["threshold"]),
        "threshold_source": state["threshold_source"],
        "is_ground_truth_anomaly": is_in_anomaly_interval(ts),
    }


@app.get("/metrics")
def get_metrics():
    """Return current confusion-matrix values and derived metrics."""
    TP = state["TP"]
    FP = state["FP"]
    TN = state["TN"]
    FN = state["FN"]
    total = TP + FP + TN + FN

    detection_rate      = TP / (TP + FN) if (TP + FN) > 0 else 0.0
    false_positive_rate = FP / (FP + TN) if (FP + TN) > 0 else 0.0
    accuracy            = (TP + TN) / total if total > 0 else 0.0

    return {
        "TP": TP, "FP": FP, "TN": TN, "FN": FN,
        "detection_rate":      round(detection_rate * 100, 2),
        "false_positive_rate": round(false_positive_rate * 100, 2),
        "accuracy":            round(accuracy * 100, 2),
        "total_predictions":   total,
    }


def _model_params_dict():
    m = state["model"]
    if m is None:
        return None
    p = m.get_params()
    return {
        "contamination": p.get("contamination"),
        "n_estimators": int(p.get("n_estimators", 0)),
        "max_samples": p.get("max_samples"),
    }


@app.get("/status")
def get_status():
    """Health-check / current streaming state."""
    return {
        "running": state["running"],
        "index":   state["index"],
        "total_rows": len(state["df"]) if state["df"] is not None else 0,
        "model_loaded":  state["model"]  is not None,
        "scaler_loaded": state["scaler"] is not None,
        "threshold": float(state["threshold"]),
        "threshold_source": state["threshold_source"],
        "model_params": _model_params_dict(),
        "anomaly_intervals": ANOMALY_INTERVALS,
    }