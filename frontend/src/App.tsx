import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Cpu,
  Gauge,
  Truck,
  Wrench,
} from "lucide-react";

import "./App.css";

import {
  getEquipmentHistory,
  getRental,
  type Rental,
  type Telemetry,
} from "./services/api";

const SITE_LOCATIONS = [
  { siteId: "S001", latitude: 19.0760, longitude: 72.5714 },
  { siteId: "S002", latitude: 19.0760, longitude: 72.8778 },
  { siteId: "S003", latitude: 18.5204, longitude: 73.8567 },
  { siteId: "S004", latitude: 9.9312, longitude: 76.6395 },
  { siteId: "S005", latitude: 28.6139, longitude: 77.2090 },
  { siteId: "S006", latitude: 12.9716, longitude: 77.5946 },
  { siteId: "S007", latitude: 12.9716, longitude: 77.6602 },
  { siteId: "S008", latitude: 12.9716, longitude: 77.7499 },
  { siteId: "S009", latitude: 17.3850, longitude: 78.4867 },
  { siteId: "S010", latitude: 13.0827, longitude: 80.2706 },
];

function getSiteLocation(longitude: number) {
  return SITE_LOCATIONS.reduce((closest, site) =>
    Math.abs(site.longitude - longitude) <
    Math.abs(closest.longitude - longitude)
      ? site
      : closest
  );
}

import Predictions from "./pages/Predictions";
import DemandForecast from "./pages/DemandForecast";
import Equipment from "./pages/Equipment";
import Rentals from "./pages/Rentals";
import Alerts from "./pages/Alerts";

type Page =
  | "dashboard"
  | "equipment"
  | "rentals"
  | "predictions"
  | "demand"
  | "alerts";

