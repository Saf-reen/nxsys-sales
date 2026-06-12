import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createProduct,
  getProducts,
  updateProduct,
} from '@/services';
import { getApiErrorMessage } from '@/services';
import {
  CATALOG_SYNC_EVENT,
  CATALOG_SYNC_KEY,
  getCatalogSyncVersion,
} from '@/utils/catalogSyncStore';
import { CatalogContext } from '@/context/catalogContext';
import { ProductContext } from '@/context/productContext';
import logger from '@/utils/logger';

const STALE_MS = 5 * 60 * 1000; // 5 minutes — min gap between focus-triggered re-fetches

const mergeProductIntoList = (currentProducts: any[], nextProduct: any) => {
  const nextId = String(nextProduct?.id || '');
  const currentIndex = currentProducts.findIndex((product) => String(product.id) === nextId);
  if (currentIndex === -1) return [...currentProducts, nextProduct];
  return currentProducts.map((product, index) => (index === currentIndex ? nextProduct : product));
};

export function ProductProvider({ children }) {
  const catalog = useContext(CatalogContext);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const latestProductVersionRef = useRef(getCatalogSyncVersion());
  const activeRequestRef = useRef<Promise<any> | null>(null);
  const hasFetchedInitialProductsRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastFetchedAtRef = useRef(0);

  const {
    categories = [],
    subcategories = [],
    subcategoriesByCategory = {},
    brands = [],
    loading: catalogLoading = false,
  } = catalog || {};

  const catalogSnapshotRef = useRef({ categories, subcategories, brands });
  useEffect(() => {
    catalogSnapshotRef.current = { categories, subcategories, brands };
  }, [categories, subcategories, brands]);

  const refreshProducts = useCallback(async (options: { silent?: boolean; force?: boolean } = {}) => {
    const { silent = false, force = false } = options;

    if (activeRequestRef.current && !force) return activeRequestRef.current;

    if (!silent) setLoading(true);
    setError(null);

    const request = (async () => {
      try {
        const productRes = await getProducts({}, catalogSnapshotRef.current);
        if (!isMountedRef.current) return productRes;
        const productList = Array.isArray(productRes) ? productRes : (productRes?.results || []);
        setProducts(productList);
        lastFetchedAtRef.current = Date.now();
        return productRes;
      } catch (err) {
        if (!isMountedRef.current) return null;
        if ((err as any)?.response?.status === 429) {
          console.warn('Too many requests. Please wait.');
        }
        const errorMsg = getApiErrorMessage(err, 'Failed to fetch products');
        logger.error('ProductContext: Failed to fetch products:', errorMsg, err);
        setError(errorMsg);
        return null;
      } finally {
        activeRequestRef.current = null;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    })();

    activeRequestRef.current = request;
    return request;
  }, []);

  // Start product fetch immediately — in parallel with catalog, not after it.
  // catalogSnapshotRef is updated whenever catalog data arrives so normalization
  // is correct even though both fetches run concurrently.
  useEffect(() => {
    if (hasFetchedInitialProductsRef.current) return;
    hasFetchedInitialProductsRef.current = true;
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const syncProductsIfNeeded = (nextVersion?: string) => {
      const resolvedVersion = nextVersion || getCatalogSyncVersion();
      if (!resolvedVersion || resolvedVersion === latestProductVersionRef.current) return;
      latestProductVersionRef.current = resolvedVersion;
      refreshProducts({ silent: true });
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CATALOG_SYNC_KEY) syncProductsIfNeeded(event.newValue ?? undefined);
    };

    const handleCatalogSync = (event: Event) =>
      syncProductsIfNeeded((event as CustomEvent<string>).detail);

    const syncIfStale = () => {
      if (Date.now() - lastFetchedAtRef.current < STALE_MS) return;
      syncProductsIfNeeded();
    };

    const handleWindowFocus = () => syncIfStale();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncIfStale();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CATALOG_SYNC_EVENT, handleCatalogSync);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CATALOG_SYNC_EVENT, handleCatalogSync);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshProducts]);

  const topSellingProducts = useMemo(
    () => products.filter((product) => product.topSelling).slice(0, 8),
    [products],
  );

  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured),
    [products],
  );

  const value = useMemo(
    () => ({
      products,
      loading: loading || catalogLoading,
      error,
      topSellingProducts,
      featuredProducts,
      refreshProducts,
      addProduct: async (data: any) => {
        const result = await createProduct(data, { categories, subcategories, brands });
        setProducts((current) => mergeProductIntoList(current, result));
        return result;
      },
      updateProduct: async (id: any, data: any) => {
        const result = await updateProduct(id, data, { categories, subcategories, brands });
        setProducts((current) => mergeProductIntoList(current, result));
        return result;
      },
      categories,
      subcategories,
      subcategoriesByCategory,
      brands,
    }),
    [
      brands,
      categories,
      catalogLoading,
      error,
      featuredProducts,
      loading,
      products,
      refreshProducts,
      subcategories,
      subcategoriesByCategory,
      topSellingProducts,
    ],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
