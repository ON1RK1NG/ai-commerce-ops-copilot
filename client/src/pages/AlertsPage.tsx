import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acknowledgeAlert,
  getAlerts,
  resolveAlert,
  syncLowStockAlerts,
} from "../api/alertsApi";
import { getInventoryByProductId } from "../api/inventoryApi";
import type { AlertListItem, AlertListResponse } from "../types/alert";
import type { InventoryDetail } from "../types/inventory";
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

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

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

function formatMovementType(value: string) {
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

function getRecommendationClass(value?: string) {
  switch ((value ?? "").toLowerCase()) {
    case "critical":
    case "high":
      return "critical";
    case "medium":
    case "warning":
      return "warning";
    case "healthy":
      return "resolved";
    default:
      return "info";
  }
}

export default function AlertsPage() {
  const [alertsResponse, setAlertsResponse] = useState(initialResponse);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actingAlertId, setActingAlertId] = useState<number | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<AlertListItem | null>(null);
  const [selectedAlertDetails, setSelectedAlertDetails] =
    useState<InventoryDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
      setSelectedAlert((current) => {
        if (!current) {
          return current;
        }

        const updated = data.items.find((item) => item.id === current.id);
        return updated ?? current;
      });

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

  async function loadAlertDetails(alert: AlertListItem) {
    setSelectedAlert(alert);
    setSelectedAlertDetails(null);

    if (!alert.productId) {
      return;
    }

    try {
      setLoadingDetails(true);
      setError("");

      const detail = await getInventoryByProductId(alert.productId);
      setSelectedAlertDetails(detail);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load alert details."));
    } finally {
      setLoadingDetails(false);
    }
  }

  function closeDrawer() {
    setSelectedAlert(null);
    setSelectedAlertDetails(null);
    setLoadingDetails(false);
  }

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

      setSelectedAlert((current) =>
        current && current.id === id
          ? { ...current, status: "acknowledged" }
          : current
      );

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

      setSelectedAlert((current) =>
        current && current.id === id ? { ...current, status: "resolved" } : current
      );

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

  const drawerCanAcknowledge = selectedAlert?.status === "open";
  const drawerCanResolve = selectedAlert?.status !== "resolved";

  return (
    <>
      <div className="alerts-page">
        <section className="alerts-hero">
          <p className="alerts-eyebrow">Operational Monitoring</p>
          <h1>Alerts Center</h1>
          <p className="alerts-subtitle">
            Review stock-risk alerts, sync new low-stock issues, and inspect the
            inventory context behind each alert.
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
            <small>Issues that should be reviewed soon.</small>
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
              <p>Open an alert to inspect stock context and next steps.</p>
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
                            <button
                              type="button"
                              className="alerts-title-button"
                              onClick={() => void loadAlertDetails(alert)}
                            >
                              <strong>{alert.title}</strong>
                            </button>
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
                              className="alerts-action-button view"
                              onClick={() => void loadAlertDetails(alert)}
                            >
                              Details
                            </button>

                            <button
                              type="button"
                              className="alerts-action-button secondary"
                              disabled={!canAcknowledge || isBusy}
                              onClick={() => void handleAcknowledgeAlert(alert.id)}
                            >
                              {isBusy && canAcknowledge ? "Working..." : "Acknowledge"}
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

      {selectedAlert ? (
        <div className="alerts-drawer-overlay" onClick={closeDrawer}>
          <aside className="alerts-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="alerts-drawer-header">
              <div>
                <p className="alerts-drawer-eyebrow">Alert details</p>
                <h2>{selectedAlert.title}</h2>
                <p className="alerts-drawer-subtitle">
                  Review the stock context and take the next best action.
                </p>
              </div>

              <button
                type="button"
                className="alerts-drawer-close"
                onClick={closeDrawer}
                aria-label="Close alert details"
              >
                ×
              </button>
            </div>

            <div className="alerts-drawer-body">
              <div className="alerts-detail-stack">
                <div className="alerts-detail-meta">
                  <span
                    className={`alerts-badge alerts-badge-${getSeverityClass(
                      selectedAlert.severity
                    )}`}
                  >
                    {selectedAlert.severity}
                  </span>
                  <span
                    className={`alerts-badge alerts-status-${getStatusClass(
                      selectedAlert.status
                    )}`}
                  >
                    {selectedAlert.status}
                  </span>
                  <span className="alerts-detail-inline">
                    {toDisplayLabel(selectedAlert.alertType)}
                  </span>
                </div>

                <section className="alerts-detail-section">
                  <h3>Why this alert fired</h3>
                  <p>{selectedAlert.description}</p>

                  <div className="alerts-detail-grid">
                    <article className="alerts-detail-card">
                      <span>Product</span>
                      <strong>{selectedAlert.productName || "—"}</strong>
                    </article>

                    <article className="alerts-detail-card">
                      <span>SKU</span>
                      <strong>{selectedAlert.sku || "—"}</strong>
                    </article>

                    <article className="alerts-detail-card">
                      <span>Created</span>
                      <strong>{formatDate(selectedAlert.createdAtUtc)}</strong>
                    </article>

                    <article className="alerts-detail-card">
                      <span>Resolved</span>
                      <strong>{formatDate(selectedAlert.resolvedAtUtc)}</strong>
                    </article>
                  </div>
                </section>

                {loadingDetails ? (
                  <div className="alerts-detail-empty">
                    Loading inventory context...
                  </div>
                ) : selectedAlert.productId && selectedAlertDetails ? (
                  <>
                    <section className="alerts-detail-section">
                      <h3>Inventory snapshot</h3>

                      <div className="alerts-detail-grid">
                        <article className="alerts-detail-card">
                          <span>Stock on hand</span>
                          <strong>{selectedAlertDetails.stockOnHand}</strong>
                        </article>

                        <article className="alerts-detail-card">
                          <span>Reserved</span>
                          <strong>{selectedAlertDetails.stockReserved}</strong>
                        </article>

                        <article className="alerts-detail-card">
                          <span>Available</span>
                          <strong>{selectedAlertDetails.stockAvailable}</strong>
                        </article>

                        <article className="alerts-detail-card">
                          <span>Reorder threshold</span>
                          <strong>{selectedAlertDetails.reorderThreshold}</strong>
                        </article>

                        <article className="alerts-detail-card">
                          <span>Recent units sold</span>
                          <strong>{selectedAlertDetails.recentUnitsSold}</strong>
                        </article>

                        <article className="alerts-detail-card">
                          <span>Updated</span>
                          <strong>{formatDate(selectedAlertDetails.updatedAtUtc)}</strong>
                        </article>
                      </div>
                    </section>

                    <section className="alerts-detail-section">
                      <h3>Recommended action</h3>

                      <div
                        className={`alerts-recommendation alerts-recommendation-${getRecommendationClass(
                          selectedAlertDetails.recommendationSeverity
                        )}`}
                      >
                        <div>
                          <strong>{selectedAlertDetails.recommendationMessage}</strong>
                          <p>
                            Suggested restock units:{" "}
                            {selectedAlertDetails.recommendedRestockUnits}
                          </p>
                        </div>

                        <span className="alerts-recommendation-tag">
                          {selectedAlertDetails.recommendationSeverity}
                        </span>
                      </div>
                    </section>

                    <section className="alerts-detail-section">
                      <h3>Recent inventory movements</h3>

                      {selectedAlertDetails.recentMovements.length === 0 ? (
                        <div className="alerts-detail-empty">
                          No inventory movements recorded yet.
                        </div>
                      ) : (
                        <div className="alerts-movement-list">
                          {selectedAlertDetails.recentMovements
                            .slice(0, 5)
                            .map((movement) => (
                              <article
                                className="alerts-movement-item"
                                key={movement.id}
                              >
                                <div>
                                  <strong>
                                    {formatMovementType(movement.movementType)}
                                  </strong>
                                  <p>{movement.reason || "No reason provided."}</p>
                                </div>

                                <div className="alerts-movement-meta">
                                  <span>Qty {movement.quantity}</span>
                                  <span>
                                    Available after: {movement.stockAvailableAfter}
                                  </span>
                                  <span>{formatDate(movement.createdAtUtc)}</span>
                                </div>
                              </article>
                            ))}
                        </div>
                      )}
                    </section>
                  </>
                ) : (
                  <div className="alerts-detail-empty">
                    This alert is not linked to a product inventory record.
                  </div>
                )}
              </div>
            </div>

            <div className="alerts-drawer-actions">
              <button
                type="button"
                className="alerts-action-button secondary"
                disabled={!drawerCanAcknowledge || actingAlertId === selectedAlert.id}
                onClick={() => void handleAcknowledgeAlert(selectedAlert.id)}
              >
                {actingAlertId === selectedAlert.id && drawerCanAcknowledge
                  ? "Working..."
                  : "Acknowledge"}
              </button>

              <button
                type="button"
                className="alerts-action-button primary"
                disabled={!drawerCanResolve || actingAlertId === selectedAlert.id}
                onClick={() => void handleResolveAlert(selectedAlert.id)}
              >
                {actingAlertId === selectedAlert.id && drawerCanResolve
                  ? "Working..."
                  : "Resolve"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}