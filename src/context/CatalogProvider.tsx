import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/services';
import { getCatalogData } from '@/services';
import { getApiErrorMessage } from '@/services';
import {
  CATALOG_SYNC_EVENT,
  CATALOG_SYNC_KEY,
  getCatalogSyncVersion,
} from '@/utils/catalogSyncStore';
import { CatalogContext } from '@/context/catalogContext';
import logger from '@/utils/logger';

const STALE_MS = 5 * 60 * 1000; // 5 minutes — min gap between focus-triggered re-fetches

export function CatalogProvider({ children }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categoryTree, setCategoryTree] = useState<any[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const latestCatalogVersionRef = useRef(getCatalogSyncVersion());
  const lastFetchedAtRef = useRef(0);

  const refreshCatalog = useCallback(async (options: { force?: boolean; silent?: boolean } = {}) => {
    const { silent = false } = options;

    if (!silent) setLoading(true);
    setError(null);

    try {
      const catalogData = await getCatalogData();
      const allCategories = Array.isArray(catalogData.categories) ? catalogData.categories : [];
      setCategories(allCategories);
      setSubcategories(allCategories.filter((c: any) => !!c.parent));
      setBrands(Array.isArray(catalogData.brands) ? catalogData.brands : []);
      setCategoryTree(Array.isArray(catalogData.categoryTree) ? catalogData.categoryTree : []);
      setSubcategoriesByCategory((catalogData as any).subcategoriesByCategory || {});
      lastFetchedAtRef.current = Date.now();
      return catalogData;
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Failed to fetch catalog data');
      logger.error('CatalogProvider: Failed to fetch catalog:', errorMsg, err);
      setError(errorMsg);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    // Version-based sync: fires immediately for real catalog changes from another tab or
    // from admin mutations within this tab. No stale-time guard here — version change means
    // something genuinely changed and we want it reflected ASAP.
    const syncCatalogIfNeeded = (nextVersion?: string) => {
      const resolvedVersion = nextVersion || getCatalogSyncVersion();
      if (!resolvedVersion || resolvedVersion === latestCatalogVersionRef.current) return;
      latestCatalogVersionRef.current = resolvedVersion;
      refreshCatalog({ force: true, silent: true });
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CATALOG_SYNC_KEY) syncCatalogIfNeeded(event.newValue ?? undefined);
    };

    const handleCatalogSync = (event: Event) =>
      syncCatalogIfNeeded((event as CustomEvent<string>).detail);

    // Focus / visibility: only re-fetch if data is stale. Prevents a full reload every time
    // the user alt-tabs to Gmail and back.
    const syncIfStale = () => {
      if (Date.now() - lastFetchedAtRef.current < STALE_MS) return;
      syncCatalogIfNeeded();
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
  }, [refreshCatalog]);

  const value = useMemo(
    () => ({
      categories,
      subcategories,
      subcategoriesByCategory,
      categoryTree,
      brands,
      loading,
      error,
      refreshCatalog,
      addCategory: async (data: any) => {
        const result = await createCategory(data);
        await refreshCatalog({ force: true, silent: true });
        return result;
      },
      updateCategory: async (id: any, data: any) => {
        const result = await updateCategory(id, data);
        await refreshCatalog({ force: true, silent: true });
        return result;
      },
      deleteCategory: async (id: any) => {
        const result = await deleteCategory(id);
        await refreshCatalog({ force: true, silent: true });
        return result;
      },
    }),
    [brands, categories, categoryTree, error, loading, refreshCatalog, subcategories, subcategoriesByCategory],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
