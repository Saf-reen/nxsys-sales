import { NAVBAR_GROUPS, buildSpecificationSections, logger } from '../utils';

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;

/** Caches the base URL for assets to avoid repetitive environment variable lookups. */
let cachedAssetBaseUrl: string | null = null;
const getAssetBaseUrl = () => {
  if (cachedAssetBaseUrl !== null) return cachedAssetBaseUrl;

  const basePath = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && basePath && !ABSOLUTE_URL_PATTERN.test(basePath)) {
    cachedAssetBaseUrl = window.location.origin;
    return cachedAssetBaseUrl;
  }

  const candidates = [basePath, import.meta.env.VITE_API_URL, import.meta.env.VITE_API_PROXY_TARGET];
  for (const candidate of candidates) {
    if (candidate && ABSOLUTE_URL_PATTERN.test(candidate)) {
      cachedAssetBaseUrl = normalizeBaseUrl(candidate);
      return cachedAssetBaseUrl;
    }
  }

  cachedAssetBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return cachedAssetBaseUrl;
};

export const normalizeBaseUrl = (value: string | undefined | null) => {
  if (!value) return '/api';
  const normalizedValue = value.endsWith('/') && value !== '/' ? value.slice(0, -1) : value;
  return normalizedValue === '/' ? '' : normalizedValue;
};

/**
 * Resolves a raw asset path/URL into a fully qualified URL or absolute path.
 * Handles relative paths, media/static folders, and data URIs.
 */
export const resolveAssetUrl = (value: any) => {
  if (!value) return null;
  const rawValue = String(value).trim();
  if (!rawValue) return null;

  // If already absolute or special, return as is (with potential localhost mapping)
  if (ABSOLUTE_URL_PATTERN.test(rawValue) || rawValue.startsWith('data:') || rawValue.startsWith('blob:')) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    if (apiUrl && ABSOLUTE_URL_PATTERN.test(apiUrl)) {
      try {
        const apiOrigin = new URL(apiUrl).origin;
        const valueUrl = new URL(rawValue);
        if (valueUrl.origin === apiOrigin || valueUrl.hostname === 'localhost' || valueUrl.hostname === '127.0.0.1') {
          return valueUrl.pathname + valueUrl.search + valueUrl.hash;
        }
      } catch { /* skip normalization if invalid URL */ }
    }
    return rawValue;
  }

  // Ensure path starts with / and has correct prefix
  let cleanValue = rawValue;
  if (!cleanValue.startsWith('/')) {
    const hasKnownPrefix = cleanValue.startsWith('media/') || cleanValue.startsWith('static/') || cleanValue.startsWith('api/');
    cleanValue = hasKnownPrefix ? `/${cleanValue}` : `/media/${cleanValue}`;
  }

  const baseUrl = getAssetBaseUrl();
  if (!baseUrl) return cleanValue;
  
  try {
    return new URL(cleanValue.replace(/^\//, ''), `${baseUrl}/`).toString();
  } catch {
    return cleanValue;
  }
};

export const getEntityId = (value: any) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.pk ?? value.slug ?? value.name ?? null;
  return value;
};

export const getEntityLabel = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return String(value.name || value.title || value.label || '').trim();
  return String(value).trim();
};

export const normalizeCatalogLookups = (catalog: any = {}) => {
  if (Array.isArray(catalog)) return { categories: catalog, subcategories: [], brands: [] };
  return {
    categories: Array.isArray(catalog?.categories) ? catalog.categories : [],
    subcategories: Array.isArray(catalog?.subcategories) ? catalog.subcategories : [],
    brands: Array.isArray(catalog?.brands) ? catalog.brands : [],
  };
};

/** Performs a lookup in a catalog list based on ID or Label. */
const findLookupMatch = (value: any, items: any[] = [], normalizer: (v: any) => any) => {
  if (!Array.isArray(items) || !items.length || !value) return null;
  const entityId = getEntityId(value);
  const entityLabel = getEntityLabel(value).toLowerCase();

  return items.find((item) => {
    const normalizedItem = normalizer(item);
    if (!normalizedItem) return false;
    const itemId = getEntityId(normalizedItem);
    const itemLabel = getEntityLabel(normalizedItem).toLowerCase();
    return (entityId !== null && String(itemId) === String(entityId)) || (entityLabel && itemLabel === entityLabel);
  }) || null;
};

