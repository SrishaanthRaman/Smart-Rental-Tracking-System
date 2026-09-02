import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score


# ============================================================
# 1. LOAD DATA
# ============================================================

print("Loading data...")

df = pd.read_csv("backend/data/smart_rental_cleaned.csv")

df["timestamp"] = pd.to_datetime(df["timestamp"])

print(f"Rows loaded: {len(df)}")


# ============================================================
# 2. ASSIGN GEOGRAPHIC SITES
# ============================================================

print("Assigning geographic sites...")

# Existing 10-site scheme, ordered geographically by longitude.
site_centers = {
    "S001": 72.5714,
    "S002": 72.8778,
    "S003": 73.8567,
    "S004": 76.6395,
    "S005": 77.2090,
    "S006": 77.5946,
    "S007": 77.6602,
    "S008": 77.7499,
    "S009": 78.4867,
    "S010": 80.2706,
}

site_names = list(site_centers.keys())
site_values = np.array(list(site_centers.values()))


def assign_site(longitude):
    distances = np.abs(site_values - longitude)
    return site_names[np.argmin(distances)]


df["site_id"] = df["longitude"].apply(assign_site)

print("\nSite distribution:")
print(df["site_id"].value_counts().sort_index())


# ============================================================
# 3. CREATE DAILY DEMAND
# ============================================================

print("\nCreating daily demand...")

df["date"] = df["timestamp"].dt.normalize()

# Demand = number of active telemetry records for a
# particular site + equipment model on a particular day.
daily = (
    df.groupby(["date", "site_id", "model"])
      .size()
      .reset_index(name="demand")
)

print(f"Daily observations: {len(daily)}")


# ============================================================
# 4. CREATE COMPLETE DATE/SITE/MODEL GRID
# ============================================================

print("Creating complete time series...")

all_dates = pd.date_range(
    daily["date"].min(),
    daily["date"].max(),
    freq="D"
)

all_sites = sorted(site_centers.keys())
all_models = sorted(df["model"].unique())

grid = pd.MultiIndex.from_product(
    [all_dates, all_sites, all_models],
    names=["date", "site_id", "model"]
).to_frame(index=False)

daily = grid.merge(
    daily,
    on=["date", "site_id", "model"],
    how="left"
)

daily["demand"] = daily["demand"].fillna(0)


# ============================================================
# 5. CREATE TIME-SERIES FEATURES
# ============================================================

print("Creating lag and rolling features...")

daily = daily.sort_values(
    ["site_id", "model", "date"]
).reset_index(drop=True)

group = daily.groupby(["site_id", "model"])["demand"]

daily["lag_1"] = group.shift(1)
daily["lag_7"] = group.shift(7)

daily["rolling_mean_7"] = (
    daily.groupby(["site_id", "model"])["demand"]
         .transform(lambda x: x.shift(1).rolling(7).mean())
)

daily["rolling_mean_14"] = (
    daily.groupby(["site_id", "model"])["demand"]
         .transform(lambda x: x.shift(1).rolling(14).mean())
)

daily["day_of_week"] = daily["date"].dt.dayofweek
daily["is_weekend"] = (
    daily["day_of_week"] >= 5
).astype(int)

daily["month"] = daily["date"].dt.month
daily["day_of_year"] = daily["date"].dt.dayofyear


# Remove rows without enough history.
daily = daily.dropna(
    subset=[
        "lag_1",
        "lag_7",
        "rolling_mean_7",
        "rolling_mean_14",
    ]
)


# ============================================================
# 6. ENCODE SITE + MODEL
# ============================================================

print("Encoding categorical variables...")

site_encoder = LabelEncoder()
model_encoder = LabelEncoder()

site_encoder.fit(all_sites)
model_encoder.fit(all_models)

daily["site_enc"] = site_encoder.transform(
    daily["site_id"]
)

daily["model_enc"] = model_encoder.transform(
    daily["model"]
)


# ============================================================
# 7. PREPARE FEATURES
# ============================================================

features = [
    "day_of_week",
    "is_weekend",
    "month",
    "day_of_year",
    "lag_1",
    "lag_7",
    "rolling_mean_7",
    "rolling_mean_14",
    "site_enc",
    "model_enc",
]

X = daily[features]
y = daily["demand"]


# ============================================================
# 8. TIME-ORDERED TRAIN/TEST SPLIT
# ============================================================

print("Splitting training/test data...")

split_index = int(len(daily) * 0.8)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


# ============================================================
# 9. TRAIN MODEL
# ============================================================

print("Training demand model...")

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)


# ============================================================
# 10. EVALUATE
# ============================================================

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print("\nModel evaluation:")
print(f"MAE: {mae:.4f}")
print(f"R²:  {r2:.4f}")


# ============================================================
# 11. SAVE MODEL
# ============================================================

print("\nSaving demand model...")

joblib.dump(
    model,
    "backend/models/demand_model.pkl"
)


# ============================================================
# 12. SAVE ENCODERS
# ============================================================

joblib.dump(
    {
        "site": site_encoder,
        "model": model_encoder,
    },
    "backend/models/demand_label_encoders.pkl"
)


# ============================================================
# 13. SAVE CONFIG
# ============================================================

joblib.dump(
    {
        "features": features
    },
    "backend/models/demand_model_config.pkl"
)


# ============================================================
# 14. SAVE SITE MAPPING
# ============================================================

joblib.dump(
    site_centers,
    "backend/models/site_mapping.pkl"
)


print("\n========================================")
print("✅ DEMAND MODEL TRAINING COMPLETE")
print("========================================")
print("Model:    backend/models/demand_model.pkl")
print("Encoders: backend/models/demand_label_encoders.pkl")
print("Config:   backend/models/demand_model_config.pkl")
print("Mapping:  backend/models/site_mapping.pkl")
print(f"MAE:      {mae:.4f}")
print(f"R²:       {r2:.4f}")