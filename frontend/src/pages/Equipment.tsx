import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Search,
  Wrench,
} from "lucide-react";

import {
  getEquipmentHistory,
  type Telemetry,
} from "../services/api";

function Equipment() {
  const [equipmentId, setEquipmentId] = useState("EQX0001");
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    const id = equipmentId.trim();

    if (!id) {
      setError("Please enter an equipment ID.");
      setTelemetry([]);
      setSearched(true);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(false);
      setTelemetry([]);

      console.log("Searching equipment:", id);

      const history = await getEquipmentHistory(id, 0, 100);

      console.log("Telemetry received:", history);

      setTelemetry(history);
      setSearched(true);

      if (history.length === 0) {
        setError("No telemetry records found for this equipment.");
      }
    } catch (err) {
      console.error("Equipment search failed:", err);

      setTelemetry([]);
      setSearched(true);
      setError(
        "Equipment not found or unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSearch();
  }

  const latest = telemetry.length > 0 ? telemetry[0] : null;

  return (
    <div className="equipment-page">
      <div className="page-header">
        <div>
          <h2>Equipment</h2>
          <p>
            Monitor equipment telemetry and operating conditions.
          </p>
        </div>
      </div>

      <div className="equipment-search-card">
        <form
          className="equipment-search-form"
          onSubmit={handleSubmit}
        >
          <div className="equipment-search-input">
            <Search size={18} aria-hidden="true" />

            <input
              id="equipment-id"
              type="text"
              value={equipmentId}
              onChange={(event) =>
                setEquipmentId(event.target.value)
              }
              placeholder="Enter equipment ID"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search Equipment"}
          </button>
        </form>
      </div>

      {error && (
        <div className="equipment-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="equipment-empty">
          <Activity size={24} />

          <h3>Loading equipment data...</h3>

          <p>
            Fetching telemetry from the backend.
          </p>
        </div>
      )}

      {!loading && latest && (
        <>
          <div className="equipment-summary">
            <div>
              <span className="equipment-label">
                Equipment ID
              </span>
              <strong>{latest.equipment_id}</strong>
            </div>

            <div>
              <span className="equipment-label">
                Engine Status
              </span>
              <strong>{latest.engine_status}</strong>
            </div>

            <div>
              <span className="equipment-label">
                Maintenance Status
              </span>
              <strong>{latest.maintenance_status}</strong>
            </div>

            <div>
              <span className="equipment-label">
                Latest Telemetry
              </span>
              <strong>
                {formatDate(latest.timestamp)}
              </strong>
            </div>
          </div>

          <div className="equipment-metrics">
            <MetricCard
              icon={<Clock3 size={20} />}
              label="Engine Hours"
              value={`${latest.engine_hours.toFixed(1)} h`}
            />

            <MetricCard
              icon={<Activity size={20} />}
              label="Operating Hours"
              value={`${latest.operating_hours.toFixed(1)} h`}
            />

            <MetricCard
              icon={<Gauge size={20} />}
              label="Utilization"
              value={`${latest.utilization_pct.toFixed(1)}%`}
            />

            <MetricCard
              icon={<Wrench size={20} />}
              label="Maintenance"
              value={latest.maintenance_status}
            />
          </div>

          <div className="equipment-grid">
            <section className="equipment-card">
              <div className="equipment-card-header">
                <div>
                  <h3>Current Equipment State</h3>
                  <p>
                    Latest available telemetry reading.
                  </p>
                </div>

                <StatusBadge
                  status={latest.maintenance_status}
                />
              </div>

              <div className="equipment-details">
                <DetailRow
                  label="Equipment ID"
                  value={latest.equipment_id}
                />

                <DetailRow
                  label="Engine Status"
                  value={latest.engine_status}
                />

                <DetailRow
                  label="Engine Hours"
                  value={`${latest.engine_hours.toFixed(
                    2
                  )} hours`}
                />

                <DetailRow
                  label="Operating Hours"
                  value={`${latest.operating_hours.toFixed(
                    2
                  )} hours`}
                />

                <DetailRow
                  label="Utilization"
                  value={`${latest.utilization_pct.toFixed(
                    2
                  )}%`}
                />

                <DetailRow
                  label="Longitude"
                  value={latest.longitude.toFixed(4)}
                />

                <DetailRow
                  label="Fuel Efficiency"
                  value={
                    latest.fuel_efficiency != null
                      ? `${latest.fuel_efficiency.toFixed(
                          2
                        )} L/op.hr`
                      : "Not available"
                  }
                />

                <DetailRow
                  label="Rental ID"
                  value={
                    latest.rental_id || "Not assigned"
                  }
                />
              </div>
            </section>

            <section className="equipment-card">
              <div className="equipment-card-header">
                <div>
                  <h3>Telemetry Summary</h3>
                  <p>
                    Recent operating measurements.
                  </p>
                </div>

                <CheckCircle2 size={22} />
              </div>

              <div className="telemetry-summary">
                <div>
                  <span>Records loaded</span>
                  <strong>{telemetry.length}</strong>
                </div>

                <div>
                  <span>Latest reading</span>
                  <strong>
                    {formatDate(latest.timestamp)}
                  </strong>
                </div>

                <div>
                  <span>Anomaly injected</span>
                  <strong>
                    {latest.anomaly_injected ? "Yes" : "No"}
                  </strong>
                </div>
              </div>
            </section>
          </div>

          <section className="equipment-card telemetry-history">
            <div className="equipment-card-header">
              <div>
                <h3>Telemetry History</h3>
                <p>
                  Showing the latest {telemetry.length}{" "}
                  telemetry records.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Engine Status</th>
                    <th>Engine Hours</th>
                    <th>Operating Hours</th>
                    <th>Utilization</th>
                    <th>Maintenance</th>
                  </tr>
                </thead>

                <tbody>
                  {telemetry.map((record) => (
                    <tr key={record.telemetry_id}>
                      <td>
                        {formatDate(record.timestamp)}
                      </td>

                      <td>{record.engine_status}</td>

                      <td>
                        {record.engine_hours.toFixed(1)} h
                      </td>

                      <td>
                        {record.operating_hours.toFixed(1)} h
                      </td>

                      <td>
                        {record.utilization_pct.toFixed(1)}%
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            record.maintenance_status
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && searched && !latest && (
        <div className="equipment-empty">
          <AlertTriangle size={24} />

          <h3>No telemetry found</h3>

          <p>
            No telemetry records were returned for this
            equipment.
          </p>
        </div>
      )}

      {!loading && !searched && (
        <div className="equipment-empty">
          <Activity size={24} />

          <h3>Search for equipment</h3>

          <p>
            Enter an equipment ID to view its telemetry and
            operating history.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="equipment-metric-card">
      <div className="equipment-metric-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  let className = "status-badge";

  if (
    normalized.includes("good") ||
    normalized.includes("normal")
  ) {
    className += " status-good";
  } else if (
    normalized.includes("service") ||
    normalized.includes("due")
  ) {
    className += " status-warning";
  } else if (
    normalized.includes("critical") ||
    normalized.includes("failure")
  ) {
    className += " status-danger";
  }

  return (
    <span className={className}>
      {status}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default Equipment;