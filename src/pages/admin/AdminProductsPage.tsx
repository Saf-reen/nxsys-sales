import { useEffect, useState, useRef } from 'react';
import { Check, Edit2, X, Eye, Trash2 } from 'lucide-react';
import { getCategoryName, getApiErrorMessage, getNormalizedApiError, getBrandName, resolveAssetUrl, getEntityId } from '@/services';
import { getCatalogData } from '@/services';
import {
  createProduct,
  getProducts,
  updateProduct,
  patchProduct,
  bulkUploadProducts,
  deleteProduct,
  getProductMetadata,
} from '@/services';
import { showToast } from '@/utils/helpers';
import AdminDataTable from '@/components/admin/AdminDataTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ProductEditorModal from '@/components/admin/ProductEditorModal';
import ProductDetailsModal from '@/components/admin/ProductDetailsModal';
import { getTopLevelCategories } from '@/utils/adminUtils';

const mergeProductIntoList = (currentProducts, nextProduct) => {
  const nextId = String(nextProduct?.id || '');
  const currentIndex = currentProducts.findIndex((product) => String(product.id) === nextId);

  if (currentIndex === -1) {
    return [...currentProducts, nextProduct];
  }

  return currentProducts.map((product, index) => (index === currentIndex ? nextProduct : product));
};

