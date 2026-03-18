import { useEffect, useState } from "react";
import { getAlerts } from "../api/alertsApi";
import { getDashboardSummary } from "../api/dashboardApi";
import type { AlertListResponse } from "../types/alert";
import type { DashboardSummary } from "../types/dashboard";
import "../styles/DashboardPage.css";

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
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [alerts, setAlerts] = useState<AlertListResponse>(initialAlerts);

  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [error, setError] = useState("");
  const [alertsError, setAlertsError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await getDashboardSummary();
        setSummary(response);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load dashboard summary."));
      } finally {
        setLoading(false);
      }
    }

    async function loadAlertsPreview() {
      try {
        setAlertsLoading(true);
        setAlertsError("");

        const response = await getAlerts({
          page: 1,
          pageSize: 5,
        });

        setAlerts(response);
      } catch (err) {
        setAlertsError(getErrorMessage(err, "Failed to load alerts."));
      } finally {
        setAlertsLoading(false);
      }
    }

    void loadDashboard();
    void loadAlertsPreview();
  }, []);

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

      {error ? (
        <div className="dashboard-message dashboard-message-error">{error}</div>
      ) : null}

      {loading ? (
        <div className="dashboard-panel">
          <p>Loading dashboard...</p>
        </div>
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

            <article className="dashboard-stat-card">
              <span>Today Orders</span>
              <strong>{summary.todayOrdersCount}</strong>
              <small>Orders created today</small>
            </article>

            <article className="dashboard-stat-card success">
              <span>Today Revenue</span>
              <strong>{formatCurrency(summary.todayRevenue)}</strong>
              <small>Total revenue from today’s orders</small>
            </article>

            <article className="dashboard-stat-card accent">
              <span>Needs Attention</span>
              <strong>{summary.stockAttentionCount}</strong>
              <small>Products at or below reorder threshold</small>
            </article>

            <article className="dashboard-stat-card warning">
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

          <section className="dashboard-grid">
            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Top Selling Products</h2>
                  <p>Based on the last 30 days of order lines.</p>
                </div>
              </div>

              {summary.topSellingProducts.length === 0 ? (
                <div className="dashboard-empty-state">
                  <p>No sales data available yet.</p>
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
            </article>

            <article className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <h2>Recent Orders</h2>
                  <p>The latest incoming order activity.</p>
                </div>
              </div>

              {summary.recentOrders.length === 0 ? (
                <div className="dashboard-empty-state">
                  <p>No recent orders found.</p>
                </div>
              ) : (
                <div className="dashboard-list">
                  {summary.recentOrders.map((order) => (
                    <div key={order.id} className="dashboard-list-item">
                      <div className="dashboard-list-main">
                        <div className="dashboard-list-top">
                          <strong>{order.orderNumber}</strong>
                          <span>{formatCurrency(order.totalAmount)}</span>
                        </div>

                        <div className="dashboard-order-meta">
                          <span>Status: {order.status}</span>
                          <span>Payment: {order.paymentStatus}</span>
                          <span>
                            Market: {order.market || order.customerCountry || "N/A"}
                          </span>
                        </div>
                      </div>

                      <time>{formatDate(order.createdAtUtc)}</time>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="dashboard-panel dashboard-next-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Recent Alerts</h2>
                <p>
                  Latest operational alerts from the alerts module.
                </p>
              </div>
            </div>

            {alertsError ? (
              <div className="dashboard-empty-state">
                <p>{alertsError}</p>
              </div>
            ) : alertsLoading ? (
              <div className="dashboard-empty-state">
                <p>Loading alerts...</p>
              </div>
            ) : alerts.items.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>No alerts found.</p>
              </div>
            ) : (
              <div className="dashboard-list">
                {alerts.items.map((alert) => (
                  <div key={alert.id} className="dashboard-list-item">
                    <div className="dashboard-list-main">
                      <div className="dashboard-list-top">
                        <strong>{alert.title}</strong>
                        <span>
                          {alert.severity} · {alert.status}
                        </span>
                      </div>

                      <div className="dashboard-order-meta">
                        <span>Type: {alert.alertType}</span>
                        <span>SKU: {alert.sku || "N/A"}</span>
                        <span>Product: {alert.productName || "N/A"}</span>
                      </div>

                      <p
                        style={{
                          margin: "0.45rem 0 0",
                          color: "#64748b",
                          lineHeight: 1.5,
                        }}
                      >
                        {alert.description}
                      </p>
                    </div>

                    <time>{formatDate(alert.createdAtUtc)}</time>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}