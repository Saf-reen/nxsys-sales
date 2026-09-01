import { useContext } from 'react';
import { WishlistContext } from '@/context/wishlistContext';
import type { WishlistContextValue } from '@/types';

export const useWishlist = (): WishlistContextValue | null =>
  useContext(WishlistContext);

export default useWishlist;