function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [equipmentId] = useState("EQX0001");
  const [rentalId] = useState("RNT015207");
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<{
    predicted_maintenance_status: string;
    predicted_anomaly: boolean;
    confidence: number | null;
  } | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [history, rentalData] = await Promise.all([
        getEquipmentHistory(equipmentId, 0, 100),
        getRental(rentalId),
      ]);

      setTelemetry(history);
      setRental(rentalData);

      if (history.length > 0) {
        const latestTelemetry = history[0];

        try {
          setPredictionLoading(true);

          const predictionResponse = await fetch(
            "http://localhost:8000/predict/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(latestTelemetry),
            }
          );

          if (!predictionResponse.ok) {
            throw new Error(
              `Prediction request failed with status ${predictionResponse.status}`
            );
          }

          const predictionData = await predictionResponse.json();

          setPrediction({
            predicted_maintenance_status:
              predictionData.predicted_maintenance_status,
            predicted_anomaly: Boolean(predictionData.predicted_anomaly),
            confidence:
              predictionData.confidence == null
                ? null
                : Number(predictionData.confidence),
          });
        } catch (predictionError) {
          console.error("Dashboard prediction failed:", predictionError);
          setPrediction(null);
        } finally {
          setPredictionLoading(false);
        }
      } else {
        setPrediction(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const latest = telemetry.length > 0 ? telemetry[0] : null;

  const maintenanceStatus = latest?.maintenance_status ?? "Unknown";

  const activeRental =
    rental?.rental_status_generated?.toLowerCase() === "ongoing";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Truck size={22} />
          </div>

          <div>
            <h1>Smart Rental</h1>
            <span>Tracking System</span>
          </div>
        </div>

        <nav>
          <NavButton
            active={activePage === "dashboard"}
            onClick={() => setActivePage("dashboard")}
            icon={<Gauge size={18} />}
          >
            Dashboard
          </NavButton>

          <NavButton
            active={activePage === "equipment"}
            onClick={() => setActivePage("equipment")}
            icon={<Truck size={18} />}
          >
            Equipment
          </NavButton>

          <NavButton
            active={activePage === "rentals"}
            onClick={() => setActivePage("rentals")}
            icon={<CalendarDays size={18} />}
          >
            Rentals
          </NavButton>

          <NavButton
            active={activePage === "predictions"}
            onClick={() => setActivePage("predictions")}
            icon={<Activity size={18} />}
          >
            Predictions
          </NavButton>

          <NavButton
            active={activePage === "demand"}
            onClick={() => setActivePage("demand")}
            icon={<Cpu size={18} />}
          >
            Demand Forecast
          </NavButton>

          <NavButton
            active={activePage === "alerts"}
            onClick={() => setActivePage("alerts")}
            icon={<Bell size={18} />}
          >
            Operational Alerts
          </NavButton>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Backend Connected
        </div>
      </aside>

      <main className="main">
        {activePage === "predictions" ? (
          <Predictions />
        ) : activePage === "demand" ? (
          <DemandForecast />
        ) : activePage === "equipment" ? (
          <Equipment />
        ) : activePage === "rentals" ? (
          <Rentals />
        ) : activePage === "alerts" ? (
          <Alerts />
        ) : (
          <Dashboard
            equipmentId={equipmentId}
            latest={latest}
            telemetry={telemetry}
            rental={rental}
            loading={loading}
            error={error}
            maintenanceStatus={maintenanceStatus}
            activeRental={activeRental}
            prediction={prediction}
            predictionLoading={predictionLoading}
            onNavigate={setActivePage}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  equipmentId,
  latest,
  telemetry,
  rental,
  loading,
  error,
  maintenanceStatus,
  activeRental,
  prediction,
  predictionLoading,
  onNavigate,
}: {
  equipmentId: string;
  latest: Telemetry | null;
  telemetry: Telemetry[];
  rental: Rental | null;
  loading: boolean;
  error: string;
  maintenanceStatus: string;
  activeRental: boolean;
  prediction: {
    predicted_maintenance_status: string;
    predicted_anomaly: boolean;
    confidence: number | null;
  } | null;
  predictionLoading: boolean;
  onNavigate: (page: Page) => void;
}) {
  const site = latest ? getSiteLocation(latest.longitude) : null;
  const running =
    latest?.engine_status?.toLowerCase().includes("running") ?? false;
  const anomaly = latest?.anomaly_injected === true;
  const utilization = latest?.utilization_pct ?? 0;
  const utilizationLabel =
    utilization >= 80 ? "High" : utilization >= 50 ? "Moderate" : "Low";
  const returnStatus = rental ? getReturnStatus(rental) : "No rental";

  return (
    <div className="dashboard">
      <div className="topbar">
        <div>
          <div
            style={{
              marginBottom: "5px",
              color: "#6b7280",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Operations
          </div>
          <h2>Fleet Dashboard</h2>
          <p>Smart Rental Tracking System overview</p>
        </div>

        <div className="connection-status">
          <span className="status-dot" />
          Live
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-card">
          <Activity size={24} />
          <span>Loading fleet data...</span>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              icon={<Truck size={20} />}
              label="Equipment"
              value={equipmentId}
              detail="Tracked asset"
            />
            <StatCard
              icon={<Activity size={20} />}
              label="Engine State"
              value={latest?.engine_status ?? "Unknown"}
              detail={running ? "Machine running" : "Machine not running"}
            />
            <StatCard
              icon={<Gauge size={20} />}
              label="Utilization"
              value={latest ? `${utilization.toFixed(1)}%` : "—"}
              detail={`${utilizationLabel} utilization`}
            />
            <StatCard
              icon={<CalendarDays size={20} />}
              label="Rental"
              value={rental ? formatStatus(rental.rental_status_generated) : "—"}
              detail={activeRental ? "Currently rented" : "Not currently rented"}
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Fleet Health</h3>
                  <p>Current operational condition of the tracked asset</p>
                </div>
                <WrenchIcon />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <HealthCard
                  label="Maintenance"
                  value={maintenanceStatus}
                  statusClass={getStatusClass(maintenanceStatus)}
                  icon={
                    maintenanceStatus.toLowerCase().includes("good") ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    )
                  }
                />
                <HealthCard
                  label="Engine"
                  value={latest?.engine_status ?? "Unknown"}
                  statusClass={running ? "status-good" : ""}
                  icon={<Activity size={18} />}
                />
                <HealthCard
                  label="Anomaly"
                  value={anomaly ? "Detected" : "None"}
                  statusClass={anomaly ? "status-danger" : "status-good"}
                  icon={<AlertTriangle size={18} />}
                />
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "9px",
                  }}
                >
                  <span style={{ color: "#6b7280", fontSize: "12px" }}>
                    Utilization
                  </span>
                  <strong style={{ color: "#111827", fontSize: "13px" }}>
                    {latest ? `${utilization.toFixed(1)}%` : "—"}
                  </strong>
                </div>
                <div
                  style={{
                    height: "8px",
                    overflow: "hidden",
                    borderRadius: "999px",
                    background: "#e5e7eb",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(Math.max(utilization, 0), 100)}%`,
                      height: "100%",
                      borderRadius: "999px",
                      background: "#374151",
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Current Location</h3>
                  <p>Site-derived equipment position</p>
                </div>
                <Truck size={20} />
              </div>

              {site ? (
                <>
                  <div
                    style={{
                      marginBottom: "18px",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#6b7280",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Site
                    </span>
                    <strong style={{ color: "#111827", fontSize: "22px" }}>
                      {site.siteId}
                    </strong>
                  </div>
                  <div className="info-list">
                    <InfoItem
                      label="Latitude"
                      value={`${site.latitude.toFixed(4)}° N`}
                    />
                    <InfoItem
                      label="Longitude"
                      value={`${latest!.longitude.toFixed(4)}° E`}
                    />
                    <InfoItem
                      label="Telemetry"
                      value={formatDate(latest!.timestamp)}
                    />
                  </div>
                </>
              ) : (
                <div className="empty-state">No location information available.</div>
              )}
            </section>
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Rental Operations</h3>
                  <p>Current rental lifecycle</p>
                </div>
                <CalendarDays size={20} />
              </div>

              {rental ? (
                <>
                  <div className="info-list">
                    <InfoItem label="Rental ID" value={rental.id} />
                    <InfoItem label="Equipment" value={rental.equipment_id} />
                    <InfoItem
                      label="Status"
                      value={formatStatus(rental.rental_status_generated)}
                    />
                    <InfoItem
                      label="Checkout"
                      value={formatDate(rental.checkout_datetime)}
                    />
                    <InfoItem
                      label="Expected Return"
                      value={formatDate(rental.expected_return_datetime)}
                    />
                    <InfoItem
                      label="Check-in"
                      value={
                        rental.checkin_datetime
                          ? formatDate(rental.checkin_datetime)
                          : "Not checked in"
                      }
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "16px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ color: "#6b7280", fontSize: "12px" }}>
                      Return performance
                    </span>
                    <span
                      className={`status-badge ${
                        returnStatus === "Late"
                          ? "status-danger"
                          : returnStatus === "On Time"
                            ? "status-good"
                            : returnStatus === "Early"
                              ? "status-warning"
                              : ""
                      }`}
                    >
                      {returnStatus}
                    </span>
                  </div>
                </>
              ) : (
                <div className="empty-state">No rental information available.</div>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Operational Metrics</h3>
                  <p>Latest machine measurements</p>
                </div>
                <Gauge size={20} />
              </div>

              {latest ? (
                <div className="overview-grid">
                  <Metric
                    label="Engine Hours"
                    value={`${latest.engine_hours.toFixed(2)} h`}
                  />
                  <Metric
                    label="Operating Hours"
                    value={`${latest.operating_hours.toFixed(2)} h`}
                  />
                  <Metric
                    label="Utilization"
                    value={`${latest.utilization_pct.toFixed(2)}%`}
                  />
                  <Metric
                    label="Fuel Efficiency"
                    value={
                      latest.fuel_efficiency != null
                        ? `${latest.fuel_efficiency.toFixed(2)} L/op.hr`
                        : "N/A"
                    }
                  />
                  <Metric
                    label="Maintenance"
                    value={latest.maintenance_status}
                  />
                  <Metric
                    label="Telemetry Records"
                    value={String(telemetry.length)}
                  />
                </div>
              ) : (
                <div className="empty-state">No telemetry available.</div>
              )}
            </section>
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>ML Maintenance Insight</h3>
                  <p>Latest telemetry evaluated by the maintenance model</p>
                </div>
                <Activity size={20} />
              </div>

              {predictionLoading ? (
                <div className="loading-card">
                  <Activity size={20} />
                  <span>Running maintenance prediction...</span>
                </div>
              ) : prediction ? (
                <div className="overview-grid">
                  <Metric
                    label="Predicted Maintenance"
                    value={prediction.predicted_maintenance_status}
                  />
                  <Metric
                    label="Confidence"
                    value={
                      prediction.confidence == null
                        ? "N/A"
                        : `${(prediction.confidence * 100).toFixed(1)}%`
                    }
                  />
                  <Metric
                    label="Anomaly"
                    value={prediction.predicted_anomaly ? "Detected" : "None"}
                  />
                  <Metric
                    label="Risk"
                    value={
                      prediction.predicted_anomaly
                        ? "High"
                        : prediction.predicted_maintenance_status
                            .toLowerCase()
                            .includes("repair")
                          ? "High"
                          : prediction.predicted_maintenance_status
                              .toLowerCase()
                              .includes("service") ||
                              prediction.predicted_maintenance_status
                                .toLowerCase()
                                .includes("check")
                            ? "Medium"
                            : "Low"
                    }
                  />
                </div>
              ) : (
                <div className="empty-state">
                  ML prediction unavailable for the current telemetry.
                </div>
              )}

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <span style={{ color: "#6b7280", fontSize: "12px" }}>
                  Decision support
                </span>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#374151",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  {prediction?.predicted_anomaly
                    ? "Investigate the equipment condition and review the full prediction details."
                    : prediction?.predicted_maintenance_status
                        .toLowerCase()
                        .includes("service")
                      ? "Schedule service review while keeping the asset under operational monitoring."
                      : "No immediate ML maintenance escalation is indicated by the latest telemetry."}
                </p>
              </div>

              <div style={{ marginTop: "14px" }}>
                <QuickAction
                  icon={<Activity size={18} />}
                  title="Open Predictions"
                  description="Review the full ML prediction"
                  onClick={() => onNavigate("predictions")}
                />
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Operational Decision Path</h3>
                  <p>How the dashboard connects live signals to actions</p>
                </div>
                <CheckCircle2 size={20} />
              </div>

              <div className="info-list">
                <InfoItem
                  label="Telemetry"
                  value={latest ? "Live signal available" : "Unavailable"}
                />
                <InfoItem
                  label="Maintenance ML"
                  value={prediction ? "Prediction available" : "Unavailable"}
                />
                <InfoItem
                  label="Rental Operations"
                  value={rental ? formatStatus(rental.rental_status_generated) : "No rental"}
                />
                <InfoItem
                  label="Demand Forecast"
                  value="Available"
                />
                <InfoItem
                  label="Operational Alerts"
                  value="Available"
                />
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <strong style={{ fontSize: "12px", color: "#111827" }}>
                  Recommended workflow
                </strong>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#6b7280",
                    fontSize: "12px",
                    lineHeight: 1.6,
                  }}
                >
                  Monitor telemetry → evaluate maintenance risk → review rental
                  status → check demand → act on operational alerts.
                </p>
              </div>
            </section>
          </div>

          <section className="panel telemetry-panel">
            <div className="panel-header">
              <div>
                <h3>Recent Telemetry</h3>
                <p>Latest readings for {equipmentId}</p>
              </div>
              <Activity size={20} />
            </div>

            {telemetry.length > 0 ? (
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
                          <span
                            className={`status-badge ${getStatusClass(
                              record.maintenance_status
                            )}`}
                          >
                            {record.maintenance_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No telemetry records available.</div>
            )}
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <QuickAction
              icon={<Truck size={18} />}
              title="Equipment"
              description="Inspect equipment telemetry"
              onClick={() => onNavigate("equipment")}
            />
            <QuickAction
              icon={<CalendarDays size={18} />}
              title="Rentals"
              description="Review rental operations"
              onClick={() => onNavigate("rentals")}
            />
            <QuickAction
              icon={<Activity size={18} />}
              title="Predictions"
              description="Run ML maintenance checks"
              onClick={() => onNavigate("predictions")}
            />
            <QuickAction
              icon={<Cpu size={18} />}
              title="Demand"
              description="Forecast equipment demand"
              onClick={() => onNavigate("demand")}
            />
          </div>
        </>
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  statusClass,
  icon,
}: {
  label: string;
  value: string;
  statusClass: string;
  icon: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          marginBottom: "9px",
          color: "#6b7280",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {icon}
        {label}
      </div>
      <span className={`status-badge ${statusClass}`}>{value}</span>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "14px 16px",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#ffffff",
        color: "#111827",
        textAlign: "left",
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRadius: "9px",
          background: "#f3f4f6",
          color: "#374151",
        }}
      >
        {icon}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <strong style={{ fontSize: "13px" }}>{title}</strong>
        <span style={{ color: "#6b7280", fontSize: "11px" }}>
          {description}
        </span>
      </span>
    </button>
  );
}

function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "on_time":
      return "On Time";
    case "ongoing":
      return "Ongoing";
    case "late":
      return "Late";
    case "early":
      return "Early";
    default:
      return status;
  }
}

function getReturnStatus(rental: Rental): string {
  if (!rental.checkin_datetime) {
    return "Ongoing";
  }

  const expected = new Date(rental.expected_return_datetime);
  const actual = new Date(rental.checkin_datetime);

  if (
    Number.isNaN(expected.getTime()) ||
    Number.isNaN(actual.getTime())
  ) {
    return "Unknown";
  }

  const differenceHours =
    (actual.getTime() - expected.getTime()) / (1000 * 60 * 60);

  if (Math.abs(differenceHours) < 1) {
    return "On Time";
  }

  return differenceHours > 0 ? "Late" : "Early";
}

function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function StatCard({
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

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("good") ||
    normalized.includes("normal") ||
    normalized.includes("active") ||
    normalized.includes("ongoing")
  ) {
    return "status-good";
  }

  if (
    normalized.includes("service") ||
    normalized.includes("due") ||
    normalized.includes("pending")
  ) {
    return "status-warning";
  }

  if (
    normalized.includes("critical") ||
    normalized.includes("failure") ||
    normalized.includes("overdue")
  ) {
    return "status-danger";
  }

  return "";
}

function WrenchIcon() {
  return <Wrench size={20} />;
}

export default App;