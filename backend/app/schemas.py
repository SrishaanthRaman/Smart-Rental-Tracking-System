from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TelemetryCreate(BaseModel):
    telemetry_id: str
    timestamp: datetime
    equipment_id: str
    longitude: float
    engine_status: str
    engine_hours: float
    operating_hours: float
    utilization_pct: float
    maintenance_status: str
    rental_id: str
    fuel_efficiency: Optional[float] = None
    anomaly_injected: Optional[bool] = None


class TelemetryOut(TelemetryCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PredictionResponse(BaseModel):
    telemetry_id: str
    predicted_maintenance_status: str
    predicted_anomaly: bool
    confidence: Optional[float] = None


class EquipmentOut(BaseModel):
    id: str
    model: Optional[str] = None
    vendor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RentalOut(BaseModel):
    id: str
    equipment_id: str
    checkout_datetime: datetime
    expected_return_datetime: datetime
    checkin_datetime: Optional[datetime] = None
    rental_status_generated: str

    model_config = ConfigDict(from_attributes=True)