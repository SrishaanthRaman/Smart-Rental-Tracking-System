# train_models.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import joblib

print("Loading data...")
df = pd.read_csv('backend/data/smart_rental_cleaned.csv')

print("Preparing features...")
features = ['engine_hours', 'operating_hours', 'utilization_pct']
X = df[features].fillna(0)

# Target: maintenance_status
le = LabelEncoder()
y = le.fit_transform(df['maintenance_status'])

print("Training model...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

print("Saving model...")
joblib.dump(model, 'backend/models/maintenance_model.pkl')
print("✅ Model saved to backend/models/maintenance_model.pkl")
