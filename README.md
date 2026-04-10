# IoT Anomaly Detection System

Real-time IoT sensor monitoring with ML-powered anomaly detection. Streams live sensor data through an Isolation Forest model and visualises everything on a live dashboard.

---

## What it does

Reads IoT sensor data row by row (Temperature, Humidity, Air Quality, Light, Loudness), scores each reading with a trained Isolation Forest, and pushes it to a dashboard that updates every second. You can watch anomalies appear in real time, jump directly to known anomaly windows, or inject a synthetic spike to test the system.

---

## Stack

- **ML** — scikit-learn Isolation Forest, trained in Google Colab
- **Backend** — FastAPI + Uvicorn
- **Frontend** — Next.js 14, Tailwind CSS, Recharts

---

## Project Structure

```
iot-anomaly-detection/
├── colab_training.py            # train the model here
├── hypothesis_testing_cells.py  # statistical validation
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── model.pkl        ← add after Colab
│   ├── scaler.pkl       ← add after Colab
│   ├── threshold.pkl    ← add after Colab
│   └── data/
│       └── iot_dataset.csv
└── frontend/
    ├── app/
    ├── components/
    └── lib/
```

---

## Getting Started

### 1. Train the model (Google Colab)

Open `colab_training.py` in Colab, upload your dataset, and run all cells. At the end, download the three output files:

```python
from google.colab import files
files.download("model.pkl")
files.download("scaler.pkl")
files.download("threshold.pkl")
```

Drop all three into `backend/`. That's it for training.

> **Why three files?** The model and scaler are standard. The threshold is a calibrated decision boundary found by scanning F1 across the full dataset — more accurate than sklearn's default.

### 2. Run the backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On startup you should see the threshold value printed — that confirms all three pkl files loaded correctly.

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend proxies `/api/*` to the backend automatically.

---

## Demo walkthrough

1. Hit **Start** — charts begin populating
2. Hit **Jump to Anomaly → Day 1 · 18:21** — streams from 5 rows before the anomaly window so you see the transition from normal → anomaly
3. Hit **Inject Anomaly** — forces a synthetic spike on the next row
4. Watch the Metrics panel — Detection Rate and Accuracy update live
5. Hit **Reset** to start over

---

## The model

Training is unsupervised — Isolation Forest gets no labels. The trick is *what you train on*: the anomaly-interval rows are excluded from `model.fit()` so the model learns a clean picture of normal behaviour. Anomalous readings then become genuine outliers at inference time.

```
All rows
 ├── inside anomaly intervals  →  excluded from training, used for evaluation only
 └── outside anomaly intervals →  model.fit(X_scaled)
```

The known anomaly windows (Day 1: 18:21–19:37, Day 2: 02:26–04:15 and 08:54–10:45) are stored as UNIX timestamp ranges and used purely for evaluation — computing TP/FP/TN/FN and running the hypothesis tests.

---

## Hypothesis testing

Run `hypothesis_testing_cells.py` in the same Colab session after training. It runs four tests and produces a summary figure:

| Test | Question |
|---|---|
| Mann-Whitney U | Are anomaly scores stochastically lower than normal scores? |
| Kolmogorov-Smirnov | Do the two score distributions look different overall? |
| Welch's t-test (per feature) | Which sensors actually change during anomaly events? |
| Levene's test | Are anomaly scores more erratic (higher variance)? |

A good model should show p < 0.001 on the first two, significance on Temperature and Humidity in the t-tests, and non-significance on Air Quality (it barely moves).

---

## API

| Endpoint | What it does |
|---|---|
| `POST /start` | Begin streaming |
| `GET /stream` | Next row + prediction (poll every 1s) |
| `POST /reset` | Reset index and metrics |
| `POST /inject-anomaly` | Spike values on next row |
| `POST /jump-to-anomaly` | Seek to interval `{ "interval_index": 0 }` |
| `GET /metrics` | Live TP/FP/TN/FN + accuracy/DR/FPR |

---

## Troubleshooting

**Detection Rate is 0%** — model was trained on dirty data. Re-run `colab_training.py` and confirm it prints `Training rows: X (anomaly rows excluded)`.

**`threshold.pkl not found`** — download it from Colab and place it in `backend/`. The backend falls back to `0.0` which will give poor results.

**Version mismatch errors on startup** — Colab and your local environment must use the same scikit-learn version (`1.4.2` recommended).

**Charts empty after Start** — check the browser network tab. If `/api/stream` returns 400, the backend isn't in a started state — click Start again or check that both servers are running.