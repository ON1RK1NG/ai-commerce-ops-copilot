import type {
  AdjustInventoryRequest,
  InventoryDetail,
  InventoryListResponse,
  InventoryMovement,
  InventoryQueryParams,
} from "../types/inventory";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7017/api";

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

function buildInventoryQuery(params?: InventoryQueryParams) {
  const searchParams = new URLSearchParams();

  if (!params) {
    return "";
  }

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.stockStatus && params.stockStatus !== "all") {
    searchParams.set("stockStatus", params.stockStatus);
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
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

export function getInventory(params?: InventoryQueryParams) {
  return request<InventoryListResponse>(`${API_BASE_URL}/inventory${buildInventoryQuery(params)}`);
}

export function getInventoryByProductId(productId: number) {
  return request<InventoryDetail>(`${API_BASE_URL}/inventory/${productId}`);
}

export function getInventoryMovements(productId?: number, page = 1, pageSize = 20) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  if (productId) {
    searchParams.set("productId", String(productId));
  }

  return request<InventoryMovement[]>(`${API_BASE_URL}/inventory/movements?${searchParams.toString()}`);
}

export function adjustInventory(payload: AdjustInventoryRequest) {
  return request<InventoryDetail>(`${API_BASE_URL}/inventory/adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