function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [productFlags, setProductFlags] = useState<any[]>([]);
  const [productMetadata, setProductMetadata] = useState<any>(null);
  const [saveError, setSaveError] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFilesInputRef = useRef<HTMLInputElement>(null);

  const loadCatalog = async () => {
    setLoading(true);
    setError('');
    try {
      let catalogData = { 
        categories: [], 
        subcategories: [], 
        subcategoriesByCategory: {}, 
        brands: [],
        productFlags: []
      };
      try {
        catalogData = await getCatalogData() as any;
      } catch {
        // Keep the product table available even if catalog metadata is temporarily unavailable.
      }
      
      const productList = await getProducts({
        categories: catalogData.categories,
        subcategories: catalogData.subcategories,
        brands: catalogData.brands,
      });

      setCategories(catalogData.categories);
      setSubcategories(catalogData.subcategories);
      setSubcategoriesByCategory(catalogData.subcategoriesByCategory);
      setProducts(productList);
      setBrands(Array.isArray(catalogData.brands) ? catalogData.brands : []);
      setProductFlags(catalogData.productFlags || []);
      try {
        const metadata = await getProductMetadata();
        setProductMetadata(metadata);
      } catch {
        // Fallback or ignore if OPTIONS not supported
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const topLevelCategories = getTopLevelCategories(categories);
  const visibleProducts = products.filter((product) => {
    const matchesQuery = [product.name, product.brandName || getBrandName(product.brand, brands), product.subcategory]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
    const matchesCategory =
      categoryFilter === 'all' ||
      String(product.category?.id || product.category) === String(categoryFilter);
    return matchesQuery && matchesCategory;
  });

  const openAdd = () => {
    setSaveError(null);
    setActiveProduct(null);
    setEditorOpen(true);
  };

  const openEdit = (product) => {
    setSaveError(null);
    setActiveProduct(product);
    setEditorOpen(true);
  };

  const openView = (product) => {
    setViewProduct(product);
    setDetailsOpen(true);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (activeProduct) {
        const updatedProduct = await updateProduct(activeProduct.id, payload, { categories, subcategories, brands });
        setProducts((current) => mergeProductIntoList(current, updatedProduct));
        showToast({ title: 'Product updated', message: `${updatedProduct.name} was updated.` });
      } else {
        const createdProduct = await createProduct(payload, { categories, subcategories, brands });
        setProducts((current) => mergeProductIntoList(current, createdProduct));
        showToast({ title: 'Product created', message: `${createdProduct.name} was added to the catalog.` });
      }
      setEditorOpen(false);
      setActiveProduct(null);
      setSaveError(null);
    } catch (err) {
      const errorData = getNormalizedApiError(err, { fallbackMessage: 'Product save failed' });
      setSaveError(errorData);
      showToast({
        title: 'Unable to save product',
        message: errorData.message,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (product) => {
    const nextStatus = !product.is_active;
    const action = nextStatus ? 'activate' : 'deactivate';
    const confirmed = window.confirm(`${nextStatus ? 'Activate' : 'Deactivate'} product "${product.name}"?`);
    if (!confirmed) return;

    try {
      const updatedProduct = await patchProduct(product.id, { is_active: nextStatus });
      setProducts((current) => mergeProductIntoList(current, updatedProduct));
      showToast({ 
        title: `Product ${nextStatus ? 'Activated' : 'Deactivated'}`, 
        message: `${product.name} is now ${nextStatus ? 'visible' : 'hidden'} in the store.` 
      });
    } catch (err) {
      showToast({
        title: `Unable to ${action} product`,
        message: getApiErrorMessage(err, `Failed to ${action} product`),
        type: 'error',
      });
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete the product "${product.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteProduct(product.id);
      setProducts((current) => current.filter((p) => String(p.id) !== String(product.id)));
      showToast({ title: 'Product deleted', message: `${product.name} was removed from the catalog.` });
    } catch (err) {
      showToast({
        title: 'Unable to delete product',
        message: getApiErrorMessage(err, 'Failed to delete product'),
        type: 'error',
      });
    }
  };

  const handleExport = () => {
    if (products.length === 0) {
      showToast({ title: 'No products', message: 'There are no products to export.', type: 'error' });
      return;
    }

    const headers = ['ID', 'Name', 'Brand', 'Category', 'Subcategory', 'Price', 'Stock', 'SKU'];
    const csvRows = products.map(p => [
      p.id,
      p.name,
      p.brandName || getBrandName(p.brand, brands),
      getCategoryName(p.category, categories),
      p.subcategory || p.subcategoryData?.name || 'Standard',
      p.price,
      p.stock,
      p.sku || ''
    ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast({ title: 'Export complete', message: 'Product catalog exported to CSV.' });
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleImageFilesClick = () => imageFilesInputRef.current?.click();

  const handleImageFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length) setImageFiles(files);
    event.target.value = '';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    try {
      const result = await bulkUploadProducts(file, imageFiles, (progress) => setImportProgress(progress));
      const successful: number = result?.successful ?? 0;
      const failed: number = result?.failed ?? 0;
      const warnings: string[] = result?.warnings ?? [];

      if (failed > 0 || warnings.length > 0) {
        const preview = warnings.slice(0, 3).join(' • ');
        const more = warnings.length > 3 ? ` … and ${warnings.length - 3} more` : '';
        showToast({
          title: `Imported ${successful}, failed ${failed}`,
          message: preview + more,
          type: failed > 0 ? 'error' : 'warning',
        });
      } else {
        showToast({ title: 'Import successful', message: `${successful} products imported.` });
      }
      loadCatalog();
    } catch (err) {
      showToast({
        title: 'Import failed',
        message: getApiErrorMessage(err, 'Failed to import products'),
        type: 'error',
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImageFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="text-lg font-semibold text-rose-900">Unable to load products</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog management"
        title={`Products (${products.length})`}
        description="Create, edit, delete, and enrich products with visuals, technical specs, inventory, and merchandising flags."
        action={
          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".xlsx, .xls, .csv"
            />
            <input
              type="file"
              ref={imageFilesInputRef}
              onChange={handleImageFilesChange}
              className="hidden"
              accept="image/*"
              multiple
            />
            <a
              href="/bulk_product_upload_sample.xlsx"
              download
              className="admin-btn-secondary max-sm:w-full !text-[11px]"
            >
              Sample Excel
            </a>
            <button
              type="button"
              onClick={handleExport}
              className="admin-btn-secondary max-sm:w-full !text-[11px]"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleImageFilesClick}
              className="admin-btn-secondary max-sm:w-full !text-[11px]"
              title="Select product images to attach during bulk import"
            >
              {imageFiles.length > 0 ? `${imageFiles.length} Image${imageFiles.length !== 1 ? 's' : ''} Selected` : 'Add Images'}
            </button>
            <button
              type="button"
              disabled={isImporting}
              onClick={handleImportClick}
              className="admin-btn-secondary max-sm:w-full !text-[11px] min-w-[120px] relative overflow-hidden"
            >
              {isImporting && (
                <div 
                  className="absolute inset-0 bg-primary/10 transition-all duration-300 ease-out" 
                  style={{ width: `${importProgress}%` }}
                />
              )}
              <span className="relative z-10">
                {isImporting 
                  ? importProgress < 100 
                    ? `Uploading ${importProgress}%` 
                    : 'Processing...' 
                  : 'Import Products'}
              </span>
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="admin-btn-primary max-sm:w-full"
            >
              Add product
            </button>
          </div>
        }
      />

      <div className="surface-panel grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <label className="field-stack">
          <span className="text-sm font-semibold text-slate-700">Search products</span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product name, brand, or subcategory"
            className="admin-control"
          />
        </label>
        <label className="field-stack">
          <span className="text-sm font-semibold text-slate-700">Category filter</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="admin-control"
          >
            <option value="all">All categories</option>
            {topLevelCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AdminDataTable
        tableFixed
        columns={[
          {
            key: 'product',
            label: 'Product Info',
            width: '45%',
            cellClassName: 'min-w-[300px]',
            render: (product) => {
              const displayImage = product.image || product.product_image || product.images?.[0];
              return (
                <div className="flex min-w-0 items-start gap-4 pr-4">
                  {displayImage ? (
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[18px] border border-slate-100 bg-white p-1">
                      <img
                        src={resolveAssetUrl(typeof displayImage === 'string' ? displayImage : (displayImage?.image || displayImage?.url || displayImage?.image_url)) ?? undefined}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-300 border border-slate-100">
                      N/A
                    </div>
                  )}
                  <div className="min-w-0 pt-1">
                    <p className="font-semibold text-slate-950 leading-relaxed truncate">{product.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {product.brand_name || product.brandName || getBrandName(product.brand, brands) || 'Generic'}
                      </span>
                      <span className="text-[10px] text-slate-300">|</span>
                      <span className="text-[10px] font-mono font-medium text-slate-500">{product.sku || 'No SKU'}</span>
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: 'category',
            label: 'Category',
            width: '25%',
            render: (product) => (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-950 uppercase tracking-wider">
                  {product.category_name || getCategoryName(product.category, categories)}
                </p>
                {product.subcategory_name && (
                  <p className="mt-1 truncate text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                    {product.subcategory_name}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            width: '15%',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (product) => (
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                product.is_active 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'actions',
            label: 'Actions',
            width: '100px',
            cellClassName: 'text-right',
            render: (product) => (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openView(product)}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="View details"
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(product)}
                  className="p-2 text-slate-400 hover:text-sky-600 transition-colors"
                  title="Edit product"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(product)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    product.is_active ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                  title={product.is_active ? 'Deactivate product' : 'Activate product'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      product.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(product)}
                  className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                  title="Delete product"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
        rows={visibleProducts}
        emptyText="No products match the current filters."
        minWidthClassName="min-w-[1100px]"
      />

      <ProductEditorModal
        open={editorOpen}
        product={activeProduct}
        products={products}
        categories={categories}
        subcategoriesByCategory={subcategoriesByCategory}
        brands={brands}
        setBrands={setBrands}
        productFlags={productFlags}
        submitting={saving}
        error={saveError}
        metadata={productMetadata}
        onClose={() => {
          setEditorOpen(false);
          setActiveProduct(null);
          setSaveError(null);
        }}
        onSubmit={handleSave}
      />

      <ProductDetailsModal
        open={detailsOpen}
        product={viewProduct}
        onClose={() => {
          setDetailsOpen(false);
          setViewProduct(null);
        }}
      />
    </div>
  );
}

export default AdminProductsPage;
