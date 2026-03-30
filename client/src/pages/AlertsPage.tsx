import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acknowledgeAlert,
  getAlerts,
  resolveAlert,
  syncLowStockAlerts,
} from "../api/alertsApi";
import type { AlertListResponse } from "../types/alert";
import "../styles/AlertsPage.css";

const DEFAULT_PAGE_SIZE = 10;

const initialResponse: AlertListResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalPages: 0,
  openCount: 0,
  acknowledgedCount: 0,
  resolvedCount: 0,
  criticalCount: 0,
  warningCount: 0,
  infoCount: 0,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDisplayLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSeverityClass(value: string) {
  switch (value.toLowerCase()) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

function getStatusClass(value: string) {
  switch (value.toLowerCase()) {
    case "resolved":
      return "resolved";
    case "acknowledged":
      return "acknowledged";
    default:
      return "open";
  }
}

export default function AlertsPage() {
  const [alertsResponse, setAlertsResponse] = useState(initialResponse);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actingAlertId, setActingAlertId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [alertType, setAlertType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const items = alertsResponse.items;

  const alertTypeOptions = useMemo(() => {
    const values = new Set<string>(["low-stock"]);
    alertsResponse.items.forEach((item) => {
      if (item.alertType?.trim()) {
        values.add(item.alertType);
      }
    });

    return Array.from(values);
  }, [alertsResponse.items]);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAlerts({
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status,
        severity: severity === "all" ? undefined : severity,
        alertType: alertType === "all" ? undefined : alertType,
        page,
        pageSize,
      });

      setAlertsResponse(data);

      if (data.totalPages > 0 && page > data.totalPages) {
        setPage(data.totalPages);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load alerts."));
    } finally {
      setLoading(false);
    }
  }, [alertType, page, pageSize, search, severity, status]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [success, error]);

  async function handleSyncAlerts() {
    try {
      setSyncing(true);
      setError("");
      setSuccess("");

      const response = await syncLowStockAlerts();
      setSuccess(response.message || "Alerts synced successfully.");
      await loadAlerts();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to sync low-stock alerts."));
    } finally {
      setSyncing(false);
    }
  }

  async function handleAcknowledgeAlert(id: number) {
    try {
      setActingAlertId(id);
      setError("");
      setSuccess("");

      await acknowledgeAlert(id);
      setSuccess("Alert acknowledged.");
      await loadAlerts();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to acknowledge alert."));
    } finally {
      setActingAlertId(null);
    }
  }

  async function handleResolveAlert(id: number) {
    try {
      setActingAlertId(id);
      setError("");
      setSuccess("");

      await resolveAlert(id);
      setSuccess("Alert resolved.");
      await loadAlerts();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to resolve alert."));
    } finally {
      setActingAlertId(null);
    }
  }

  const startItem =
    alertsResponse.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem =
    alertsResponse.totalCount === 0
      ? 0
      : Math.min(page * pageSize, alertsResponse.totalCount);

  return (
    <div className="alerts-page">
      <section className="alerts-hero">
        <p className="alerts-eyebrow">Operational Monitoring</p>
        <h1>Alerts Center</h1>
        <p className="alerts-subtitle">
          Review stock-risk alerts, sync new low-stock issues, and track what
          has been acknowledged or resolved.
        </p>
      </section>

      {success ? (
        <div className="alerts-message alerts-message-success">{success}</div>
      ) : null}

      {error ? (
        <div className="alerts-message alerts-message-error">{error}</div>
      ) : null}

      <section className="alerts-stats-grid">
        <article className="alerts-stat-card accent">
          <span>Total Alerts</span>
          <strong>{alertsResponse.totalCount}</strong>
          <small>All alerts matching the current filters.</small>
        </article>

        <article className="alerts-stat-card danger">
          <span>Open</span>
          <strong>{alertsResponse.openCount}</strong>
          <small>Items that still need attention.</small>
        </article>

        <article className="alerts-stat-card warning">
          <span>Acknowledged</span>
          <strong>{alertsResponse.acknowledgedCount}</strong>
          <small>Seen by ops but not yet resolved.</small>
        </article>

        <article className="alerts-stat-card success">
          <span>Resolved</span>
          <strong>{alertsResponse.resolvedCount}</strong>
          <small>Issues that have already been closed.</small>
        </article>

        <article className="alerts-stat-card danger">
          <span>Critical</span>
          <strong>{alertsResponse.criticalCount}</strong>
          <small>Highest priority alerts.</small>
        </article>

        <article className="alerts-stat-card warning">
          <span>Warning</span>
          <strong>{alertsResponse.warningCount}</strong>
          <small>Potential issues that should be reviewed soon.</small>
        </article>
      </section>

      <section className="alerts-panel">
        <div className="alerts-panel-header alerts-panel-header-row">
          <div>
            <h2>Filters & sync</h2>
            <p>Search and narrow alert results, or refresh low-stock alerts.</p>
          </div>

          <button
            type="button"
            className="alerts-primary-button"
            onClick={handleSyncAlerts}
            disabled={syncing || loading}
          >
            {syncing ? "Syncing..." : "Sync low-stock alerts"}
          </button>
        </div>

        <div className="alerts-filters-grid">
          <label className="alerts-field">
            <span>Search</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, SKU, product, or description"
            />
          </label>

          <label className="alerts-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>

          <label className="alerts-field">
            <span>Severity</span>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </label>

          <label className="alerts-field">
            <span>Alert type</span>
            <select
              value={alertType}
              onChange={(e) => {
                setAlertType(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All alert types</option>
              {alertTypeOptions.map((value) => (
                <option key={value} value={value}>
                  {toDisplayLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="alerts-field">
            <span>Page size</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
            </select>
          </label>
        </div>
      </section>

      <section className="alerts-panel">
        <div className="alerts-panel-header alerts-panel-header-row">
          <div>
            <h2>Alert list</h2>
            <p>Track severity, status, stock-risk reason, and action progress.</p>
          </div>

          <div className="alerts-results-meta">
            Showing {startItem}–{endItem} of {alertsResponse.totalCount}
          </div>
        </div>

        {loading ? (
          <div className="alerts-empty-state">
            <p>Loading alerts...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="alerts-empty-state">
            <p>No alerts match the current filters.</p>
          </div>
        ) : (
          <div className="alerts-table-wrap">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((alert) => {
                  const isBusy = actingAlertId === alert.id;
                  const canAcknowledge = alert.status === "open";
                  const canResolve = alert.status !== "resolved";

                  return (
                    <tr key={alert.id}>
                      <td>
                        <div className="alerts-title-cell">
                          <strong>{alert.title}</strong>
                          <p>{alert.description}</p>
                        </div>
                      </td>
                      <td>{alert.sku || "—"}</td>
                      <td>{alert.productName || "—"}</td>
                      <td>{toDisplayLabel(alert.alertType)}</td>
                      <td>
                        <span
                          className={`alerts-badge alerts-badge-${getSeverityClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`alerts-badge alerts-status-badge alerts-status-${getStatusClass(
                            alert.status
                          )}`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td>{formatDate(alert.createdAtUtc)}</td>
                      <td>
                        <div className="alerts-actions">
                          <button
                            type="button"
                            className="alerts-action-button secondary"
                            disabled={!canAcknowledge || isBusy}
                            onClick={() => void handleAcknowledgeAlert(alert.id)}
                          >
                            {isBusy && canAcknowledge
                              ? "Working..."
                              : "Acknowledge"}
                          </button>

                          <button
                            type="button"
                            className="alerts-action-button primary"
                            disabled={!canResolve || isBusy}
                            onClick={() => void handleResolveAlert(alert.id)}
                          >
                            {isBusy && canResolve ? "Working..." : "Resolve"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="alerts-pagination">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </button>

          <span>
            Page {alertsResponse.totalPages === 0 ? 0 : alertsResponse.page} of{" "}
            {alertsResponse.totalPages}
          </span>

          <button
            type="button"
            disabled={
              loading ||
              alertsResponse.totalPages === 0 ||
              page >= alertsResponse.totalPages
            }
            onClick={() =>
              setPage((prev) => Math.min(prev + 1, alertsResponse.totalPages))
            }
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}