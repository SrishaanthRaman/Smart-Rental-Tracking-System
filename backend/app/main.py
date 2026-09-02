from datetime import datetime
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import crud, models, schemas, ml_model
from app.database import SessionLocal, engine


models.Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Smart Rental Equipment API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "message": "Smart Rental Tracking System API",
        "version": "1.0.0",
        "endpoints": {
            "/predict": (
                "Predict maintenance status and anomaly"
            ),
            "/predict-demand": (
                "Predict equipment demand"
            ),
            "/equipment/{id}/history": (
                "Get equipment telemetry history"
            ),
            "/rental/{id}": (
                "Get rental details"
            ),
            "/rentals": (
                "Get rental list"
            ),
            "/load-data": (
                "Load CSV data into database"
            ),
        },
    }


@app.post(
    "/predict/",
    response_model=schemas.PredictionResponse,
)
def predict_telemetry(
    telemetry: schemas.TelemetryCreate,
    db: Session = Depends(get_db),
):
    crud.save_telemetry(db, telemetry)

    maint, anomaly, conf = ml_model.predictor.predict(
        telemetry
    )

    pred_response = schemas.PredictionResponse(
        telemetry_id=telemetry.telemetry_id,
        predicted_maintenance_status=maint,
        predicted_anomaly=anomaly,
        confidence=conf,
    )

    crud.save_prediction(db, pred_response)

    return pred_response


@app.post(
    "/predict-batch/",
    response_model=List[schemas.PredictionResponse],
)
def predict_batch(
    telemetry_list: List[schemas.TelemetryCreate],
    db: Session = Depends(get_db),
):
    responses = []

    for telemetry in telemetry_list:
        crud.save_telemetry(db, telemetry)

        maint, anomaly, conf = (
            ml_model.predictor.predict(telemetry)
        )

        pred_resp = schemas.PredictionResponse(
            telemetry_id=telemetry.telemetry_id,
            predicted_maintenance_status=maint,
            predicted_anomaly=anomaly,
            confidence=conf,
        )

        crud.save_prediction(db, pred_resp)

        responses.append(pred_resp)

    return responses


@app.post("/predict-demand/")
def predict_demand(
    site_id: str,
    model: str,
    date: str,
):
    try:
        date_obj = datetime.strptime(
            date,
            "%Y-%m-%d",
        )

        prediction = ml_model.predictor.predict_demand(
            site_id,
            model,
            date_obj,
        )

        return {
            "site_id": site_id,
            "model": model,
            "date": date,
            "predicted_demand": round(
                prediction,
                2,
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@app.get(
    "/equipment/{equipment_id}/history",
    response_model=List[schemas.TelemetryOut],
)
def get_equipment_history(
    equipment_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    history = crud.get_telemetry_history(
        db,
        equipment_id,
        skip,
        limit,
    )

    if not history:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found",
        )

    return history


@app.get(
    "/rental/{rental_id}",
    response_model=schemas.RentalOut,
)
def get_rental(
    rental_id: str,
    db: Session = Depends(get_db),
):
    rental = crud.get_rental(
        db,
        rental_id,
    )

    if not rental:
        raise HTTPException(
            status_code=404,
            detail="Rental not found",
        )

    return rental


@app.get("/rentals")
def get_rentals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    rentals = crud.get_rentals(
        db,
        skip,
        limit,
    )

    total = crud.get_rental_count(db)

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "rentals": [
            schemas.RentalOut.model_validate(
                rental
            ).model_dump()
            for rental in rentals
        ],
    }


@app.post("/load-data/")
def load_initial_data(
    db: Session = Depends(get_db),
):
    from app.utils import load_csv_data

    load_csv_data(db)

    return {
        "message": "Data loaded successfully"
    }