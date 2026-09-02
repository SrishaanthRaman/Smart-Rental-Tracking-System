import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  X,
} from "lucide-react";
import {
  getRental,
  getRentals,
  type Rental,
} from "../services/api";

const PAGE_SIZE = 10;

function Rentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadRentals();
  }, []);

  async function loadRentals() {
    try {
      setLoading(true);
      setError("");

      const response = await getRentals(0, 200);
      setRentals(response.rentals);
    } catch (err) {
      console.error("Rental loading failed:", err);
      setError(
        "Unable to load rental data. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedQuery(query.trim().toLowerCase());
    setAppliedStatus(statusFilter);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setAppliedQuery("");
    setAppliedStatus("all");
    setPage(1);
  }

  async function openRental(rental: Rental) {
    try {
      setDetailLoading(true);

      const detail = await getRental(rental.id);
      setSelectedRental(detail);
    } catch (err) {
      console.error("Rental detail loading failed:", err);
      setSelectedRental(rental);
    } finally {
      setDetailLoading(false);
    }
  }

  const filteredRentals = useMemo(() => {
    return rentals.filter((rental) => {
      const matchesQuery =
        !appliedQuery ||
        rental.id.toLowerCase().includes(appliedQuery) ||
        rental.equipment_id.toLowerCase().includes(appliedQuery);

      const matchesStatus =
        appliedStatus === "all" ||
        rental.rental_status_generated.toLowerCase() === appliedStatus;

      return matchesQuery && matchesStatus;
    });
  }, [rentals, appliedQuery, appliedStatus]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRentals.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleRentals = filteredRentals.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const totalCount = rentals.length;
  const ongoingCount = rentals.filter(
    (rental) => rental.rental_status_generated.toLowerCase() === "ongoing"
  ).length;
  const onTimeCount = rentals.filter(
    (rental) => rental.rental_status_generated.toLowerCase() === "on_time"
  ).length;
  const lateCount = rentals.filter(
    (rental) => rental.rental_status_generated.toLowerCase() === "late"
  ).length;

  return (
    <div className="rentals-page">
      <div className="page-header">
        <div>
          <h2>Rentals</h2>
          <p>
            Monitor equipment rentals, returns, and rental status across the
            fleet.
          </p>
        </div>
      </div>

      {error && <div className="equipment-error">{error}</div>}

      <div className="rentals-summary">
        <RentalSummaryCard
          icon={<CalendarDays size={20} />}
          label="Total Rentals"
          value={String(totalCount)}
          detail="All rental records"
        />
        <RentalSummaryCard
          icon={<Clock3 size={20} />}
          label="Ongoing"
          value={String(ongoingCount)}
          detail="Currently active"
        />
        <RentalSummaryCard
          icon={<CheckCircle2 size={20} />}
          label="On Time"
          value={String(onTimeCount)}
          detail="Official status"
        />
        <RentalSummaryCard
          icon={<Clock3 size={20} />}
          label="Late"
          value={String(lateCount)}
          detail="Official status"
        />
      </div>

      <div className="rental-toolbar">
        <form className="rental-toolbar-form" onSubmit={handleSubmit}>
          <div className="rental-search-input">
            <Search size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rental ID or equipment"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <select
            className="rental-status-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter rentals by status"
          >
            <option value="all">All Statuses</option>
            <option value="ongoing">Ongoing</option>
            <option value="on_time">On Time</option>
            <option value="late">Late</option>
            <option value="early">Early</option>
          </select>

          <button className="rental-toolbar-button" type="submit">
            Search
          </button>
        </form>

        {(appliedQuery || appliedStatus !== "all") && (
          <div style={{ marginTop: "10px", textAlign: "right" }}>
            <button
              type="button"
              className="rental-close-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <section className="rentals-table-card">
        <div className="rentals-table-header">
          <div>
            <h3>Rental Records</h3>
            <p>
              Showing {filteredRentals.length} matching rental
              {filteredRentals.length === 1 ? "" : "s"}.
            </p>
          </div>

          <span className="equipment-badge">
            {loading ? "Loading..." : `${filteredRentals.length} records`}
          </span>
        </div>

        {loading ? (
          <div className="rentals-empty">
            <Clock3 size={24} />
            <h3>Loading rental records...</h3>
            <p>Fetching rental operations from the backend.</p>
          </div>
        ) : visibleRentals.length === 0 ? (
          <div className="rentals-empty">
            <Search size={24} />
            <h3>No rentals found</h3>
            <p>Try a different rental ID, equipment ID, or status filter.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="rentals-table">
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>Rental ID</th>
                    <th style={{ width: "14%" }}>Equipment</th>
                    <th style={{ width: "19%" }}>Checkout</th>
                    <th style={{ width: "20%" }}>Expected Return</th>
                    <th style={{ width: "20%" }}>Actual Return</th>
                    <th style={{ width: "12%" }}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRentals.map((rental) => (
                    <tr key={rental.id} onClick={() => openRental(rental)}>
                      <td className="rental-id-cell">{rental.id}</td>
                      <td className="rental-equipment-cell">
                        {rental.equipment_id}
                      </td>
                      <td>{formatDate(rental.checkout_datetime)}</td>
                      <td>{formatDate(rental.expected_return_datetime)}</td>
                      <td>
                        {rental.checkin_datetime
                          ? formatDate(rental.checkin_datetime)
                          : "Not returned"}
                      </td>
                      <td>
                        <RentalStatusBadge
                          status={rental.rental_status_generated}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rentals-pagination">
              <span className="rentals-pagination-info">
                Showing{" "}
                {(currentPage - 1) * PAGE_SIZE + 1}
                {"–"}
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredRentals.length
                )}{" "}
                of {filteredRentals.length}
              </span>

              <div className="rentals-pagination-controls">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from(
                  { length: Math.min(totalPages, 5) },
                  (_, index) => index + 1
                ).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={
                      currentPage === pageNumber ? "current-page" : ""
                    }
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedRental && (
        <section className="card rental-detail-card">
          <div className="card-header">
            <div>
              <h3>Rental Details</h3>
              <p>
                {detailLoading
                  ? "Loading the latest rental details..."
                  : `Detailed operational information for ${selectedRental.id}.`}
              </p>
            </div>

            <button
              type="button"
              className="rental-close-button"
              onClick={() => setSelectedRental(null)}
              aria-label="Close rental details"
            >
              <X size={16} />
            </button>
          </div>

          <div className="rental-detail-grid">
            <RentalDetailItem
              label="Rental ID"
              value={selectedRental.id}
            />
            <RentalDetailItem
              label="Equipment ID"
              value={selectedRental.equipment_id}
            />
            <RentalDetailItem
              label="Official Status"
              value={formatStatus(selectedRental.rental_status_generated)}
            />
            <RentalDetailItem
              label="Checkout"
              value={formatDate(selectedRental.checkout_datetime)}
            />
            <RentalDetailItem
              label="Expected Return"
              value={formatDate(selectedRental.expected_return_datetime)}
            />
            <RentalDetailItem
              label="Actual Check-in"
              value={
                selectedRental.checkin_datetime
                  ? formatDate(selectedRental.checkin_datetime)
                  : "Not checked in"
              }
            />
            <RentalDetailItem
              label="Planned Duration"
              value={calculateDuration(
                selectedRental.checkout_datetime,
                selectedRental.expected_return_datetime
              )}
            />
            <RentalDetailItem
              label="Actual Duration"
              value={
                selectedRental.checkin_datetime
                  ? calculateDuration(
                      selectedRental.checkout_datetime,
                      selectedRental.checkin_datetime
                    )
                  : "Not available"
              }
            />
            <RentalDetailItem
              label="Return Timing"
              value={getReturnTiming(selectedRental)}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function RentalSummaryCard({
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
    <div className="rental-summary-card">
      <div className="rental-summary-icon">{icon}</div>
      <div className="rental-summary-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function RentalStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let className = "rental-status-badge rental-status-default";

  if (normalized === "on_time") {
    className = "rental-status-badge rental-status-on-time";
  } else if (normalized === "ongoing") {
    className = "rental-status-badge rental-status-ongoing";
  } else if (normalized === "late") {
    className = "rental-status-badge rental-status-late";
  } else if (normalized === "early") {
    className = "rental-status-badge rental-status-early";
  }

  return <span className={className}>{formatStatus(status)}</span>;
}

function RentalDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rental-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatStatus(status: string) {
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function calculateDuration(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const milliseconds = endDate.getTime() - startDate.getTime();

  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "Unavailable";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

function getReturnTiming(rental: Rental) {
  if (!rental.checkin_datetime) {
    return "Ongoing";
  }

  const expected = new Date(rental.expected_return_datetime).getTime();
  const actual = new Date(rental.checkin_datetime).getTime();

  if (!Number.isFinite(expected) || !Number.isFinite(actual)) {
    return "Unavailable";
  }

  if (actual < expected) {
    return "Returned early";
  }

  if (actual > expected) {
    return "Returned late";
  }

  return "Returned on time";
}

export default Rentals;
