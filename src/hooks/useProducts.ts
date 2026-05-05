import { useContext } from 'react';
import { ProductContext } from '@/context/productContext';
import type { ProductContextValue } from '@/types';

/** Returns null when called outside a ProductProvider (admin/auth layouts). */
export const useProducts = (): ProductContextValue | null => {
  return useContext(ProductContext);
};
