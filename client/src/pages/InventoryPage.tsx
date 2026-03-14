import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adjustInventory,
  getInventory,
  getInventoryByProductId,
  getInventoryMovements,
} from "../api/inventoryApi";
import type {
  AdjustInventoryRequest,
  InventoryAdjustmentType,
  InventoryDetail,
  InventoryListItem,
  InventoryListResponse,
  InventoryMovement,
  InventorySortOption,
  InventoryStockFilter,
} from "../types/inventory";
import "../styles/InventoryPage.css";

const DEFAULT_PAGE_SIZE = 10;

const initialListResponse: InventoryListResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalPages: 1,
  lowStockCount: 0,
  outOfStockCount: 0,
  healthyCount: 0,
  totalAvailableUnits: 0,
};

const initialAdjustmentForm: AdjustInventoryRequest = {
  productId: 0,
  adjustmentType: "add-stock",
  quantity: 1,
  reason: "",
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

function getMovementLabel(value: string) {
  switch (value) {
    case "add-stock":
      return "Add stock";
    case "remove-stock":
      return "Remove stock";
    case "reserve-stock":
      return "Reserve stock";
    case "release-reserved-stock":
      return "Release reserved";
    default:
      return value;
  }
}

export default function InventoryPage() {
  const [inventoryResponse, setInventoryResponse] = useState<InventoryListResponse>(initialListResponse);
  const [selectedItem, setSelectedItem] = useState<InventoryListItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<InventoryDetail | null>(null);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<InventoryStockFilter>("all");
  const [sortBy, setSortBy] = useState<InventorySortOption>("updated-desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustInventoryRequest>(initialAdjustmentForm);

  const items = inventoryResponse.items;

  const loadInventory = useCallback(async () => {
    try {
      setLoadingList(true);
      setError("");

      const data = await getInventory({
        search,
        stockStatus,
        sortBy,
        page,
        pageSize,
      });

      setInventoryResponse(data);

      if (data.items.length === 0) {
        setSelectedItem(null);
        setSelectedDetail(null);
        setAdjustmentForm((prev) => ({ ...prev, productId: 0 }));
        return;
      }

      const matchingSelected = data.items.find((item) => item.productId === selectedItem?.productId);
      const nextSelected = matchingSelected ?? data.items[0];
      setSelectedItem(nextSelected);
      setAdjustmentForm((prev) => ({ ...prev, productId: nextSelected.productId }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load inventory."));
    } finally {
      setLoadingList(false);
    }
  }, [search, stockStatus, sortBy, page, pageSize, selectedItem?.productId]);

  const loadSelectedDetail = useCallback(async () => {
    if (!selectedItem) {
      setSelectedDetail(null);
      return;
    }

    try {
      setLoadingDetail(true);
      const data = await getInventoryByProductId(selectedItem.productId);
      setSelectedDetail(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load inventory detail."));
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedItem]);

  const loadRecentMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const data = await getInventoryMovements(undefined, 1, 12);
      setRecentMovements(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load recent movements."));
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    void loadSelectedDetail();
  }, [loadSelectedDetail]);

  useEffect(() => {
    void loadRecentMovements();
  }, [loadRecentMovements]);

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

  const startItem = inventoryResponse.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = inventoryResponse.totalCount === 0 ? 0 : Math.min(page * pageSize, inventoryResponse.totalCount);

  const selectedStatusLabel = useMemo(() => {
    if (!selectedDetail) {
      return "No item selected";
    }

    if (selectedDetail.isOutOfStock) {
      return "Out of stock";
    }

    if (selectedDetail.isLowStock) {
      return "Low stock";
    }

    return "Healthy";
  }, [selectedDetail]);

  async function handleAdjustInventory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!adjustmentForm.productId) {
      setError("Please select an inventory item first.");
      return;
    }

    if (adjustmentForm.quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const updatedDetail = await adjustInventory(adjustmentForm);
      setSelectedDetail(updatedDetail);
      setSuccess("Inventory adjusted successfully.");
      setAdjustmentForm((prev) => ({
        ...prev,
        quantity: 1,
        reason: "",
      }));

      await Promise.all([loadInventory(), loadRecentMovements()]);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to adjust inventory."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inventory-page">
      <div className="inventory-hero">
        <div>
          <h1 className="inventory-title">Inventory Operations</h1>
          <p className="inventory-subtitle">
            Monitor stock health, review movement history, and apply controlled inventory adjustments.
          </p>
        </div>
      </div>

      {success && <div className="inventory-message inventory-message-success">{success}</div>}
      {error && <div className="inventory-message inventory-message-error">{error}</div>}

      <div className="inventory-stats-grid">
        <div className="inventory-stat-card">
          <span>Total Items</span>
          <strong>{inventoryResponse.totalCount}</strong>
        </div>
        <div className="inventory-stat-card warning">
          <span>Low Stock</span>
          <strong>{inventoryResponse.lowStockCount}</strong>
        </div>
        <div className="inventory-stat-card danger">
          <span>Out of Stock</span>
          <strong>{inventoryResponse.outOfStockCount}</strong>
        </div>
        <div className="inventory-stat-card success">
          <span>Healthy</span>
          <strong>{inventoryResponse.healthyCount}</strong>
        </div>
        <div className="inventory-stat-card">
          <span>Total Available Units</span>
          <strong>{inventoryResponse.totalAvailableUnits}</strong>
        </div>
      </div>

      <section className="inventory-panel">
        <div className="inventory-panel-header">
          <h2>Inventory List</h2>
          <p>Search, filter, and sort current stock state.</p>
        </div>

        <div className="inventory-filters-grid">
          <div className="inventory-filter-field inventory-filter-search">
            <label htmlFor="inventory-search">Search</label>
            <input
              id="inventory-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by SKU, product, or category"
            />
          </div>

          <div className="inventory-filter-field">
            <label htmlFor="inventory-stock-status">Stock Status</label>
            <select
              id="inventory-stock-status"
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value as InventoryStockFilter);
                setPage(1);
              }}
            >
              <option value="all">All items</option>
              <option value="healthy">Healthy only</option>
              <option value="low">Low stock only</option>
              <option value="out">Out of stock only</option>
            </select>
          </div>

          <div className="inventory-filter-field">
            <label htmlFor="inventory-sort">Sort By</label>
            <select
              id="inventory-sort"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as InventorySortOption);
                setPage(1);
              }}
            >
              <option value="updated-desc">Recently updated</option>
              <option value="updated-asc">Oldest updated</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="available-asc">Lowest available</option>
              <option value="available-desc">Highest available</option>
              <option value="reserved-desc">Most reserved</option>
            </select>
          </div>

          <div className="inventory-filter-field">
            <label htmlFor="inventory-page-size">Page Size</label>
            <select
              id="inventory-page-size"
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

        <div className="inventory-range-text">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{inventoryResponse.totalCount}</strong> items
        </div>

        {loadingList ? (
          <p className="inventory-state-text">Loading inventory...</p>
        ) : items.length === 0 ? (
          <div className="inventory-empty-state">
            <h3>No inventory items match the current filters</h3>
            <p>Try changing search, stock status, or sorting.</p>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Recommendation</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.productId}
                    className={selectedItem?.productId === item.productId ? "selected" : ""}
                    onClick={() => {
                      setSelectedItem(item);
                      setAdjustmentForm((prev) => ({ ...prev, productId: item.productId }));
                    }}
                  >
                    <td>{item.sku}</td>
                    <td>{item.productName}</td>
                    <td>{item.categoryName}</td>
                    <td>{item.stockOnHand}</td>
                    <td>{item.stockReserved}</td>
                    <td>{item.stockAvailable}</td>
                    <td>{item.reorderThreshold}</td>
                    <td>
                      <span
                        className={`inventory-status-badge ${
                          item.isOutOfStock ? "out" : item.isLowStock ? "low" : "healthy"
                        }`}
                      >
                        {item.isOutOfStock ? "Out" : item.isLowStock ? "Low" : "Healthy"}
                      </span>
                    </td>
                    <td>{item.recommendedRestockUnits > 0 ? `${item.recommendedRestockUnits} units` : "—"}</td>
                    <td>{formatDate(item.updatedAtUtc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="inventory-pagination-row">
          <button
            type="button"
            className="inventory-page-button"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </button>
          <span>
            Page <strong>{inventoryResponse.page}</strong> of <strong>{inventoryResponse.totalPages}</strong>
          </span>
          <button
            type="button"
            className="inventory-page-button"
            disabled={page >= inventoryResponse.totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, inventoryResponse.totalPages))}
          >
            Next
          </button>
        </div>
      </section>

      <div className="inventory-details-grid">
        <section className="inventory-panel">
          <div className="inventory-panel-header">
            <h2>Selected Inventory Detail</h2>
            <p>Review the current stock state and recent product-specific movement history.</p>
          </div>

          {!selectedItem ? (
            <p className="inventory-state-text">Select a row from the inventory table.</p>
          ) : loadingDetail || !selectedDetail ? (
            <p className="inventory-state-text">Loading selected item...</p>
          ) : (
            <>
              <div className="inventory-detail-summary">
                <div>
                  <span>SKU</span>
                  <strong>{selectedDetail.sku}</strong>
                </div>
                <div>
                  <span>Product</span>
                  <strong>{selectedDetail.productName}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{selectedStatusLabel}</strong>
                </div>
                <div>
                  <span>Recommended Restock</span>
                  <strong>{selectedDetail.recommendedRestockUnits} units</strong>
                </div>
              </div>

              <div className="inventory-movement-list compact">
                {selectedDetail.recentMovements.length === 0 ? (
                  <p className="inventory-state-text">No movements recorded yet.</p>
                ) : (
                  selectedDetail.recentMovements.map((movement) => (
                    <div key={movement.id} className="inventory-movement-card">
                      <div className="inventory-movement-top">
                        <strong>{getMovementLabel(movement.movementType)}</strong>
                        <span>{formatDate(movement.createdAtUtc)}</span>
                      </div>
                      <div className="inventory-movement-meta">
                        <span>Qty: {movement.quantity}</span>
                        <span>Available after: {movement.stockAvailableAfter}</span>
                      </div>
                      <p>{movement.reason || "No reason provided."}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <section className="inventory-panel">
          <div className="inventory-panel-header">
            <h2>Adjust Inventory</h2>
            <p>Apply operational stock changes and record movement history.</p>
          </div>

          <form className="inventory-adjust-form" onSubmit={handleAdjustInventory}>
            <div className="inventory-filter-field">
              <label htmlFor="adjustment-product">Selected Product</label>
              <input
                id="adjustment-product"
                value={selectedItem ? `${selectedItem.sku} — ${selectedItem.productName}` : "No item selected"}
                readOnly
              />
            </div>

            <div className="inventory-filter-field">
              <label htmlFor="adjustment-type">Adjustment Type</label>
              <select
                id="adjustment-type"
                value={adjustmentForm.adjustmentType}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    adjustmentType: e.target.value as InventoryAdjustmentType,
                  }))
                }
              >
                <option value="add-stock">Add stock</option>
                <option value="remove-stock">Remove stock</option>
                <option value="reserve-stock">Reserve stock</option>
                <option value="release-reserved-stock">Release reserved stock</option>
              </select>
            </div>

            <div className="inventory-filter-field">
              <label htmlFor="adjustment-quantity">Quantity</label>
              <input
                id="adjustment-quantity"
                type="number"
                min={1}
                value={adjustmentForm.quantity}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    quantity: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="inventory-filter-field">
              <label htmlFor="adjustment-reason">Reason</label>
              <textarea
                id="adjustment-reason"
                rows={4}
                value={adjustmentForm.reason ?? ""}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="e.g. supplier restock, order reservation, damaged stock"
              />
            </div>

            <button type="submit" className="inventory-primary-button" disabled={submitting || !selectedItem}>
              {submitting ? "Applying..." : "Apply Adjustment"}
            </button>
          </form>
        </section>
      </div>

      <section className="inventory-panel">
        <div className="inventory-panel-header">
          <h2>Recent Inventory Activity</h2>
          <p>Latest stock movements across the catalog.</p>
        </div>

        {loadingMovements ? (
          <p className="inventory-state-text">Loading recent activity...</p>
        ) : recentMovements.length === 0 ? (
          <p className="inventory-state-text">No recent movements yet.</p>
        ) : (
          <div className="inventory-movement-list">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="inventory-movement-card">
                <div className="inventory-movement-top">
                  <strong>{movement.sku} — {movement.productName}</strong>
                  <span>{formatDate(movement.createdAtUtc)}</span>
                </div>
                <div className="inventory-movement-meta">
                  <span>{getMovementLabel(movement.movementType)}</span>
                  <span>Qty: {movement.quantity}</span>
                  <span>Available after: {movement.stockAvailableAfter}</span>
                </div>
                <p>{movement.reason || "No reason provided."}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
