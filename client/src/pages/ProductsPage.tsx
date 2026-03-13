import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  getProductSummary,
  updateProduct,
} from "../api/productsApi";
import { useDebounce } from "../hooks/useDebounce";
import type {
  Category,
  CreateProductRequest,
  InventorySummary,
  Product,
  ProductListResponse,
  SortOption,
  StockFilter,
  UpdateProductRequest,
} from "../types/product";
import "../styles/ProductsPage.css";

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const ALLOWED_PAGE_SIZES = [5, 10, 20] as const;
const VALID_STOCK_FILTERS: StockFilter[] = ["all", "healthy", "low"];
const VALID_SORT_OPTIONS: SortOption[] = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "available-asc",
  "available-desc",
];

type DashboardUrlState = {
  searchTerm: string;
  selectedCategoryId: number;
  stockFilter: StockFilter;
  sortBy: SortOption;
  currentPage: number;
  pageSize: number;
};

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

const initialServerData: ProductListResponse = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalPages: 1,
};

const initialSummary: InventorySummary = {
  totalMatchingProducts: 0,
  healthyProductsCount: 0,
  lowStockCount: 0,
  totalStockOnHand: 0,
  totalAvailableUnits: 0,
  averagePrice: 0,
  lowStockPercentage: 0,
  catalogHealthPercentage: 100,
  topCategories: [],
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

  const items: Array<number | "start-ellipsis" | "end-ellipsis"> = [1];

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

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeStockFilter(value: string | null): StockFilter {
  if (value && VALID_STOCK_FILTERS.includes(value as StockFilter)) {
    return value as StockFilter;
  }

  return "all";
}

function normalizeSortOption(value: string | null): SortOption {
  if (value && VALID_SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption;
  }

  return "newest";
}

function normalizePageSize(value: string | null) {
  const parsed = parsePositiveInteger(value, DEFAULT_PAGE_SIZE);

  if (
    ALLOWED_PAGE_SIZES.includes(
      parsed as (typeof ALLOWED_PAGE_SIZES)[number]
    )
  ) {
    return parsed;
  }

  return DEFAULT_PAGE_SIZE;
}

function readDashboardStateFromUrl(): DashboardUrlState {
  const params = new URLSearchParams(window.location.search);

  return {
    searchTerm: params.get("search") ?? "",
    selectedCategoryId: parsePositiveInteger(params.get("categoryId"), 0),
    stockFilter: normalizeStockFilter(params.get("stockStatus")),
    sortBy: normalizeSortOption(params.get("sortBy")),
    currentPage: parsePositiveInteger(params.get("page"), 1),
    pageSize: normalizePageSize(params.get("pageSize")),
  };
}

function syncDashboardStateToUrl(state: DashboardUrlState) {
  const params = new URLSearchParams();

  const trimmedSearch = state.searchTerm.trim();

  if (trimmedSearch) {
    params.set("search", trimmedSearch);
  }

  if (state.selectedCategoryId > 0) {
    params.set("categoryId", String(state.selectedCategoryId));
  }

  if (state.stockFilter !== "all") {
    params.set("stockStatus", state.stockFilter);
  }

  if (state.sortBy !== "newest") {
    params.set("sortBy", state.sortBy);
  }

  if (state.currentPage > 1) {
    params.set("page", String(state.currentPage));
  }

  if (state.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(state.pageSize));
  }

  const nextSearch = params.toString();
  const nextUrl = nextSearch
    ? `${window.location.pathname}?${nextSearch}`
    : window.location.pathname;

  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ProductsPage() {
  const initialUrlState = useMemo(() => readDashboardStateFromUrl(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CreateProductRequest>(initialForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(
    null
  );
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState(initialUrlState.searchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialUrlState.selectedCategoryId
  );
  const [stockFilter, setStockFilter] = useState<StockFilter>(
    initialUrlState.stockFilter
  );
  const [sortBy, setSortBy] = useState<SortOption>(initialUrlState.sortBy);
  const [pageSize, setPageSize] = useState(initialUrlState.pageSize);
  const [currentPage, setCurrentPage] = useState(initialUrlState.currentPage);
  const [serverData, setServerData] =
    useState<ProductListResponse>(initialServerData);
  const [summary, setSummary] = useState<InventorySummary>(initialSummary);

  const isEditMode = editingProductId !== null;
  const isDeleteModalOpen = productToDelete !== null;
  const isSearchDebouncing = searchTerm !== debouncedSearchTerm;

  const paginationItems = useMemo(() => {
    return buildPaginationItems(currentPage, Math.max(serverData.totalPages, 1));
  }, [currentPage, serverData.totalPages]);

  const startItem =
    serverData.totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const endItem =
    serverData.totalCount === 0
      ? 0
      : Math.min(currentPage * pageSize, serverData.totalCount);

  useEffect(() => {
    syncDashboardStateToUrl({
      searchTerm,
      selectedCategoryId,
      stockFilter,
      sortBy,
      currentPage,
      pageSize,
    });
  }, [
    searchTerm,
    selectedCategoryId,
    stockFilter,
    sortBy,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const state = readDashboardStateFromUrl();

      setSearchTerm(state.searchTerm);
      setSelectedCategoryId(state.selectedCategoryId);
      setStockFilter(state.stockFilter);
      setSortBy(state.sortBy);
      setCurrentPage(state.currentPage);
      setPageSize(state.pageSize);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [success, error]);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await getProducts({
        search: debouncedSearchTerm,
        categoryId: selectedCategoryId > 0 ? selectedCategoryId : undefined,
        stockStatus: stockFilter === "all" ? undefined : stockFilter,
        sortBy,
        page: currentPage,
        pageSize,
      });

      if (
        response.totalCount > 0 &&
        response.totalPages > 0 &&
        currentPage > response.totalPages
      ) {
        setCurrentPage(response.totalPages);
        return;
      }

      setServerData(response);
      setProducts(response.items);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load products."));
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadSummary() {
    try {
      setLoadingSummary(true);

      const response = await getProductSummary({
        search: debouncedSearchTerm,
        categoryId: selectedCategoryId > 0 ? selectedCategoryId : undefined,
        stockStatus: stockFilter === "all" ? undefined : stockFilter,
      });

      setSummary(response);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load summary."));
    } finally {
      setLoadingSummary(false);
    }
  }

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load categories."));
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [
    debouncedSearchTerm,
    selectedCategoryId,
    stockFilter,
    sortBy,
    currentPage,
    pageSize,
  ]);

  useEffect(() => {
    void loadSummary();
  }, [debouncedSearchTerm, selectedCategoryId, stockFilter]);

  function resetForm() {
    setForm(initialForm);
    setEditingProductId(null);
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCategoryId(0);
    setStockFilter("all");
    setSortBy("newest");
    setPageSize(DEFAULT_PAGE_SIZE);
    setCurrentPage(1);
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

    window.scrollTo({ top: 0, behavior: "smooth" });
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
        await Promise.all([loadProducts(), loadSummary()]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete product."));
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
      await Promise.all([loadProducts(), loadSummary()]);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          isEditMode
            ? "Failed to update product."
            : "Failed to create product."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const lowStockProgressWidth = `${Math.min(
    100,
    Math.max(0, summary.lowStockPercentage)
  )}%`;

  return (
    <>
      <div className="products-page">
        <div className="hero-section">
          <div>
            <h1 className="page-title">Inventory Dashboard</h1>
            <p className="page-subtitle">
              Manage products, monitor stock, and keep track of low inventory
              items.
            </p>
          </div>
        </div>

        {success && <div className="message message-success">{success}</div>}
        {error && <div className="message message-error">{error}</div>}

        <div className="stats-grid stats-grid-expanded">
          <div className="stat-card">
            <span className="stat-label">Products On Page</span>
            <strong className="stat-value">{products.length}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Total Matching Products</span>
            <strong className="stat-value">
              {summary.totalMatchingProducts}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Healthy Products</span>
            <strong className="stat-value">
              {summary.healthyProductsCount}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Low Stock Items</span>
            <strong className="stat-value warning-text">
              {summary.lowStockCount}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Available Units</span>
            <strong className="stat-value">
              {summary.totalAvailableUnits}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Average Catalog Price</span>
            <strong className="stat-value">
              ${summary.averagePrice.toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="dashboard-summary-grid">
          <section className="panel summary-panel">
            <div className="panel-header">
              <h2>Inventory Health</h2>
              <p>
                {loadingSummary || isSearchDebouncing
                  ? "Refreshing catalog summary..."
                  : "Quick overview of the filtered catalog."}
              </p>
            </div>

            <div className="health-list">
              <div className="health-item">
                <div>
                  <span className="health-label">Healthy products</span>
                  <strong className="health-value">
                    {summary.healthyProductsCount}
                  </strong>
                </div>
                <div className="health-badge healthy">Healthy</div>
              </div>

              <div className="health-item">
                <div>
                  <span className="health-label">Low stock products</span>
                  <strong className="health-value">
                    {summary.lowStockCount}
                  </strong>
                </div>
                <div className="health-badge low">Low stock</div>
              </div>

              <div className="health-item">
                <div>
                  <span className="health-label">Low stock percentage</span>
                  <strong className="health-value">
                    {summary.lowStockPercentage}%
                  </strong>
                </div>
                <div className="health-badge neutral">Catalog</div>
              </div>

              <div className="health-item">
                <div>
                  <span className="health-label">Catalog health</span>
                  <strong className="health-value">
                    {summary.catalogHealthPercentage}%
                  </strong>
                </div>
                <div className="health-badge healthy">Overall</div>
              </div>
            </div>

            <div className="progress-block">
              <div className="progress-header">
                <span>Low stock ratio</span>
                <strong>{summary.lowStockPercentage}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: lowStockProgressWidth }}
                />
              </div>
            </div>
          </section>

          <section className="panel summary-panel">
            <div className="panel-header">
              <h2>Category Overview</h2>
              <p>Top categories from the filtered catalog.</p>
            </div>

            {summary.topCategories.length === 0 ? (
              <div className="empty-results compact-empty">
                <h3>📦 No category data yet</h3>
                <p>Create some products to see a category summary.</p>
              </div>
            ) : (
              <div className="category-overview-list">
                {summary.topCategories.map((item) => (
                  <div className="category-overview-item" key={item.name}>
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
                      {loadingCategories
                        ? "Loading categories..."
                        : "Select category"}
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
                    onChange={(e) =>
                      handleCategoryFilterChange(Number(e.target.value))
                    }
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
                    onChange={(e) =>
                      handleStockFilterChange(e.target.value as StockFilter)
                    }
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
                    onChange={(e) =>
                      handleSortChange(e.target.value as SortOption)
                    }
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                    <option value="price-asc">Price low to high</option>
                    <option value="price-desc">Price high to low</option>
                    <option value="available-asc">
                      Lowest available stock
                    </option>
                    <option value="available-desc">
                      Highest available stock
                    </option>
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
                  Showing <strong>{startItem}</strong>–<strong>{endItem}</strong>{" "}
                  of <strong>{serverData.totalCount}</strong> matching products
                </span>

                <span>
                  {isSearchDebouncing ? (
                    <>Waiting for search...</>
                  ) : (
                    <>
                      Sorted by <strong>{getSortLabel(sortBy)}</strong>
                    </>
                  )}
                </span>
              </div>
            </div>

            {loadingProducts ? (
              <p className="state-text">
                {isSearchDebouncing
                  ? "Waiting for search..."
                  : "Loading products..."}
              </p>
            ) : serverData.totalCount === 0 ? (
              <div className="empty-results">
                <h3>🔎 No matching products</h3>
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
                          <tr
                            key={product.id}
                            className={isLowStock ? "row-low-stock" : ""}
                          >
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
                              <span
                                className={
                                  isLowStock
                                    ? "status-badge low"
                                    : "status-badge ok"
                                }
                              >
                                {isLowStock ? "Low Stock" : "Healthy"}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-button edit-button"
                                  onClick={() => handleEditClick(product)}
                                  disabled={
                                    submitting || deletingProductId !== null
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="table-button delete-button"
                                  onClick={() => handleDeleteClick(product)}
                                  disabled={
                                    submitting || deletingProductId !== null
                                  }
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
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    {paginationItems.map((item, index) =>
                      typeof item === "number" ? (
                        <button
                          key={`${item}-${index}`}
                          type="button"
                          className={`page-button ${
                            currentPage === item ? "active" : ""
                          }`}
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </button>
                      ) : (
                        <span key={`${item}-${index}`} className="page-ellipsis">
                          ...
                        </span>
                      )
                    )}

                    <button
                      type="button"
                      className="page-button"
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(
                            Math.max(serverData.totalPages, 1),
                            page + 1
                          )
                        )
                      }
                      disabled={
                        currentPage === Math.max(serverData.totalPages, 1)
                      }
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
              You are about to delete <strong>{productToDelete.name}</strong>.
              This action cannot be undone.
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
                {deletingProductId === productToDelete.id
                  ? "Deleting..."
                  : "Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}