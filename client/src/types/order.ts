export type OrderStatus = "Pending" | "Processing" | "Completed" | "Cancelled";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export type OrderListItem = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  customerCountry: string;
  market: string;
  itemsCount: number;
  totalUnits: number;
  createdAtUtc: string;
};

export type OrderItem = {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDetail = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  customerCountry: string;
  market: string;
  createdAtUtc: string;
  items: OrderItem[];
};

export type OrderListResponse = {
  items: OrderListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalRevenueInQuery: number;
  totalUnitsInQuery: number;
};

export type OrderQueryParams = {
  search?: string;
  status?: string;
  paymentStatus?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
};

export type CreateOrderItemRequest = {
  productId: number;
  quantity: number;
};

export type CreateOrderRequest = {
  status: string;
  paymentStatus: string;
  customerCountry: string;
  market: string;
  items: CreateOrderItemRequest[];
};
