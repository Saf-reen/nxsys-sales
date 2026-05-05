// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface User {
  id?: number | string;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
  user_role?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_admin?: boolean;
  isAdmin?: boolean;
  groups?: Array<{ name?: string; slug?: string; role?: string } | string>;
  permissions?: Array<string | { name?: string; code?: string; slug?: string }>;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  navbarGroup?: string;
  navbar_group?: string;
  description?: string;
  parent?: number | null;
  parent_id?: number | null;
  subcategories?: Subcategory[];
  children?: Subcategory[];
}

export interface CategoryTree extends Category {
  subcategories: Subcategory[];
  children: Subcategory[];
}

export interface Subcategory {
  id: number;
  name: string;
  slug?: string;
  categoryId?: number;
  parent?: number | null;
  parent_id?: number | null;
  description?: string;
}

export interface Brand {
  id: number;
  name: string;
  logo?: string;
  slug?: string;
}

export interface ProductImage {
  id: number;
  image: string;
  productId?: number;
  product?: number;
  isPrimary?: boolean;
  is_primary?: boolean;
  altText?: string;
  alt_text?: string;
}

export interface SpecificationRecord {
  id?: number;
  key: string;
  value: string;
  label?: string;
  section?: string;
  productId?: number;
}

export interface SpecificationSection {
  title: string;
  items: SpecificationRecord[];
}

export interface InventoryItem {
  id?: number;
  productId?: number;
  product?: number;
  stock: number;
  sku?: string;
  threshold?: number;
}

export interface Product {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  model?: string;
  brand?: Brand | number | null;
  brandName?: string;
  category?: Category | number | null;
  categoryName?: string;
  subcategory?: Subcategory | number | null;
  subcategoryName?: string;
  price?: number;
  originalPrice?: number;
  images?: ProductImage[];
  image?: string | null;
  product_image?: string | null;
  primaryImage?: string;
  gallery?: string[];
  specifications?: SpecificationRecord[];
  specificationSections?: SpecificationSection[];
  inventory?: InventoryItem | null;
  stock?: number;
  featured?: boolean;
  topSelling?: boolean;
  top_selling?: boolean;
  newArrival?: boolean;
  new_arrival?: boolean;
  highlights?: string[];
  tags?: string[];
  specification_records?: SpecificationRecord[];
  subcategoryId?: number;
  mpn?: string;
  sku?: string;
  isNew?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceRequest {
  id: number;
  productId?: number;
  product?: Product | number | null;
  productName?: string;
  quantity: number;
  status: string;
  message?: string;
  notes?: string;
  user?: User | number | null;
  userName?: string;
  companyName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: number;
  productId?: number;
  product?: number | null;
  rating: number;
  comment?: string;
  title?: string;
  user?: User | number | null;
  userName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enquiry {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  subject?: string;
}

export interface ProductFlag {
  key: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Context value shapes
// ---------------------------------------------------------------------------

export interface CatalogContextValue {
  categories: Category[];
  subcategories: Subcategory[];
  subcategoriesByCategory: Record<string, Subcategory[]>;
  brands: Brand[];
  loading: boolean;
  error: string | null;
  refreshCatalog: (options?: { force?: boolean; silent?: boolean }) => Promise<unknown>;
  addCategory: (data: unknown) => Promise<Category>;
  updateCategory: (id: number, data: unknown) => Promise<Category>;
  deleteCategory: (id: number) => Promise<unknown>;
}

export interface ProductContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  topSellingProducts: Product[];
  featuredProducts: Product[];
  refreshProducts: (options?: { silent?: boolean; force?: boolean }) => Promise<unknown>;
  addProduct: (data: unknown) => Promise<Product>;
  updateProduct: (id: number, data: unknown) => Promise<Product>;
  categories: Category[];
  subcategories: Subcategory[];
  subcategoriesByCategory: Record<string, Subcategory[]>;
  brands: Brand[];
}

export interface WishlistContextValue {
  productIds: string[];
  count: number;
  loading: boolean;
  error: string;
  isWishlisted: (productId: string | number) => boolean;
  addToWishlist: (productId: string | number) => Promise<string[]>;
  removeFromWishlist: (productId: string | number) => Promise<string[]>;
  toggleWishlist: (productId: string | number) => Promise<string[]>;
  refreshWishlist: () => Promise<string[]>;
}

// ---------------------------------------------------------------------------
// API / utility shapes
// ---------------------------------------------------------------------------

export interface ApiError {
  message: string;
  status: number;
  type?: 'validation' | 'auth' | 'server';
  fieldErrors?: Record<string, string[]>;
  data?: unknown;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ToastPayload {
  id?: number;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export interface ProductFilters {
  categories: string[];
  subcategories: string[];
  display: string[];
  modelName: string[];
  brands: string[];
  colour: string[];
  operatingSystem: string[];
  featuredOnly: boolean;
}

export interface CatalogData {
  categories: Category[];
  subcategories: Subcategory[];
  subcategoriesByCategory: Record<string, Subcategory[]>;
  brands: Brand[];
  productFlags: ProductFlag[];
  categoryTree: CategoryTree[];
}

export type UserRole = 'admin' | 'customer';
