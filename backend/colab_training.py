# ============================================================
#  IoT Anomaly Detection — Model Training (Google Colab)
#  Run each cell in sequence inside Colab
# ============================================================

# ── Cell 1: Install dependencies ────────────────────────────
# !pip install scikit-learn pandas numpy

# ── Cell 2: Imports ──────────────────────────────────────────
import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

# ── Cell 3: Upload dataset ────────────────────────────────────
# In Colab, run this cell to upload your CSV file:
# from google.colab import files
# uploaded = files.upload()
# Then set DATA_PATH to the filename:
DATA_PATH = "iot_dataset.csv"    # ← change if needed

# ── Cell 4: Load & inspect data ──────────────────────────────
df = pd.read_csv(DATA_PATH)
df.columns = df.columns.str.strip()

print("Shape:", df.shape)
print("\nFirst 5 rows:")
print(df.head())
print("\nData types:")
print(df.dtypes)
print("\nMissing values:")
print(df.isnull().sum())

# ── Cell 5: Feature extraction ───────────────────────────────
# IMPORTANT: Training is UNSUPERVISED — no anomaly labels used.
# The anomaly intervals listed below are ONLY for post-training evaluation.

FEATURES = ["Temperature", "Humidity", "Air Quality", "Light", "Loudness"]

# Rename 'Time' column if needed
if "Time" in df.columns:
    df.rename(columns={"Time": "timestamp"}, inplace=True)

# Drop rows with any NaN in feature columns
df_clean = df[FEATURES + ["timestamp"]].dropna()
X = df_clean[FEATURES].values

print(f"\nTraining samples: {len(X)}")
print("Feature matrix shape:", X.shape)

# ── Cell 6: Feature statistics ───────────────────────────────
print("\nFeature statistics:")
print(pd.DataFrame(X, columns=FEATURES).describe())

# ── Cell 7: Scale features ────────────────────────────────────
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("\nScaled feature means (should be ~0):", X_scaled.mean(axis=0).round(4))
print("Scaled feature stds  (should be ~1):", X_scaled.std(axis=0).round(4))

# ── Cell 8: Train Isolation Forest ───────────────────────────
# contamination=0.05 means ~5% of data is expected to be anomalous
# random_state=42 for reproducibility
# Training is purely unsupervised — no labels involved

model = IsolationForest(
    contamination=0.05,
    random_state=42,
    n_estimators=100,
    max_samples="auto",
    n_jobs=-1,
)

print("Training Isolation Forest...")
model.fit(X_scaled)
print("Training complete!")

# ── Cell 9: Quick sanity check ───────────────────────────────
predictions    = model.predict(X_scaled)          # 1 = normal, -1 = anomaly
anomaly_scores = model.decision_function(X_scaled)

n_anomalies = (predictions == -1).sum()
print(f"\nPredicted anomalies: {n_anomalies} / {len(predictions)} ({n_anomalies/len(predictions)*100:.2f}%)")
print(f"Anomaly score range: [{anomaly_scores.min():.4f}, {anomaly_scores.max():.4f}]")
print("Lower score = more anomalous")

# ── Cell 10: Evaluation against known intervals ───────────────
# ANOMALY_INTERVALS are used ONLY here for evaluation — NOT during training.

_D1 = 1623715200          # June 15, 2021 00:00:00 UTC
_D2 = 1623715200 + 86400  # June 16, 2021 00:00:00 UTC

ANOMALY_INTERVALS = [
    (_D1 + 18*3600 + 21*60 + 46,  _D1 + 19*3600 + 37*60 + 16),  # Day 1
    (_D2 +  2*3600 + 26*60 + 36,  _D2 +  4*3600 + 15*60 + 56),  # Day 2 morning
    (_D2 +  8*3600 + 54*60 + 46,  _D2 + 10*3600 + 45*60 + 36),  # Day 2 late
]

def is_anomaly_interval(ts):
    for s, e in ANOMALY_INTERVALS:
        if s <= ts <= e:
            return True
    return False

df_clean["prediction"]    = predictions
df_clean["anomaly_score"] = anomaly_scores
df_clean["gt_anomaly"]    = df_clean["timestamp"].apply(is_anomaly_interval)

TP = ((df_clean["prediction"] == -1) &  df_clean["gt_anomaly"]).sum()
FP = ((df_clean["prediction"] == -1) & ~df_clean["gt_anomaly"]).sum()
TN = ((df_clean["prediction"] ==  1) & ~df_clean["gt_anomaly"]).sum()
FN = ((df_clean["prediction"] ==  1) &  df_clean["gt_anomaly"]).sum()

detection_rate      = TP / (TP + FN) if (TP + FN) > 0 else 0
false_positive_rate = FP / (FP + TN) if (FP + TN) > 0 else 0
accuracy            = (TP + TN) / (TP + FP + TN + FN) if (TP + FP + TN + FN) > 0 else 0

print(f"\n── Evaluation Metrics ──────────────────────")
print(f"  TP: {TP}  FP: {FP}  TN: {TN}  FN: {FN}")
print(f"  Accuracy        : {accuracy*100:.2f}%")
print(f"  Detection Rate  : {detection_rate*100:.2f}%")
print(f"  False Pos. Rate : {false_positive_rate*100:.2f}%")

# ── Cell 11: Save model and scaler ───────────────────────────
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

with open("scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

print("\nSaved: model.pkl  and  scaler.pkl")
print("Download these files and place them inside backend/")

# ── Cell 12: Download files (Colab only) ─────────────────────
# Uncomment in Colab:
# from google.colab import files
# files.download("model.pkl")
# files.download("scaler.pkl")

# ── Hypothesis Testing: Normal vs Anomaly Scores ─────────────

from scipy.stats import ttest_ind, mannwhitneyu
import seaborn as sns

# 1. T-test (assumes normal distribution)
t_stat, t_p = ttest_ind(normal_scores, anomaly_scores, equal_var=False)

# 2. Mann-Whitney U test (non-parametric, more robust)
u_stat, u_p = mannwhitneyu(normal_scores, anomaly_scores, alternative='two-sided')

print("=== Hypothesis Testing Results ===")
print(f"T-test       → stat={t_stat:.4f},  p-value={t_p:.6f}")
print(f"Mann-Whitney → stat={u_stat:.4f}, p-value={u_p:.6f}")

alpha = 0.05

print("\n=== Interpretation ===")
if t_p < alpha:
    print("T-test: Reject H0 → distributions are significantly different")
else:
    print("T-test: Fail to reject H0 → no significant difference")

if u_p < alpha:
    print("Mann-Whitney: Reject H0 → distributions are significantly different")
else:
    print("Mann-Whitney: Fail to reject H0 → no significant difference")


# ── Visualization ───────────────────────────────────────────

plt.figure(figsize=(12,5))

# KDE Plot (smooth distribution)
sns.kdeplot(normal_scores, label="Normal", fill=True)
sns.kdeplot(anomaly_scores, label="Anomaly", fill=True)

plt.title("Distribution Comparison (KDE Plot)")
plt.xlabel("Anomaly Score")
plt.ylabel("Density")
plt.legend()
plt.show()


# Boxplot (clear statistical difference)
plt.figure(figsize=(6,5))
sns.boxplot(data=[normal_scores, anomaly_scores])
plt.xticks([0,1], ["Normal", "Anomaly"])
plt.title("Boxplot: Normal vs Anomaly Scores")
plt.ylabel("Score")
plt.show()