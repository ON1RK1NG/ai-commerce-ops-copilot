import { useState } from "react";
import "./App.css";
import InventoryPage from "./pages/InventoryPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";

type View = "products" | "inventory" | "orders";

function AppLogo() {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        background:
          "linear-gradient(135deg, #2563eb 0%, #1d4ed8 55%, #0f172a 100%)",
        display: "grid",
        placeItems: "center",
        boxShadow: "0 14px 32px rgba(37, 99, 235, 0.22)",
        flexShrink: 0,
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 7.5L12 3L20 7.5V16.5L12 21L4 16.5V7.5Z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 10.5H16"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 13.5H13.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function NavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 999,
        padding: "0.78rem 1.2rem",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "0.95rem",
        background: active ? "#2563eb" : "#e2e8f0",
        color: active ? "#ffffff" : "#0f172a",
        boxShadow: active ? "0 10px 24px rgba(37, 99, 235, 0.18)" : "none",
        transition: "all 0.18s ease",
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState<View>("products");

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #f8fbff 0%, #f1f5f9 42%, #eef2f7 100%)",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "rgba(248, 251, 255, 0.82)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.9rem",
              minWidth: 0,
            }}
          >
            <AppLogo />

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "2rem",
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  background:
                    "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Commerce Ops
              </h1>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <NavButton
              label="Products"
              active={view === "products"}
              onClick={() => setView("products")}
            />
            <NavButton
              label="Inventory"
              active={view === "inventory"}
              onClick={() => setView("inventory")}
            />
            <NavButton
              label="Orders"
              active={view === "orders"}
              onClick={() => setView("orders")}
            />
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "1rem",
        }}
      >
        {view === "products" && <ProductsPage />}
        {view === "inventory" && <InventoryPage />}
        {view === "orders" && <OrdersPage />}
      </main>
    </div>
  );
}