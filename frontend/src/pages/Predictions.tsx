import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import {
  getEquipmentHistory,
  type Prediction,
  type Telemetry,
} from "../services/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function Predictions() {
  const [equipmentId, setEquipmentId] = useState("EQX0001");
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState("");

  async function runPrediction(history: Telemetry[]) {
    const latest = history[0];

    if (!latest) {
      setPrediction(null);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/predict/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telemetry_id: latest.telemetry_id,
        timestamp: latest.timestamp,
        equipment_id: latest.equipment_id,
        longitude: latest.longitude,
        engine_status: latest.engine_status,
        engine_hours: latest.engine_hours,
        operating_hours: latest.operating_hours,
        utilization_pct: latest.utilization_pct,
        maintenance_status: latest.maintenance_status,
        rental_id: latest.rental_id,
        fuel_efficiency: latest.fuel_efficiency ?? null,
        anomaly_injected: latest.anomaly_injected ?? false,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Prediction request failed.");
    }

    const result = (await response.json()) as Prediction;
    setPrediction(result);
    setLastRun(new Date().toISOString());
  }

  async function handleSearch() {
    const id = equipmentId.trim();

    if (!id) {
      setError("Please enter an equipment ID.");
      setTelemetry([]);
      setPrediction(null);
      setSearched(true);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(false);
      setPrediction(null);

      const history = await getEquipmentHistory(id, 0, 100);

      setTelemetry(history);
      setSearched(true);

      if (history.length === 0) {
        setError("No telemetry records found for this equipment.");
        return;
      }

      await runPrediction(history);
    } catch (err) {
      console.error("Prediction request failed:", err);
      setPrediction(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate a maintenance prediction."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!equipmentId.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const history = await getEquipmentHistory(
        equipmentId.trim(),
        0,
        100
      );

      setTelemetry(history);

      if (history.length === 0) {
        setPrediction(null);
        setError("No telemetry records found for this equipment.");
        return;
      }

      await runPrediction(history);
    } catch (err) {
      console.error("Prediction refresh failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh the prediction."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSearch();
  }

  const latest = telemetry[0] ?? null;
  const confidence = prediction?.confidence ?? 0;
  const status = prediction?.predicted_maintenance_status ?? "—";
  const isAnomaly = prediction?.predicted_anomaly ?? false;
  const riskLevel = getRiskLevel(status, isAnomaly, confidence);
  const recommendation = getRecommendation(status, isAnomaly);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <Activity size={22} />
            <h2>Maintenance Predictions</h2>
          </div>
          <p>
            Run the trained maintenance model against the latest equipment
            telemetry.
          </p>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={handleRefresh}
          disabled={loading || !searched}
        >
          <RefreshCw size={16} />
          {loading ? "Running..." : "Refresh Prediction"}
        </button>
      </div>

      <section className="panel equipment-search">
        <form onSubmit={handleSubmit}>
          <label htmlFor="prediction-equipment-id">Equipment ID</label>
          <div className="search-row">
            <input
              id="prediction-equipment-id"
              value={equipmentId}
              onChange={(event) => setEquipmentId(event.target.value)}
              placeholder="Enter equipment ID"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              <Search size={16} />
              {loading ? "Running..." : "Run Prediction"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-card">
          <Activity size={24} />
          <span>Fetching telemetry and running the ML model...</span>
        </div>
      )}

      {!loading && latest && prediction && (
        <>
          <div className="stats-grid">
            <PredictionStat
              icon={<Wrench size={20} />}
              label="Predicted Maintenance"
              value={status}
              detail="Current model output"
            />
            <PredictionStat
              icon={<ShieldCheck size={20} />}
              label="Confidence"
              value={`${(confidence * 100).toFixed(1)}%`}
              detail="Model prediction confidence"
            />
            <PredictionStat
              icon={<AlertTriangle size={20} />}
              label="Anomaly"
              value={isAnomaly ? "Detected" : "Normal"}
              detail="Telemetry rule assessment"
            />
            <PredictionStat
              icon={<Gauge size={20} />}
              label="Risk Level"
              value={riskLevel}
              detail="Operational interpretation"
            />
          </div>

          <div className="prediction-layout">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Prediction Result</h3>
                  <p>Latest telemetry evaluation for {latest.equipment_id}</p>
                </div>
                {isAnomaly ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
              </div>

              <div className="prediction-result">
                <div
                  className={`prediction-icon ${
                    isAnomaly || status !== "Good" ? "danger" : "success"
                  }`}
                >
                  {isAnomaly || status !== "Good" ? (
                    <AlertTriangle size={34} />
                  ) : (
                    <CheckCircle2 size={34} />
                  )}
                </div>

                <span className="result-label">Predicted maintenance status</span>
                <h4>{status}</h4>

                <div className="confidence">
                  <div className="confidence-header">
                    <span>Confidence</span>
                    <strong>{(confidence * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${Math.max(0, Math.min(100, confidence * 100))}%` }}
                    />
                  </div>
                </div>

                <div
                  className={`anomaly-result ${
                    isAnomaly ? "anomaly" : "normal"
                  }`}
                >
                  {isAnomaly ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <div>
                    <strong>
                      {isAnomaly ? "Anomaly detected" : "No anomaly detected"}
                    </strong>
                    <span>
                      {isAnomaly
                        ? "Telemetry crossed an operational anomaly threshold."
                        : "Current telemetry is within the configured anomaly thresholds."}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Recommended Action</h3>
                  <p>Operational response based on the result</p>
                </div>
                <Wrench size={20} />
              </div>

              <div className="forecast-explanation">
                <div className="explanation-icon">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.description}</p>
                </div>
              </div>

              <div className="model-info-card">
                <div className="model-info-grid">
                  <ModelInfo label="Equipment" value={latest.equipment_id} />
                  <ModelInfo label="Telemetry ID" value={latest.telemetry_id} />
                  <ModelInfo label="Engine Status" value={latest.engine_status} />
                  <ModelInfo
                    label="Utilization"
                    value={`${latest.utilization_pct.toFixed(1)}%`}
                  />
                  <ModelInfo
                    label="Engine Hours"
                    value={`${latest.engine_hours.toFixed(2)} h`}
                  />
                  <ModelInfo
                    label="Operating Hours"
                    value={`${latest.operating_hours.toFixed(2)} h`}
                  />
                  <ModelInfo
                    label="Fuel Efficiency"
                    value={
                      latest.fuel_efficiency != null
                        ? `${latest.fuel_efficiency.toFixed(2)} L/op.hr`
                        : "N/A"
                    }
                  />
                  <ModelInfo
                    label="Telemetry Time"
                    value={formatDate(latest.timestamp)}
                  />
                </div>
              </div>
            </section>
          </div>

          <section className="panel telemetry-panel">
            <div className="panel-header">
              <div>
                <h3>Recent Telemetry Context</h3>
                <p>
                  The model prediction above was generated from the newest
                  telemetry record.
                </p>
              </div>
              <Clock3 size={20} />
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Engine</th>
                    <th>Engine Hours</th>
                    <th>Operating Hours</th>
                    <th>Utilization</th>
                    <th>Maintenance</th>
                    <th>Anomaly Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.slice(0, 10).map((record) => (
                    <tr key={record.telemetry_id}>
                      <td>{formatDate(record.timestamp)}</td>
                      <td>{record.engine_status}</td>
                      <td>{record.engine_hours.toFixed(1)} h</td>
                      <td>{record.operating_hours.toFixed(1)} h</td>
                      <td>{record.utilization_pct.toFixed(1)}%</td>
                      <td>
                        <span className={`status-pill ${getStatusClass(record.maintenance_status)}`}>
                          {record.maintenance_status}
                        </span>
                      </td>
                      <td>{record.anomaly_injected ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {lastRun && (
              <div className="prediction-run-note">
                Prediction executed at {formatDate(lastRun)} using the latest
                available telemetry.
              </div>
            )}
          </section>
        </>
      )}

      {!loading && searched && !latest && (
        <div className="prediction-empty">
          <AlertTriangle size={24} />
          <h4>No telemetry found</h4>
          <p>
            No telemetry records were returned for this equipment, so a model
            prediction could not be generated.
          </p>
        </div>
      )}

      {!loading && !searched && (
        <div className="prediction-empty">
          <Activity size={24} />
          <h4>Search for equipment</h4>
          <p>
            Enter an equipment ID to evaluate its latest telemetry with the
            maintenance model.
          </p>
        </div>
      )}
    </div>
  );
}

function PredictionStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function ModelInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="model-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getRiskLevel(
  status: string,
  anomaly: boolean,
  confidence: number
) {
  if (anomaly || status.toLowerCase().includes("repair")) {
    return "High";
  }

  if (
    status.toLowerCase().includes("service") ||
    status.toLowerCase().includes("check") ||
    confidence < 0.7
  ) {
    return "Medium";
  }

  return "Low";
}

function getRecommendation(status: string, anomaly: boolean) {
  if (anomaly || status.toLowerCase().includes("repair")) {
    return {
      title: "Inspect equipment before continued operation",
      description:
        "The prediction indicates elevated operational risk. Review the latest telemetry, inspect the asset, and schedule maintenance before returning it to normal rental service.",
    };
  }

  if (
    status.toLowerCase().includes("service") ||
    status.toLowerCase().includes("check")
  ) {
    return {
      title: "Schedule a maintenance check",
      description:
        "The model indicates that the equipment may require attention. Plan a service inspection while keeping the asset under operational review.",
    };
  }

  return {
    title: "Continue normal monitoring",
    description:
      "The model currently classifies the equipment as healthy. Continue telemetry monitoring and rerun the prediction when new operating data becomes available.",
  };
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("good") || normalized.includes("normal")) {
    return "good";
  }

  if (normalized.includes("service") || normalized.includes("check")) {
    return "service-due";
  }

  if (
    normalized.includes("repair") ||
    normalized.includes("critical") ||
    normalized.includes("failure")
  ) {
    return "repair";
  }

  return "";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default Predictions;
