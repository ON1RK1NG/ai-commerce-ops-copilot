export type InventoryStockFilter = "all" | "healthy" | "low" | "out";

export type InventorySortOption =
  | "updated-desc"
  | "updated-asc"
  | "name-asc"
  | "name-desc"
  | "available-asc"
  | "available-desc"
  | "reserved-desc";

export type InventoryAdjustmentType =
  | "add-stock"
  | "remove-stock"
  | "reserve-stock"
  | "release-reserved-stock";

export type InventoryListItem = {
  productId: number;
  sku: string;
  productName: string;
  categoryName: string;
  stockOnHand: number;
  stockReserved: number;
  stockAvailable: number;
  reorderThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  recommendedRestockUnits: number;
  updatedAtUtc: string;
};

export type InventoryMovement = {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  movementType: string;
  quantity: number;
  reason: string;
  stockOnHandAfter: number;
  stockReservedAfter: number;
  stockAvailableAfter: number;
  createdAtUtc: string;
};

export type InventoryDetail = {
  productId: number;
  sku: string;
  productName: string;
  categoryName: string;
  stockOnHand: number;
  stockReserved: number;
  stockAvailable: number;
  reorderThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  recommendedRestockUnits: number;
  updatedAtUtc: string;
  recentMovements: InventoryMovement[];
};

export type InventoryListResponse = {
  items: InventoryListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  lowStockCount: number;
  outOfStockCount: number;
  healthyCount: number;
  totalAvailableUnits: number;
};

export type InventoryQueryParams = {
  search?: string;
  stockStatus?: InventoryStockFilter;
  sortBy?: InventorySortOption;
  page?: number;
  pageSize?: number;
};

export type AdjustInventoryRequest = {
  productId: number;
  adjustmentType: InventoryAdjustmentType;
  quantity: number;
  reason?: string;
};
