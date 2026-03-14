import { useCallback, useEffect, useMemo, useState } from "react";
import { getProducts } from "../api/productsApi";
import { createOrder, getOrderById, getOrders } from "../api/ordersApi";
import type { Product } from "../types/product";
import type {
  CreateOrderRequest,
  OrderDetail,
  OrderListItem,
  OrderListResponse,
} from "../types/order";
import "../styles/OrdersPage.css";

const DEFAULT_PAGE_SIZE = 10;

const initialOrdersResponse: OrderListResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalPages: 1,
  totalRevenueInQuery: 0,
  totalUnitsInQuery: 0,
};

const initialOrderForm: CreateOrderRequest = {
  status: "Pending",
  paymentStatus: "Pending",
  customerCountry: "Kosovo",
  market: "XK",
  items: [{ productId: 0, quantity: 1 }],
};

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
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

export default function OrdersPage() {
  const [ordersResponse, setOrdersResponse] = useState<OrderListResponse>(initialOrdersResponse);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [orderForm, setOrderForm] = useState<CreateOrderRequest>(initialOrderForm);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const items = ordersResponse.items;

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      setError("");

      const data = await getOrders({
        search,
        status: statusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        sortBy,
        page,
        pageSize,
      });

      setOrdersResponse(data);

      if (data.items.length === 0) {
        setSelectedOrder(null);
        setSelectedOrderDetail(null);
        return;
      }

      const matchingSelected = data.items.find((item) => item.id === selectedOrder?.id);
      setSelectedOrder(matchingSelected ?? data.items[0]);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoadingOrders(false);
    }
  }, [search, statusFilter, paymentStatusFilter, sortBy, page, pageSize, selectedOrder?.id]);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const response = await getProducts({ page: 1, pageSize: 200, sortBy: "name-asc" });
      setProducts(response.items);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load products for order creation."));
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadSelectedOrder = useCallback(async () => {
    if (!selectedOrder) {
      setSelectedOrderDetail(null);
      return;
    }

    try {
      setLoadingDetail(true);
      const data = await getOrderById(selectedOrder.id);
      setSelectedOrderDetail(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load order details."));
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadSelectedOrder();
  }, [loadSelectedOrder]);

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

  const startItem = ordersResponse.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = ordersResponse.totalCount === 0 ? 0 : Math.min(page * pageSize, ordersResponse.totalCount);

  const estimatedDraftTotal = useMemo(() => {
    return orderForm.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return sum;
      }
      return sum + product.price * item.quantity;
    }, 0);
  }, [orderForm.items, products]);

  function addItemRow() {
    setOrderForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: 0, quantity: 1 }],
    }));
  }

  function removeItemRow(index: number) {
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (orderForm.items.length === 0) {
      setError("Order must contain at least one item.");
      return;
    }

    if (orderForm.items.some((x) => x.productId <= 0 || x.quantity <= 0)) {
      setError("Each order item must have a product and quantity greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await createOrder(orderForm);
      setSuccess(`Order ${created.orderNumber} created successfully.`);
      setOrderForm(initialOrderForm);
      await loadOrders();
      setSelectedOrder({
        id: created.id,
        orderNumber: created.orderNumber,
        status: created.status,
        paymentStatus: created.paymentStatus,
        totalAmount: created.totalAmount,
        customerCountry: created.customerCountry,
        market: created.market,
        itemsCount: created.items.length,
        totalUnits: created.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAtUtc: created.createdAtUtc,
      });
      setSelectedOrderDetail(created);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create order."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="orders-page">
      <div className="orders-hero">
        <div>
          <h1 className="orders-title">Orders Operations</h1>
          <p className="orders-subtitle">
            Track incoming orders, inspect order lines, and create new orders that flow into inventory.
          </p>
        </div>
      </div>

      {success && <div className="orders-message orders-message-success">{success}</div>}
      {error && <div className="orders-message orders-message-error">{error}</div>}

      <div className="orders-stats-grid">
        <div className="orders-stat-card">
          <span>Total Orders</span>
          <strong>{ordersResponse.totalCount}</strong>
        </div>
        <div className="orders-stat-card success">
          <span>Revenue In View</span>
          <strong>{formatCurrency(ordersResponse.totalRevenueInQuery)}</strong>
        </div>
        <div className="orders-stat-card">
          <span>Units In View</span>
          <strong>{ordersResponse.totalUnitsInQuery}</strong>
        </div>
        <div className="orders-stat-card">
          <span>Draft Total</span>
          <strong>{formatCurrency(estimatedDraftTotal)}</strong>
        </div>
      </div>

      <section className="orders-panel">
        <div className="orders-panel-header">
          <h2>Orders List</h2>
          <p>Search, filter, and inspect incoming orders.</p>
        </div>

        <div className="orders-filters-grid">
          <div className="orders-filter-field orders-filter-search">
            <label htmlFor="orders-search">Search</label>
            <input
              id="orders-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by order number, country, or market"
            />
          </div>

          <div className="orders-filter-field">
            <label htmlFor="orders-status-filter">Status</label>
            <select
              id="orders-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="orders-filter-field">
            <label htmlFor="orders-payment-status-filter">Payment</label>
            <select
              id="orders-payment-status-filter"
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All payments</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          <div className="orders-filter-field">
            <label htmlFor="orders-sort">Sort By</label>
            <select
              id="orders-sort"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="order-number-asc">Order number A–Z</option>
            </select>
          </div>

          <div className="orders-filter-field">
            <label htmlFor="orders-page-size">Page Size</label>
            <select
              id="orders-page-size"
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
          </div>
        </div>

        <div className="orders-range-text">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{ordersResponse.totalCount}</strong> orders
        </div>

        {loadingOrders ? (
          <p className="orders-state-text">Loading orders...</p>
        ) : items.length === 0 ? (
          <div className="orders-empty-state">
            <h3>No orders yet</h3>
            <p>Create your first order from the form below.</p>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Country</th>
                  <th>Market</th>
                  <th>Items</th>
                  <th>Units</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => (
                  <tr
                    key={order.id}
                    className={selectedOrder?.id === order.id ? "selected" : ""}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td>{order.orderNumber}</td>
                    <td>{order.status}</td>
                    <td>{order.paymentStatus}</td>
                    <td>{order.customerCountry || "—"}</td>
                    <td>{order.market || "—"}</td>
                    <td>{order.itemsCount}</td>
                    <td>{order.totalUnits}</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{formatDate(order.createdAtUtc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="orders-details-grid">
        <section className="orders-panel">
          <div className="orders-panel-header">
            <h2>Selected Order Detail</h2>
            <p>Review the full order, line items, and totals.</p>
          </div>

          {!selectedOrder ? (
            <p className="orders-state-text">Select an order from the list.</p>
          ) : loadingDetail || !selectedOrderDetail ? (
            <p className="orders-state-text">Loading selected order...</p>
          ) : (
            <>
              <div className="orders-detail-summary">
                <div>
                  <span>Order Number</span>
                  <strong>{selectedOrderDetail.orderNumber}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedOrderDetail.status}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{selectedOrderDetail.paymentStatus}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatCurrency(selectedOrderDetail.totalAmount)}</strong>
                </div>
              </div>

              <div className="orders-line-items">
                {selectedOrderDetail.items.map((item) => (
                  <div key={item.id} className="orders-line-item-card">
                    <div className="orders-line-item-top">
                      <strong>{item.sku} — {item.productName}</strong>
                      <span>{formatCurrency(item.lineTotal)}</span>
                    </div>
                    <div className="orders-line-item-meta">
                      <span>Qty: {item.quantity}</span>
                      <span>Unit: {formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="orders-panel">
          <div className="orders-panel-header">
            <h2>Create Order</h2>
            <p>Place an order and apply inventory changes automatically.</p>
          </div>

          <form className="orders-form" onSubmit={handleSubmit}>
            <div className="orders-filter-field">
              <label htmlFor="order-status">Order Status</label>
              <select
                id="order-status"
                value={orderForm.status}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="orders-filter-field">
              <label htmlFor="order-payment-status">Payment Status</label>
              <select
                id="order-payment-status"
                value={orderForm.paymentStatus}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    paymentStatus: e.target.value,
                  }))
                }
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="orders-filter-field">
              <label htmlFor="order-country">Customer Country</label>
              <input
                id="order-country"
                value={orderForm.customerCountry}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    customerCountry: e.target.value,
                  }))
                }
              />
            </div>

            <div className="orders-filter-field">
              <label htmlFor="order-market">Market</label>
              <input
                id="order-market"
                value={orderForm.market}
                onChange={(e) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    market: e.target.value,
                  }))
                }
              />
            </div>

            <div className="orders-items-section">
              <div className="orders-items-header">
                <h3>Order Items</h3>
                <button type="button" className="orders-secondary-button" onClick={addItemRow}>
                  Add Item
                </button>
              </div>

              {orderForm.items.map((item, index) => (
                <div key={index} className="orders-item-row">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const productId = Number(e.target.value);
                      setOrderForm((prev) => ({
                        ...prev,
                        items: prev.items.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, productId } : currentItem
                        ),
                      }));
                    }}
                    disabled={loadingProducts}
                  >
                    <option value={0}>{loadingProducts ? "Loading products..." : "Select product"}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const quantity = Number(e.target.value);
                      setOrderForm((prev) => ({
                        ...prev,
                        items: prev.items.map((currentItem, currentIndex) =>
                          currentIndex === index ? { ...currentItem, quantity } : currentItem
                        ),
                      }));
                    }}
                  />

                  <button
                    type="button"
                    className="orders-danger-button"
                    onClick={() => removeItemRow(index)}
                    disabled={orderForm.items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button type="submit" className="orders-primary-button" disabled={submitting}>
              {submitting ? "Creating..." : "Create Order"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
