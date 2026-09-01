export const SPECIFICATION_FIELDS = [
  { key: 'model_name', label: 'Model Name', placeholder: 'MacBook Pro MDE54-M5', section: 'General' },
  { key: 'model_number', label: 'Model Number', placeholder: 'MDE54HN/A', section: 'General' },
  { key: 'colour', label: 'Colour', placeholder: 'Silver', section: 'General' },
  { key: 'color', label: 'Color', placeholder: 'Silver', section: 'General' },
  { key: 'graphics', label: 'Graphics', placeholder: 'Integrated 10 Core GPU', section: 'General' },
  { key: 'keyboard', label: 'Keyboard', placeholder: 'Backlit Magic Keyboard', section: 'General' },
  { key: 'pointing_device', label: 'Pointing Device', placeholder: 'Force Touch Trackpad', section: 'General' },
  { key: 'processor', label: 'Processor', placeholder: 'Apple M5 Chip', section: 'Processor' },
  { key: 'chipset', label: 'Chipset', placeholder: 'Apple Silicon', section: 'Processor' },
  { key: 'processor_brand', label: 'Processor Brand', placeholder: 'Apple', section: 'Processor' },
  { key: 'storage', label: 'Storage', placeholder: '1TB SSD', section: 'Memory' },
  { key: 'memory', label: 'Memory', placeholder: '16GB RAM', section: 'Memory' },
  { key: 'display_resolution', label: 'Display Resolution', placeholder: '3024 x 1964', section: 'Display' },
  { key: 'display_size', label: 'Display Size', placeholder: '14 inch', section: 'Display' },
  { key: 'display_features', label: 'Display Features', placeholder: 'Liquid Retina XDR', section: 'Display' },
  { key: 'wireless_connectivity', label: 'Wireless Connectivity', placeholder: 'Wi-Fi 6E, Bluetooth 5.3', section: 'Connectivity' },
  { key: 'power_adapter', label: 'Power Adapter', placeholder: '96W USB-C Power Adapter', section: 'Power' },
  { key: 'dimensions', label: 'Dimensions', placeholder: '31.26 x 22.12 x 1.55 cm', section: 'Physical' },
  { key: 'weight', label: 'Weight', placeholder: '1.55 kg', section: 'Physical' },
  { key: 'os', label: 'OS', placeholder: 'macOS', section: 'Operating System' },
  { key: 'operating_system', label: 'Operating System', placeholder: 'macOS', section: 'Operating System' },
  { key: 'product_type', label: 'Product Type', placeholder: 'Laptop', section: 'Additional Details' },
  { key: 'whats_in_the_box', label: 'Whats in the Box', placeholder: 'Laptop, adapter, cable', section: 'Additional Details' },
  { key: 'webcam', label: 'Webcam', placeholder: '1080p FaceTime HD camera', section: 'Additional Details' },
  { key: 'features', label: 'Features', placeholder: 'Touch ID, backlit keyboard', section: 'Additional Details' },
];

const SECTION_ORDER = ['General', 'Processor', 'Memory', 'Display', 'Connectivity', 'Power', 'Physical', 'Operating System', 'Additional Details'];
const SECTION_ALIASES: Record<string, string> = {
  general: 'General', processor: 'Processor', memory: 'Memory', display: 'Display', connectivity: 'Connectivity', power: 'Power', physical: 'Physical',
  'operating system': 'Operating System', operatingsystem: 'Operating System', os: 'Operating System', 'additional details': 'Additional Details', additional: 'Additional Details',
};

const FIELD_LABEL_LOOKUP = SPECIFICATION_FIELDS.reduce((acc: Record<string, string>, field) => { acc[field.key] = field.label; return acc; }, {});

const titleCase = (value: any) => String(value || '').split(' ').filter(Boolean).map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(' ');

