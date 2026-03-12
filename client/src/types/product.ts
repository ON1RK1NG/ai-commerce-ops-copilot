export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: number;
  categoryName: string;
  stockOnHand: number;
  stockReserved: number;
  reorderThreshold: number;
  createdAtUtc: string;
};

export type Category = {
  id: number;
  name: string;
};

export type CreateProductRequest = {
  sku: string;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  stockOnHand: number;
  stockReserved: number;
  reorderThreshold: number;
};

export type UpdateProductRequest = CreateProductRequest;

export type StockFilter = "all" | "healthy" | "low";

export type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "available-asc"
  | "available-desc";

export type ProductQueryParams = {
  search?: string;
  categoryId?: number;
  stockStatus?: Exclude<StockFilter, "all">;
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
};

export type PagedResponse<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductListResponse = PagedResponse<Product>;

export type InventoryCategorySummary = {
  name: string;
  count: number;
  availableUnits: number;
};

export type InventorySummary = {
  totalMatchingProducts: number;
  healthyProductsCount: number;
  lowStockCount: number;
  totalStockOnHand: number;
  totalAvailableUnits: number;
  averagePrice: number;
  lowStockPercentage: number;
  catalogHealthPercentage: number;
  topCategories: InventoryCategorySummary[];
};