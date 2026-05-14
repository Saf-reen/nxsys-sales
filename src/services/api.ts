import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios';
import { isAdminUser, resolveUserRole, logger, NAVBAR_GROUPS, buildSpecificationSections } from '@/utils';
import { showToast } from '@/utils/helpers';

// ---------------------------------------------------------------------------
// 1. BASE UTILS & CONSTANTS (Must be first to avoid ReferenceErrors)
// ---------------------------------------------------------------------------
const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;
const AUTH_STORAGE_KEY = 'auth_session';
const AUTH_REFRESH_KEY = 'auth_refresh';
const TEMP_EMAIL_KEY = 'nxsys_temp_email';
const TEMP_PWD_RESET_KEY = 'nxsys_temp_pwd_reset';

export const normalizeBaseUrl = (value: string | undefined | null) => {
  if (!value) return '/api';
  const normalizedValue = value.endsWith('/') && value !== '/' ? value.slice(0, -1) : value;
  return normalizedValue === '/' ? '' : normalizedValue;
};

export const authSessionStorage = {
  getToken: () => localStorage.getItem(AUTH_STORAGE_KEY),
  getRefreshToken: () => localStorage.getItem(AUTH_REFRESH_KEY),
  getUser: () => {
    try {
      const user = localStorage.getItem('auth_user');
      return user ? JSON.parse(user) : null;
    } catch { return null; }
  },
  setSession: (token: string, user: any, refresh?: string) => {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (refresh) localStorage.setItem(AUTH_REFRESH_KEY, refresh);
  },
  clearSession: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    localStorage.removeItem('auth_user');
  }
};

const sessionGet = (key: string) => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } };
const sessionSet = (key: string, value: any) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { } };
const sessionDel = (key: string) => { try { sessionStorage.removeItem(key); } catch { } };

// ---------------------------------------------------------------------------
// 2. AXIOS INSTANCE CREATION
// ---------------------------------------------------------------------------
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  return normalizeBaseUrl(envUrl);
};

const commonConfig = {
  baseURL: getBaseUrl(),
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  // Custom serializer to remove the "[]" from array parameters (e.g., categories=1&categories=2)
  paramsSerializer: (params: any) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  }
};

// Authenticated instance
export const api: AxiosInstance = axios.create(commonConfig);

// Public instance
export const publicApi: AxiosInstance = axios.create(commonConfig);

// Interceptors
api.interceptors.request.use((config) => {
  const token = authSessionStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const shouldSkipRefresh = (url: string) =>
  url.includes('/login/') || url.includes('/token/refresh/') || url.includes('/register/');

api.interceptors.response.use(
  (response) => response,
  async (axiosError) => {
    const originalRequest = axiosError.config ?? ({} as InternalAxiosRequestConfig & { _retry?: boolean });
    const status = axiosError.response?.status;
    const errorData = axiosError.response?.data as any;
    const isTokenExpired = status === 401 || (errorData?.code === 'token_not_valid');

    if (isTokenExpired && !originalRequest._retry && !shouldSkipRefresh(originalRequest.url ?? '')) {
      originalRequest._retry = true;
      try {
        const refresh = authSessionStorage.getRefreshToken();
        if (!refresh) throw new Error('No refresh token');

        const res = await axios.post(`${getBaseUrl()}/accounts/token/refresh/`, { refresh });
        const newToken = res.data.access;
        const user = authSessionStorage.getUser();
        authSessionStorage.setSession(newToken, user, refresh);

        const headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
        return api({ ...originalRequest, headers });
      } catch (err) {
        authSessionStorage.clearSession();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(axiosError);
  }
);

// ---------------------------------------------------------------------------
// 3. API SERVICES & HELPERS
// ---------------------------------------------------------------------------
export const unwrapResponse = (response: any) => response?.data ?? response ?? null;

export const getApiErrorMessage = (error: any, fallback = 'Request failed') => {
  const data = error?.response?.data || error?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === 'string') return data.trim() || fallback;

  // DRF often returns { "field_name": ["error message"] } or { "detail": "error message" }
  // We scan for common keys or return the first string value we find
  if (typeof data === 'object') {
    const candidate = data.error || data.message || data.detail || data.non_field_errors || data.msg;
    if (candidate) {
      return (Array.isArray(candidate) ? candidate[0] : candidate) || fallback;
    }

    // Fallback: look for the first array/string in the object
    const firstValue = Object.values(data)[0];
    if (firstValue) {
      return (Array.isArray(firstValue) ? firstValue[0] : firstValue) || fallback;
    }
  }

  return fallback;
};

export const getNormalizedApiError = (error: any, _options?: any) => {
  const data = error?.response?.data || error?.data;
  const status = error?.response?.status || 0;
  const fieldErrors: Record<string, string[]> = {};
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (Array.isArray(v)) fieldErrors[k] = v.map(String);
    });
  }
  const type = status >= 500 ? 'server' : status === 401 || status === 403 ? 'auth' : 'validation';
  return { message: getApiErrorMessage(error, _options?.fallbackMessage), status, data, fieldErrors, type };
};