const normalizeNavbarGroup = (value: any) => {
  if (!value) return null;
  const normalizedValue = String(value).trim().toLowerCase();
  return (
    NAVBAR_GROUPS.find((group) => group.toLowerCase() === normalizedValue) ??
    NAVBAR_GROUPS.find((group) => group.toLowerCase().replace(/&/g, 'and') === normalizedValue.replace(/&/g, 'and')) ??
    String(value).trim()
  );
};

export const normalizeCategory = (category: any) => {
  if (!category) return null;
  if (typeof category === 'string' || typeof category === 'number') {
    return { id: String(category), name: String(category), navbar_group: null };
  }
  return {
    ...category,
    id: category.id ?? category.pk ?? category.slug ?? category.name,
    name: category.name || category.title || category.label || 'Unnamed category',
    parent: category.parent?.id ?? category.parent_id ?? category.parent ?? null,
    navbar_group: normalizeNavbarGroup(category.navbar_group ?? category.navbarGroup ?? category.group),
    image: resolveAssetUrl(category.image || category.url || category.file || null),
    icon: resolveAssetUrl(category.icon || null),
  };
};

export const normalizeSubcategory = (subcategory: any, fallbackCategoryId: any = null) => {
  if (!subcategory) return null;
  if (typeof subcategory === 'string' || typeof subcategory === 'number') {
    return { id: String(subcategory), name: String(subcategory), category_id: fallbackCategoryId };
  }
  return {
    ...subcategory,
    id: subcategory.id ?? subcategory.pk ?? subcategory.slug ?? subcategory.name,
    name: subcategory.name || subcategory.title || subcategory.label || 'Unnamed subcategory',
    category_id: subcategory.parent ?? fallbackCategoryId ?? null,
    image: resolveAssetUrl(subcategory.image || subcategory.url || null),
  };
};

export const normalizeBrand = (brand: any) => {
  if (!brand) return null;
  if (typeof brand === 'string' || typeof brand === 'number') {
    return { id: String(brand), name: String(brand) };
  }
  return {
    ...brand,
    id: brand.id ?? brand.pk,
    name: brand.name || 'Unnamed brand',
    logo: resolveAssetUrl(brand.logo || brand.image || null),
  };
};

/**
 * Normalizes a product object, resolving its category, subcategory, brand, and images.
 * Uses the provided catalog for deep lookups to ensure display consistency.
 */
