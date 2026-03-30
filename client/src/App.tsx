import { useState } from "react";
import "./App.css";
import AlertsPage from "./pages/AlertsPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";

type View = "dashboard" | "products" | "inventory" | "orders" | "alerts";

function AppLogo() {
  return (
    <div className="app-logo" aria-hidden="true">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 8.5C8 6.567 9.567 5 11.5 5H18.5C20.433 5 22 6.567 22 8.5C22 10.433 20.433 12 18.5 12H11.5C9.567 12 8 13.567 8 15.5C8 17.433 9.567 19 11.5 19H20"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 19L17 16"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 19L17 22"
          stroke="white"
          strokeWidth="2.4"
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
      className={`app-nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <AppLogo />
            <h1 className="app-title">Commerce Ops</h1>
          </div>

          <nav className="app-nav" aria-label="Primary navigation">
            <NavButton
              active={view === "dashboard"}
              label="Dashboard"
              onClick={() => setView("dashboard")}
            />
            <NavButton
              active={view === "products"}
              label="Products"
              onClick={() => setView("products")}
            />
            <NavButton
              active={view === "inventory"}
              label="Inventory"
              onClick={() => setView("inventory")}
            />
            <NavButton
              active={view === "orders"}
              label="Orders"
              onClick={() => setView("orders")}
            />
            <NavButton
              active={view === "alerts"}
              label="Alerts"
              onClick={() => setView("alerts")}
            />
          </nav>
        </div>
      </header>

      <main className="app-main">
        {view === "dashboard" && <DashboardPage />}
        {view === "products" && <ProductsPage />}
        {view === "inventory" && <InventoryPage />}
        {view === "orders" && <OrdersPage />}
        {view === "alerts" && <AlertsPage />}
      </main>
    </div>
  );
}