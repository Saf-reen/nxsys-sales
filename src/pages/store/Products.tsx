import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ProductGrid from '@/components/product/ProductGrid';
import FilterSidebar from '@/components/filters/FilterSidebar';
import ProductDetails from './ProductDetails';
import { useProducts } from '@/hooks/useProducts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  catalogApi,
  getBrandName,
  getCategoryName,
  getSubcategoryName,
  searchApi,
} from '@/services';
import { DEFAULT_FILTERS, slugify, normalizeSpecificationKey } from '@/utils';

// ─── Constants ──────────────────────────────────────────────────────────────

const DETAIL_ALIAS_PATTERN = /^\d+$/;

const FILTER_SECTIONS = [
  { key: 'display', label: 'Display', optionKey: 'displayValue', emptyLabel: 'No display values available.' },
  { key: 'categories', label: 'Category', optionKey: 'categoryLabel', idKey: 'categoryId', emptyLabel: 'No categories available.' },
  { key: 'subcategories', label: 'Subcategory', optionKey: 'subcategoryLabel', idKey: 'subcategoryId', emptyLabel: 'No subcategories available.' },
  { key: 'modelName', label: 'Model Name', optionKey: 'modelNameValue', emptyLabel: 'No model names available.' },
  { key: 'brands', label: 'Brands', optionKey: 'brandValue', emptyLabel: 'No brands available.' },
  { key: 'colour', label: 'Colour', optionKey: 'colourValue', emptyLabel: 'No colour values available.' },
  { key: 'operatingSystem', label: 'Operating System', optionKey: 'operatingSystemValue', emptyLabel: 'No operating systems available.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toDisplayValue = (value: any) => String(value || '').trim();

const getSpecificationValue = (product: any, keys: string[] = []) => {
  const specifications = product?.specifications || [];
  const normalizedKeys = keys.map((key) => normalizeSpecificationKey(key));
  if (Array.isArray(specifications)) {
    for (const section of specifications) {
      for (const item of section.items || []) {
        if (normalizedKeys.includes(normalizeSpecificationKey(item.key))) {
          return String(item.value).trim();
        }
      }
    }
  }
  return '';
};

const matchesSelectedValues = (selectedValues: any[] = [], entryValue: string = '') =>
  !selectedValues.length || (entryValue && selectedValues.includes(entryValue));

const normalizeFacetOptions = (source: any) => {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map((item: any) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return { value: String(item), label: String(item), count: 0 };
      }
      const value = item.value ?? item.id ?? item.key ?? item.name ?? item.label;
      const label = item.label ?? item.name ?? item.key ?? item.value ?? value;
      return value ? { value: String(value), label: String(label), count: Number(item.count ?? item.doc_count ?? 0) } : null;
    }).filter(Boolean);
  }
  if (typeof source === 'object') {
    return Object.entries(source).map(([value, count]: [string, any]) => ({
      value: String(value),
      label: String(value),
      count: Number(count?.count ?? count?.doc_count ?? count ?? 0),
    }));
  }
  return [];
};

const getFacetSource = (facets: any = {}, section: any) => {
  const source = facets.facets || facets;
  return source?.[section.key] ?? source?.[section.optionKey] ?? source?.[section.label] ?? source?.[section.label?.toLowerCase?.()] ?? null;
};

// ─── ProductsPage ────────────────────────────────────────────────────────────

