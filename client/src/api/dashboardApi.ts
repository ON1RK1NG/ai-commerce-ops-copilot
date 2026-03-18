import type { DashboardSummary } from "../types/dashboard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7017/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`);
  return handleResponse<DashboardSummary>(response);
}