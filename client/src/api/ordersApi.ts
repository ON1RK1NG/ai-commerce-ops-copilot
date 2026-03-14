import type {
  CreateOrderRequest,
  OrderDetail,
  OrderListResponse,
  OrderQueryParams,
} from "../types/order";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7017/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildOrdersQuery(params?: OrderQueryParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return "";
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    searchParams.set("status", params.status.trim());
  }

  if (params.paymentStatus?.trim()) {
    searchParams.set("paymentStatus", params.paymentStatus.trim());
  }

  if (params.sortBy?.trim()) {
    searchParams.set("sortBy", params.sortBy.trim());
  }

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getOrders(params?: OrderQueryParams) {
  return request<OrderListResponse>(`${API_BASE_URL}/orders${buildOrdersQuery(params)}`);
}

export function getOrderById(id: number) {
  return request<OrderDetail>(`${API_BASE_URL}/orders/${id}`);
}

export function createOrder(payload: CreateOrderRequest) {
  return request<OrderDetail>(`${API_BASE_URL}/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
