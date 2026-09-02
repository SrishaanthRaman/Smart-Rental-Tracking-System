import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Gauge,
  RefreshCw,
  Search,
  Truck,
  Wrench,
} from "lucide-react";

import {
  getEquipmentHistory,
  getRentals,
  type Rental,
  type Telemetry,
} from "../services/api";

interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  equipmentId?: string;
  rentalId?: string;
  timestamp?: string;
}

function Alerts() {
  const [equipmentId, setEquipmentId] = useState("EQX0001");
  const [searchedEquipmentId, setSearchedEquipmentId] = useState("EQX0001");
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadAlerts(targetEquipmentId = searchedEquipmentId, initial = false) {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const [rentalResponse, history] = await Promise.all([
        getRentals(0, 200),
        getEquipmentHistory(targetEquipmentId, 0, 20),
      ]);

      setRentals(rentalResponse.rentals);
      setTelemetry(history);
    } catch (err) {
      console.error("Alert loading failed:", err);
      setError(
        "Unable to load operational alerts. Make sure the FastAPI backend is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAlerts("EQX0001", true);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = equipmentId.trim();

    if (!id) {
      setError("Please enter an equipment ID.");
      return;
    }

    setSearchedEquipmentId(id);
    loadAlerts(id);
  }

  const alerts = useMemo<AlertItem[]>(() => {
    const result: AlertItem[] = [];
    const latest = telemetry[0];
    const now = new Date();

    rentals.forEach((rental) => {
      const expectedReturn = new Date(rental.expected_return_datetime);
      const status = rental.rental_status_generated.toLowerCase();

      if (status === "late") {
        result.push({
          id: `late-${rental.id}`,
          severity: "critical",
          title: "Late rental return",
          description: `${rental.id} for ${rental.equipment_id} is recorded as late.`,
          equipmentId: rental.equipment_id,
          rentalId: rental.id,
          timestamp: rental.checkin_datetime ?? rental.expected_return_datetime,
        });
      } else if (
        status === "ongoing" &&
        !Number.isNaN(expectedReturn.getTime()) &&
        expectedReturn.getTime() < now.getTime()
      ) {
        result.push({
          id: `overdue-${rental.id}`,
          severity: "critical",
          title: "Rental overdue",
          description: `${rental.id} for ${rental.equipment_id} has passed its expected return time.`,
          equipmentId: rental.equipment_id,
          rentalId: rental.id,
          timestamp: rental.expected_return_datetime,
        });
      }
    });

    if (latest) {
      const utilization = latest.utilization_pct;
      const fuelEfficiency = latest.fuel_efficiency;
      const maintenance = latest.maintenance_status.toLowerCase();

      if (
        maintenance.includes("repair") ||
        maintenance.includes("critical") ||
        maintenance.includes("failure")
      ) {
        result.push({
          id: `maintenance-critical-${latest.telemetry_id}`,
          severity: "critical",
          title: "Critical maintenance state",
          description: `${searchedEquipmentId} reports ${latest.maintenance_status}.`,
          equipmentId: searchedEquipmentId,
          timestamp: latest.timestamp,
        });
      } else if (
        maintenance.includes("service") ||
        maintenance.includes("due") ||
        maintenance.includes("check")
      ) {
        result.push({
          id: `maintenance-warning-${latest.telemetry_id}`,
          severity: "warning",
          title: "Maintenance attention required",
          description: `${searchedEquipmentId} reports ${latest.maintenance_status}.`,
          equipmentId: searchedEquipmentId,
          timestamp: latest.timestamp,
        });
      }

      if (latest.anomaly_injected) {
        result.push({
          id: `anomaly-${latest.telemetry_id}`,
          severity: "critical",
          title: "Telemetry anomaly flagged",
          description: `The latest telemetry record for ${searchedEquipmentId} is flagged as anomalous.`,
          equipmentId: searchedEquipmentId,
          timestamp: latest.timestamp,
        });
      } else if (utilization > 95) {
        result.push({
          id: `utilization-critical-${latest.telemetry_id}`,
          severity: "critical",
          title: "Extreme utilization",
          description: `${searchedEquipmentId} is operating at ${utilization.toFixed(1)}% utilization.`,
          equipmentId: searchedEquipmentId,
          timestamp: latest.timestamp,
        });
      } else if (utilization >= 85) {
        result.push({
          id: `utilization-warning-${latest.telemetry_id}`,
          severity: "warning",
          title: "High utilization",
          description: `${searchedEquipmentId} is operating at ${utilization.toFixed(1)}% utilization.`,
          equipmentId: searchedEquipmentId,
          timestamp: latest.timestamp,
        });
      }

      if (fuelEfficiency != null && fuelEfficiency < 8) {
        result.push({
          id: `fuel-${latest.telemetry_id}`,
          severity: "warning",
          title: "Low fuel efficiency",
          description: `${searchedEquipmentId} is reporting ${fuelEfficiency.toFixed(2)} L/op.hr.`,
          equipmentId: searchedEquipmentId,
          timestamp: latest.timestamp,
        });
      }
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };

    return result.sort((a, b) => {
      const severityDifference = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDifference !== 0) {
        return severityDifference;
      }

      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [rentals, telemetry, searchedEquipmentId]);

  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = alerts.filter((alert) => alert.severity === "warning").length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <Bell size={22} />
            <h2>Operational Alerts</h2>
          </div>
          <p>
            Detect maintenance, telemetry, utilization, and rental exceptions.
          </p>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={() => loadAlerts(searchedEquipmentId)}
          disabled={refreshing || loading}
        >
          <RefreshCw size={16} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "20px",
          padding: "14px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
        }}
      >
        <Search size={18} />
        <input
          value={equipmentId}
          onChange={(event) => setEquipmentId(event.target.value)}
          placeholder="Enter equipment ID"
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "13px",
          }}
        />
        <button type="submit" disabled={loading || refreshing}>
          Search Equipment
        </button>
      </form>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-card">
          <Activity size={24} />
          <span>Loading operational alerts...</span>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <AlertSummaryCard
              icon={<Bell size={20} />}
              label="Active Alerts"
              value={String(alerts.length)}
              detail="Current operational exceptions"
            />
            <AlertSummaryCard
              icon={<AlertTriangle size={20} />}
              label="Critical"
              value={String(criticalCount)}
              detail="Immediate attention"
            />
            <AlertSummaryCard
              icon={<Wrench size={20} />}
              label="Warnings"
              value={String(warningCount)}
              detail="Review recommended"
            />
            <AlertSummaryCard
              icon={<Truck size={20} />}
              label="Tracked Equipment"
              value={searchedEquipmentId}
              detail="Latest telemetry monitored"
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Current Equipment Signals</h3>
                  <p>Latest telemetry for {searchedEquipmentId}</p>
                </div>
                <Gauge size={20} />
              </div>

              {telemetry[0] ? (
                <div className="overview-grid">
                  <AlertMetric
                    label="Engine"
                    value={telemetry[0].engine_status}
                  />
                  <AlertMetric
                    label="Utilization"
                    value={`${telemetry[0].utilization_pct.toFixed(1)}%`}
                  />
                  <AlertMetric
                    label="Maintenance"
                    value={telemetry[0].maintenance_status}
                  />
                  <AlertMetric
                    label="Fuel Efficiency"
                    value={
                      telemetry[0].fuel_efficiency != null
                        ? `${telemetry[0].fuel_efficiency.toFixed(2)} L/op.hr`
                        : "N/A"
                    }
                  />
                </div>
              ) : (
                <div className="empty-state">No telemetry available.</div>
              )}
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Alert Logic</h3>
                  <p>Rules applied to current system data</p>
                </div>
                <CheckCircle2 size={20} />
              </div>

              <div className="summary-list">
                <div>
                  <span>Late rental</span>
                  <strong>Official rental status</strong>
                </div>
                <div>
                  <span>Overdue rental</span>
                  <strong>Ongoing + expected time passed</strong>
                </div>
                <div>
                  <span>High utilization</span>
                  <strong>≥ 85%</strong>
                </div>
                <div>
                  <span>Extreme utilization</span>
                  <strong>&gt; 95%</strong>
                </div>
                <div>
                  <span>Low fuel efficiency</span>
                  <strong>&lt; 8 L/op.hr</strong>
                </div>
              </div>
            </section>
          </div>

          <section className="panel telemetry-panel">
            <div className="panel-header">
              <div>
                <h3>Active Alerts</h3>
                <p>
                  Rental exceptions are fleet-wide; equipment signals are for {searchedEquipmentId}.
                </p>
              </div>
              <Clock3 size={20} />
            </div>

            {alerts.length > 0 ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {alerts.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle2 size={24} />
                <div>
                  <strong>No active alerts</strong>
                  <p style={{ margin: "4px 0 0" }}>
                    The monitored equipment and rental records have no exceptions matching the configured alert rules.
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AlertSummaryCard({
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

function AlertMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const icon =
    alert.severity === "critical" ? (
      <AlertTriangle size={20} />
    ) : alert.severity === "warning" ? (
      <Wrench size={20} />
    ) : (
      <Bell size={20} />
    );

  const badgeClass =
    alert.severity === "critical"
      ? "status-danger"
      : alert.severity === "warning"
        ? "status-warning"
        : "status-good";

  return (
    <div
      style={{
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        padding: "15px",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#ffffff",
      }}
    >
      <div style={{ display: "flex", paddingTop: "2px" }}>{icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginBottom: "5px",
            flexWrap: "wrap",
          }}
        >
          <strong style={{ fontSize: "13px" }}>{alert.title}</strong>
          <span className={`status-badge ${badgeClass}`}>
            {alert.severity}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          {alert.description}
        </p>

        <div
          style={{
            display: "flex",
            gap: "14px",
            marginTop: "8px",
            color: "#9ca3af",
            fontSize: "11px",
            flexWrap: "wrap",
          }}
        >
          {alert.equipmentId && <span>Equipment: {alert.equipmentId}</span>}
          {alert.rentalId && <span>Rental: {alert.rentalId}</span>}
          {alert.timestamp && <span>{formatDate(alert.timestamp)}</span>}
        </div>
      </div>
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

export default Alerts;