export const normalizeSpecificationKey = (label: any) => String(label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export const formatSpecificationLabel = (key: any) => FIELD_LABEL_LOOKUP[key] || titleCase(String(key).replace(/[_-]+/g, ' '));

export const normalizeSpecificationSection = (value: any) => {
  const normalized = String(value || 'General').trim().toLowerCase();
  return SECTION_ALIASES[normalized] || titleCase(normalized.replace(/[_-]+/g, ' '));
};

export const normalizeSpecificationRecord = (record: any = {}, fallbackSection = 'General') => {
  const key = record?.key ?? record?.name ?? record?.label ?? record?.field ?? record?.spec_key ?? record?.specification_key;
  const value = record?.value ?? record?.spec_value ?? record?.field_value ?? record?.specification_value;
  if (!key || value === undefined || value === null || String(value).trim() === '') return null;
  const normKey = normalizeSpecificationKey(key);
  return {
    id: record?.id ?? `${fallbackSection}-${normKey}`,
    key: normKey, label: formatSpecificationLabel(normKey),
    value: String(value).trim(),
    section: normalizeSpecificationSection(record?.section || fallbackSection),
  };
};

export const toSpecificationRecords = (source: any = {}) => {
  if (Array.isArray(source)) return source.map((r) => normalizeSpecificationRecord(r)).filter(Boolean);
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source).map(([key, value]) => normalizeSpecificationRecord({ key, value })).filter(Boolean);
};

export const buildSpecificationSections = (source: any = {}) => {
  const records = toSpecificationRecords(source);
  if (!records.length) return [];
  const grouped = records.reduce((acc: Record<string, any[]>, r: any) => {
    const sec = r.section || 'General';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(r);
    return acc;
  }, {});
  const names = [...SECTION_ORDER.filter(s => grouped[s]), ...Object.keys(grouped).filter(s => !SECTION_ORDER.includes(s))];
  return names.map(s => ({ id: normalizeSpecificationKey(s), title: s, items: grouped[s].map((r: any) => ({ id: r.id, key: r.key, label: r.label, value: r.value })) }));
};

export const getSpecificationHighlights = (source: any = {}, maxItems = 6) => {
  const records = toSpecificationRecords(source);
  if (!records.length) return [];
  const priority = ['processor', 'chipset', 'memory', 'storage', 'display_size', 'display_resolution', 'graphics', 'os', 'operating_system'];
  const found: any[] = [];
  const remaining = [...records];
  priority.forEach(pk => {
    const idx = remaining.findIndex(r => r && r.key === pk);
    if (idx >= 0) { found.push(remaining[idx]); remaining.splice(idx, 1); }
  });
  return [...found, ...remaining].slice(0, maxItems).map(r => ({ key: r.key, label: r.label, value: r.value }));
};

export const CATALOG_SYNC_KEY = 'catalog_sync_version';
export const CATALOG_SYNC_EVENT = 'catalog-sync';

export const getCatalogSyncVersion = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(CATALOG_SYNC_KEY) || '';
};

export const touchCatalogSync = () => {
  if (typeof window === 'undefined') return '';
  const version = String(Date.now());
  window.localStorage.setItem(CATALOG_SYNC_KEY, version);
  window.dispatchEvent(new CustomEvent(CATALOG_SYNC_EVENT, { detail: version }));
  return version;
};

export const catalogSyncStore = { CATALOG_SYNC_KEY, CATALOG_SYNC_EVENT, getCatalogSyncVersion, touchCatalogSync };

// --- NAVBAR GROUP OVERRIDES ---
const STORAGE_KEY = 'category_navbar_group_overrides';
const readOverrides = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};
const writeOverrides = (val: any) => {
  if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
};
export const applyCategoryNavbarGroupOverride = (category: any) => {
  if (!category || category.navbar_group) return category;
  const override = readOverrides()[String(category.id)];
  return override ? { ...category, navbar_group: override } : category;
};
export const applyCategoryNavbarGroupOverrides = (categories: any[] = []) => categories.map(applyCategoryNavbarGroupOverride);
export const setCategoryNavbarGroupOverride = (categoryId: any, navbarGroup: any) => {
  const overrides = readOverrides();
  overrides[String(categoryId)] = navbarGroup;
  writeOverrides(overrides);
};
export const removeCategoryNavbarGroupOverride = (categoryId: any) => {
  const overrides = readOverrides();
  delete overrides[String(categoryId)];
  writeOverrides(overrides);
};
export const categoryNavbarGroupStore = {
  applyCategoryNavbarGroupOverride,
  applyCategoryNavbarGroupOverrides,
  setCategoryNavbarGroupOverride,
  removeCategoryNavbarGroupOverride,
};
