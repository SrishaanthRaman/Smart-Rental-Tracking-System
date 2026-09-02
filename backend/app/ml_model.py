import joblib
import pandas as pd
import numpy as np

from typing import Tuple
from datetime import datetime, timedelta

from app.schemas import TelemetryCreate
from app.database import SessionLocal
from app import models as db_models


class MaintenancePredictor:

    def __init__(self):
        self.models = {}
        self.label_encoders = None
        self.model_config = None
        self.demand_encoders = None
        self.demand_config = None
        self.site_mapping = None

        self.load_models()

    # ============================================================
    # MODEL LOADING
    # ============================================================

    def load_models(self):
        """Load all ML models, encoders, and configurations."""

        # --------------------------------------------------------
        # 1. Maintenance label encoders
        # --------------------------------------------------------

        try:
            with open("models/label_encoders.pkl", "rb") as f:
                self.label_encoders = joblib.load(f)

            print("✅ Loaded label_encoders.pkl")

        except FileNotFoundError:
            print("⚠️ models/label_encoders.pkl not found")
            self.label_encoders = None

        except Exception as e:
            print(f"❌ Error loading label_encoders.pkl: {e}")
            self.label_encoders = None

        # --------------------------------------------------------
        # 2. Maintenance model configuration
        # --------------------------------------------------------

        try:
            with open("models/model_config.pkl", "rb") as f:
                self.model_config = joblib.load(f)

            print("✅ Loaded model_config.pkl")
            print(
                f"   Config features: "
                f"{self.model_config.get('features', [])}"
            )
            print(
                f"   Threshold: "
                f"{self.model_config.get('threshold', 0.5)}"
            )

        except FileNotFoundError:
            print("⚠️ models/model_config.pkl not found")
            self.model_config = None

        except Exception as e:
            print(f"❌ Error loading model_config.pkl: {e}")
            self.model_config = None

        # --------------------------------------------------------
        # 3. Demand label encoders
        # --------------------------------------------------------

        try:
            with open("models/demand_label_encoders.pkl", "rb") as f:
                self.demand_encoders = joblib.load(f)

            print("✅ Loaded demand_label_encoders.pkl")

        except FileNotFoundError:
            print("⚠️ models/demand_label_encoders.pkl not found")
            self.demand_encoders = None

        except Exception as e:
            print(
                f"❌ Error loading demand_label_encoders.pkl: {e}"
            )
            self.demand_encoders = None

        # --------------------------------------------------------
        # 4. Demand model configuration
        # --------------------------------------------------------

        try:
            with open("models/demand_model_config.pkl", "rb") as f:
                self.demand_config = joblib.load(f)

            print("✅ Loaded demand_model_config.pkl")
            print(
                f"   Demand features: "
                f"{self.demand_config.get('features', [])}"
            )

        except FileNotFoundError:
            print("⚠️ models/demand_model_config.pkl not found")
            self.demand_config = None

        except Exception as e:
            print(
                f"❌ Error loading demand_model_config.pkl: {e}"
            )
            self.demand_config = None

        # --------------------------------------------------------
        # 5. Site mapping
        # --------------------------------------------------------

        try:
            with open("models/site_mapping.pkl", "rb") as f:
                self.site_mapping = joblib.load(f)

            print("✅ Loaded site_mapping.pkl")

        except FileNotFoundError:
            print("⚠️ models/site_mapping.pkl not found")
            self.site_mapping = None

        except Exception as e:
            print(f"❌ Error loading site_mapping.pkl: {e}")
            self.site_mapping = None

        # --------------------------------------------------------
        # 6. Maintenance model
        # --------------------------------------------------------

        model_files = [
            "models/maintenance_model.pkl",
            "models/model.pkl",
            "models/rf_model.pkl",
            "models/xgb_model.pkl",
        ]

        loaded = False

        for model_file in model_files:
            try:
                with open(model_file, "rb") as f:
                    self.models["maintenance"] = joblib.load(f)

                print(
                    f"✅ Loaded maintenance model: "
                    f"{model_file}"
                )

                # Print the actual features expected by sklearn.
                model = self.models["maintenance"]

                if hasattr(model, "feature_names_in_"):
                    print(
                        f"   Maintenance model features: "
                        f"{list(model.feature_names_in_)}"
                    )

                elif hasattr(model, "n_features_in_"):
                    print(
                        f"   Maintenance model expects "
                        f"{model.n_features_in_} features"
                    )

                loaded = True
                break

            except FileNotFoundError:
                continue

            except Exception as e:
                print(
                    f"⚠️ Could not load "
                    f"{model_file}: {e}"
                )

        if not loaded:
            print(
                "⚠️ No maintenance model found - "
                "using fallback logic"
            )

            self.models["maintenance"] = None

        # --------------------------------------------------------
        # 7. Demand model
        # --------------------------------------------------------

        try:
            with open("models/demand_model.pkl", "rb") as f:
                self.models["demand"] = joblib.load(f)

            print("✅ Loaded demand_model.pkl")

        except FileNotFoundError:
            print(
                "⚠️ models/demand_model.pkl not found - "
                "demand forecasting disabled"
            )

            self.models["demand"] = None

        except Exception as e:
            print(
                f"❌ Error loading demand_model.pkl: {e}"
            )

            self.models["demand"] = None

    # ============================================================
    # CATEGORICAL ENCODING
    # ============================================================

    def encode_categorical(self, value, encoder_name):
        """Encode categorical values using label encoders."""

        if (
            self.label_encoders is None
            or encoder_name not in self.label_encoders
        ):
            return 0

        encoder = self.label_encoders[encoder_name]

        try:
            return encoder.transform([value])[0]

        except Exception:
            return 0

    # ============================================================
    # CATEGORICAL DECODING
    # ============================================================

    def decode_categorical(self, encoded_value, encoder_name):
        """Decode categorical values using label encoders."""

        if (
            self.label_encoders is None
            or encoder_name not in self.label_encoders
        ):
            return str(encoded_value)

        encoder = self.label_encoders[encoder_name]

        try:
            return encoder.inverse_transform(
                [encoded_value]
            )[0]

        except Exception:
            return "Unknown"

    # ============================================================
    # MAINTENANCE FEATURE PREPARATION
    # ============================================================

    def prepare_features(
        self,
        telemetry: TelemetryCreate
    ) -> pd.DataFrame:
        """
        Prepare maintenance features.

        IMPORTANT:
        The actual maintenance model was trained using:

            engine_hours
            operating_hours
            utilization_pct

        Therefore inference must use the same feature set.
        """

        model = self.models.get("maintenance")

        # --------------------------------------------------------
        # Determine the features the trained model actually expects
        # --------------------------------------------------------

        if model is not None and hasattr(
            model,
            "feature_names_in_"
        ):
            features_list = list(
                model.feature_names_in_
            )

        elif model is not None and hasattr(
            model,
            "n_features_in_"
        ):
            # The current trained model uses the original
            # three-feature training pipeline.
            if model.n_features_in_ == 3:
                features_list = [
                    "engine_hours",
                    "operating_hours",
                    "utilization_pct",
                ]
            else:
                raise ValueError(
                    "Maintenance model does not expose "
                    "feature names and expects "
                    f"{model.n_features_in_} features."
                )

        elif self.model_config is not None:
            features_list = self.model_config.get(
                "features",
                [
                    "engine_hours",
                    "operating_hours",
                    "utilization_pct",
                ],
            )

        else:
            features_list = [
                "engine_hours",
                "operating_hours",
                "utilization_pct",
            ]

        # --------------------------------------------------------
        # Feature mapping
        # --------------------------------------------------------

        field_mapping = {
            "engine_hours":
                telemetry.engine_hours or 0,

            "operating_hours":
                telemetry.operating_hours or 0,

            "utilization_pct":
                telemetry.utilization_pct or 0,

            "longitude":
                telemetry.longitude or 0,

            "fuel_efficiency_liters_per_operating_hour":
                telemetry.fuel_efficiency or 0,
        }

        feature_dict = {}

        for feature in features_list:

            if feature in field_mapping:
                feature_dict[feature] = (
                    field_mapping[feature]
                )

            else:
                feature_dict[feature] = 0

        X = pd.DataFrame(
            [feature_dict],
            columns=features_list,
        )

        return X

    # ============================================================
    # MAINTENANCE PREDICTION
    # ============================================================

    def predict(
        self,
        telemetry: TelemetryCreate
    ) -> Tuple[str, bool, float]:
        """
        Predict maintenance status and anomaly detection.

        Returns:
            (maintenance_status, is_anomaly, confidence)
        """

        model = self.models.get("maintenance")

        # --------------------------------------------------------
        # Fallback logic
        # --------------------------------------------------------

        if model is None:

            util = telemetry.utilization_pct or 0

            if util > 80:
                return (
                    "Service Due",
                    util > 95,
                    0.85,
                )

            elif util > 60:
                return (
                    "Needs Check",
                    False,
                    0.70,
                )

            return (
                "Good",
                False,
                0.95,
            )

        try:

            # ----------------------------------------------------
            # Prepare features
            # ----------------------------------------------------

            X = self.prepare_features(telemetry)

            print(
                f"🔧 Maintenance input: "
                f"{X.to_dict(orient='records')[0]}"
            )

            # ----------------------------------------------------
            # Model prediction
            # ----------------------------------------------------

            pred = model.predict(X)[0]

            # ----------------------------------------------------
            # Confidence
            # ----------------------------------------------------

            confidence = 0.85

            if hasattr(model, "predict_proba"):

                try:
                    proba = model.predict_proba(X)

                    confidence = float(
                        np.max(proba[0])
                    )

                except Exception as e:
                    print(
                        f"⚠️ Could not calculate "
                        f"maintenance confidence: {e}"
                    )

            # ----------------------------------------------------
            # Decode maintenance status
            # ----------------------------------------------------

            if (
                self.label_encoders
                and "maintenance_status"
                in self.label_encoders
            ):

                status = self.decode_categorical(
                    pred,
                    "maintenance_status",
                )

            else:

                status_map = {
                    0: "Good",
                    1: "Service Due",
                    2: "Needs Repair",
                }

                status = status_map.get(
                    pred,
                    "Unknown",
                )

            # ----------------------------------------------------
            # Anomaly detection
            # ----------------------------------------------------

            anomaly = False

            if (telemetry.utilization_pct or 0) > 95:
                anomaly = True

            elif (
                telemetry.fuel_efficiency
                and telemetry.fuel_efficiency < 8
            ):
                anomaly = True

            return (
                status,
                anomaly,
                confidence,
            )

        except Exception as e:

            print(
                f"❌ Maintenance prediction error: {e}"
            )

            return (
                "Good",
                False,
                0.50,
            )

    # ============================================================
    # DEMAND PREDICTION
    # ============================================================

    def predict_demand(
        self,
        site_id: str,
        model_name: str,
        date: datetime,
    ) -> float:
        """
        Predict equipment demand for a specific site,
        equipment model, and date.

        Demand is defined as the number of telemetry
        records for a site + model on a given day.
        """

        demand_model = self.models.get("demand")

        # --------------------------------------------------------
        # Check model availability
        # --------------------------------------------------------

        if (
            demand_model is None
            or self.demand_encoders is None
        ):
            print(
                "⚠️ Demand model or encoders unavailable"
            )
            return 0.0

        try:

            # ====================================================
            # 1. ENCODE SITE AND MODEL
            # ====================================================

            site_encoder = self.demand_encoders["site"]
            model_encoder = self.demand_encoders["model"]

            site_enc = site_encoder.transform(
                [site_id]
            )[0]

            model_enc = model_encoder.transform(
                [model_name]
            )[0]

            # ====================================================
            # 2. GET SITE LOCATION
            # ====================================================

            if self.site_mapping is None:
                raise ValueError(
                    "site_mapping.pkl is not loaded"
                )

            target_longitude = self.site_mapping.get(
                site_id
            )

            if target_longitude is None:
                raise ValueError(
                    f"Unknown site_id: {site_id}"
                )

            # ====================================================
            # 3. QUERY HISTORICAL TELEMETRY
            # ====================================================

            db = SessionLocal()

            try:

                start_date = (
                    date - timedelta(days=30)
                )

                history = (
                    db.query(db_models.Telemetry)
                    .join(
                        db_models.Equipment,
                        db_models.Telemetry.equipment_id
                        == db_models.Equipment.id
                    )
                    .filter(
                        db_models.Telemetry.timestamp
                        >= start_date,

                        db_models.Telemetry.timestamp
                        < date,

                        db_models.Equipment.model
                        == model_name,

                        db_models.Telemetry.longitude.between(
                            target_longitude - 0.02,
                            target_longitude + 0.02,
                        ),
                    )
                    .order_by(
                        db_models.Telemetry.timestamp.asc()
                    )
                    .all()
                )

                # =================================================
                # 4. AGGREGATE DAILY DEMAND
                # =================================================

                daily_counts = {}

                for telemetry in history:

                    if telemetry.timestamp is None:
                        continue

                    telemetry_date = (
                        telemetry.timestamp.date()
                    )

                    daily_counts[telemetry_date] = (
                        daily_counts.get(
                            telemetry_date,
                            0,
                        )
                        + 1
                    )

                # =================================================
                # 5. COMPLETE 30-DAY SERIES
                # =================================================

                historical_dates = [
                    (
                        start_date
                        + timedelta(days=i)
                    ).date()
                    for i in range(30)
                ]

                demands = [
                    daily_counts.get(
                        historical_date,
                        0,
                    )
                    for historical_date
                    in historical_dates
                ]

                # =================================================
                # 6. LAG FEATURES
                # =================================================

                lag_1 = demands[-1]

                lag_7 = demands[-7]

                rolling_7 = float(
                    np.mean(demands[-7:])
                )

                rolling_14 = float(
                    np.mean(demands[-14:])
                )

                # =================================================
                # 7. MODEL INPUT
                # =================================================

                features = pd.DataFrame(
                    [
                        {
                            "day_of_week":
                                date.weekday(),

                            "is_weekend":
                                1
                                if date.weekday() >= 5
                                else 0,

                            "month":
                                date.month,

                            "day_of_year":
                                date.timetuple().tm_yday,

                            "lag_1":
                                lag_1,

                            "lag_7":
                                lag_7,

                            "rolling_mean_7":
                                rolling_7,

                            "rolling_mean_14":
                                rolling_14,

                            "site_enc":
                                site_enc,

                            "model_enc":
                                model_enc,
                        }
                    ]
                )

                # =================================================
                # 8. FEATURE ORDER
                # =================================================

                if (
                    self.demand_config
                    and self.demand_config.get("features")
                ):

                    features = features[
                        self.demand_config["features"]
                    ]

                # =================================================
                # 9. PREDICTION
                # =================================================

                prediction = demand_model.predict(
                    features
                )[0]

                prediction = max(
                    0.0,
                    float(prediction),
                )

                print(
                    f"📊 Demand prediction | "
                    f"Site: {site_id} | "
                    f"Model: {model_name} | "
                    f"Date: {date.date()} | "
                    f"Historical rows: {len(history)} | "
                    f"Prediction: {prediction:.2f}"
                )

                return prediction

            finally:
                db.close()

        except Exception as e:

            print(
                f"❌ Demand prediction error: {e}"
            )

            return 0.0


# ================================================================
# SINGLETON INSTANCE
# ================================================================

predictor = MaintenancePredictor()