export const normalizeProduct = (product: any, catalog: any = {}) => {
  if (!product) return null;
  
  const { categories, subcategories, brands } = normalizeCatalogLookups(catalog);
  
  // Resolve Category & Subcategory
  const categorySource = product.category ?? product.category_details ?? product.category_id;
  const subcategorySource = product.subcategory ?? product.subcategory_details ?? product.subcategory_id;
  
  const normalizedCategory = findLookupMatch(categorySource, categories, normalizeCategory) ?? normalizeCategory(categorySource);
  const normalizedSubcategory = findLookupMatch(subcategorySource, subcategories, normalizeSubcategory) ?? normalizeSubcategory(subcategorySource);

  // Resolve Brand
  const rawBrand = product.brand ?? product.manufacturer ?? '';
  const matchedBrand = Array.isArray(brands) 
    ? brands.find(item => String(item?.id) === String(rawBrand?.id || rawBrand) || String(item?.name || '').toLowerCase() === String(rawBrand?.name || rawBrand).toLowerCase()) 
    : null;
  const brandName = matchedBrand?.name || (typeof rawBrand === 'string' ? rawBrand : rawBrand?.name || '');

  // Resolve Images
  const imagesSource = product.product_image ?? product.images ?? product.gallery ?? product.gallery_images ?? product.image;
  const resolveImageUrl = (img: any) => {
    if (!img) return null;
    return resolveAssetUrl(typeof img === 'string' ? img : (img.image || img.url || img.src || null));
  };
  const images = Array.isArray(imagesSource) 
    ? imagesSource.map(resolveImageUrl).filter(Boolean) 
    : [resolveImageUrl(imagesSource), resolveImageUrl(product.image_url), resolveImageUrl(product.thumbnail)].filter(Boolean);

  // Resolve Specifications
  const specifications = product.specifications || {};
  let normalizedSpecifications: any[] = [];
  if (Array.isArray(specifications) && specifications.length > 0) {
    if (specifications[0]?.section || specifications[0]?.key) {
      const sections = buildSpecificationSections(specifications);
      normalizedSpecifications = sections.map(s => ({ category: s.title, items: s.items.map((item: any) => ({ key: item.label || item.key, value: item.value })) }));
    } else {
      normalizedSpecifications = specifications;
    }
  } else if (specifications && typeof specifications === 'object') {
    const entries = Object.entries(specifications)
      .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      .map(([key, value]) => ({ key, value: String(value).trim() }));
    if (entries.length > 0) normalizedSpecifications = [{ category: 'General', items: entries }];
  }

  // Build Final Object
  return {
    ...product,
    id: product.id ?? product.pk,
    name: product.name || product.title || 'Untitled product',
    brand: rawBrand, 
    brandName,
    description: product.description || product.summary || '',
    image: images[0] || null,
    product_image: images[0] || null, // Ensure this key exists for easy re-submission
    category: normalizedCategory,
    categoryId: normalizedCategory?.id ?? getEntityId(categorySource),
    categoryName: normalizedCategory?.name || String(categorySource || '').trim() || 'Uncategorized',
    subcategory: normalizedSubcategory?.name || String(subcategorySource || '').trim() || '',
    subcategoryId: normalizedSubcategory?.id ?? getEntityId(subcategorySource),
    subcategoryData: normalizedSubcategory,
    stock: Number(product.stock ?? product.inventory?.stock ?? 0),
    rating: Number(product.rating ?? 0),
    soldCount: Number(product.soldCount ?? product.sold_count ?? 0),
    featured: Boolean(product.featured ?? product.is_featured),
    topSelling: Boolean(product.topSelling ?? product.top_selling),
    isNew: Boolean(product.isNew ?? product.new_arrival),
    createdAt: product.createdAt || product.created_at || null,
    images: images.filter(Boolean),
    gallery: images.filter(Boolean).map((url, idx) => ({ id: Array.isArray(imagesSource) ? imagesSource[idx]?.id : null, url, display_order: idx })),
    specifications: normalizedSpecifications,
    highlights: (() => {
      const h = product.highlights ?? product.product_highlights ?? product.key_features ?? [];
      const rawArray = Array.isArray(h) ? h : (typeof h === 'string' && (h.startsWith('[') || h.startsWith('{')) ? JSON.parse(h) : [h]);
      return (Array.isArray(rawArray) ? rawArray : [rawArray])
        .flatMap((item: any) => String(typeof item === 'object' && item !== null ? item.text || item.value || '' : item).split(/\r?\n/))
        .map((item: string) => item.trim())
        .filter(Boolean);
    })(),
  };
};

export const getBrandName = (brand: any, _brands?: any[]) => {
  if (!brand) return '';
  if (typeof brand === 'string' || typeof brand === 'number') {
    const found = _brands?.find((b: any) => String(b.id) === String(brand));
    return found ? String(found.name || '').trim() : String(brand);
  }
  return String(brand.name || brand.label || brand.title || brand.id || '').trim();
};

export const getCategoryName = (category: any, _categories?: any[]) => {
  if (!category) return '';
  if (typeof category === 'string' || typeof category === 'number') {
    const found = _categories?.find((c: any) => String(c.id) === String(category));
    return found ? String(found.name || '').trim() : String(category);
  }
  return String(category.name || category.label || category.title || category.id || '').trim();
};

export const getSubcategoryName = (subcategory: any, _subcategories?: any[]) => {
  if (!subcategory) return '';
  if (typeof subcategory === 'string' || typeof subcategory === 'number') {
    const found = _subcategories?.find((s: any) => String(s.id) === String(subcategory));
    return found ? String(found.name || '').trim() : String(subcategory);
  }
  return String(subcategory.name || subcategory.label || subcategory.id || '').trim();
};

export const normalizePriceRequest = (request: any) => {
  if (!request) return null;
  const productSource = request.product;
  const product = (productSource && typeof productSource === 'object') 
    ? normalizeProduct(productSource) 
    : { id: productSource || request.product_id, name: request.product_name || 'Requested Product', brand: '', category: null, images: [], specifications: {} };
  
  return {
    ...request,
    id: request.id ?? request.pk,
    name: request.name || request.customer_name || 'Unknown customer',
    email: request.email || '',
    contactNumber: request.contactNumber || request.phone || '',
    message: request.message || request.description || '',
    quantity: Math.max(1, Number(request.quantity ?? 1) || 1),
    status: request.status || 'pending',
    createdAt: request.created_at || request.createdAt || null,
    product,
  };
};

