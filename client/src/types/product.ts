export type Product = {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  isActive: boolean;
  category: string;
  stockOnHand: number;
  stockReserved: number;
  reorderThreshold: number;
  createdAtUtc: string;
};