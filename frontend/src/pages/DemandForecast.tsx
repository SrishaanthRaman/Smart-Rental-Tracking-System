import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Cpu,
  MapPin,
  RefreshCw,
  TrendingUp,
  Truck,
} from "lucide-react";

import "../App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const SITES = [
  { id: "S001", name: "Mumbai Central", latitude: 19.076, longitude: 72.5714 },
  { id: "S002", name: "Mumbai East", latitude: 19.076, longitude: 72.8778 },
  { id: "S003", name: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { id: "S004", name: "Kochi", latitude: 9.9312, longitude: 76.6395 },
  { id: "S005", name: "Delhi", latitude: 28.6139, longitude: 77.209 },
  { id: "S006", name: "Bengaluru Central", latitude: 12.9716, longitude: 77.5946 },
  { id: "S007", name: "Bengaluru East", latitude: 12.9716, longitude: 77.6602 },
  { id: "S008", name: "Bengaluru North", latitude: 12.9716, longitude: 77.7499 },
  { id: "S009", name: "Hyderabad", latitude: 17.385, longitude: 78.4867 },
  { id: "S010", name: "Chennai", latitude: 13.0827, longitude: 80.2706 },
];

const EQUIPMENT_MODELS = [
  "CAT 140",
  "CAT 320",
  "CAT 950",
  "CAT D6",
  "JCB 220X",
  "John Deere 850K",
  "Komatsu D65",
  "Komatsu GD655",
  "Komatsu PC210",
  "Komatsu WA380",
  "Liebherr LTM 1100",
  "SANY STC",
  "Tadano GR-800EX",
  "Volvo G940",
  "Volvo L120",
];

interface DemandPredictionResponse {
  site_id: string;
  model: string;
  date: string;
  predicted_demand: number;
}

