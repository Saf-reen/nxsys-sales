import React, { useEffect, useMemo, useState } from 'react';
import { Check, Edit2, Star, Trash2, X } from 'lucide-react';
import AdminModal from './AdminModal';
import { getTopLevelCategories } from '@/utils/adminUtils';
import { createBrand, updateBrand, deleteBrand } from '@/services';
import { resolveAssetUrl } from '@/services';
import { showToast } from '@/utils/helpers';
import type { Brand, Category, Product, ProductFlag, Subcategory } from '@/types';

interface SpecRecord {
  id: string | number;
  key: string;
  value: string;
  section: string;
}

interface ExistingImage {
  id: string | number | null;
  url: string;
  image?: string;
  display_order: number;
}

interface FormState {
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  is_active: boolean;
  featured: boolean;
  top_selling: boolean;
  new_arrival: boolean;
  mpn: string;
  sku: string;
  specifications: SpecRecord[];
  highlights: string;
  existingImages: ExistingImage[];
  files: File[];
  [key: string]: unknown;
}

interface PreviewUrl { name: string; url: string; }

const DEFAULT_PRODUCT_FLAGS = [
  { key: 'featured', label: 'Featured' },
  { key: 'top_selling', label: 'Top Selling' },
  { key: 'new_arrival', label: 'New Arrival' },
];

const normalizeSpecification = (specification: Record<string, unknown> = {}, index = 0): SpecRecord => ({
  id: (specification.id as string | number) ?? `temp-${Date.now()}-${index}`,
  key: String(specification.key || specification.label || specification.name || '').trim(),
  value: String(specification.value || '').trim(),
  section: String(specification.section || specification.category || 'General').trim() || 'General',
});


const normalizeExistingImage = (image: unknown, index = 0): ExistingImage | null => {
  if (!image) return null;
  
  if (typeof image === 'string') {
    return {
      id: null, // Strings don't have IDs in this context
      url: image,
      display_order: index,
    };
  }

  if (typeof image === 'object') {
    const img = image as Record<string, unknown>;
    const url = (img.url as string) || (img.image_url as string) || (img.image as string) || '';
    if (!url) return null;
    return {
      id: (img.id as string | number) ?? null,
      url,
      display_order: (img.display_order as number) ?? index,
    };
  }

  return null;
};

const createInitialForm = (product: Product | null | undefined): FormState => {
  const rawSpecs = product?.specification_records ?? product?.specifications ?? [];
  const baseSpecifications: SpecRecord[] = Array.isArray(rawSpecs)
    ? rawSpecs.map((s, i) => normalizeSpecification(s as unknown as Record<string, unknown>, i))
    : [];

  const rawImages: unknown[] =
    Array.isArray(product?.gallery) && product.gallery.length
      ? product.gallery
      : Array.isArray(product?.images) && product.images.length
        ? product.images
        : [];

  // If there's a primary product_image that isn't in the raw list, add it
  if (product?.product_image && typeof product.product_image === 'string') {
    const mainImgUrl = product.product_image;
    const alreadyIncluded = rawImages.some(img => {
      const url = typeof img === 'string' ? img : (img as any)?.url || (img as any)?.image_url || (img as any)?.image;
      return url === mainImgUrl;
    });
    if (!alreadyIncluded) rawImages.unshift(mainImgUrl);
  }

  const existingImages: ExistingImage[] = rawImages
    .map((img, i) => normalizeExistingImage(img, i))
    .filter((img): img is ExistingImage => img !== null);

  return {
    name: product?.name || '',
    brand: String(typeof product?.brand === 'object' ? (product?.brand as { id?: unknown })?.id : product?.brand || ''),
    category: String((typeof product?.category === 'object' ? (product?.category as { id?: unknown })?.id : product?.category) || ''),
    subcategory: String(product?.subcategoryId || ''),
    description: product?.description || '',
    is_active: product ? Boolean(product?.is_active ?? true) : true,
    featured: Boolean(product?.featured),
    top_selling: Boolean(product?.top_selling ?? product?.topSelling),
    new_arrival: Boolean(product?.new_arrival ?? product?.isNew),
    mpn: product?.mpn || '',
    sku: product?.sku || '',
    specifications: baseSpecifications,
    highlights: Array.isArray(product?.highlights)
      ? product.highlights.map(h => (typeof h === 'object' ? (h as { text?: string }).text ?? '' : h)).join('\n')
      : String(product?.highlights || ''),
    existingImages,
    files: [],
  };
};

