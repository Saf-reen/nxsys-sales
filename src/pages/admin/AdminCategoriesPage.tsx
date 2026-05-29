import { useEffect, useState } from 'react';
import { 
  createCategory, 
  deleteCategory, 
  updateCategory, 
  createBrand,
  getCategoryMetadata,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory
} from '@/services';
import { getCatalogData, getApiErrorMessage, getNormalizedApiError } from '@/services';
import { showToast } from '@/utils/helpers';
import { getTopLevelCategories, isTopLevelCategory } from '@/utils/admin';
import AdminDataTable from '@/components/admin/AdminDataTable';
import CategoryModal from '@/components/admin/CategoryModal';
import CategoryDetailModal from '@/components/admin/CategoryDetailModal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [modalConfig, setModalConfig] = useState<{ isSub?: boolean; parentId?: any }>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'categories' | 'groups'>('categories');
  const [categoryMetadata, setCategoryMetadata] = useState<any>(null);
  const [categorySaveError, setCategorySaveError] = useState<any>(null);

  const openModal = (isSub = false, parentId = '', category = null) => {
    setSelectedCategory(category);
    setCategorySaveError(null);
    setModalConfig({ isSub, parentId });
    setModalOpen(true);
  };

  const openDetail = (category: any) => {
    setSelectedCategory(category);
    setDetailModalOpen(true);
  };

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const catalogData: any = await getCatalogData();
      // Sort: Group children under parents
      const sorted = [...catalogData.categories].sort((a, b) => {
        const aRef = a.parent || a.id;
        const bRef = b.parent || b.id;
        if (String(aRef) === String(bRef)) {
          return a.parent ? 1 : -1;
        }
        return String(aRef).localeCompare(String(bRef));
      });
      setCategories(sorted);
      setBrands(catalogData.brands || []);
      setSubcategoriesByCategory(catalogData.subcategoriesByCategory);
      
      try {
        const metadata = await getCategoryMetadata();
        setCategoryMetadata(metadata);
      } catch {
        // Fallback
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load categories'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSave = async (payload: any) => {
    setSaving(true);
    const isSub = !!payload.parent;
    try {
      
      if (payload.navbar_group === 'Top Brands' && !payload.id) {
        // Automatically create a Brand as well
        await createCategory(payload); 
        const brandPayload = { name: payload.name, description: `Created via Top Brands category` };
        await createBrand(brandPayload);
        showToast({ title: 'Brand & Category created', message: `${payload.name} was added to Brands and the Navbar.` });
      } else if (payload.id) {
        if (isSub) {
          await updateSubcategory(payload.parent, payload.id, payload);
          showToast({ title: 'Subcategory updated', message: `${payload.name} was updated successfully.` });
        } else {
          await updateCategory(payload.id, payload);
          showToast({ title: 'Category updated', message: `${payload.name} was updated successfully.` });
        }
      } else {
        if (isSub) {
          await createSubcategory(payload.parent, payload);
          showToast({ title: 'Subcategory created', message: `${payload.name} was added successfully.` });
        } else {
          await createCategory(payload);
          showToast({ title: 'Category created', message: `${payload.name} was added successfully.` });
        }
      }
      setModalOpen(false);
      await loadCategories();
    } catch (err) {
      const errorData = getNormalizedApiError(err, { fallbackMessage: 'Operation failed' });
      setCategorySaveError(errorData);
      showToast({
        title: `Unable to ${payload.id ? 'update' : 'create'} ${isSub ? 'subcategory' : 'category'}`,
        message: errorData.message,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: any) => {
    const subcount = (subcategoriesByCategory[String(category.id)] || []).length;
    const warning = subcount > 0 
      ? `\n\nWarning: This category has ${subcount} linked subcategories. Deleting it may cause errors or orphans depending on the server configuration.` 
      : '';
    
    const confirmed = window.confirm(`Delete category "${category.name}"?${warning}`);
    if (!confirmed) {
      return;
    }

    try {
      if (category.parent) {
        await deleteSubcategory(category.parent, category.id);
      } else {
        await deleteCategory(category.id);
      }
      showToast({ title: 'Success', message: `${category.name} was removed.` });
      await loadCategories();
    } catch (err) {
      showToast({
        title: 'Unable to delete item',
        message: getApiErrorMessage(err, 'Deletion failed'),
        type: 'error',
      });
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading categories...</div>;
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="text-lg font-semibold text-rose-900">Unable to load categories</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Taxonomy"
        title={`Categories (${getTopLevelCategories(categories).length})`}
        description="Manage top-level catalog groupings and assign each category to the correct navbar section."
        action={
          <button
            type="button"
            onClick={() => openModal(false)}
            className="admin-btn-primary max-sm:w-full"
          >
            Add category
          </button>
        }
      />
      
      <div className="flex border-b border-slate-100 mb-6">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'categories' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'groups' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Navbar Groups
        </button>
      </div>

      {activeTab === 'categories' ? (
        <AdminDataTable
          tableFixed
          columns={[
            {
              key: 'name',
              label: 'Category',
              width: '35%',
              cellClassName: 'min-w-[240px]',
              render: (category) => {
                const isSub = !isTopLevelCategory(category);
                const parent = isSub ? categories.find(c => String(c.id) === String(category.parent)) : null;
                
                return (
                  <div className={`min-w-0 pr-4 ${isSub ? 'pl-6 border-l-2 border-slate-100' : ''}`}>
                    <p className="font-semibold text-slate-950 leading-relaxed">
                      {category.name}
                    </p>
                    {isSub ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                        Subcategory of {parent?.name || 'Unknown'}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {(subcategoriesByCategory[String(category.id)] || []).length} linked subcategories
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'navbar_group',
              label: 'Navbar Group',
              width: '20%',
              render: (category) => (
                <span className="text-xs font-medium text-slate-600">
                  {category.navbar_group || <span className="text-slate-300 italic">None</span>}
                </span>
              ),
            },
            {
              key: 'children',
              label: 'Hierarchy Details',
              width: '25%',
              render: (category) => {
                if (category.parent) return <span className="text-xs text-slate-400 italic">Leaf Node</span>;
                const linked = subcategoriesByCategory[String(category.id)] || [];
                return (
                  <p className="text-xs leading-relaxed text-slate-500 italic">
                    {linked.length ? linked.map((item) => item.name).join(', ') : 'No subcategories linked'}
                  </p>
                );
              },
            },
            {
              key: 'actions',
              label: 'Actions',
              width: '28%',
              cellClassName: 'text-right min-w-[240px]',
              render: (category) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(category)}
                    className="admin-btn-secondary !min-h-[38px] !rounded-xl !px-3 !py-1.5 !text-[10px] !font-black !uppercase !tracking-wider"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(!!category.parent, category.parent, category)}
                    className="admin-btn-secondary !min-h-[38px] !rounded-xl !px-3 !py-1.5 !text-[10px] !font-black !uppercase !tracking-wider"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(true, category.id)}
                    className="admin-btn-secondary !min-h-[38px] !rounded-xl !px-3 !py-1.5 !text-[10px] !font-black !uppercase !tracking-wider"
                    title={`Add subcategory to ${category.name}`}
                  >
                    Add Sub
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    className="admin-btn-danger !min-h-[38px] !rounded-xl !px-3 !py-1.5 !text-[10px] !font-black !uppercase"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={getTopLevelCategories(categories)}
          emptyText="No categories available."
          minWidthClassName="min-w-[1000px]"
        />
      ) : (
        <AdminDataTable
          tableFixed
          columns={[
            {
              key: 'group',
              label: 'Navbar Group',
              width: '30%',
              render: (group) => (
                <p className="font-bold text-slate-950 uppercase tracking-tight">{group.name}</p>
              )
            },
            {
              key: 'categories',
              label: 'Assigned Items',
              width: '45%',
              render: (group) => (
                <div className="flex flex-wrap gap-2">
                  {group.categories.map(cat => (
                    <span key={cat.id} className="inline-flex items-center rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {cat.name}
                    </span>
                  ))}
                  {group.brands.map(brand => (
                    <span key={brand.id} className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {brand.name} (Brand)
                    </span>
                  ))}
                </div>
              )
            },
            {
              key: 'stats',
              label: 'Depth',
              width: '25%',
              render: (group) => (
                <p className="text-xs text-slate-500 italic">
                  {group.categories.length} parents, {group.totalSubcategories} total children
                </p>
              )
            }
          ]}
          rows={(() => {
            const grouped = categories.reduce((acc, cat) => {
              if (isTopLevelCategory(cat)) {
                const group = cat.navbar_group || 'Unassigned / Standalone';
                if (!acc[group]) acc[group] = [];
                acc[group].push(cat);
              }
              return acc;
            }, {} as Record<string, any[]>);

            // Explicitly ensure 'Top Brands' shows up if we have brands
            if (!grouped['Top Brands']) grouped['Top Brands'] = [];

            return (Object.entries(grouped) as [string, any[]][]).map(([name, cats]) => ({
              name,
              categories: cats,
              brands: name === 'Top Brands' ? brands : [],
              totalSubcategories: cats.reduce((sum, cat) => sum + (subcategoriesByCategory[String(cat.id)] || []).length, 0)
            }));
          })()}
          emptyText="No navbar groups defined."
          minWidthClassName="min-w-[800px]"
        />
      )}

      <CategoryModal
        open={modalOpen}
        title={selectedCategory ? "Edit Category" : "Add Category"}
        description={selectedCategory ? "Modify category details and navbar group." : "Add a top-level category or a subcategory to organize your products."}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        submitting={saving}
        categories={categories}
        brands={brands}
        category={selectedCategory}
        error={categorySaveError}
        metadata={categoryMetadata}
        initialIsSubcategory={modalConfig.isSub}
        initialParentId={modalConfig.parentId}
      />

      <CategoryDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onAddSub={(category) => {
          setDetailModalOpen(false);
          openModal(true, category.id);
        }}
        onEditSub={(sub) => {
          setDetailModalOpen(false);
          openModal(true, sub.parent, sub);
        }}
        onDeleteSub={(sub) => {
          setDetailModalOpen(false);
          handleDelete(sub);
        }}
        category={selectedCategory}
        subcategories={selectedCategory ? (subcategoriesByCategory[String(selectedCategory.id)] || []) : []}
      />
    </div>
  );
}

export default AdminCategoriesPage;
