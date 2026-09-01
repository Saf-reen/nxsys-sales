import React, { useEffect, useState } from 'react';
import AdminModal from './AdminModal';
import { getTopLevelCategories } from '@/utils/adminUtils';
import { NAVBAR_GROUPS } from '@/utils/constants';
import type { Category } from '@/types';

interface CategoryModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  error?: any;
  metadata?: any;
  categories?: Category[];
  brands?: any[];
  category?: Category | null;
  initialIsSubcategory?: boolean;
  initialParentId?: string | number;
}

function CategoryModal({
  open,
  title,
  description,
  onClose,
  onSubmit,
  submitting,
  error,
  metadata,
  categories = [],
  brands = [],
  category = null,
  initialIsSubcategory = false,
  initialParentId = '',
}: CategoryModalProps) {
  const [name, setName] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [parentId, setParentId] = useState(String(initialParentId || ''));
  const [navbarGroup, setNavbarGroup] = useState('');
  const [isSubcategory, setIsSubcategory] = useState(initialIsSubcategory);

  // Derive unique navbar groups from existing categories for the datalist
  const existingNavbarGroups = Array.from(
    new Set([
      ...NAVBAR_GROUPS,
      ...(categories || [])
        .map((c) => c.navbar_group)
        .filter((g): g is string => !!g)
    ])
  ).sort();

  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name || '');
        setDescriptionValue(category.description || '');
        setParentId(String(category.parent || ''));
        setNavbarGroup(category.navbar_group || '');
        setIsSubcategory(!!category.parent);
      } else {
        setName('');
        setDescriptionValue('');
        setParentId(String(initialParentId || ''));
        setNavbarGroup('');
        setIsSubcategory(initialIsSubcategory);
      }
    }
  }, [open, category, initialIsSubcategory, initialParentId]);

  const topLevelCategories = getTopLevelCategories(categories);

  const getFieldError = (fieldName: string) => {
    if (error && typeof error === 'object' && error.fieldErrors) {
      return error.fieldErrors[fieldName]?.[0];
    }
    return null;
  };

  const isRequired = (fieldName: string) => {
    const action = category ? 'PUT' : 'POST';
    const field = metadata?.actions?.[action]?.[fieldName] || metadata?.actions?.POST?.[fieldName];
    return field?.required || false;
  };

  // Capture all errors that aren't mapped to specific fields
  const getGeneralErrors = () => {
    if (!error) return [];
    const messages: string[] = [];
    
    // 1. Check for non_field_errors
    if (Array.isArray(error.data?.non_field_errors)) {
      messages.push(...error.data.non_field_errors);
    }
    
    // 2. Check for other field errors not explicitly handled in the UI
    const handledFields = ['name', 'parent', 'navbar_group'];
    if (error.fieldErrors) {
      Object.entries(error.fieldErrors).forEach(([key, errs]) => {
        if (!handledFields.includes(key) && key !== 'non_field_errors') {
          if (Array.isArray(errs)) {
            errs.forEach(e => messages.push(String(e)));
          }
        }
      });
    }

    // 3. Fallback to the top-level message if no specific field errors were found
    if (messages.length === 0 && error.message && !error.fieldErrors) {
      messages.push(error.message);
    }

    return [...new Set(messages)]; // Unique messages
  };

  const generalErrors = getGeneralErrors();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    const payload: any = {
      name: name.trim(),
      description: descriptionValue.trim() || null,
    };

    if (isSubcategory) {
      if (!parentId) return;
      payload.parent = parentId;
      payload.parent_id = parentId;
      payload.categoryId = parentId;
    } else {
      payload.navbar_group = navbarGroup.trim() || null;
      payload.parent = null;
      payload.parent_id = null;
    }

    if (category?.id) {
      payload.id = category.id;
    }

    onSubmit(payload);
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="admin-btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="admin-category-form"
            disabled={submitting || (isSubcategory && !parentId)}
            className="admin-btn-primary"
          >
            {submitting ? 'Saving...' : category ? 'Save Changes' : isSubcategory ? 'Add Subcategory' : 'Add Category'}
          </button>
        </div>
      }
    >
      <form id="admin-category-form" onSubmit={handleSubmit} className="space-y-6">
        {generalErrors.length > 0 && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-1">
            {generalErrors.map((err: string, i: number) => (
              <p key={i} className="text-xs font-bold text-rose-600 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-rose-600 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 rounded-[20px] bg-slate-50 p-4 border border-slate-100">
          <button
            type="button"
            onClick={() => setIsSubcategory(false)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              !isSubcategory ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Top-level Category
          </button>
          <button
            type="button"
            onClick={() => setIsSubcategory(true)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              isSubcategory ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Subcategory
          </button>
        </div>

        {isSubcategory && (
          <div className="field-stack">
            <label className="text-sm font-semibold text-slate-700" htmlFor="admin-parent-category">
              Parent category {isRequired('parent') && <span className="text-rose-500">*</span>}
            </label>
            <select
              id="admin-parent-category"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className={`admin-control ${getFieldError('parent') ? 'border-rose-300 bg-rose-50/30' : ''}`}
              required={isRequired('parent')}
            >
              <option value="">Select a category</option>
              {topLevelCategories
                .filter(c => c.id !== category?.id) // Prevent self-parenting
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            {getFieldError('parent') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('parent')}</p>}
          </div>
        )}

        {!isSubcategory && (
          <div className="field-stack">
            <label className="text-sm font-semibold text-slate-700" htmlFor="admin-navbar-group">
              Navbar Group {isRequired('navbar_group') && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="admin-navbar-group"
              list="navbar-groups-list"
              type="text"
              value={navbarGroup}
              onChange={(event) => setNavbarGroup(event.target.value)}
              placeholder="Select or type to add new group..."
              className={`admin-control ${getFieldError('navbar_group') ? 'border-rose-300 bg-rose-50/30' : ''}`}
              required={isRequired('navbar_group')}
            />
            <datalist id="navbar-groups-list">
              {existingNavbarGroups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
            {getFieldError('navbar_group') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('navbar_group')}</p>}
            <p className="text-[10px] text-slate-400 italic">
              Group multiple categories under one navbar heading. Leave blank for standalone.
            </p>
          </div>
        )}

        {!isSubcategory && navbarGroup === 'Top Brands' && (
          <div className="field-stack">
            <label className="text-sm font-semibold text-emerald-700" htmlFor="admin-brand-select">
              Select Existing Brand (Optional)
            </label>
            <select
              id="admin-brand-select"
              onChange={(e) => setName(e.target.value)}
              className="admin-control !border-emerald-200 !bg-emerald-50/30"
            >
              <option value="">-- Choose from catalog --</option>
              {brands.map((brand: any) => (
                <option key={brand.id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-emerald-600 italic">
              Picking an existing brand will auto-fill the name. You can still type a new name below to create a new brand.
            </p>
          </div>
        )}

        <div className="field-stack">
          <label className="text-sm font-semibold text-slate-700" htmlFor="admin-category-name">
            {isSubcategory ? 'Subcategory name' : navbarGroup === 'Top Brands' ? 'Brand name' : 'Category name'}
            {isRequired('name') && <span className="text-rose-500">*</span>}
          </label>
          <input
            id="admin-category-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={isSubcategory ? 'Example: Workstations' : navbarGroup === 'Top Brands' ? 'Example: Apple' : 'Example: Enterprise'}
            className={`admin-control ${getFieldError('name') ? 'border-rose-300 bg-rose-50/30' : ''}`}
            required={isRequired('name')}
          />
          {getFieldError('name') && <p className="text-[10px] font-bold text-rose-500 mt-1 pl-1">{getFieldError('name')}</p>}
        </div>

        <div className="field-stack">
          <label className="text-sm font-semibold text-slate-700" htmlFor="admin-category-description">
            Description (Optional)
          </label>
          <textarea
            id="admin-category-description"
            value={descriptionValue}
            onChange={(event) => setDescriptionValue(event.target.value)}
            placeholder="Briefly describe this category for SEO and internal reference..."
            rows={3}
            className="admin-control min-h-[100px] resize-none"
          />
        </div>
      </form>
    </AdminModal>
  );
}

export default CategoryModal;