export const normalizeInventoryItem = (item: any, categories: any[] = [], subcategories: any[] = []) => {
  if (!item) return null;
  const product = (item.product && typeof item.product === 'object') 
    ? normalizeProduct(item.product, { categories, subcategories }) 
    : { id: item.product || item.product_id, name: item.product_name || 'Managed Product' };
  return { ...item, id: item.id ?? item.pk, stock: Number(item.stock ?? 0), product };
};

export const normalizeReview = (review: any) => {
  if (!review) return null;
  const author = review.user || review.customer || review.author || {};
  return {
    ...review,
    id: review.id ?? review.pk,
    product: review.product?.id ?? review.product_id ?? review.product,
    rating: Math.max(1, Math.min(5, Number(review.rating ?? 0))),
    userName: author.name || author.username || author.email || 'Verified customer',
    createdAt: review.created_at || review.createdAt || null,
  };
};

// --- CORE UTILS ---
export const unwrapResponse = (response: any) => response?.data ?? response ?? null;

export const extractList = (payload: any) => {
  const data = unwrapResponse(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

/** Converts a flat or nested object into FormData, handling File arrays and primary images specifically. */
export const toFormData = (payload: Record<string, any>) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    // Handle primary image
    if ((key === 'image' || key === 'product_image') && value instanceof File) {
      formData.append('product_image', value);
    } 
    // Handle gallery images
    else if (key === 'files' && Array.isArray(value)) {
      value.forEach((file) => {
        if (file instanceof File) {
          formData.append('product_image', file);
        }
      });
    } 
    // Handle complex objects/arrays
    else if (Array.isArray(value) || typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } 
    // Handle simple values
    else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

export const extractAuthData = (payload: any) => {
  if (!payload) return { token: null, admin: null };
  let data = payload.data !== undefined ? payload.data : payload;
  const token = data?.access || data?.token || data?.access_token || null;
  const refreshToken = data?.refresh || data?.refresh_token || null;
  const admin = data?.user || data?.profile || data?.admin || null;
  return { ...data, token, refreshToken, admin, access: token, refresh: refreshToken };
};

// --- ERROR HANDLING ---
const normalizeMessageValue = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(normalizeMessageValue).find(v => v) || '';
  if (value && typeof value === 'object') return Object.values(value).map(normalizeMessageValue).find(v => v) || '';
  return String(value);
};

export const extractApiErrorMessage = (payload: any, fallback = 'Request failed') => {
  if (typeof payload === 'string') return payload.trim() || fallback;
  if (!payload) return fallback;
  return normalizeMessageValue(payload.error || payload.message || payload.detail || payload.non_field_errors) || fallback;
};

export const getApiErrorMessage = (error: any, fallback = 'Request failed') => extractApiErrorMessage(error?.response?.data || error?.data, fallback);

export const getNormalizedApiError = (error: any, _options?: { fallbackMessage?: string }) => {
  const data = error?.response?.data || error?.data;
  const status = error?.response?.status || 0;
  const fieldErrors: Record<string, string[]> = {};
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (Array.isArray(v)) fieldErrors[k] = v.map(String);
    });
  }
  const type = status >= 500 ? 'server' : status === 401 || status === 403 ? 'auth' : 'validation';
  return { message: getApiErrorMessage(error), status, data, fieldErrors, type };
};

export const normalizeCategories = (payload: any) => extractList(payload).map(normalizeCategory).filter(Boolean);
export const normalizeBrands = (payload: any) => extractList(payload).map(normalizeBrand).filter(Boolean);
export const normalizeProducts = (payload: any, catalog: any = {}) => extractList(payload).map((product: any) => normalizeProduct(product, catalog)).filter(Boolean);
export const normalizePriceRequests = (payload: any) => extractList(payload).map(normalizePriceRequest).filter(Boolean);
export const normalizeReviews = (payload: any) => extractList(payload).map(normalizeReview).filter(Boolean);

// --- REQUEST HELPERS ---
export const fetchAllPages = async (client: any, url: string, params: any = {}) => {
  const items: any[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const res: any = await client.get(nextUrl, { params: items.length === 0 ? params : {} });
    items.push(...extractList(res));
    const data = unwrapResponse(res);
    nextUrl = data?.next ? (new URL(data.next).pathname.replace('/api', '') + new URL(data.next).search) : null;
  }
  return items;
};

// --- SERVICE HELPERS ---
export const runServiceAction = async (action: () => Promise<any>, errorMessage: string) => {
  try {
    return await action();
  } catch (error) {
    logger.error(errorMessage, error);
    throw error;
  }
};
