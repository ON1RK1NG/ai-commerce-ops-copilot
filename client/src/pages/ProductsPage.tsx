import { useEffect, useMemo, useState } from "react";
import { createProduct, getCategories, getProducts } from "../api/productsApi";
import type { Category, CreateProductRequest, Product } from "../types/product";
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CreateProductRequest>(initialForm);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalProducts = products.length;

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockOnHand - p.stockReserved <= p.reorderThreshold).length;
  }, [products]);

  const totalStock = useMemo(() => {
    return products.reduce((sum, product) => sum + product.stockOnHand, 0);
  }, [products]);

  async function loadProducts() {
    try {
      setLoadingProducts(true);
      setError("");
      const data = await getProducts();
      setProducts(data);
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
    loadProducts();
    loadCategories();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    const numericFields = ["price", "categoryId", "stockOnHand", "stockReserved", "reorderThreshold"];

    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
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

    try {
      setSubmitting(true);

      await createProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        categoryId: Number(form.categoryId),
        stockOnHand: Number(form.stockOnHand),
        stockReserved: Number(form.stockReserved),
        reorderThreshold: Number(form.reorderThreshold),
      });

      setSuccess("Product created successfully.");
      setForm(initialForm);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="products-page">
      <div className="hero-section">
        <div>
          <h1 className="page-title">Inventory Dashboard</h1>
          <p className="page-subtitle">
            Manage products, monitor stock, and keep track of low inventory items.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Products</span>
          <strong className="stat-value">{totalProducts}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">Low Stock Items</span>
          <strong className="stat-value warning-text">{lowStockCount}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Units in Stock</span>
          <strong className="stat-value">{totalStock}</strong>
        </div>
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Create Product</h2>
            <p>Add a new product to your inventory.</p>
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

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Creating..." : "Create Product"}
            </button>
          </form>

          {error && <div className="message message-error">{error}</div>}
          {success && <div className="message message-success">{success}</div>}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Products</h2>
            <p>Overview of all products currently in the system.</p>
          </div>

          {loadingProducts ? (
            <p className="state-text">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="state-text">No products found.</p>
          ) : (
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
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const available = product.stockOnHand - product.stockReserved;
                    const isLowStock = available <= product.reorderThreshold;

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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}