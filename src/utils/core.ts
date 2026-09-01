import type { ToastPayload } from '@/types';

// --- CONSTANTS ---
export const NAVBAR_GROUPS = [
  'Computer & Accessories',
  'Enterprise',
  'Top Brands',
];

// --- LOGGER ---
type LogMethod = 'error' | 'warn' | 'info';
const logInDevelopment = (method: LogMethod, args: unknown[]): void => {
  if (!import.meta.env.DEV || typeof console[method] !== 'function') return;
  console[method](...args);
};
export const logger = {
  error: (...args: unknown[]): void => logInDevelopment('error', args),
  warn: (...args: unknown[]): void => logInDevelopment('warn', args),
  info: (...args: unknown[]): void => logInDevelopment('info', args),
};

export const DEFAULT_FILTERS = {
  categories: [],
  subcategories: [],
  brands: [],
  display: [],
  modelName: [],
  colour: [],
  operatingSystem: [],
  featuredOnly: false,
};

// --- HELPERS ---
export const formatCurrency = (value: number | string | null | undefined): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

export const formatNumber = (value: number | string | null | undefined): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0));

export const slugify = (value: string | null | undefined): string =>
  value?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';

export const getRatingLabel = (rating: number): string => {
  if (rating >= 4.8) return 'Excellent';
  if (rating >= 4.4) return 'Top rated';
  if (rating >= 4) return 'Trusted';
  return 'Good';
};

export const showToast = ({ title, message, type = 'success' }: ToastPayload): void => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { id: Date.now(), title, message, type } }));
};

// --- ACCESS CONTROL ---
const ADMIN_ROLE_VALUES = new Set(['admin', 'administrator', 'superadmin', 'super_admin', 'superuser', 'super_user', 'staff']);
const TRUE_LIKE_VALUES = new Set(['1', 'true', 'yes']);
const ADMIN_PERMISSION_VALUES = new Set(['admin', 'admin:access', 'admin_access', 'manage_admin', 'manage_catalog', 'staff', 'superadmin', 'superuser']);

export const normalizeRoleValue = (value: any) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

const toBooleanFlag = (value: any) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return TRUE_LIKE_VALUES.has(normalizeRoleValue(value));
  return false;
};

const getCandidateObjects = (payload: any) => {
  if (!payload || typeof payload !== 'object') return [];
  return [payload.user, payload.profile, payload.admin, payload.account, payload.me, payload].filter((candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate));
};

const getFirstDefinedValue = (objects: any[], keys: string[]) => {
  for (const object of objects) {
    for (const key of keys) {
      if (object[key] !== undefined && object[key] !== null && object[key] !== '') return object[key];
    }
  }
  return undefined;
};

const collectStringValues = (objects: any[], keys: string[]) => {
  const values: any[] = [];
  objects.forEach((object) => {
    keys.forEach((key) => {
      const value = object?.[key];
      if (Array.isArray(value)) {
        value.forEach((entry) => { if (entry !== undefined && entry !== null && entry !== '') values.push(entry); });
      } else if (value !== undefined && value !== null && value !== '') {
        values.push(value);
      }
    });
  });
  return values;
};

export const getAuthUserSource = (payload: any = {}) => {
  const candidates = getCandidateObjects(payload);
  return candidates.find(c => c !== payload) || (payload && typeof payload === 'object' ? payload : {});
};

export const isAdminRole = (value: any) => ADMIN_ROLE_VALUES.has(normalizeRoleValue(value));

export const hasAdminGroup = (groups: any) => Array.isArray(groups) && groups.some((group) => isAdminRole(typeof group === 'string' ? group : group?.name || group?.slug || group?.role));

export const isAdminUser = (...sources: any[]) => {
  const candidates = sources.flatMap((source) => getCandidateObjects(source));
  if (!candidates.length) return false;
  const rawRole = getFirstDefinedValue(candidates, ['role', 'user_role', 'user_type', 'userType', 'role_name', 'type', 'account_type', 'accountType', 'kind']);
  if (isAdminRole(rawRole)) return true;
  const permissionValues = collectStringValues(candidates, ['permissions', 'permission', 'scopes', 'scope']);
  if (permissionValues.some((value) => ADMIN_PERMISSION_VALUES.has(normalizeRoleValue(typeof value === 'string' ? value : value?.name || value?.code || value?.slug)))) return true;
  return candidates.some((candidate) => toBooleanFlag(candidate.is_superuser) || toBooleanFlag(candidate.isSuperuser) || toBooleanFlag(candidate.is_staff) || toBooleanFlag(candidate.isStaff) || toBooleanFlag(candidate.is_admin) || toBooleanFlag(candidate.isAdmin) || hasAdminGroup(candidate.groups));
};

export const resolveUserRole = (...sources: any[]) => isAdminUser(...sources) ? 'admin' : 'customer';
