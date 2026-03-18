export type TopSellingProduct = {
  productId: number;
  sku: string;
  name: string;
  unitsSold: number;
  ordersCount: number;
  revenue: number;
};

export type RecentOrder = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  market: string;
  customerCountry: string;
  createdAtUtc: string;
};

export type DashboardSummary = {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayOrdersCount: number;
  todayRevenue: number;
  stockAttentionCount: number;
  topSellingProducts: TopSellingProduct[];
  recentOrders: RecentOrder[];
};