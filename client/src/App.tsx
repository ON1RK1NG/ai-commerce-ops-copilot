import { useState } from "react";
import "./App.css";
import InventoryPage from "./pages/InventoryPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";

type View = "products" | "inventory" | "orders";

function AppLogo() {
  return (
    <div className="app-logo">
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
      className={`app-nav-button ${active ? "active" : ""}`}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState<View>("products");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <AppLogo />
            <h1 className="app-title">Commerce Ops</h1>
          </div>

          <div className="app-nav">
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

      <main className="app-main">
        {view === "products" && <ProductsPage />}
        {view === "inventory" && <InventoryPage />}
        {view === "orders" && <OrdersPage />}
      </main>
    </div>
  );
}