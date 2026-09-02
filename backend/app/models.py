from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(String, primary_key=True, index=True)  # equipment_id
    model = Column(String)
    vendor_name = Column(String)

class Rental(Base):
    __tablename__ = "rentals"
    id = Column(String, primary_key=True, index=True)  # rental_id
    equipment_id = Column(String, ForeignKey("equipment.id"))
    checkout_datetime = Column(DateTime)
    expected_return_datetime = Column(DateTime)
    checkin_datetime = Column(DateTime, nullable=True)
    rental_status_generated = Column(String)  # on_time, late, early, ongoing
    equipment = relationship("Equipment")

class Telemetry(Base):
    __tablename__ = "telemetry"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    telemetry_id = Column(String, index=True)
    timestamp = Column(DateTime)
    equipment_id = Column(String, ForeignKey("equipment.id"))
    longitude = Column(Float)
    engine_status = Column(String)
    engine_hours = Column(Float)
    operating_hours = Column(Float)
    utilization_pct = Column(Float)
    maintenance_status = Column(String)
    rental_id = Column(String, ForeignKey("rentals.id"))
    fuel_efficiency = Column(Float, nullable=True)
    anomaly_injected = Column(Boolean)
    equipment = relationship("Equipment")
    rental = relationship("Rental")

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    telemetry_id = Column(String, index=True)
    predicted_maintenance_status = Column(String)
    predicted_anomaly = Column(Boolean)
    confidence = Column(Float, nullable=True)
    prediction_timestamp = Column(DateTime, default=datetime.utcnow)