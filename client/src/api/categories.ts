import { http } from "./http";
import type { Category } from "../types/category";

export const getCategories = async (): Promise<Category[]> => {
  const response = await http.get<Category[]>("/categories");
  return response.data;
};