// --- NORMALIZERS ---
let cachedAssetBaseUrl: string | null = null;
const getAssetBaseUrl = () => {
  if (cachedAssetBaseUrl !== null) return cachedAssetBaseUrl;
  const basePath = getBaseUrl();
  if (typeof window !== 'undefined' && basePath && !ABSOLUTE_URL_PATTERN.test(basePath)) {
    cachedAssetBaseUrl = window.location.origin;
    return cachedAssetBaseUrl;
  }
  cachedAssetBaseUrl = basePath || (typeof window !== 'undefined' ? window.location.origin : '');
  return cachedAssetBaseUrl;
};

export const resolveAssetUrl = (value: any) => {
  if (!value) return null;
  const rawValue = String(value).trim();
  if (!rawValue) return null;
  if (ABSOLUTE_URL_PATTERN.test(rawValue)) return rawValue;

  const baseUrl = getAssetBaseUrl();
  const cleanValue = rawValue.startsWith('/') ? rawValue : `/media/${rawValue}`;
  return `${baseUrl}${cleanValue}`;
};

export const getEntityId = (value: any) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value.id ?? value.pk ?? value.slug ?? null;
  return value;
};

export const extractList = (payload: any) => {
  const data = unwrapResponse(payload);
  return Array.isArray(data) ? data : (data?.results || data?.items || []);
};