interface ForecastPoint {
  date: string;
  demand: number;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function getDemandLevel(demand: number) {
  if (demand >= 2.5) {
    return {
      label: "High",
      className: "status-pill status-danger",
      description:
        "Strong demand signal. Prioritize equipment availability at this site.",
    };
  }

  if (demand >= 1) {
    return {
      label: "Moderate",
      className: "status-pill status-warning",
      description:
        "Moderate demand expected. Maintain normal availability and monitor bookings.",
    };
  }

  return {
    label: "Low",
    className: "status-pill status-success",
    description:
      "Low demand expected. Equipment can remain available for other allocation needs.",
  };
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

async function requestForecast(
  siteId: string,
  model: string,
  date: string
): Promise<DemandPredictionResponse> {
  const query = new URLSearchParams({
  site_id: siteId,
  model,
  date,
});

const response = await fetch(
  `${API_BASE_URL}/predict-demand/?${query.toString()}`,
  {
    method: "POST",
  }
);

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Demand forecast failed with status ${response.status}`
    );
  }

  return response.json();
}

export default function DemandForecast() {
  const [siteId, setSiteId] = useState("S008");
  const [model, setModel] = useState("Komatsu GD655");
  const [date, setDate] = useState("2026-09-02");

  const [prediction, setPrediction] =
    useState<DemandPredictionResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingOutlook, setLoadingOutlook] = useState(false);
  const [error, setError] = useState("");

  const selectedSite = useMemo(
    () => SITES.find((site) => site.id === siteId) ?? SITES[0],
    [siteId]
  );

  const demandLevel = prediction
    ? getDemandLevel(prediction.predicted_demand)
    : null;

  const maxForecastDemand = Math.max(
    ...forecast.map((point) => point.demand),
    1
  );

  async function runForecast() {
    try {
      setLoading(true);
      setError("");

      const result = await requestForecast(siteId, model, date);

      setPrediction(result);

      setLoadingOutlook(true);

      const outlookDates = Array.from({ length: 7 }, (_, index) =>
        addDays(date, index)
      );

      const outlook = await Promise.all(
        outlookDates.map(async (forecastDate) => {
          const resultForDate = await requestForecast(
            siteId,
            model,
            forecastDate
          );

          return {
            date: forecastDate,
            demand: Number(resultForDate.predicted_demand ?? 0),
          };
        })
      );

      setForecast(outlook);
    } catch (err) {
      console.error(err);
      setPrediction(null);
      setForecast([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate demand forecast. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
      setLoadingOutlook(false);
    }
  }

  useEffect(() => {
    runForecast();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <h2>Demand Forecast</h2>
          </div>

          <p>
            Predict equipment demand by site, model, and date using the trained
            forecasting model.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={runForecast}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          {loading ? "Forecasting..." : "Refresh Forecast"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="demand-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Forecast Controls</h3>
              <p>Select the operational scenario to evaluate.</p>
            </div>
          </div>

          <div className="forecast-form">
            <div className="form-group">
              <label htmlFor="forecast-site">Site</label>

              <div className="select-wrapper">
                <MapPin size={16} />

                <select
                  id="forecast-site"
                  value={siteId}
                  onChange={(event) => setSiteId(event.target.value)}
                >
                  {SITES.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.id} — {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="forecast-model">Equipment Model</label>

              <div className="select-wrapper">
                <Truck size={16} />

                <select
                  id="forecast-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {EQUIPMENT_MODELS.map((equipmentModel) => (
                    <option key={equipmentModel} value={equipmentModel}>
                      {equipmentModel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="forecast-date">Forecast Date</label>

              <div className="date-wrapper">
                <CalendarDays size={16} />

                <input
                  id="forecast-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>

            <button
              className="forecast-button"
              type="button"
              onClick={runForecast}
              disabled={loading}
            >
              <BarChart3 size={17} />
              {loading ? "Running Model..." : "Generate Demand Forecast"}
            </button>
          </div>
        </section>

        <section className="panel">
          {prediction && demandLevel ? (
            <div className="demand-result">
              <div className="demand-icon">
                <TrendingUp size={31} />
              </div>

              <span className={demandLevel.className}>
                {demandLevel.label} Demand
              </span>

              <div className="demand-number">
                {prediction.predicted_demand.toFixed(2)}
              </div>

              <div className="demand-unit">
                predicted telemetry-demand units
              </div>

              <div className="forecast-summary">
                <div>
                  <span>Site</span>
                  <strong>{prediction.site_id}</strong>
                </div>

                <div>
                  <span>Model</span>
                  <strong>{prediction.model}</strong>
                </div>

                <div>
                  <span>Date</span>
                  <strong>{formatDate(prediction.date)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="demand-empty">
              <BarChart3 size={34} />
              <h4>No forecast generated</h4>
              <p>
                Select a site, equipment model, and date, then generate a
                forecast.
              </p>
            </div>
          )}
        </section>
      </div>

      {prediction && demandLevel && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={20} />
              </div>

              <div className="stat-content">
                <span>Predicted Demand</span>
                <strong>{prediction.predicted_demand.toFixed(2)}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <MapPin size={20} />
              </div>

              <div className="stat-content">
                <span>Forecast Site</span>
                <strong>{selectedSite.id}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Cpu size={20} />
              </div>

              <div className="stat-content">
                <span>Equipment Model</span>
                <strong>{prediction.model}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircle2 size={20} />
              </div>

              <div className="stat-content">
                <span>Demand Level</span>
                <strong>{demandLevel.label}</strong>
              </div>
            </div>
          </div>

          <div className="content-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>7-Day Demand Outlook</h3>
                  <p>
                    Model-generated forecast for {prediction.model} at{" "}
                    {prediction.site_id}.
                  </p>
                </div>
              </div>

              <div className="forecast-chart">
                {forecast.map((point) => {
                  const height = Math.max(
                    (point.demand / maxForecastDemand) * 100,
                    point.demand > 0 ? 8 : 2
                  );

                  const isSelectedDate = point.date === date;

                  return (
                    <div className="forecast-bar-item" key={point.date}>
                      <div className="forecast-bar-value">
                        {point.demand.toFixed(2)}
                      </div>

                      <div className="forecast-bar-track">
                        <div
                          className={`forecast-bar-fill ${
                            isSelectedDate ? "forecast-bar-active" : ""
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <span>
                        {new Intl.DateTimeFormat("en-IN", {
                          weekday: "short",
                        }).format(new Date(`${point.date}T00:00:00`))}
                      </span>

                      <small>
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "2-digit",
                          month: "short",
                        }).format(new Date(`${point.date}T00:00:00`))}
                      </small>
                    </div>
                  );
                })}
              </div>

              {loadingOutlook && (
                <div className="forecast-loading-note">
                  Updating 7-day outlook...
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Operational Interpretation</h3>
                  <p>Translate the model output into a fleet action.</p>
                </div>
              </div>

              <div className="forecast-explanation">
                <div className="explanation-icon">
                  <TrendingUp size={19} />
                </div>

                <div>
                  <h3>{demandLevel.label} demand expected</h3>
                  <p>{demandLevel.description}</p>
                </div>
              </div>

              <div className="forecast-summary">
                <div>
                  <span>Location</span>
                  <strong>{selectedSite.name}</strong>
                </div>

                <div>
                  <span>Latitude</span>
                  <strong>{selectedSite.latitude.toFixed(4)}</strong>
                </div>

                <div>
                  <span>Longitude</span>
                  <strong>{selectedSite.longitude.toFixed(4)}</strong>
                </div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Forecast Model Context</h3>
                <p>
                  The prediction is generated from the existing trained demand
                  model and its historical telemetry signal.
                </p>
              </div>
            </div>

            <div className="model-info-grid">
              <div className="model-info-item">
                <span>Target</span>
                <strong>Site + equipment-model demand</strong>
              </div>

              <div className="model-info-item">
                <span>Forecast Horizon</span>
                <strong>Selected date + 6 days</strong>
              </div>

              <div className="model-info-item">
                <span>Historical Window</span>
                <strong>Previous 30 days</strong>
              </div>

              <div className="model-info-item">
                <span>Model Features</span>
                <strong>Calendar, lag, rolling, site, model</strong>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
