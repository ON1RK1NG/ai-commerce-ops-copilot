import { useState } from "react";
import "./App.css";
import InventoryPage from "./pages/InventoryPage";
import ProductsPage from "./pages/ProductsPage";

type View = "products" | "inventory";

export default function App() {
  const [view, setView] = useState<View>("products");

  return (
    <div>
      <header
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "1.25rem 1rem 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>
            AI Commerce Ops Copilot
          </h1>
          <p style={{ margin: "0.35rem 0 0", color: "#64748b" }}>
            Operations dashboard for products and inventory.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setView("products")}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "0.7rem 1rem",
              cursor: "pointer",
              fontWeight: 700,
              background: view === "products" ? "#2563eb" : "#e2e8f0",
              color: view === "products" ? "#ffffff" : "#0f172a",
            }}
          >
            Products
          </button>

          <button
            type="button"
            onClick={() => setView("inventory")}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "0.7rem 1rem",
              cursor: "pointer",
              fontWeight: 700,
              background: view === "inventory" ? "#2563eb" : "#e2e8f0",
              color: view === "inventory" ? "#ffffff" : "#0f172a",
            }}
          >
            Inventory
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "1rem" }}>
        {view === "products" ? <ProductsPage /> : <InventoryPage />}
      </main>
    </div>
  );
}
