import { useCallback, useEffect, useState } from "react";
import { getAlerts } from "../api/alertsApi";
import { getDashboardSummary } from "../api/dashboardApi";
import type { AlertListResponse } from "../types/alert";
import type { DashboardSummary } from "../types/dashboard";
import "../styles/DashboardPage.css";

const DASHBOARD_REFRESH_INTERVAL_MS = 20000;

const initialSummary: DashboardSummary = {
  totalProducts: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  todayOrdersCount: 0,
  todayRevenue: 0,
  stockAttentionCount: 0,
  topSellingProducts: [],
  recentOrders: [],
};

const initialAlerts: AlertListResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 5,
  totalPages: 0,
  openCount: 0,
  acknowledgedCount: 0,
  resolvedCount: 0,
  criticalCount: 0,
  warningCount: 0,
  infoCount: 0,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(initialSummary);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertsError, setAlertsError] = useState("");

  const loadDashboard = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");
      const response = await getDashboardSummary();
      setSummary(response);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load dashboard summary."));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  const loadAlertsPreview = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setAlertsLoading(true);
      }

      setAlertsError("");

      const response = await getAlerts({
        page: 1,
        pageSize: 5,
      });

      setAlerts(response);
    } catch (err) {
      setAlertsError(getErrorMessage(err, "Failed to load alerts."));
    } finally {
      if (showLoader) {
        setAlertsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadAlertsPreview();
  }, [loadDashboard, loadAlertsPreview]);

  useEffect(() => {
    const refreshDashboard = () => {
      void loadDashboard(false);
      void loadAlertsPreview(false);
    };

    const intervalId = window.setInterval(
      refreshDashboard,
      DASHBOARD_REFRESH_INTERVAL_MS
    );

    const handleWindowFocus = () => {
      refreshDashboard();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDashboard, loadAlertsPreview]);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Commerce Ops Overview</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            A quick operational view of products, stock risk, order activity,
            and live alerts.
          </p>
        </div>
      </section>

      {error ? <div className="dashboard-message error">{error}</div> : null}

      {loading ? (
        <div className="dashboard-empty-state">Loading dashboard...</div>
      ) : (
        <>
          <section className="dashboard-stats-grid">
            <article className="dashboard-stat-card">
              <span>Total Products</span>
              <strong>{summary.totalProducts}</strong>
              <small>All products currently in the catalog</small>
            </article>

            <article className="dashboard-stat-card warning">
              <span>Low Stock</span>
              <strong>{summary.lowStockCount}</strong>
              <small>Products below or at threshold but not yet out</small>
            </article>

            <article className="dashboard-stat-card danger">
              <span>Out of Stock</span>
              <strong>{summary.outOfStockCount}</strong>
              <small>Products with zero or negative available stock</small>
            </article>

            <article className="dashboard-stat-card accent">
              <span>Today Orders</span>
              <strong>{summary.todayOrdersCount}</strong>
              <small>Orders created today</small>
            </article>

            <article className="dashboard-stat-card success">
              <span>Today Revenue</span>
              <strong>{formatCurrency(summary.todayRevenue)}</strong>
              <small>Total revenue from today’s orders</small>
            </article>

            <article className="dashboard-stat-card warning">
              <span>Needs Attention</span>
              <strong>{summary.stockAttentionCount}</strong>
              <small>Products at or below reorder threshold</small>
            </article>

            <article className="dashboard-stat-card danger">
              <span>Open Alerts</span>
              <strong>{alerts.openCount}</strong>
              <small>Alerts that still need action</small>
            </article>

            <article className="dashboard-stat-card danger">
              <span>Critical Alerts</span>
              <strong>{alerts.criticalCount}</strong>
              <small>Highest priority operational issues</small>
            </article>
          </section>

          <div className="dashboard-content-grid">
            <section className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Top Selling Products</h2>
                  <p>Based on the last 30 days of order lines.</p>
                </div>
              </div>

              {summary.topSellingProducts.length === 0 ? (
                <div className="dashboard-empty-state">
                  No sales data available yet.
                </div>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Units Sold</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topSellingProducts.map((product) => (
                        <tr key={product.productId}>
                          <td>{product.sku}</td>
                          <td>{product.name}</td>
                          <td>{product.unitsSold}</td>
                          <td>{product.ordersCount}</td>
                          <td>{formatCurrency(product.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Recent Orders</h2>
                  <p>The latest incoming order activity.</p>
                </div>
              </div>

              {summary.recentOrders.length === 0 ? (
                <div className="dashboard-empty-state">
                  No recent orders found.
                </div>
              ) : (
                <div className="dashboard-order-list">
                  {summary.recentOrders.map((order) => (
                    <article className="dashboard-order-card" key={order.id}>
                      <div className="dashboard-order-top">
                        <strong>{order.orderNumber}</strong>
                        <span>{formatCurrency(order.totalAmount)}</span>
                      </div>

                      <p>
                        Status: {order.status} · Payment: {order.paymentStatus} ·
                        Market: {order.market || order.customerCountry || "N/A"}
                      </p>

                      <small>{formatDate(order.createdAtUtc)}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Recent Alerts</h2>
                <p>Latest operational alerts from the alerts module.</p>
              </div>
            </div>

            {alertsError ? (
              <div className="dashboard-message error">{alertsError}</div>
            ) : alertsLoading ? (
              <div className="dashboard-empty-state">Loading alerts...</div>
            ) : alerts.items.length === 0 ? (
              <div className="dashboard-empty-state">No alerts found.</div>
            ) : (
              <div className="dashboard-alerts-list">
                {alerts.items.map((alert) => (
                  <article className="dashboard-alert-card" key={alert.id}>
                    <div className="dashboard-alert-top">
                      <strong>{alert.title}</strong>
                      <span>
                        {alert.severity} · {alert.status}
                      </span>
                    </div>

                    <p>
                      Type: {alert.alertType} · SKU: {alert.sku || "N/A"} ·
                      Product: {alert.productName || "N/A"}
                    </p>

                    <p>{alert.description}</p>

                    <small>{formatDate(alert.createdAtUtc)}</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}