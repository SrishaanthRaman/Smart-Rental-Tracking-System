import pandas as pd
from sqlalchemy.orm import Session
from app import models, schemas, crud
from datetime import datetime

def load_csv_data(db: Session, filepath: str = "data/smart_rental_cleaned.csv"):
    df = pd.read_csv(filepath)
    # Convert timestamp columns
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['checkout_datetime'] = pd.to_datetime(df['checkout_datetime'])
    df['expected_return_datetime'] = pd.to_datetime(df['expected_return_datetime'])
    df['checkin_datetime'] = pd.to_datetime(df['checkin_datetime'], errors='coerce')

    # Insert equipment
    equipment_df = df[['equipment_id', 'model', 'vendor_name']].drop_duplicates()
    for _, row in equipment_df.iterrows():
        eq = models.Equipment(id=row['equipment_id'], model=row['model'], vendor_name=row['vendor_name'])
        db.merge(eq)

    # Insert rentals
    rental_df = df[['rental_id', 'equipment_id', 'checkout_datetime', 'expected_return_datetime', 'checkin_datetime', 'rental_status_generated']].drop_duplicates()
    for _, row in rental_df.iterrows():
        rental = models.Rental(
            id=row['rental_id'],
            equipment_id=row['equipment_id'],
            checkout_datetime=row['checkout_datetime'],
            expected_return_datetime=row['expected_return_datetime'],
            checkin_datetime=row['checkin_datetime'] if pd.notna(row['checkin_datetime']) else None,
            rental_status_generated=row['rental_status_generated']
        )
        db.merge(rental)

    # Insert telemetry
    for _, row in df.iterrows():
        telemetry = models.Telemetry(
            telemetry_id=row['telemetry_id'],
            timestamp=row['timestamp'],
            equipment_id=row['equipment_id'],
            longitude=row['longitude'],
            engine_status=row['engine_status'],
            engine_hours=row['engine_hours'],
            operating_hours=row['operating_hours'],
            utilization_pct=row['utilization_pct'],
            maintenance_status=row['maintenance_status'],
            rental_id=row['rental_id'],
            fuel_efficiency=row['fuel_efficiency_liters_per_operating_hour'] if pd.notna(row['fuel_efficiency_liters_per_operating_hour']) else None,
            anomaly_injected=row['anomaly_injected']
        )
        db.add(telemetry)

    db.commit()