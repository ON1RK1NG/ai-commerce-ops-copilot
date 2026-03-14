import type {
  Category,
  CreateProductRequest,
  InventorySummary,
  Product,
  ProductListResponse,
  ProductQueryParams,
  UpdateProductRequest,
} from "../types/product";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7017/api";

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

function buildQueryString(params: ProductQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.categoryId && params.categoryId > 0) {
    searchParams.set("categoryId", String(params.categoryId));
  }

  if (params.stockStatus) {
    searchParams.set("stockStatus", params.stockStatus);
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
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

export async function getProducts(
  params: ProductQueryParams = {}
): Promise<ProductListResponse> {
  const queryString = buildQueryString(params);
  const response = await fetch(`${API_BASE_URL}/products${queryString}`);
  return handleResponse(response);
}

export async function getProductSummary(
  params: ProductQueryParams = {}
): Promise<InventorySummary> {
  const queryString = buildQueryString(params);
  const response = await fetch(`${API_BASE_URL}/products/summary${queryString}`);
  return handleResponse(response);
}

export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/categories`);
  return handleResponse(response);
}

export async function createProduct(
  request: CreateProductRequest
): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return handleResponse(response);
}

export async function updateProduct(
  id: number,
  request: UpdateProductRequest
): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return handleResponse(response);
}

export async function deleteProduct(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: "DELETE",
  });

  await handleResponse(response);
}