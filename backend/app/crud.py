from sqlalchemy.orm import Session

from app import models, schemas


def get_equipment(db: Session, equipment_id: str):
    return (
        db.query(models.Equipment)
        .filter(models.Equipment.id == equipment_id)
        .first()
    )


def create_equipment(
    db: Session,
    equipment: schemas.EquipmentOut,
):
    db_equipment = models.Equipment(**equipment.dict())

    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)

    return db_equipment


def get_rental(db: Session, rental_id: str):
    return (
        db.query(models.Rental)
        .filter(models.Rental.id == rental_id)
        .first()
    )


def get_rentals(
    db: Session,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(models.Rental)
        .order_by(models.Rental.checkout_datetime.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_rental_count(db: Session):
    return db.query(models.Rental).count()


def get_telemetry_history(
    db: Session,
    equipment_id: str,
    skip: int = 0,
    limit: int = 100,
):
    return (
        db.query(models.Telemetry)
        .filter(
            models.Telemetry.equipment_id == equipment_id
        )
        .order_by(models.Telemetry.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def save_telemetry(
    db: Session,
    telemetry: schemas.TelemetryCreate,
):
    db_telemetry = models.Telemetry(**telemetry.dict())

    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)

    return db_telemetry


def save_prediction(
    db: Session,
    pred: schemas.PredictionResponse,
):
    db_pred = models.Prediction(
        telemetry_id=pred.telemetry_id,
        predicted_maintenance_status=(
            pred.predicted_maintenance_status
        ),
        predicted_anomaly=pred.predicted_anomaly,
        confidence=pred.confidence,
    )

    db.add(db_pred)
    db.commit()
    db.refresh(db_pred)

    return db_pred