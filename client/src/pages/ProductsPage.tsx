import { useEffect, useState } from "react";
import { getProducts } from "../api/product";
import type { Product } from "../types/product";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch {
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading products...</div>;
  }

  if (error) {
    return <div style={{ padding: "20px" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Products</h1>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr>
            <th style={thStyle}>Id</th>
            <th style={thStyle}>SKU</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}>Stock</th>
            <th style={thStyle}>Reserved</th>
            <th style={thStyle}>Threshold</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td style={tdStyle}>{product.id}</td>
              <td style={tdStyle}>{product.sku}</td>
              <td style={tdStyle}>{product.name}</td>
              <td style={tdStyle}>{product.category}</td>
              <td style={tdStyle}>${product.price.toFixed(2)}</td>
              <td style={tdStyle}>{product.stockOnHand}</td>
              <td style={tdStyle}>{product.stockReserved}</td>
              <td style={tdStyle}>{product.reorderThreshold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "left" as const,
  backgroundColor: "#f5f5f5",
};

const tdStyle = {
  border: "1px solid #ccc",
  padding: "10px",
};