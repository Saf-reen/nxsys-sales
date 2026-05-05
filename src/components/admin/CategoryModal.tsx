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
  categories = [],
  brands = [],
  category = null,
  initialIsSubcategory = false,
  initialParentId = '',
}: CategoryModalProps) {
  const [name, setName] = useState('');
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
        setParentId(String(category.parent || ''));
        setNavbarGroup(category.navbar_group || '');
        setIsSubcategory(!!category.parent);
      } else {
        setName('');
        setParentId(String(initialParentId || ''));
        setNavbarGroup('');
        setIsSubcategory(initialIsSubcategory);
      }
    }
  }, [open, category, initialIsSubcategory, initialParentId]);

  const topLevelCategories = getTopLevelCategories(categories);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    const payload: any = {
      name: name.trim(),
    };

    if (isSubcategory) {
      if (!parentId) return;
      payload.parent = parentId;
      payload.categoryId = parentId;
    } else {
      payload.navbar_group = navbarGroup.trim() || null;
      payload.parent = null;
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
        <div className="flex items-center gap-4 rounded-[20px] bg-slate-50 p-4 border border-slate-100">
          <button
            type="button"
            disabled={!!category} // Don't allow changing type during edit to keep it simple, or allow if needed
            onClick={() => setIsSubcategory(false)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              !isSubcategory ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
            } ${category ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            Top-level Category
          </button>
          <button
            type="button"
            disabled={!!category}
            onClick={() => setIsSubcategory(true)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              isSubcategory ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'
            } ${category ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            Subcategory
          </button>
        </div>

        {isSubcategory && (
          <div className="field-stack">
            <label className="text-sm font-semibold text-slate-700" htmlFor="admin-parent-category">
              Parent category
            </label>
            <select
              id="admin-parent-category"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="admin-control"
              required
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
          </div>
        )}

        {!isSubcategory && (
          <div className="field-stack">
            <label className="text-sm font-semibold text-slate-700" htmlFor="admin-navbar-group">
              Navbar Group
            </label>
            <input
              id="admin-navbar-group"
              list="navbar-groups-list"
              type="text"
              value={navbarGroup}
              onChange={(event) => setNavbarGroup(event.target.value)}
              placeholder="Select or type to add new group..."
              className="admin-control"
            />
            <datalist id="navbar-groups-list">
              {existingNavbarGroups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
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
          </label>
          <input
            id="admin-category-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={isSubcategory ? 'Example: Workstations' : navbarGroup === 'Top Brands' ? 'Example: Apple' : 'Example: Enterprise'}
            className="admin-control"
            required
          />
        </div>
      </form>
    </AdminModal>
  );
}

export default CategoryModal;
