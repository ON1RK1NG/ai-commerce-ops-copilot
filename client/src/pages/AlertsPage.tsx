import { useEffect, useMemo, useState } from "react";
import {
  acknowledgeAlert,
  getAlerts,
  resolveAlert,
  syncLowStockAlerts,
} from "../api/alertsApi";
import type {
  AlertListItem,
  AlertListResponse,
  AlertQueryParameters,
} from "../types/alert";
import "../styles/AlertsPage.css";

const initialData: AlertListResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  openCount: 0,
  acknowledgedCount: 0,
  resolvedCount: 0,
  criticalCount: 0,
  warningCount: 0,
  infoCount: 0,
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertListResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState<AlertQueryParameters>({
    search: "",
    status: "",
    severity: "",
    alertType: "",
    page: 1,
    pageSize: 10,
  });

  const activePage = filters.page ?? 1;

  async function loadAlerts(nextFilters: AlertQueryParameters) {
    try {
      setLoading(true);
      setError("");

      const result = await getAlerts(nextFilters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlerts(filters);
  }, [filters]);

  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [success, error]);

  function updateFilter<K extends keyof AlertQueryParameters>(
    key: K,
    value: AlertQueryParameters[K]
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value as number : 1,
    }));
  }

  async function handleSync() {
    try {
      setSyncing(true);
      setError("");
      setSuccess("");

      await syncLowStockAlerts();
      setSuccess("Alerts synced successfully.");
      await loadAlerts(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync alerts.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAcknowledge(id: number) {
    try {
      setError("");
      await acknowledgeAlert(id);
      await loadAlerts(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge alert.");
    }
  }

  async function handleResolve(id: number) {
    try {
      setError("");
      await resolveAlert(id);
      await loadAlerts(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve alert.");
    }
  }

  const startItem = useMemo(() => {
    if (data.totalCount === 0) return 0;
    return ((data.page - 1) * data.pageSize) + 1;
  }, [data.page, data.pageSize, data.totalCount]);

  const endItem = useMemo(() => {
    if (data.totalCount === 0) return 0;
    return Math.min(data.page * data.pageSize, data.totalCount);
  }, [data.page, data.pageSize, data.totalCount]);

  return (
    <div className="alerts-page">
      <section className="alerts-hero">
        <div>
          <h1>Alerts</h1>
          <p>
            Track low-stock signals, acknowledge issues, and resolve them after inventory recovers.
          </p>
        </div>

        <button
          className="alerts-primary-button"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? "Syncing..." : "Sync Low Stock"}
        </button>
      </section>

      {success && <div className="alerts-banner alerts-banner-success">{success}</div>}
      {error && <div className="alerts-banner alerts-banner-error">{error}</div>}

      <section className="alerts-summary-grid">
        <article className="alerts-summary-card">
          <span>Open</span>
          <strong>{data.openCount}</strong>
        </article>

        <article className="alerts-summary-card">
          <span>Acknowledged</span>
          <strong>{data.acknowledgedCount}</strong>
        </article>

        <article className="alerts-summary-card">
          <span>Resolved</span>
          <strong>{data.resolvedCount}</strong>
        </article>

        <article className="alerts-summary-card">
          <span>Total</span>
          <strong>{data.totalCount}</strong>
        </article>

        <article className="alerts-summary-card">
          <span>Critical</span>
          <strong>{data.criticalCount}</strong>
        </article>

        <article className="alerts-summary-card">
          <span>Warning</span>
          <strong>{data.warningCount}</strong>
        </article>

        <article className="alerts-summary-card">
          <span>Info</span>
          <strong>{data.infoCount}</strong>
        </article>
      </section>

      <section className="alerts-filters-card">
        <div className="alerts-filters-grid">
          <input
            type="text"
            placeholder="Search alerts, title, SKU, product..."
            value={filters.search ?? ""}
            onChange={(e) => updateFilter("search", e.target.value)}
          />

          <select
            value={filters.status ?? ""}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={filters.severity ?? ""}
            onChange={(e) => updateFilter("severity", e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={filters.alertType ?? ""}
            onChange={(e) => updateFilter("alertType", e.target.value)}
          >
            <option value="">All Types</option>
            <option value="low-stock">Low Stock</option>
          </select>

          <select
            value={String(filters.pageSize ?? 10)}
            onChange={(e) => updateFilter("pageSize", Number(e.target.value))}
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </section>

      <section className="alerts-panel">
        <div className="alerts-panel-header">
          <div>
            <h2>Alert List</h2>
            <p>
              Showing {startItem}-{endItem} of {data.totalCount}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="alerts-empty-state">Loading alerts...</div>
        ) : data.items.length === 0 ? (
          <div className="alerts-empty-state">No alerts found.</div>
        ) : (
          <div className="alerts-table-wrap">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Resolved</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {data.items.map((alert: AlertListItem) => (
                  <tr key={alert.id}>
                    <td>
                      <span className={`alerts-badge alerts-badge-${alert.severity}`}>
                        {alert.severity}
                      </span>
                    </td>

                    <td>
                      <div className="alerts-title">{alert.title}</div>
                      <div className="alerts-description">{alert.description}</div>
                    </td>

                    <td>
                      <div className="alerts-product-name">
                        {alert.productName || "-"}
                      </div>
                      <div className="alerts-product-sku">
                        {alert.sku || ""}
                      </div>
                    </td>

                    <td>{alert.alertType}</td>

                    <td>
                      <span className={`alerts-status alerts-status-${alert.status}`}>
                        {alert.status}
                      </span>
                    </td>

                    <td>{formatDate(alert.createdAtUtc)}</td>
                    <td>{formatDate(alert.resolvedAtUtc)}</td>

                    <td>
                      <div className="alerts-actions">
                        {alert.status === "open" && (
                          <button onClick={() => handleAcknowledge(alert.id)}>
                            Acknowledge
                          </button>
                        )}

                        {alert.status !== "resolved" && (
                          <button onClick={() => handleResolve(alert.id)}>
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="alerts-pagination">
          <button
            disabled={activePage <= 1 || loading}
            onClick={() => updateFilter("page", activePage - 1)}
          >
            Previous
          </button>

          <span>
            Page {data.page} of {Math.max(data.totalPages, 1)}
          </span>

          <button
            disabled={data.totalPages === 0 || activePage >= data.totalPages || loading}
            onClick={() => updateFilter("page", activePage + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}