interface ProductEditorModalProps {
  open: boolean;
  product?: Product | null;
  products?: Product[];
  categories?: Category[];
  subcategoriesByCategory?: Record<string, Subcategory[]>;
  submitting: boolean;
  error?: any;
  metadata?: any;
  brands?: Brand[];
  productFlags?: ProductFlag[];
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
}

function ProductEditorModal({
  open,
  product,
  products = [],
  categories = [],
  subcategoriesByCategory = {},
  submitting,
  error,
  metadata,
  brands = [],
  productFlags = [],
  setBrands,
  onClose,
  onSubmit,
}: ProductEditorModalProps) {
  const [form, setForm] = useState<FormState>(createInitialForm(product));

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (!open) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setForm((current) => ({
              ...current,
              files: [...current.files, file],
            }));
            showToast({ title: 'Image pasted', message: 'Image captured from clipboard', type: 'success' });
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open]);
  const [previewUrls, setPreviewUrls] = useState<PreviewUrl[]>([]);
  const [showNewSectionInput, setShowNewSectionInput] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
  const [editBrandName, setEditBrandName] = useState('');

  const [sectionBeingRenamed, setSectionBeingRenamed] = useState<string | null>(null);
  const [renameSectionValue, setRenameSectionValue] = useState('');
  const [mainImageIndex, setMainImageIndex] = useState<number | null>(null);

  useEffect(() => {
    setForm(createInitialForm(product));
    setEditingBrandId(null);
    setSectionBeingRenamed(null);
    setMainImageIndex(null);
  }, [product, open]);


  useEffect(() => {
    const nextUrls = form.files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [form.files]);

  const topLevelCategories = getTopLevelCategories(categories);
  
  const subcategories = useMemo(
    () => (form.category ? subcategoriesByCategory[String(form.category)] || [] : []),
    [form.category, subcategoriesByCategory],
  );
const resolvedProductFlags = useMemo(() => {
    const allowedFlags = new Map(DEFAULT_PRODUCT_FLAGS.map((flag) => [flag.key, flag]));
    const dynamicFlags = (Array.isArray(productFlags) ? productFlags : [])
      .filter((flag) => allowedFlags.has(flag?.key))
      .map((flag) => ({
        key: flag.key,
        label: flag.label || allowedFlags.get(flag.key)?.label || flag.key,
      }));

    return dynamicFlags.length ? dynamicFlags : DEFAULT_PRODUCT_FLAGS;
  }, [productFlags]);

  const globalSections = useMemo(() => {
    const defaultSections = [
      'General',
      'Processor',
      'Memory',
      'Display',
      'Connectivity',
      'Power',
      'Physical',
      'Operating System',
      'Additional Details'
    ];

    const catalogSections = products.flatMap(p => {
      const specs = p.specification_records || p.specifications || [];
      if (Array.isArray(specs)) {
        return specs.map(s => (s as SpecRecord & { category?: string }).section || (s as SpecRecord & { category?: string }).category).filter(Boolean);
      }
      return [];
    });

    return [...new Set([...defaultSections, ...catalogSections])].sort();
  }, [products]);

  useEffect(() => {
    if (!form.category) {
      return;
    }

    const subcategoryExists = subcategories.some(
      (subcategory) => String(subcategory.id) === String(form.subcategory),
    );

    if (!subcategoryExists && form.subcategory) {
      setForm((current) => ({
        ...current,
        subcategory: '',
      }));
    }
  }, [form.category, form.subcategory, subcategories]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setForm((current) => ({
      ...current,
      ...(name === 'category' ? { subcategory: '' } : {}),
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFlagChange = (name: string) => {
    setForm((current) => ({
      ...current,
      [name]: !current[name],
    }));
  };

  const handleSmartPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const { name } = event.target as HTMLTextAreaElement;
    const text = event.clipboardData.getData('Text');
    if (!text || text.length < 10) return;

    // Convert bullet points and sentences into newlines for a list structure
    const points = text
      .split(/[•·●○■□▪▫*–—]|\n/)
      .flatMap(p => p.split(/\. (?=[A-Z])/))
      .map(p => p.trim().replace(/^\.*|\.*$/g, ''))
      .filter(p => p.length > 2);

    if (points.length > 1) {
      event.preventDefault();
      const newText = points.join('\n');

      setForm(prev => {
        const currentVal = String(prev[name] || '');
        const currentPrefix = currentVal && !currentVal.endsWith('\n')
          ? currentVal + '\n'
          : currentVal;
        return {
          ...prev,
          [name]: currentPrefix + newText + '\n'
        };
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    if (!nextFiles.length) {
      return;
    }

    setForm((current) => ({
      ...current,
      files: [...current.files, ...nextFiles],
    }));
    event.target.value = '';
  };

  const handleRemoveNewFile = (index: number) => {
    setForm((current) => ({
      ...current,
      files: current.files.filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const handleRemoveExistingImage = (index: number) => {
    setForm((current) => ({
      ...current,
      existingImages: current.existingImages.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleAddSpecification = (section = 'General'): void => {
    setForm((current) => ({
      ...current,
      specifications: [
        ...current.specifications,
        { id: `temp-${Date.now()}`, section, key: '', value: '' }
      ],
    }));
  };

  const handleAddCustomSection = () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    handleAddSpecification(trimmed);
    setNewSectionName('');
    setShowNewSectionInput(false);
  };

  const handleSpecificationChange = (index: number, field: keyof SpecRecord, value: string) => {
    setForm((current) => ({
      ...current,
      specifications: current.specifications.map((spec, specIndex) =>
        specIndex === index ? { ...spec, [field]: value } : spec
      ),
    }));
  };

  const handleRemoveSpecification = (index: number) => {
    setForm((current) => ({
      ...current,
      specifications: current.specifications.filter((_, specIndex) => specIndex !== index),
    }));
  };

  const handleAddCustomBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;
    setCreatingBrand(true);
    try {
      const newBrand = await createBrand({ name: trimmed });
      setBrands && setBrands(prev => [...prev, newBrand]);
      setForm(current => ({ ...current, brand: newBrand.id }));
      setNewBrandName('');
      setShowNewBrandInput(false);
      showToast({ title: 'Brand Created', message: `Brand "${trimmed}" was successfully added.`, type: 'success' });
    } catch {
      showToast({ title: 'Error', message: 'Failed to create brand', type: 'error' });
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleUpdateBrand = async () => {
    const trimmed = editBrandName.trim();
    if (!trimmed || !editingBrandId) return;
    setCreatingBrand(true);
    try {
      const updated = await updateBrand(editingBrandId, { name: trimmed });
      setBrands && setBrands(prev => prev.map(b => b.id === editingBrandId ? updated : b));
      setEditingBrandId(null);
      setEditBrandName('');
      showToast({ title: 'Brand Updated', message: 'Brand name was changed successfully.', type: 'success' });
    } catch {
      showToast({ title: 'Error', message: 'Failed to update brand', type: 'error' });
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleDeleteBrand = async (id: number) => {
    const brandToDelete = brands.find(b => b.id === id);
    if (!brandToDelete) return;

    if (!window.confirm(`Are you sure you want to permanently delete the brand "${brandToDelete.name}"? This will affect all products associated with it.`)) {
      return;
    }

    setCreatingBrand(true);
    try {
      await deleteBrand(id);
      setBrands && setBrands(prev => prev.filter(b => b.id !== id));
      if (String(form.brand) === String(id)) {
        setForm(prev => ({ ...prev, brand: '' }));
      }
      showToast({ title: 'Brand Deleted', message: 'Brand was removed from the catalog.', type: 'success' });
    } catch {
      showToast({ title: 'Error', message: 'Failed to delete brand. It may be in use by other products.', type: 'error' });
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleRenameSection = (oldName: string) => {
    const trimmed = renameSectionValue.trim();
    if (!trimmed || trimmed === oldName) {
      setSectionBeingRenamed(null);
      return;
    }

    setForm(current => ({
      ...current,
      specifications: current.specifications.map(s =>
        (s.section || 'General') === oldName ? { ...s, section: trimmed } : s
      )
    }));
    setSectionBeingRenamed(null);
    setRenameSectionValue('');
    showToast({ title: 'Section Renamed', message: `All items in "${oldName}" moved to "${trimmed}".`, type: 'success' });
  };

  const handleRemoveSection = (sectionName: string) => {
    if (!window.confirm(`Are you sure you want to remove the entire "${sectionName}" section and all its ${groupedSpecs[sectionName]?.length || 0} specifications?`)) {
      return;
    }

    setForm(current => ({
      ...current,
      specifications: current.specifications.filter(s => (s.section || 'General') !== sectionName)
    }));
    showToast({ title: 'Section Removed', message: `The "${sectionName}" section was deleted.`, type: 'success' });
  };



  const getFieldError = (name: string) => {
    if (error && typeof error === 'object' && error.fieldErrors) {
      return error.fieldErrors[name]?.[0];
    }
    return null;
  };

  const isRequired = (name: string) => {
    // If it's an edit, the backend might have different requirements than a create
    const action = product ? 'PUT' : 'POST';
    const field = metadata?.actions?.[action]?.[name] || metadata?.actions?.POST?.[name];
    return field?.required || false;
  };

  const topLevelError = typeof error === 'string' ? error : error?.message;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Brand is now a ForeignKey on the backend — send the numeric pk directly.
    const brandId = form.brand ? Number(form.brand) : null;

    // Combine existing images and new files; respect the admin's explicit main selection.
    const images = [
      ...form.existingImages.map((img, i) => ({
        id: img.id || null,
        image_url: img.url,
        is_main: mainImageIndex === i,
      })),
      ...form.files.map((file, i) => ({
        id: null,
        image: file,
        is_main: mainImageIndex === form.existingImages.length + i,
      })),
    ];

    onSubmit({
      name: form.name.trim(),
      brand: brandId,
      category: form.category ? Number(form.category) : null,
      subcategory: form.subcategory ? Number(form.subcategory) : null,
      description: form.description.trim(),
      is_active: Boolean(form.is_active),
      featured: Boolean(form.featured),
      top_selling: Boolean(form.top_selling),
      new_arrival: Boolean(form.new_arrival),
      mpn: form.mpn.trim(),
      sku: form.sku.trim(),
      highlights: typeof form.highlights === 'string'
        ? form.highlights.trim()
        : '',
      images,
    });
  };

  const handleApplyTemplate = () => {
    const template = [
      { section: 'General', key: 'Brand', value: form.brand || '' },
      { section: 'General', key: 'Model Name', value: '' },
      { section: 'General', key: 'Model Number', value: form.mpn || '' },
      { section: 'General', key: 'Color', value: '' },
      { section: 'Processor', key: 'Processor', value: '' },
      { section: 'Processor', key: 'Processor Brand', value: '' },
      { section: 'Processor', key: 'Cores', value: '' },
      { section: 'Memory', key: 'RAM', value: '' },
      { section: 'Memory', key: 'Storage', value: '' },
      { section: 'Connectivity', key: 'WiFi', value: '' },
      { section: 'Connectivity', key: 'Bluetooth', value: '' },
      { section: 'Audio / Ports', key: 'USB Ports', value: '' },
      { section: 'Audio / Ports', key: 'HDMI', value: '' },
      { section: 'Power', key: 'Battery Type', value: '' },
      { section: 'Power', key: 'Charging', value: '' },
      { section: 'Physical', key: 'Dimensions', value: '' },
      { section: 'Physical', key: 'Weight', value: '' },
      { section: 'Operating System', key: 'OS', value: '' }
    ].map(s => ({ ...s, id: `temp-${Math.random()}` }));

    const existingMap = new Set(form.specifications.map(s => `${s.section}:${s.key}`.toLowerCase()));
    const nextSpecs = [...form.specifications];

    template.forEach(ts => {
      if (!existingMap.has(`${ts.section}:${ts.key}`.toLowerCase())) {
        nextSpecs.push(ts);
      }
    });

    setForm(f => ({ ...f, specifications: nextSpecs }));
  };

  const groupedSpecs = form.specifications.reduce<Record<string, SpecRecord[]>>((acc, s) => {
    const section = s.section.trim() || 'General';
    if (!acc[section]) acc[section] = [];
    acc[section].push(s);
    return acc;
  }, {});

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={product ? 'Edit product' : 'Add product'}
      description="Manage the catalog with the same product, image, specification, and inventory APIs used by the storefront."
      size="xl"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="admin-product-form"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-textMain transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving...' : product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      }
    >
      <form id="admin-product-form" onSubmit={handleSubmit} className="space-y-8 pb-12">
        {/* Error Display */}
        {topLevelError && (
          <div className="rounded-[20px] bg-rose-50 border border-rose-200 p-5 mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <X size={20} strokeWidth={3} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-rose-500">Submission Error</p>
              <p className="text-sm font-bold text-rose-900 mt-0.5">{topLevelError}</p>
            </div>
          </div>
        )}
        {/* Catalog Metadata */}
        <section className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Core info</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Catalog metadata</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Product name {isRequired('name') && <span className="text-rose-500">*</span>}
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                maxLength={255}
                required={isRequired('name')}
                className={`w-full rounded-2xl border ${getFieldError('name') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
              />
              {getFieldError('name') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('name')}</p>}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Brand {isRequired('brand') && <span className="text-rose-500">*</span>}
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 relative">
                  {!showNewBrandInput && !editingBrandId ? (
                    <>
                      <select
                        name="brand"
                        value={form.brand}
                        onChange={handleChange}
                        required={isRequired('brand')}
                        className={`flex-1 rounded-2xl border ${getFieldError('brand') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
                      >
                        <option value="">Select brand</option>
                        {brands.map((b) => (
                          <option key={b.id || b.name} value={b.id || b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      {form.brand && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const b = brands.find(brand => String(brand.id) === String(form.brand));
                              if (b) {
                                setEditingBrandId(b.id);
                                setEditBrandName(b.name);
                              }
                            }}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-primary hover:text-primary"
                            title="Edit Brand"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBrand(Number(form.brand))}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-600"
                            title="Delete Brand"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : showNewBrandInput ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary"
                        placeholder="Brand name..."
                        disabled={creatingBrand}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomBrand}
                        className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-textMain"
                        disabled={creatingBrand}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex gap-2">
                      <input
                        value={editBrandName}
                        onChange={(e) => setEditBrandName(e.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary"
                        placeholder="New brand name..."
                        disabled={creatingBrand}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleUpdateBrand}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-textMain"
                        disabled={creatingBrand}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBrandId(null);
                          setEditBrandName('');
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-400"
                        disabled={creatingBrand}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  {!editingBrandId && (
                    <button
                      type="button"
                      onClick={() => setShowNewBrandInput(!showNewBrandInput)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold whitespace-nowrap outline-none transition-colors hover:bg-slate-50"
                    >
                      {showNewBrandInput ? 'Cancel' : 'New Brand'}
                    </button>
                  )}
                </div>
                {getFieldError('brand') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('brand')}</p>}
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Category {isRequired('category') && <span className="text-rose-500">*</span>}
              </span>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required={isRequired('category')}
                className={`w-full rounded-2xl border ${getFieldError('category') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
              >
                <option value="">Select category</option>
                {topLevelCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {getFieldError('category') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('category')}</p>}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Subcategory {isRequired('subcategory') && <span className="text-rose-500">*</span>}
              </span>
              <select
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
                disabled={!form.category}
                required={isRequired('subcategory')}
                className={`w-full rounded-2xl border ${getFieldError('subcategory') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
              >
                <option value="">
                  {form.category ? 'Select subcategory' : 'Choose a category first'}
                </option>
                {subcategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {getFieldError('subcategory') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('subcategory')}</p>}
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Description {isRequired('description') && <span className="text-rose-500">*</span>}
              </span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                onPaste={handleSmartPaste}
                rows={4}
                required={isRequired('description')}
                className={`w-full rounded-2xl border ${getFieldError('description') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
                placeholder="Short operational summary for buyers"
              />
              {getFieldError('description') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('description')}</p>}
            </label>
          </div>
        </section>

        {/* Specifications */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Technical data</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">Specification sheet</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="inline-flex items-center justify-center rounded-full border border-primary px-4 py-2 text-xs font-bold text-textMain hover:bg-primary/5"
              >
                Fill PDF Template
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNewSectionInput(!showNewSectionInput)}
                  className="inline-flex items-center justify-center rounded-full border border-textMain px-4 py-2 text-xs font-bold text-textMain hover:bg-slate-50"
                >
                  {showNewSectionInput ? 'Cancel' : 'New Section'}
                </button>
                {showNewSectionInput && (
                  <div className="absolute right-0 top-full z-10 mt-2 flex w-64 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <input
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="Section name..."
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-yellowPrimary"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSection}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-textMain"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleAddSpecification()}
                className="inline-flex items-center justify-center rounded-full bg-textMain px-4 py-2 text-xs font-bold text-white hover:bg-black"
              >
                Add Row
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                MPN {isRequired('mpn') && <span className="text-rose-500">*</span>}
              </span>
              <input
                name="mpn"
                value={form.mpn}
                onChange={handleChange}
                maxLength={100}
                required={isRequired('mpn')}
                placeholder="Manufacturer Part Number"
                className={`w-full rounded-2xl border ${getFieldError('mpn') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
              />
              {getFieldError('mpn') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('mpn')}</p>}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                SKU {isRequired('sku') && <span className="text-rose-500">*</span>}
              </span>
              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                maxLength={100}
                required={isRequired('sku')}
                placeholder="Internal SKU"
                className={`w-full rounded-2xl border ${getFieldError('sku') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
              />
              {getFieldError('sku') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('sku')}</p>}
            </label>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedSpecs).map(([sectionName, specs]) => (
              <div key={sectionName} className="group rounded-[24px] border border-slate-100 bg-slate-50/50 overflow-hidden">
                <div className="bg-slate-100/50 px-5 py-3 flex items-center justify-between border-b border-slate-100">
                  <div className="flex-1 flex items-center gap-3">
                    {sectionBeingRenamed === sectionName ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameSectionValue}
                          onChange={(e) => setRenameSectionValue(e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold outline-none focus:border-primary"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSection(sectionName)}
                          className="text-primary hover:text-textMain"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSectionBeingRenamed(null)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{sectionName}</h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setSectionBeingRenamed(sectionName);
                              setRenameSectionValue(sectionName);
                            }}
                            className="p-1 text-slate-400 hover:text-primary"
                            title="Rename Section"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(sectionName)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Remove Section"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddSpecification(sectionName)}
                      className="text-[10px] font-bold text-primary hover:underline ml-auto"
                    >
                      + Add Row to {sectionName}
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 ml-4">{specs.length} items</span>
                </div>
                <div className="p-4 space-y-3">
                  {specs.map((spec) => {
                    const globalIndex = form.specifications.findIndex(s => s.id === spec.id);
                    return (
                      <div key={spec.id} className="grid grid-cols-[1.5fr_1fr_2fr_auto] gap-3 items-center">
                        <select
                          value={spec.section}
                          onChange={(e) => handleSpecificationChange(globalIndex, 'section', e.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-tight outline-none focus:border-yellowPrimary"
                        >
                          {/* Combine global sections with current product sections and sectionName to satisfy all possibilities */}
                          {[...new Set([...globalSections, ...Object.keys(groupedSpecs), sectionName])].sort().map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <input
                          value={spec.key}
                          onChange={(e) => handleSpecificationChange(globalIndex, 'key', e.target.value)}
                          placeholder="Field name"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-yellowPrimary"
                        />
                        <input
                          value={spec.value}
                          onChange={(e) => handleSpecificationChange(globalIndex, 'value', e.target.value)}
                          placeholder="Value"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-yellowPrimary"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecification(globalIndex)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {!form.specifications.length && (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-50 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                <p className="text-sm font-medium text-slate-500">No specifications added yet.</p>
                <button type="button" onClick={handleApplyTemplate} className="mt-2 text-xs font-bold text-primary">Use standard PDF template</button>
              </div>
            )}
          </div>
        </section>

        {/* Highlights */}
        <section className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Merchandising</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Product Highlights</h3>
          </div>
          <div className="space-y-3">
            <label className="field-stack">
              <span className="text-sm font-semibold text-slate-700">
                Detailed Features (New line per point) {isRequired('highlights') && <span className="text-rose-500">*</span>}
              </span>
              <textarea
                name="highlights"
                value={form.highlights}
                onChange={handleChange}
                onPaste={handleSmartPaste}
                rows={6}
                required={isRequired('highlights')}
                className={`w-full rounded-2xl border ${getFieldError('highlights') ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'} px-4 py-3 text-sm outline-none transition-colors focus:border-yellowPrimary`}
                placeholder="Enter key product features... 
Example:
High-speed data transfer
Premium build quality
3-year warranty"
              />
              {getFieldError('highlights') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('highlights')}</p>}
            </label>
            <p className="text-[10px] text-slate-400 font-medium">
              Each new line will be automatically converted into a bullet point on the live product page. Perfect for detailed technical advantages and selling points.
            </p>
          </div>
        </section>

        {/* Visuals */}
        <section className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Visuals</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Images and gallery</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {form.existingImages.map((image, index) => {
              const isMain = mainImageIndex === index;
              return (
                <div key={image.id || index} className={`group relative aspect-square overflow-hidden rounded-[24px] border-2 ${isMain ? 'border-primary' : 'border-slate-200'}`}>
                  <img src={(resolveAssetUrl(image.url || image.image)) ?? undefined} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-rose-600 shadow-sm transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainImageIndex(isMain ? null : index)}
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide shadow-sm transition-all ${
                      isMain ? 'bg-primary text-textMain' : 'bg-white/90 text-slate-500 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isMain ? 'Remove main' : 'Set as main'}
                  >
                    <Star size={9} className={isMain ? 'fill-textMain' : ''} />
                    {isMain ? 'Main' : 'Set main'}
                  </button>
                </div>
              );
            })}
            {previewUrls.map((item, index) => {
              const globalIndex = form.existingImages.length + index;
              const isMain = mainImageIndex === globalIndex;
              return (
                <div key={item.url} className={`group relative aspect-square overflow-hidden rounded-[24px] border-2 ${isMain ? 'border-primary' : 'border-primary/20'}`}>
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(index)}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainImageIndex(isMain ? null : globalIndex)}
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide shadow-sm transition-all ${
                      isMain ? 'bg-primary text-textMain' : 'bg-white/90 text-slate-500 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isMain ? 'Remove main' : 'Set as main'}
                  >
                    <Star size={9} className={isMain ? 'fill-textMain' : ''} />
                    {isMain ? 'Main' : 'Set main'}
                  </button>
                </div>
              );
            })}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-primary/50 hover:bg-primary/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-primary"><path d="M12 5v14M5 12h14" /></svg>
              <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Upload</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          {getFieldError('product_image') && <p className="text-[10px] font-bold text-rose-500 mt-2">{getFieldError('product_image')}</p>}
        </section>

        {/* Merchandising Flags */}
        <section className="space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Visibility</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Flags and listing</h3>
          </div>

          {/* Active / Inactive status toggle */}
          <div className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-colors ${form.is_active ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
            <div>
              <p className="text-sm font-bold text-slate-800">Product Status</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {form.is_active ? 'Visible to customers in the storefront.' : 'Hidden from the storefront.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(current => ({ ...current, is_active: !current.is_active }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
              aria-label={form.is_active ? 'Deactivate product' : 'Activate product'}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className={`ml-3 text-[11px] font-black uppercase tracking-widest ${form.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
              {form.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            {resolvedProductFlags.map((flag) => (
              <label key={flag.key} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={Boolean((form as Record<string, unknown>)[flag.key])}
                  onChange={() => handleFlagChange(flag.key)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-700">{flag.label}</span>
              </label>
            ))}
          </div>
        </section>
      </form>
    </AdminModal>
  );
}

export default ProductEditorModal;