function ProductsPage({ predefinedCategory }: { predefinedCategory?: any }) {
  const { category: urlCategory, subcategory: urlSubcategory } = useParams();
  const navigate = useNavigate();
  const {
    categories = [],
    subcategories = [],
    subcategoriesByCategory = {},
    brands = [],
    error = null,
  } = useProducts() ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  const querySearch = searchParams.get('search') || '';
  const searchCategory = searchParams.get('category') || '';
  const searchSubcategory = searchParams.get('subcategory') || '';
  const requestedCategory = predefinedCategory || urlCategory || searchCategory || '';
  const requestedSubcategory = urlSubcategory || searchSubcategory || '';

  // ── Category / subcategory resolution ──────────────────────────────────────

  const findCategory = useCallback((value: any) => {
    if (!value || value === 'All') return null;
    return categories.find((c: any) => {
      const name = c?.name || '';
      return (
        String(c?.id) === String(value) ||
        name.toLowerCase() === String(value).toLowerCase() ||
        slugify(name) === slugify(value)
      );
    }) || null;
  }, [categories]);

  const findSubcategory = useCallback((value: any, source = subcategories) => {
    if (!value || value === 'All') return null;
    return source.find((s: any) => {
      const name = s?.name || '';
      return (
        String(s?.id) === String(value) ||
        name.toLowerCase() === String(value).toLowerCase() ||
        slugify(name) === slugify(value)
      );
    }) || null;
  }, [subcategories]);

  const resolvedCategory = useMemo(
    () => findCategory(requestedCategory),
    [requestedCategory, findCategory],
  );

  const categoryScopedSubcategories = useMemo(
    () => resolvedCategory ? subcategoriesByCategory[String(resolvedCategory.id)] || [] : subcategories,
    [resolvedCategory, subcategoriesByCategory, subcategories],
  );

  const resolvedSubcategory = useMemo(
    () =>
      findSubcategory(requestedSubcategory, categoryScopedSubcategories) ||
      findSubcategory(requestedSubcategory, subcategories),
    [requestedSubcategory, categoryScopedSubcategories, subcategories, findSubcategory],
  );

  const routeCategoryId = resolvedCategory?.id ? String(resolvedCategory.id) : null;
  const routeSubcategoryId = resolvedSubcategory?.id ? String(resolvedSubcategory.id) : null;
  const searchBrand = searchParams.get('brand');

  // ── Filters / UI state ────────────────────────────────────────────────────

  const [filters, setFilters] = useState<Record<string, any>>({
    ...DEFAULT_FILTERS,
    categories: routeCategoryId ? [routeCategoryId] : [],
    subcategories: routeSubcategoryId ? [routeSubcategoryId] : [],
    brands: searchBrand ? [searchBrand] : [],
    featuredOnly: searchParams.get('featured') === '1',
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState(querySearch);
  const debouncedSearch = useDeferredValue(searchTerm);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // ── Product data state ────────────────────────────────────────────────────

  const [products, setProducts] = useState<any[]>([]);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Server search state ───────────────────────────────────────────────────

  const [serverSearchProducts, setServerSearchProducts] = useState<any>(null);
  const [serverFacets, setServerFacets] = useState<Record<string, any>>({});
  const [serverSearchLoading, setServerSearchLoading] = useState(false);

  // ── Sync filters from URL ─────────────────────────────────────────────────

  useEffect(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      categories: routeCategoryId ? [routeCategoryId] : [],
      subcategories: routeSubcategoryId ? [routeSubcategoryId] : [],
      brands: searchBrand ? [searchBrand] : [],
    });
  }, [routeCategoryId, routeSubcategoryId, searchBrand]);

  useEffect(() => {
    setSearchTerm(querySearch);
  }, [querySearch]);

  // ── Build backend params from current filters ─────────────────────────────
  // Passes resolved IDs to the backend so the server pre-filters,
  // meaning all 20 products in the response are relevant.

  const backendParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (filters.categories.length) params.category = filters.categories[0];
    // Only send subcategory/brand to backend for single-selection; multi-select is handled client-side
    // so the backend returns the full category set and the client filters from it.
    if (filters.subcategories.length === 1) params.subcategory = filters.subcategories[0];
    if (filters.brands.length === 1) params.brand = filters.brands[0];
    if (filters.featuredOnly) params.featured = 'true';
    return params;
  }, [filters.categories, filters.subcategories, filters.brands, filters.featuredOnly]);

  // ── Fetch first page whenever filters or backend params change ────────────

  useEffect(() => {
    if (debouncedSearch.trim().length >= 2) return; // server search handles this path
    let isMounted = true;
    setLoading(true);
    setProducts([]);
    setNextPageUrl(null);

    catalogApi
      .getProducts({ ...backendParams }, { categories, subcategories, brands })
      .then((data: any) => {
        if (!isMounted) return;
        setProducts(data.results || []);
        setNextPageUrl(data.next || null);
        setTotalCount(data.count || 0);
      })
      .catch(() => { })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
    // Re-fetch when backend filters or catalog metadata changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendParams, categories.length, subcategories.length, brands.length]);

  // ── Load more (infinite scroll) ───────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (!nextPageUrl || loadingMore) return;
    setLoadingMore(true);
    catalogApi
      .getProductsPage(nextPageUrl, { categories, subcategories, brands })
      .then((data: any) => {
        setProducts((prev) => [...prev, ...(data.results || [])]);
        setNextPageUrl(data.next || null);
      })
      .catch(() => { })
      .finally(() => setLoadingMore(false));
  }, [nextPageUrl, loadingMore, categories, subcategories, brands]);

  // Sentinel ref — when it enters the viewport, loadMore fires
  const sentinelRef = useInfiniteScroll(loadMore, !!nextPageUrl && !loading && !loadingMore);

  // ── Server search ─────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const query = debouncedSearch.trim();

    if (query.length < 2) {
      setServerSearchProducts(null);
      setServerFacets({});
      setServerSearchLoading(false);
      return () => { isMounted = false; };
    }

    setServerSearchLoading(true);
    Promise.all([
      searchApi.searchProducts({ q: query, search: query }, { categories, subcategories, brands }),
      searchApi.getSearchFacets({ q: query, search: query }),
    ])
      .then(([searchProducts, facets]: [any, any]) => {
        if (!isMounted) return;
        setServerSearchProducts(Array.isArray(searchProducts) ? searchProducts : []);
        setServerFacets(facets || {});
      })
      .catch(() => {
        if (!isMounted) return;
        setServerSearchProducts(null);
        setServerFacets({});
      })
      .finally(() => { if (isMounted) setServerSearchLoading(false); });

    return () => { isMounted = false; };
  }, [brands, categories, debouncedSearch, subcategories]);

  // ── Catalog entries (client-side enrichment) ──────────────────────────────

  const activeProducts = Array.isArray(serverSearchProducts) ? serverSearchProducts : products;

  const categoryById = useMemo(
    () => new Map(categories.map((c: any) => [String(c.id), c])),
    [categories],
  );

  const catalogEntries = useMemo(
    () =>
      activeProducts.map((product: any) => {
        const rawCatId = String(
          product.categoryId ??
          product.category?.id ??
          (typeof product.category !== 'object' ? product.category : null) ??
          '',
        );
        const rawSubObj = product.subcategoryData ?? product.subcategory;
        const rawSubId = String(
          product.subcategoryId ??
          rawSubObj?.id ??
          (typeof rawSubObj !== 'object' ? rawSubObj : null) ??
          '',
        );

        const catObj = categoryById.get(rawCatId);
        const categoryId = catObj?.parent ? String(catObj.parent) : rawCatId;
        const subcategoryId = catObj?.parent ? rawCatId : rawSubId;

        const categoryLabel = getCategoryName(categoryId, categories) || 'Uncategorized';
        const subcategoryLabel =
          (catObj?.parent ? catObj.name : null) ||
          getSubcategoryName(subcategoryId, subcategories) ||
          '';

        const displayValue = getSpecificationValue(product, ['display_size', 'display', 'screen_size']) || '';
        const modelNameValue = getSpecificationValue(product, ['model_name', 'model_number']) || '';
        const colourValue = getSpecificationValue(product, ['colour', 'color']) || '';
        const operatingSystemValue = getSpecificationValue(product, ['operating_system', 'os']) || '';
        const brandValue = toDisplayValue(product.brandName || getBrandName(product.brand, brands));
        const name = toDisplayValue(product.name);
        const mpn = toDisplayValue(product.mpn) || 'N/A';
        const sku = toDisplayValue(product.sku) || 'N/A';

        const specificationsText = (product.specifications || [])
          .flatMap((group: any) => [
            group.category,
            ...(group.items || []).flatMap((item: any) => [item.key, item.value]),
          ])
          .filter(Boolean)
          .join(' ');

        return {
          id: String(product.id),
          product,
          detailPath: `/products/${product.id}`,
          name, mpn, sku,
          categoryId, categoryLabel,
          subcategoryId, subcategoryLabel,
          displayValue, modelNameValue,
          brandValue, colourValue, operatingSystemValue,
          searchText: `${name} ${mpn} ${sku} ${specificationsText}`.toLowerCase(),
        } as Record<string, any>;
      }),
    [activeProducts, categories, subcategories, brands, categoryById],
  );

  // ── Filter helpers ────────────────────────────────────────────────────────

  const categoryNameById = useMemo(
    () => new Map(categories.map((c: any) => [String(c.id), c.name])),
    [categories],
  );
  const subcategoryNameById = useMemo(
    () => new Map(subcategories.map((s: any) => [String(s.id), s.name])),
    [subcategories],
  );

  const selectedCategoryIds = filters.categories;

  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryIds.length) return subcategories;
    const lookup = new Map();
    selectedCategoryIds.forEach((catId: any) => {
      (subcategoriesByCategory[String(catId)] || []).forEach((s: any) => {
        lookup.set(String(s.id), s);
      });
    });
    return Array.from(lookup.values());
  }, [selectedCategoryIds, subcategories, subcategoriesByCategory]);

  useEffect(() => {
    if (!filters.subcategories.length) return;
    const availableIds = new Set(availableSubcategories.map((s: any) => String(s.id)));
    const next = filters.subcategories.filter((id: any) => availableIds.has(String(id)));
    if (next.length !== filters.subcategories.length) {
      setFilters((prev) => ({ ...prev, subcategories: next }));
    }
  }, [availableSubcategories, filters.subcategories]);

  const matchesEntry = (entry: any, activeFilters: any, searchValue: string, ignoreKey: string | null = null) => {
    const normalized = searchValue.trim().toLowerCase();
    if (normalized && !entry.searchText.includes(normalized)) return false;
    if (ignoreKey !== 'categories' && !matchesSelectedValues(activeFilters.categories, entry.categoryId)) return false;
    if (ignoreKey !== 'subcategories' && !matchesSelectedValues(activeFilters.subcategories, entry.subcategoryId)) return false;
    if (ignoreKey !== 'display' && !matchesSelectedValues(activeFilters.display, entry.displayValue)) return false;
    if (ignoreKey !== 'modelName' && !matchesSelectedValues(activeFilters.modelName, entry.modelNameValue)) return false;
    if (ignoreKey !== 'brands' && !matchesSelectedValues(activeFilters.brands, entry.brandValue)) return false;
    if (ignoreKey !== 'colour' && !matchesSelectedValues(activeFilters.colour, entry.colourValue)) return false;
    if (ignoreKey !== 'operatingSystem' && !matchesSelectedValues(activeFilters.operatingSystem, entry.operatingSystemValue)) return false;
    if (ignoreKey !== 'featuredOnly' && activeFilters.featuredOnly && !entry.product.featured) return false;
    return true;
  };

  const filterSections = useMemo(
    () =>
      FILTER_SECTIONS.map((section) => {
        const scopedEntries = catalogEntries.filter((entry) =>
          matchesEntry(entry, filters, debouncedSearch, section.key),
        );
        const counts = new Map<string, any>();

        scopedEntries.forEach((entry) => {
          const optionValue = section.idKey ? entry[section.idKey] : entry[section.optionKey];
          const optionLabel = entry[section.optionKey];
          if (!optionValue || !optionLabel) return;
          const current = counts.get(String(optionValue)) || { value: String(optionValue), label: optionLabel, count: 0 };
          counts.set(String(optionValue), { ...current, count: current.count + 1 });
        });

        const selectedValues = filters[section.key] || [];
        selectedValues.forEach((sel: any) => {
          const key = String(sel);
          if (counts.has(key)) return;
          let label = key;
          if (section.key === 'categories') label = categoryNameById.get(key) || key;
          else if (section.key === 'subcategories') label = subcategoryNameById.get(key) || key;
          else {
            const match = catalogEntries.find((e) => {
              const v = section.idKey ? e[section.idKey] : e[section.optionKey];
              return String(v) === key;
            });
            label = match?.[section.optionKey] || key;
          }
          counts.set(key, { value: key, label, count: 0 });
        });

        normalizeFacetOptions(getFacetSource(serverFacets, section)).forEach((facetOption: any) => {
          if (facetOption && !counts.has(String(facetOption.value))) {
            counts.set(String(facetOption.value), facetOption);
          }
        });

        let options = Array.from(counts.values()).sort((a, b) => a.label.localeCompare(b.label));

        if (section.key === 'subcategories' && selectedCategoryIds.length > 0 && availableSubcategories.length > 0) {
          const availableIds = new Set(availableSubcategories.map((s: any) => String(s.id)));
          const keptOptions = options.filter((opt) => availableIds.has(String(opt.value)));
          const keptIds = new Set(keptOptions.map((opt) => String(opt.value)));
          availableSubcategories.forEach((s: any) => {
            if (!keptIds.has(String(s.id))) {
              keptOptions.push({ value: String(s.id), label: s.name, count: 0 });
            }
          });
          options = keptOptions.sort((a, b) => a.label.localeCompare(b.label));
        }

        return {
          ...section,
          options,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogEntries, filters, debouncedSearch, categoryNameById, subcategoryNameById, serverFacets, availableSubcategories],
  );

  const filteredEntries = useMemo(() => {
    const visible = catalogEntries.filter((e) => matchesEntry(e, filters, debouncedSearch));
    return [...visible].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogEntries, filters, debouncedSearch, sortBy]);

  // ── Filter chip helpers ───────────────────────────────────────────────────

  const selectedCategoryLabels = useMemo(() => {
    const map = new Map(categories.map((c: any) => [String(c.id), c.name]));
    return filters.categories.map((id: any) => ({
      key: 'categories', value: id,
      label: map.get(String(id)) || String(id), groupLabel: 'Category',
    }));
  }, [filters.categories, categories]);

  const selectedSubcategoryLabels = useMemo(() => {
    const map = new Map(subcategories.map((s: any) => [String(s.id), s.name]));
    return filters.subcategories.map((id: any) => ({
      key: 'subcategories', value: id,
      label: map.get(String(id)) || String(id), groupLabel: 'Subcategory',
    }));
  }, [filters.subcategories, subcategories]);

  const activeFilterChips = useMemo(() => {
    const chips = [...selectedCategoryLabels, ...selectedSubcategoryLabels];
    filterSections.forEach((section) => {
      if (section.key === 'categories' || section.key === 'subcategories') return;
      (filters[section.key] || []).forEach((val: any) => {
        const opt = section.options.find((o: any) => String(o.value) === String(val));
        chips.push({ key: section.key, value: val, label: opt?.label || String(val), groupLabel: section.label });
      });
    });
    if (filters.featuredOnly) chips.push({ key: 'featuredOnly', value: 'featuredOnly', label: 'Stocked Units', groupLabel: 'Availability' });
    return chips;
  }, [filters, filterSections, selectedCategoryLabels, selectedSubcategoryLabels]);

  const handleToggleFilter = (key: any, value: any) => {
    setFilters((prev: any) => {
      if (key === 'featuredOnly') return { ...prev, featuredOnly: !prev.featuredOnly };
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value) ? current.filter((v: any) => v !== value) : [...current, value];
      if (key === 'categories') {
        if (!next.length) return { ...prev, categories: [], subcategories: [] };
        const validSubIds = new Set(
          next.flatMap((catId: any) =>
            (subcategoriesByCategory[String(catId)] || []).map((s: any) => String(s.id)),
          ),
        );
        return {
          ...prev,
          categories: next,
          subcategories: prev.subcategories.filter((id: any) => validSubIds.has(String(id))),
        };
      }
      return { ...prev, [key]: next };
    });
  };

  const handleRemoveFilter = (key: any, value: any) => {
    if (key === 'featuredOnly') {
      setFilters((prev: any) => ({ ...prev, featuredOnly: false }));
      return;
    }
    setFilters((prev: any) => ({
      ...prev,
      [key]: (prev[key] || []).filter((v: any) => String(v) !== String(value)),
    }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTerm('');
    setSearchParams({});
    if (urlCategory || urlSubcategory || predefinedCategory) navigate('/products');
  };

  // ── Labels for breadcrumbs ────────────────────────────────────────────────

  const activeCategoryLabel =
    filters.categories.length === 1
      ? categories.find((c: any) => String(c.id) === String(filters.categories[0]))?.name || ''
      : '';

  const activeSubcategoryLabel =
    filters.subcategories.length === 1
      ? subcategories.find((s: any) => String(s.id) === String(filters.subcategories[0]))?.name || ''
      : '';

  const hasCategoryScopedResults = Boolean(filters.categories.length || filters.subcategories.length);

  const breadcrumbItems = [
    { label: 'Products', path: '/products', active: !activeCategoryLabel && !activeSubcategoryLabel },
    ...(activeCategoryLabel ? [{ label: activeCategoryLabel, path: `/products/${slugify(activeCategoryLabel)}`, active: !activeSubcategoryLabel }] : []),
    ...(activeSubcategoryLabel ? [{ label: activeSubcategoryLabel, active: true }] : []),
  ];

  // ── Progress indicator ────────────────────────────────────────────────────

  const loadedCount = products.length;
  const hasMore = !!nextPageUrl;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/30">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="container-shell pb-8 pt-8 sm:pb-16 lg:pb-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">

          {/* Mobile filter overlay */}
          {showMobileFilters ? (
            <button
              type="button"
              className="fixed inset-0 z-[39] bg-black/45 backdrop-blur-[1px] lg:hidden"
              onClick={() => setShowMobileFilters(false)}
              aria-label="Close filters"
            />
          ) : null}

          {/* Filter sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-[40] w-[min(88vw,340px)] bg-white transition-transform duration-300 lg:sticky lg:top-6 lg:z-auto lg:w-[280px] lg:self-start lg:bg-transparent xl:w-[300px] ${showMobileFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-black/10 bg-primary px-5 py-4 lg:hidden">
                <span className="text-[13px] font-black uppercase tracking-widest text-textMain">Filters</span>
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/10 text-textMain transition-colors hover:bg-black/20"
                  aria-label="Close filters"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="h-full overflow-y-auto p-6 lg:p-0">
                <FilterSidebar
                  sections={filterSections as any}
                  filters={filters}
                  totalResults={filteredEntries.length}
                  onToggleOption={handleToggleFilter}
                  onReset={resetFilters}
                />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">

            {/* Header row */}
            <div className="mb-6 border-b border-slate-200 pb-6 sm:mb-8 sm:pb-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  {/* Product count — shows loaded vs total */}
                  <p className="text-[11px] font-semibold text-slate-400">
                    {filteredEntries.length > 0
                      ? `${filteredEntries.length} result${filteredEntries.length !== 1 ? 's' : ''}${totalCount > loadedCount ? ` — scroll for more` : ` of ${totalCount} total`}`
                      : totalCount > 0 ? `${totalCount} product${totalCount !== 1 ? 's' : ''} available` : ''}
                  </p>
                  <h1 className="mt-1.5 text-2xl font-black tracking-tight text-textMain sm:mt-2 sm:text-3xl md:text-4xl">
                    {activeSubcategoryLabel || activeCategoryLabel || 'Global Catalog'}
                  </h1>
                </div>

                <div className="flex flex-col gap-4 lg:shrink-0 lg:items-end">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">

                    {/* Search */}
                    <div className="relative w-full sm:max-w-[320px] sm:flex-1 lg:w-[280px] lg:flex-none xl:w-[320px]">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name, SKU, or specs…"
                        value={searchTerm}
                        onChange={(e) => {
                          const val = e.target.value;
                          startTransition(() => setSearchTerm(val));
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            if (val.trim()) next.set('search', val.trim());
                            else next.delete('search');
                            return next;
                          }, { replace: true });
                        }}
                        className="w-full rounded-full border-2 border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-[13px] font-medium text-textMain outline-none transition-all focus:border-primary focus:bg-white sm:py-3"
                      />
                    </div>

                    {/* Mobile filters button */}
                    <button
                      type="button"
                      onClick={() => setShowMobileFilters(true)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 text-[11px] font-black uppercase tracking-[0.14em] text-textMain transition-colors hover:border-primary lg:hidden"
                    >
                      <SlidersHorizontal size={14} />
                      Filters
                    </button>

                    {/* Sort */}
                    <div className="flex min-h-[44px] items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent py-2 text-[11px] font-black uppercase tracking-[0.12em] text-textMain outline-none"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                      </select>
                    </div>

                    {/* View toggle */}
                    <div className="flex overflow-hidden rounded-full border-2 border-slate-200">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${viewMode === 'grid' ? 'bg-primary text-textMain' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        <LayoutGrid size={14} />
                        Grid
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 border-l-2 border-slate-200 px-4 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${viewMode === 'list' ? 'bg-primary text-textMain' : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        <List size={14} />
                        List
                      </button>
                    </div>
                  </div>

                  {/* Active filter chips */}
                  {activeFilterChips.length ? (
                    <div className="w-full lg:max-w-4xl">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Active:</span>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="text-[11px] font-bold text-primary transition-colors hover:opacity-80"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeFilterChips.map((chip: any) => (
                          <button
                            key={`${chip.key}-${chip.value}`}
                            type="button"
                            onClick={() => handleRemoveFilter(chip.key, chip.value)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-primary hover:text-textMain"
                          >
                            <span>{chip.label}</span>
                            <X size={11} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Product grid */}
            <div className="min-h-[420px]">
              {loading || serverSearchLoading ? (
                // Initial load spinner
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    {serverSearchLoading ? 'Searching Catalog…' : 'Loading Products…'}
                  </span>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
                  <p className="text-lg font-black tracking-tight text-rose-700">Unable to load catalog</p>
                  <p className="mx-auto mt-3 max-w-xl text-[13px] text-rose-600">{error}</p>
                </div>
              ) : filteredEntries.length ? (
                <div className="space-y-8 sm:space-y-10">
                  <ProductGrid products={filteredEntries.map((e: any) => e.product)} viewMode={viewMode as any} />

                  {/* ── Infinite scroll sentinel ─────────────────────────────
                      This invisible div sits below the product grid.
                      When it enters the viewport, useInfiniteScroll fires loadMore.
                      The 200px rootMargin means loading starts before the user
                      actually hits the bottom — seamless experience.
                  ────────────────────────────────────────────────────────── */}
                  <div ref={sentinelRef} className="h-1" />

                  {/* Loading more spinner */}
                  {loadingMore && (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                    </div>
                  )}

                  {/* End of results message */}
                  {!hasMore && !loadingMore && totalCount > 0 && (
                    <p className="border-t border-slate-200 pt-8 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      All {totalCount} products loaded
                    </p>
                  )}
                </div>
              ) : (
                // Empty state
                <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Search size={22} className="text-slate-300" />
                  </div>
                  <p className="text-[17px] font-black tracking-tight text-slate-600">
                    {totalCount === 0 && !loading
                      ? 'No products available'
                      : hasCategoryScopedResults
                        ? 'No products in this category'
                        : 'No products found'}
                  </p>
                  <p className="mt-2 text-[13px] text-slate-400">
                    Try adjusting your filters or search terms.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-[11px] font-black uppercase tracking-widest text-textMain transition-all hover:opacity-90"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Route wrapper ────────────────────────────────────────────────────────────

function Products(props: any) {
  const { category, subcategory } = useParams();
  if (!subcategory && DETAIL_ALIAS_PATTERN.test(category || '')) {
    return <ProductDetails productIdOverride={category} />;
  }
  return <ProductsPage {...props} />;
}

export default Products;