export const toFormData = (payload: Record<string, any>) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if ((key === 'image' || key === 'product_image') && value instanceof File) {
      formData.append('product_image', value);
    } else if (key === 'files' && Array.isArray(value)) {
      value.forEach(f => { if (f instanceof File) formData.append('product_image', f); });
    } else if (Array.isArray(value) || typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

export const PRODUCT_FLAGS = [
  { key: 'featured', label: 'Featured' },
  { key: 'top_selling', label: 'Top Selling' },
  { key: 'new_arrival', label: 'New Arrival' },
];

export const extractAuthData = (payload: any) => {
  const data = unwrapResponse(payload);
  const token = data?.access || data?.token || null;
  const refreshToken = data?.refresh || null;
  return { ...data, token, refreshToken, admin: data?.user || null };
};

export const normalizeCategory = (category: any) => {
  if (!category || typeof category !== 'object') return category;
  const id = category.id ?? category.pk;
  return {
    ...category,
    id,
    name: category.name || 'Unnamed category',
    navbar_group: category.navbar_group || category.navbarGroup || null,
    image: resolveAssetUrl(category.image),
    subcategories: Array.isArray(category.subcategories)
      ? category.subcategories.map((s: any) => normalizeSubcategory(s, id)).filter(Boolean)
      : []
  };
};

export const normalizeSubcategory = (subcategory: any, fallbackCategoryId: any = null) => {
  if (!subcategory || typeof subcategory !== 'object') return subcategory;
  return {
    ...subcategory,
    id: subcategory.id ?? subcategory.pk,
    name: subcategory.name || 'Unnamed subcategory',
    category_id: subcategory.parent ?? fallbackCategoryId,
    image: resolveAssetUrl(subcategory.image)
  };
};

export const normalizeProduct = (product: any, catalog: any = {}) => {
  if (!product) return null;
  const imagesSource = product.product_image ?? product.images ?? product.image;
  const images = Array.isArray(imagesSource) ? imagesSource.map(resolveAssetUrl).filter(Boolean) : [resolveAssetUrl(imagesSource)].filter(Boolean);
  
  const normalized = {
    ...product,
    id: product.id ?? product.pk,
    name: product.name || 'Untitled product',
    image: images[0] || null,
    product_image: images[0] || null,
    images: images,
  };

  // Normalize nested lists if they contain objects
  if (Array.isArray(product.related_products)) {
    normalized.related_products = product.related_products.map((p: any) => 
      typeof p === 'object' ? normalizeProduct(p, catalog) : p
    );
  }
  
  if (Array.isArray(product.frequently_bought_together)) {
    normalized.frequently_bought_together = product.frequently_bought_together.map((p: any) => 
      typeof p === 'object' ? normalizeProduct(p, catalog) : p
    );
  }

  return normalized;
};

export const normalizeCategories = (payload: any) => extractList(payload).map(normalizeCategory).filter(Boolean);
export const normalizeBrands = (payload: any) => extractList(payload).map(b => ({ ...b, id: b.id ?? b.pk, name: b.name || 'Unnamed' })).filter(Boolean);
export const normalizeProducts = (payload: any, catalog: any = {}) => extractList(payload).map(p => normalizeProduct(p, catalog)).filter(Boolean);

export const getBrandName = (val: any, brands: any[] = []) => {
  if (!val) return '';
  const id = typeof val === 'object' ? val.id ?? val.pk : val;
  return brands.find(b => String(b.id) === String(id))?.name || (typeof val === 'object' ? val.name : '') || '';
};

export const getCategoryName = (val: any, cats: any[] = []) => {
  if (!val) return '';
  const id = typeof val === 'object' ? val.id ?? val.pk : val;
  return cats.find(c => String(c.id) === String(id))?.name || (typeof val === 'object' ? val.name : '') || '';
};

export const getSubcategoryName = (val: any, subs: any[] = []) => {
  if (!val) return '';
  const id = typeof val === 'object' ? val.id ?? val.pk : val;
  return subs.find(s => String(s.id) === String(id))?.name || (typeof val === 'object' ? val.name : '') || '';
};

// --- API MODULES ---
const joinPath = (...parts: any[]) => `/${parts.filter(p => p).map(p => String(p).replace(/^\/+|\/+$/g, '')).join('/')}/`;

// --- PARAM CLEANER ---
const cleanSearchParams = (params: any) => {
  if (!params || typeof params !== 'object') return params;
  const clean: Record<string, any> = {};

  // Map 'q' to 'search' for compatibility with /products/search/
  if (params.q && !params.search) {
    params.search = params.q;
    delete params.q;
  }

  // Only keep primitive values or arrays to prevent [object Object] in URLs
  Object.entries(params).forEach(([key, value]) => {
    // Specifically ignore internal catalog structure if passed accidentally
    if (['categoryTree', 'subcategoriesByCategory', 'productFlags'].includes(key)) return;

    if (Array.isArray(value)) {
      clean[key] = value.map((item: any) => getEntityId(item)).filter((id: any) => id !== null);
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else if (value !== null && value !== undefined) {
      // If it's an object but has an ID, use the ID
      const id = getEntityId(value);
      if (id !== null && typeof id !== 'object') {
        clean[key] = id;
      }
    }
  });

  return clean;
};

export const authApi = {
  register: (payload: any) => publicApi.post('/accounts/register/', payload).then(unwrapResponse),
  login: (payload: any) => publicApi.post('/accounts/login/', payload),
  verifyOtp: (payload: any) => publicApi.post('/accounts/verify-otp/', payload).then(unwrapResponse),
  logout: (payload: any) => api.post('/accounts/logout/', payload).then(unwrapResponse),
};

export const authService = {
  login: async (creds: any) => {
    const res = await authApi.login(creds);
    const data = extractAuthData(res);
    const user = { id: data.admin?.id, name: creds.username, email: data.admin?.email, role: resolveUserRole(data) };
    if (data.token) authSessionStorage.setSession(data.token, user, data.refreshToken);
    return { user, token: data.token };
  },
  register: (payload: any) => authApi.register(payload),
  logout: async (redirect?: string) => {
    const refresh = authSessionStorage.getRefreshToken();
    if (refresh) {
      await authApi.logout({ refresh_token: refresh }).catch(() => { });
    }
    authSessionStorage.clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = redirect || '/login';
    }
  },
  clearSession: () => authSessionStorage.clearSession(),
  isAuthenticated: () => !!authSessionStorage.getToken(),
  isAdmin: () => isAdminUser(authSessionStorage.getUser()),
  getCurrentUser: () => authSessionStorage.getUser(),
  getToken: () => authSessionStorage.getToken(),
  getTempEmail: () => sessionGet(TEMP_EMAIL_KEY),
  setTempEmail: (email: string) => sessionSet(TEMP_EMAIL_KEY, email),
  clearTempEmail: () => sessionDel(TEMP_EMAIL_KEY),
  getTempPasswordReset: () => sessionGet(TEMP_PWD_RESET_KEY),
  setTempPasswordReset: (data: any) => sessionSet(TEMP_PWD_RESET_KEY, data),
  clearTempPasswordReset: () => sessionDel(TEMP_PWD_RESET_KEY),
  clearTempRegistration: () => sessionDel(TEMP_EMAIL_KEY),
  requestPasswordReset: (payload: any) => publicApi.post('/accounts/password-reset/', payload).then(unwrapResponse),
  resendVerificationOTP: (payload?: any) => publicApi.post('/accounts/resend-otp/', payload || {}).then(unwrapResponse),
  verifyOTP: (payload: any) => authApi.verifyOtp(payload),
  confirmPassword: (payload: any) => authApi.verifyOtp(payload),
  verifyAdminAccess: async () => authSessionStorage.getUser(),
};

export const catalogApi = {
  getCatalogData: async () => {
    const [catsRes, brandsRes] = await Promise.all([
      publicApi.get('/products/categories/'),
      publicApi.get('/products/brands/')
    ]);
    const rawAll = extractList(catsRes);
    const brands = normalizeBrands(brandsRes);

    // Normalize all categories into a flat list
    const allCategories = rawAll.map(normalizeCategory).filter(Boolean);

    // Group subcategories by parent ID for lookup
    const subcategoriesByCategory: Record<string, any[]> = {};
    allCategories.forEach((cat: any) => {
      if (cat.parent) {
        const parentId = String(cat.parent);
        if (!subcategoriesByCategory[parentId]) subcategoriesByCategory[parentId] = [];
        subcategoriesByCategory[parentId].push(cat);
      }
    });

    // Create a tree structure for the navbar grouped by navbar_group
    const groups: Record<string, any> = {};
    allCategories.forEach(cat => {
      if (cat.navbar_group) {
        const groupName = cat.navbar_group;
        if (!groups[groupName]) {
          groups[groupName] = {
            id: groupName,
            name: groupName,
            isGroup: true,
            subcategories: []
          };
        }
        groups[groupName].subcategories.push({
          ...cat,
          // Ensure sub-items for this category are also included if they exist
          subcategories: subcategoriesByCategory[String(cat.id)] || []
        });
      }
    });

    const categoryTree = Object.values(groups);

    return {
      categories: allCategories, // Full flat list for the admin dashboard
      brands,
      subcategoriesByCategory,
      productFlags: PRODUCT_FLAGS,
      categoryTree
    };
  },
  getProducts: (params: any = {}, cat: any = {}) => publicApi.get('/products/products/', { params: cleanSearchParams(params) }).then(res => normalizeProducts(res, cat)),
  getProductById: (id: any, cat: any = {}) => publicApi.get(`/products/products/${id}/`).then(res => {
    const data = unwrapResponse(res);
    if (!data) return null;
    const list = Array.isArray(data) ? data : (data.results || data.items || [data]);
    return normalizeProducts(list, cat)[0] || null;
  }),
  getSimilarProducts: (id: any, cat: any = {}) => publicApi.get(`/products/products/${id}/similar/`).then(res => normalizeProducts(res, cat)),
  createProduct: (payload: any, _catalog?: any) => {
    return api.post('/products/products/', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(unwrapResponse);
  },
  updateProduct: (id: any, payload: any, _catalog?: any) => {
    return api.put(`/products/products/${id}/`, toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(unwrapResponse);
  },
  patchProduct: (id: any, payload: any) => {
    return api.patch(`/products/products/${id}/`, toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(unwrapResponse);
  },
  deleteProduct: (id: any) => api.delete(`/products/products/${id}/`).then(unwrapResponse),
  bulkUploadProducts: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('excel_file', file);
    return api.post('/products/products/bulk/upload/', formData, { 
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    }).then(unwrapResponse);
  },
  getProductMetadata: () => api.options('/products/products/').then(unwrapResponse),
  createSubcategory: (data: any) => api.post('/products/subcategories/', data).then(unwrapResponse),
  deleteSubcategory: (id: any) => api.delete(joinPath('products', 'subcategories', id)).then(unwrapResponse),
};

export const categoryApi = {
  createCategory: (payload: any) => api.post('/products/categories/', payload).then(unwrapResponse),
  updateCategory: (id: any, payload: any) => api.put(joinPath('products', 'categories', id), payload).then(unwrapResponse),
  deleteCategory: (id: any) => api.delete(joinPath('products', 'categories', id)).then(unwrapResponse),
};

export const brandApi = {
  createBrand: (payload: any) => api.post('/products/brands/', payload).then(unwrapResponse),
  updateBrand: (id: any, payload: any) => api.put(joinPath('products', 'brands', id), payload).then(unwrapResponse),
  deleteBrand: (id: any) => api.delete(joinPath('products', 'brands', id)).then(unwrapResponse),
};

export const searchApi = {
  searchProducts: (params: any, cat: any = {}) => publicApi.get('/products/products/search/', { params: cleanSearchParams(params) }).then(res => normalizeProducts(res, cat)),
  getSearchFacets: (params: any) => publicApi.get('/products/products/facets/', { params: cleanSearchParams(params) }).then(unwrapResponse),
  autocomplete: (prefix: string) => publicApi.get('/products/products/autocomplete/', { params: { prefix } }).then(unwrapResponse),
};

// --- RFQ NORMALIZER ---
export const normalizeRFQ = (request: any) => {
  if (!request) return null;
  return {
    ...request,
    id: request.id,
    name: request.name || 'Anonymous',
    email: request.email,
    contactNumber: request.phone || request.contactNumber || null,
    message: request.description || request.message || null,
    createdAt: request.created_at || request.createdAt,
    status: request.status || 'pending',
  };
};

export const rfqService = {
  getRequests: () => api.get('/orders/requests/').then(res => {
    const data = extractList(res);
    console.log('RFQ Data received:', data);
    if (!Array.isArray(data)) return [];
    return data.map(normalizeRFQ).filter(Boolean);
  }),
  getProducts: () => api.get('/products/products/').then(res => extractList(res)),
  createRequest: (payload: any) => publicApi.post('/orders/requests/', payload).then(unwrapResponse),
  updateRequest: (id: any, payload: any) => api.put(joinPath('orders', 'requests', id), payload).then(unwrapResponse),
};

export const rfqIntentService = {
  save: (data: any) => sessionSet('rfq_intent', data),
  get: () => sessionGet('rfq_intent'),
  clear: () => sessionDel('rfq_intent'),
};

export const inventoryService = {
  getInventory: () => api.get('/inventory/inventory/').then(unwrapResponse),
  updateStock: (id: any, prodId: any, stock: number) => api.put(`/inventory/inventory/${id}/`, { product: prodId, stock }).then(unwrapResponse),
};

export const wishlistApi = {
  getWishlist: () => api.get('/wishlist/wishlist/').then(unwrapResponse),
  addWishlistItem: (prodId: any) => api.post('/wishlist/wishlist/', { product_id: prodId }).then(unwrapResponse),
  removeWishlistItem: (prodId: any) => api.delete(joinPath('wishlist', 'wishlist', prodId)).then(unwrapResponse),
  setWishlist: (pIds: any[]) => api.put('/wishlist/wishlist/', { products: pIds }).then(unwrapResponse),
};

export const reviewApi = {
  getReviews: () => api.get('/reviews/reviews/').then(unwrapResponse),
  getProductReviews: (pId: any) => publicApi.get(joinPath('reviews', 'reviews', pId)).then(unwrapResponse),
  createReview: (payload: any) => api.post('/reviews/reviews/', payload).then(unwrapResponse),
  updateReview: (id: any, payload: any) => api.put(joinPath('reviews', 'reviews', id), payload).then(unwrapResponse),
  deleteReview: (id: any) => api.delete(joinPath('reviews', 'reviews', id)).then(unwrapResponse),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard/').then(unwrapResponse),
  getComprehensiveAnalytics: () => api.get('/analytics/comprehensive/').then(unwrapResponse),
  getSalesAnalytics: () => api.get('/analytics/sales/').then(unwrapResponse),
  getCustomerAnalytics: () => api.get('/analytics/customers/').then(unwrapResponse),
  getReviewAnalytics: () => api.get('/analytics/reviews/').then(unwrapResponse),
  getWishlistAnalytics: () => api.get('/analytics/wishlists/').then(unwrapResponse),
  getInventoryAnalytics: () => api.get('/inventory/inventory/').then(unwrapResponse),
};

export const ordersApi = {
  submitEnquiry: (payload: any) => publicApi.post('/orders/enquiries/', payload).then(unwrapResponse),
};

// --- EXPORTS ---
export const getProducts = catalogApi.getProducts.bind(catalogApi);
export const getProductById = catalogApi.getProductById.bind(catalogApi);
export const createProduct = catalogApi.createProduct.bind(catalogApi);
export const updateProduct = catalogApi.updateProduct.bind(catalogApi);
export const patchProduct = catalogApi.patchProduct.bind(catalogApi);
export const deleteProduct = catalogApi.deleteProduct.bind(catalogApi);
export const getCatalogData = catalogApi.getCatalogData.bind(catalogApi);
export const getProductMetadata = catalogApi.getProductMetadata.bind(catalogApi);
export const bulkUploadProducts = catalogApi.bulkUploadProducts.bind(catalogApi);
export const createCategory = categoryApi.createCategory.bind(categoryApi);
export const updateCategory = categoryApi.updateCategory.bind(categoryApi);
export const deleteCategory = categoryApi.deleteCategory.bind(categoryApi);
export const createBrand = brandApi.createBrand.bind(brandApi);
export const updateBrand = brandApi.updateBrand.bind(brandApi);
export const deleteBrand = brandApi.deleteBrand.bind(brandApi);
export const getDashboardData = analyticsApi.getDashboard.bind(analyticsApi);

export default {
  auth: authApi,
  authService,
  catalog: catalogApi,
  category: categoryApi,
  brand: brandApi,
  search: searchApi,
  inventory: inventoryService,
  wishlist: wishlistApi,
  orders: ordersApi,
  rfq: rfqService,
  rfqIntent: rfqIntentService,
  review: reviewApi,
  analytics: analyticsApi,
};
