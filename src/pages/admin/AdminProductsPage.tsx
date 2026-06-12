import { useEffect, useState, useRef } from 'react';
import { Check, Edit2, X, Eye, Trash2 } from 'lucide-react';
import { getCategoryName, getApiErrorMessage, getNormalizedApiError, getBrandName, resolveAssetUrl, getEntityId } from '@/services';
import { getCatalogData, fetchAllPages, api, normalizeProduct } from '@/services';
import {
  createProduct,
  updateProduct,
  patchProduct,
  bulkUploadProducts,
  deleteProduct,
  getProductMetadata,
  syncProductSpecifications,
  deleteProductImage,
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
      
      const rawList = await fetchAllPages(api, '/products/products/', { include_inactive: 'true', page_size: 100 });
      const productList = rawList
        .map((p: any) => normalizeProduct(p, {
          categories: catalogData.categories,
          subcategories: catalogData.subcategories,
          brands: catalogData.brands,
        }))
        .filter(Boolean);

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
    // Keep `images` inside productPayload so buildProductPayload can process new file uploads.
    // Read it separately only for deletion diffing.
    const { specifications = [], ...productPayload } = payload;
    const images: any[] = Array.isArray(payload.images) ? payload.images : [];
    try {
      let savedProduct: any;
      if (activeProduct) {
        // Compute which existing image IDs were removed by the user
        const originalIds = (Array.isArray(activeProduct.images) ? activeProduct.images : [])
          .map((img: any) => img?.id)
          .filter(Boolean)
          .map(String);
        const keptIds = new Set(
          images
            .filter((img: any) => img.id && !(img.image instanceof File))
            .map((img: any) => String(img.id))
        );
        const deletedIds = originalIds.filter((id) => !keptIds.has(id));

        savedProduct = await updateProduct(activeProduct.id, productPayload, { categories, subcategories, brands });
        setProducts((current) => mergeProductIntoList(current, savedProduct));
        showToast({ title: 'Product updated', message: `${savedProduct.name} was updated.` });

        // Delete removed images (non-fatal)
        if (deletedIds.length > 0) {
          await Promise.allSettled(deletedIds.map((id) => deleteProductImage(id)));
        }
      } else {
        savedProduct = await createProduct(productPayload, { categories, subcategories, brands });
        setProducts((current) => mergeProductIntoList(current, savedProduct));
        showToast({ title: 'Product created', message: `${savedProduct.name} was added to the catalog.` });
      }

      // Sync specifications via dedicated endpoint
      const productId = savedProduct?.id ?? activeProduct?.id;
      if (productId) {
        await syncProductSpecifications(productId, specifications).catch(() => {
          // Spec sync failure is non-fatal — product was saved successfully
          showToast({ title: 'Specs sync warning', message: 'Product saved but specifications could not be synced.', type: 'warning' });
        });
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

  const handleExportExcel = async () => {
    if (products.length === 0) {
      showToast({ title: 'No products', message: 'There are no products to export.', type: 'error' });
      return;
    }

    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Products');

      // Define headers
      const headers = [
        'ID', 'Name', 'Description', 'Brand', 'Category', 'Subcategory', 'Price', 'Currency', 'Stock', 'SKU', 'MPN', 'Images', 'First Image URL'
      ];
      ws.addRow(headers);

      // Add rows
      for (const p of products) {
        const brand = p.brand_name || p.brandName || getBrandName(p.brand, brands) || '';
        const category = p.category_name || getCategoryName(p.category, categories) || '';
        const subcategory = p.subcategory_name || p.subcategory || p.subcategoryData?.name || '';
        const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : (p.product_image ? [p.product_image] : []));
        const imageUrls = images.map(img => {
          if (!img) return '';
          if (typeof img === 'string') return img;
          return img?.image || img?.url || img?.image_url || img?.src || '';
        }).filter(Boolean);

        const rowValues = [
          p.id,
          p.name,
          p.description || p.long_description || '',
          brand,
          category,
          subcategory,
          p.price ?? '',
          p.currency || '',
          p.stock ?? '',
          p.sku || '',
          p.mpn || '',
          imageUrls.join(' '),
          imageUrls[0] || ''
        ];

        ws.addRow(rowValues);
      }

      // Attempt to embed first image per-row (best-effort; external URLs need fetch).
      // We'll fetch image binary data and add it to workbook; ignore failures.
      const rows = ws.getRows(2, products.length) || [];
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : (p.product_image ? [p.product_image] : []));
        const firstUrl = images && images.length ? (typeof images[0] === 'string' ? images[0] : (images[0]?.image || images[0]?.url || images[0]?.image_url || images[0]?.src)) : null;
        if (!firstUrl) continue;
        try {
          const res = await fetch(firstUrl);
          if (!res.ok) continue;
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const ext = ((blob.type || 'image/png').split('/')[1] || 'png') as 'png' | 'jpeg' | 'gif';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imageId = wb.addImage({ buffer: new Uint8Array(arrayBuffer) as any, extension: ext });
          const rowNumber = 2 + i;
          ws.addImage(imageId, {
            tl: { col: 12, row: rowNumber - 1 },
            ext: { width: 120, height: 90 }
          });
        } catch (err) {
          // ignore image embedding errors
        }
      }

      // Auto-width columns
      ws.columns.forEach((col) => {
        col.width = Math.min(40, Math.max(12, (col.header || '').toString().length + 6));
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast({ title: 'Export complete', message: 'Product catalog exported to Excel.' });
    } catch (err) {
      showToast({ title: 'Export failed', message: getApiErrorMessage(err, 'Unable to export to Excel'), type: 'error' });
    }
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
              onClick={() => handleExportExcel()}
              className="admin-btn-secondary max-sm:w-full !text-[11px]"
              title="Export products to Excel (includes first image URL and embeds image when available)"
            >
              Export Excel
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
