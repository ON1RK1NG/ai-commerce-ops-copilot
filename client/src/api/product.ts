import { http } from "./http";
import type { Product } from "../types/product";

export const getProducts = async (): Promise<Product[]> => {
  const response = await http.get<Product[]>("/products");
  return response.data;
};