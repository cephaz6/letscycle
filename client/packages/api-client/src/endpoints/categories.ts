import { http } from '../http';

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  typicalDistanceKm: number;
  /** Lucide icon name (PascalCase). */
  iconName: string;
}

export const categoriesApi = {
  /** Public list of all categories. */
  list(): Promise<Category[]> {
    return http.get<Category[]>('/categories', { auth: false });
  },
};
