import { useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from "../api/productsApi";
import type {
  Category,
  CreateProductRequest,
  Product,
  ProductListResponse,
  SortOption,
  StockFilter,
  UpdateProductRequest,
} from "../types/product";
import "../styles/ProductsPage.css";

const initialForm: CreateProductRequest = {
  sku: "",
  name: "",
  description: "",
  price: 0,
  categoryId: 0,
  stockOnHand: 0,
  stockReserved: 0,
  reorderThreshold: 0,
};

function getAvailableStock(product: Product) {
  return product.stockOnHand - product.stockReserved;
}

function getSortLabel(sortBy: SortOption) {
  switch (sortBy) {
    case "newest":
      return "Newest first";
    case "oldest":
      return "Oldest first";
    case "name-asc":
      return "Name A–Z";
    case "name-desc":
      return "Name Z–A";
    case "price-asc":
      return "Price low to high";
    case "price-desc":
      return "Price high to low";
    case "available-asc":
      return "Lowest available stock";
    case "available-desc":
      return "Highest available stock";
    default:
      return "Newest first";
  }
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | string> = [1];

  if (currentPage > 3) {
    items.push("start-ellipsis");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page++) {
    items.push(page);
  }

  if (currentPage < totalPages - 2) {
    items.push("end-ellipsis");
  }

  items.push(totalPages);

  return items;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CreateProductRequest>(initialForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(0);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [serverData, setServerData] = useState<ProductListResponse>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });

  const isEditMode = editingProductId !== null;
  const isDeleteModalOpen = productToDelete !== null;

  const totalProducts = serverData.totalCount;

  const lowStockCount = useMemo(() => {
    return products.filter(
      (p) => getAvailableStock(p) <= p.reorderThreshold
    ).length;
  }, [products]);

  const healthyProductsCount = useMemo(() => {
    return products.filter(
      (p) => getAvailableStock(p) > p.reorderThreshold
    ).length;
  }, [products]);

  const totalStock = useMemo(() => {
    return products.reduce((sum, product) => sum + product.stockOnHand, 0);
  }, [products]);

  const totalAvailableUnits = useMemo(() => {
    return products.reduce((sum, product) => sum + getAvailableStock(product), 0);
  }, [products]);

  const averagePrice = useMemo(() => {
    if (products.length === 0) {
      return 0;
    }

    const totalPrice = products.reduce((sum, product) => sum + product.price, 0);
    return totalPrice / products.length;
  }, [products]);

  const lowStockPercentage = useMemo(() => {
    if (products.length === 0) {
      return 0;
    }

    return Math.round((lowStockCount / products.length) * 100);
  }, [lowStockCount, products.length]);

  const categoryOverview = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; availableUnits: number }
    >();

    for (const product of products) {
      const key = product.categoryName || "Uncategorized";
      const existing = map.get(key);

      if (existing) {
        existing.count += 1;
        existing.availableUnits += getAvailableStock(product);
      } else {
        map.set(key, {
          name: key,
          count: 1,
          availableUnits: getAvailableStock(product),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [products]);

  const paginationItems = useMemo(() => {
    return buildPaginationItems(currentPage, Math.max(serverData.totalPages, 1));
  }, [currentPage, serverData.totalPages]);

  const startItem =
    serverData.totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const endItem =
    serverData.totalCount === 0
      ? 0
      : Math.min(currentPage * pageSize, serverData.totalCount);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await getProducts({
        search: searchTerm,
        categoryId: selectedCategoryId > 0 ? selectedCategoryId : undefined,
        stockStatus: stockFilter === "all" ? undefined : stockFilter,
        sortBy,
        page: currentPage,
        pageSize,
      });

      setServerData(response);
      setProducts(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategoryId, stockFilter, sortBy, currentPage, pageSize]);

  function resetForm() {
    setForm(initialForm);
    setEditingProductId(null);
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCategoryId(0);
    setStockFilter("all");
    setSortBy("newest");
    setPageSize(10);
    setCurrentPage(1);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    const numericFields = [
      "price",
      "categoryId",
      "stockOnHand",
      "stockReserved",
      "reorderThreshold",
    ];

    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  }

  function handleSearchChange(value: string) {
    setSearchTerm(value);
    setCurrentPage(1);
  }

  function handleCategoryFilterChange(value: number) {
    setSelectedCategoryId(value);
    setCurrentPage(1);
  }

  function handleStockFilterChange(value: StockFilter) {
    setStockFilter(value);
    setCurrentPage(1);
  }

  function handleSortChange(value: SortOption) {
    setSortBy(value);
    setCurrentPage(1);
  }

  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setCurrentPage(1);
  }

  function handleEditClick(product: Product) {
    setError("");
    setSuccess("");
    setEditingProductId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      stockOnHand: product.stockOnHand,
      stockReserved: product.stockReserved,
      reorderThreshold: product.reorderThreshold,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCancelEdit() {
    setError("");
    setSuccess("");
    resetForm();
  }

  function handleDeleteClick(product: Product) {
    setError("");
    setSuccess("");
    setProductToDelete(product);
  }

  function handleCloseDeleteModal() {
    if (deletingProductId !== null) {
      return;
    }

    setProductToDelete(null);
  }

  async function handleConfirmDelete() {
    if (!productToDelete) {
      return;
    }

    try {
      setDeletingProductId(productToDelete.id);
      setError("");
      setSuccess("");

      await deleteProduct(productToDelete.id);

      if (editingProductId === productToDelete.id) {
        resetForm();
      }

      setSuccess("Product deleted successfully.");
      setProductToDelete(null);

      if (products.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await loadProducts();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.sku.trim()) {
      setError("SKU is required.");
      return;
    }

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (form.categoryId <= 0) {
      setError("Please select a category.");
      return;
    }

    const payload: UpdateProductRequest = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      categoryId: Number(form.categoryId),
      stockOnHand: Number(form.stockOnHand),
      stockReserved: Number(form.stockReserved),
      reorderThreshold: Number(form.reorderThreshold),
    };

    try {
      setSubmitting(true);

      if (isEditMode && editingProductId !== null) {
        await updateProduct(editingProductId, payload);
        setSuccess("Product updated successfully.");
      } else {
        await createProduct(payload);
        setSuccess("Product created successfully.");
      }

      resetForm();
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Failed to update product."
            : "Failed to create product."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="products-page">
        <div className="hero-section">
          <div>
            <h1 className="page-title">Inventory Dashboard</h1>
            <p className="page-subtitle">
              Manage products, monitor stock, and keep track of low inventory items.
            </p>
          </div>
        </div>

        <div className="stats-grid stats-grid-expanded">
          <div className="stat-card">
            <span className="stat-label">Products On Page</span>
            <strong className="stat-value">{products.length}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Total Matching Products</span>
            <strong className="stat-value">{totalProducts}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Healthy Products</span>
            <strong className="stat-value">{healthyProductsCount}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Low Stock Items</span>
            <strong className="stat-value warning-text">{lowStockCount}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Available Units</span>
            <strong className="stat-value">{totalAvailableUnits}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Average Page Price</span>
            <strong className="stat-value">${averagePrice.toFixed(2)}</strong>
          </div>
        </div>

        <div className="dashboard-summary-grid">
          <section className="panel summary-panel">
            <div className="panel-header">
              <h2>Inventory Health</h2>
              <p>Quick overview of the currently loaded products.</p>
            </div>

            <div className="health-list">
              <div className="health-item">
                <div>
                  <span className="health-label">Healthy products</span>
                  <strong className="health-value">{healthyProductsCount}</strong>
                </div>
                <div className="health-badge healthy">Healthy</div>
              </div>

              <div className="health-item">
                <div>
                  <span className="health-label">Low stock products</span>
                  <strong className="health-value">{lowStockCount}</strong>
                </div>
                <div className="health-badge low">Low stock</div>
              </div>

              <div className="health-item">
                <div>
                  <span className="health-label">Low stock percentage</span>
                  <strong className="health-value">{lowStockPercentage}%</strong>
                </div>
                <div className="health-badge neutral">Current page</div>
              </div>
            </div>

            <div className="progress-block">
              <div className="progress-header">
                <span>Catalog health</span>
                <strong>{Math.max(0, 100 - lowStockPercentage)}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(0, 100 - lowStockPercentage)}%` }}
                />
              </div>
            </div>
          </section>

          <section className="panel summary-panel">
            <div className="panel-header">
              <h2>Category Overview</h2>
              <p>Top categories from the current page results.</p>
            </div>

            {categoryOverview.length === 0 ? (
              <div className="empty-results compact-empty">
                <h3>No category data yet</h3>
                <p>Create some products to see a category summary.</p>
              </div>
            ) : (
              <div className="category-overview-list">
                {categoryOverview.map((item) => (
                  <div key={item.name} className="category-overview-item">
                    <div className="category-main">
                      <strong>{item.name}</strong>
                      <span>{item.count} products</span>
                    </div>
                    <div className="category-meta">
                      <span>{item.availableUnits} available units</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="content-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>{isEditMode ? "Edit Product" : "Create Product"}</h2>
              <p>
                {isEditMode
                  ? "Update the selected product and save your changes."
                  : "Add a new product to your inventory."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="sku">SKU</label>
                  <input
                    id="sku"
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="Enter SKU"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                  />
                </div>

                <div className="form-field form-field-full">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Enter description"
                    rows={4}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="price">Price</label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="categoryId">Category</label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={form.categoryId}
                    onChange={handleChange}
                    disabled={loadingCategories}
                  >
                    <option value={0}>
                      {loadingCategories ? "Loading categories..." : "Select category"}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="stockOnHand">Stock on Hand</label>
                  <input
                    id="stockOnHand"
                    type="number"
                    name="stockOnHand"
                    value={form.stockOnHand}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="stockReserved">Reserved</label>
                  <input
                    id="stockReserved"
                    type="number"
                    name="stockReserved"
                    value={form.stockReserved}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="reorderThreshold">Reorder Threshold</label>
                  <input
                    id="reorderThreshold"
                    type="number"
                    name="reorderThreshold"
                    value={form.reorderThreshold}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting || deletingProductId !== null}
                >
                  {submitting
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                      ? "Update Product"
                      : "Create Product"}
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleCancelEdit}
                    disabled={submitting || deletingProductId !== null}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {error && <div className="message message-error">{error}</div>}
            {success && <div className="message message-success">{success}</div>}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Products</h2>
              <p>Overview of products from the current query.</p>
            </div>

            <div className="filters-bar">
              <div className="filters-grid">
                <div className="filter-field filter-field-search">
                  <label htmlFor="searchTerm">Search</label>
                  <input
                    id="searchTerm"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by SKU or product name"
                  />
                </div>

                <div className="filter-field">
                  <label htmlFor="filterCategory">Category</label>
                  <select
                    id="filterCategory"
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryFilterChange(Number(e.target.value))}
                  >
                    <option value={0}>All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="filterStockStatus">Stock Status</label>
                  <select
                    id="filterStockStatus"
                    value={stockFilter}
                    onChange={(e) => handleStockFilterChange(e.target.value as StockFilter)}
                  >
                    <option value="all">All products</option>
                    <option value="healthy">Healthy only</option>
                    <option value="low">Low stock only</option>
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="sortBy">Sort By</label>
                  <select
                    id="sortBy"
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                    <option value="price-asc">Price low to high</option>
                    <option value="price-desc">Price high to low</option>
                    <option value="available-asc">Lowest available stock</option>
                    <option value="available-desc">Highest available stock</option>
                  </select>
                </div>

                <div className="filter-field">
                  <label htmlFor="pageSize">Page Size</label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                  </select>
                </div>

                <div className="filter-actions">
                  <button
                    type="button"
                    className="clear-filters-button"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="filters-summary">
                <span>
                  Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
                  <strong>{serverData.totalCount}</strong> matching products
                </span>
                <span>
                  Sorted by <strong>{getSortLabel(sortBy)}</strong>
                </span>
              </div>
            </div>

            {loadingProducts ? (
              <p className="state-text">Loading products...</p>
            ) : serverData.totalCount === 0 ? (
              <div className="empty-results">
                <h3>No matching products</h3>
                <p>Try changing your search, filters, or sorting.</p>
              </div>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Reserved</th>
                        <th>Threshold</th>
                        <th>Available</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => {
                        const available = getAvailableStock(product);
                        const isLowStock = available <= product.reorderThreshold;
                        const isDeleting = deletingProductId === product.id;

                        return (
                          <tr key={product.id} className={isLowStock ? "row-low-stock" : ""}>
                            <td>{product.id}</td>
                            <td>{product.sku}</td>
                            <td>{product.name}</td>
                            <td>{product.description}</td>
                            <td>${product.price.toFixed(2)}</td>
                            <td>{product.categoryName}</td>
                            <td>{product.stockOnHand}</td>
                            <td>{product.stockReserved}</td>
                            <td>{product.reorderThreshold}</td>
                            <td>{available}</td>
                            <td>
                              <span className={isLowStock ? "status-badge low" : "status-badge ok"}>
                                {isLowStock ? "Low Stock" : "Healthy"}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-button edit-button"
                                  onClick={() => handleEditClick(product)}
                                  disabled={submitting || deletingProductId !== null}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="table-button delete-button"
                                  onClick={() => handleDeleteClick(product)}
                                  disabled={submitting || deletingProductId !== null}
                                >
                                  {isDeleting ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pagination-bar">
                  <div className="pagination-info">
                    Page <strong>{serverData.page}</strong> of{" "}
                    <strong>{Math.max(serverData.totalPages, 1)}</strong>
                  </div>

                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="page-button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    {paginationItems.map((item, index) =>
                      typeof item === "string" ? (
                        <span key={`${item}-${index}`} className="page-ellipsis">
                          ...
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`page-button ${currentPage === item ? "active" : ""}`}
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="page-button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(Math.max(serverData.totalPages, 1), page + 1)
                        )
                      }
                      disabled={currentPage === Math.max(serverData.totalPages, 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {isDeleteModalOpen && productToDelete && (
        <div className="modal-overlay" onClick={handleCloseDeleteModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">!</div>

            <h3 className="modal-title">Delete product?</h3>

            <p className="modal-text">
              You are about to delete <strong>{productToDelete.name}</strong>. This
              action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-button modal-cancel-button"
                onClick={handleCloseDeleteModal}
                disabled={deletingProductId !== null}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-button modal-delete-button"
                onClick={handleConfirmDelete}
                disabled={deletingProductId !== null}
              >
                {deletingProductId === productToDelete.id ? "Deleting..." : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}