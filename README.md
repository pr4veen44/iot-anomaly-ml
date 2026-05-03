# IoT Anomaly Detection System

Real-time monitoring system for IoT sensor data with anomaly detection using an Isolation Forest model. Streams live data, detects outliers, and visualizes everything on a dashboard.

---

## Overview

This project simulates a real-world IoT monitoring setup where sensor readings are processed one by one, scored by a trained model, and displayed live.

Each incoming data point (Temperature, Humidity, Air Quality, Light, Loudness) is passed through the model to determine whether it's normal or anomalous. The results are streamed to a dashboard that updates every second, so you can actually *see* anomalies happening instead of just analyzing them offline.

You can also jump to known anomaly regions or inject artificial spikes to test how the system behaves.

---

## Tech Stack

-   **Machine Learning** — Isolation Forest (scikit-learn)
-   **Backend** — FastAPI + Uvicorn
-   **Frontend** — Next.js 14, Tailwind CSS, Recharts

---

## Project Structure

```
iot-anomaly-detection/
├── colab_training.py            
├── hypothesis_testing_cells.py  
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── model.pkl        
│   ├── scaler.pkl       
│   ├── threshold.pkl    
│   └── data/
│       └── iot_dataset.csv
└── frontend/
    ├── app/
    ├── components/
    └── lib/
```

---

## Running the Project

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On startup you should see the threshold value printed — that confirms all three pkl files loaded correctly.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend proxies `/api/*` to the backend automatically.

---

## How it works

-   Data is read row by row from the dataset
-   Each row is scaled and passed through the Isolation Forest
-   The anomaly score is compared against a custom threshold
-   Results are streamed to the frontend in real time

The model is trained only on *normal* data. Known anomaly intervals are excluded during training and used later for evaluation.

---

## Features

-   Live streaming of sensor data (1 second interval)
-   Real-time anomaly detection
-   Jump directly to anomaly regions
-   Inject synthetic anomalies for testing
-   Live metrics (accuracy, detection rate, false positives)

---

## Demo Flow

1.  Click **Start** → data begins streaming
2.  Use **Jump to Anomaly** → see transition into anomaly
3.  Click **Inject Anomaly** → simulate a spike
4.  Watch metrics update live
5.  Click **Reset** to restart

---

## Model Details

-   Algorithm: Isolation Forest (unsupervised)
-   No labels used during training
-   Trained only on normal behavior
-   Custom threshold selected using F1-based tuning instead of default scoring

---

## Evaluation

Known anomaly windows are stored as timestamp ranges and used to compute:

-   True Positives / False Positives
-   Accuracy
-   Detection Rate
-   False Positive Rate

Additional statistical tests are included in the notebook to validate that anomaly scores behave as expected.

---

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `POST /start` | Start streaming |
| `GET /stream` | Get next data point + prediction |
| `POST /reset` | Reset stream and metrics |
| `POST /inject-anomaly` | Inject synthetic anomaly |
| `POST /jump-to-anomaly` | Jump to predefined anomaly window |
| `GET /metrics` | Get live performance metrics |
