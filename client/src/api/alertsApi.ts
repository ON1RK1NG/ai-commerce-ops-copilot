import type {
  AlertListResponse,
  AlertQueryParameters,
} from "../types/alert";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7017/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function buildQueryString(params: AlertQueryParameters): string {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.status?.trim()) {
    searchParams.set("status", params.status.trim());
  }

  if (params.severity?.trim()) {
    searchParams.set("severity", params.severity.trim());
  }

  if (params.alertType?.trim()) {
    searchParams.set("alertType", params.alertType.trim());
  }

  if (params.page && params.page > 0) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize && params.pageSize > 0) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getAlerts(
  params: AlertQueryParameters = {}
): Promise<AlertListResponse> {
  const queryString = buildQueryString(params);
  const response = await fetch(`${API_BASE_URL}/alerts${queryString}`);
  return handleResponse(response);
}

export async function syncLowStockAlerts(): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/alerts/sync-low-stock`, {
    method: "POST",
  });

  return handleResponse(response);
}

export async function acknowledgeAlert(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/alerts/${id}/acknowledge`, {
    method: "PUT",
  });

  await handleResponse(response);
}

export async function resolveAlert(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/alerts/${id}/resolve`, {
    method: "PUT",
  });

  await handleResponse(response);
}