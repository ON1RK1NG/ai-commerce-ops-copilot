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