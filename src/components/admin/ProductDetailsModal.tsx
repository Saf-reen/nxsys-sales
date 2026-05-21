import React, { useEffect, useState } from 'react';
import { X, Package, Shield, Truck, Hash, BarChart, Info } from 'lucide-react';
import AdminModal from './AdminModal';
import { resolveAssetUrl, getProductSpecifications } from '@/services';
import type { Product, Category, Subcategory } from '@/types';

interface ProductDetailsModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ open, product, onClose }) => {
  const [fetchedSpecs, setFetchedSpecs] = useState<any[]>([]);

  useEffect(() => {
    if (open && product && product.id) {
      getProductSpecifications(product.id).then((specs: any) => {
        let raw = Array.isArray(specs) ? specs : (specs?.results || specs?.items || []);
        
        if (raw.length > 0 && (raw[0].specs || raw[0].specifications || raw[0].items)) {
          const flattened: any[] = [];
          raw.forEach((group: any) => {
            const items = group.specs || group.specifications || group.items || [];
            items.forEach((item: any) => {
              flattened.push({ ...item, section: group.section || group.category || item.section || 'General' });
            });
          });
          raw = flattened;
        }

        setFetchedSpecs(raw);
      }).catch(() => setFetchedSpecs([]));
    } else {
      setFetchedSpecs([]);
    }
  }, [open, product]);

  if (!product) return null;

  const images = Array.isArray(product.images) 
    ? product.images 
    : [product.product_image || product.image].filter(Boolean);

  const specs = fetchedSpecs.length > 0 ? fetchedSpecs : (product.specification_records || product.specifications || []);

  // Group specifications by section
  const rawGroupedSpecs = Array.isArray(specs) ? specs.reduce<Record<string, any[]>>((acc, s: any) => {
    const val = typeof s.value === 'string' ? s.value.trim() : s.value;
    if (val !== undefined && val !== null && val !== '' && val !== '-' && val !== '—') {
      const section = s.section || s.category || 'General';
      if (!acc[section]) acc[section] = [];
      acc[section].push(s);
    }
    return acc;
  }, {}) : {};

  // Prepend MPN / SKU as an "Identification" section
  const groupedSpecs: Record<string, any[]> = {};
  const idItems: any[] = [];
  if (product.mpn) idItems.push({ key: 'MPN', value: product.mpn });
  if (product.sku) idItems.push({ key: 'SKU', value: product.sku });
  if (idItems.length) groupedSpecs['Identification'] = idItems;
  Object.assign(groupedSpecs, rawGroupedSpecs);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Product Details"
      description="Viewing detailed information for this product from the catalog."
      size="xl"
    >
      <div className="space-y-8 pb-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Main Image */}
          <div className="h-64 w-full shrink-0 overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 lg:w-64">
            <img
              src={resolveAssetUrl(product.product_image || product.image) || ''}
              alt={product.name}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {product.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Inactive</span>
                )}
                {product.featured && (
                   <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Featured</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-950">{product.name}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500 uppercase tracking-widest">
                {product.brand_name || product.brandName || (typeof product.brand === 'object' ? (product.brand as any)?.name : product.brand) || 'Generic Brand'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {product.stock != null && product.stock !== '' && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{product.stock} units</p>
                </div>
              )}
              {product.price != null && product.price !== '' && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">₹{product.price}</p>
                </div>
              )}
              {product.sku && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 truncate">{product.sku}</p>
                </div>
              )}
              {product.mpn && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">MPN</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 truncate">{product.mpn}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Highlights Section */}
        {product.highlights && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <BarChart size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Product Highlights</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(product.highlights) 
                ? product.highlights 
                : String(product.highlights).split('|').map(h => h.trim())
              ).map((highlight, idx) => (
                <span key={idx} className="inline-flex items-center rounded-lg bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 border border-sky-100">
                  {highlight}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Description Section */}
        {product.description && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Info size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Description</h3>
            </div>
            <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
              {product.description}
            </div>
          </section>
        )}

        {/* Taxonomy Section */}
        <div className="grid gap-6 md:grid-cols-2">
           <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Package size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Taxonomy</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-900">
                  {product.category_name || (typeof product.category === 'object' ? (product.category as Category)?.name : product.category || 'N/A')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subcategory</span>
                <span className="font-semibold text-slate-900">
                  {product.subcategory_name || (typeof product.subcategory === 'object' 
                    ? (product.subcategory as Subcategory)?.name 
                    : (product.subcategory || product.subcategoryData?.name || 'Standard'))}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Merchandising</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge label="Featured" active={product.featured} />
              <Badge label="Top Selling" active={product.top_selling || product.topSelling} />
              <Badge label="New Arrival" active={product.new_arrival || product.isNew} />
            </div>
          </section>
        </div>

        {/* Specifications Section */}
        {Object.keys(groupedSpecs).length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Hash size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Technical Specifications</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(groupedSpecs).map(([section, items]) => (
                <div key={section} className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                  {/* Section header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <div className="h-3 w-[3px] rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{section}</span>
                    <span className="ml-auto text-[10px] font-bold text-slate-300">{items.length} fields</span>
                  </div>
                  {/* Rows */}
                  {(items as any[]).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex items-baseline justify-between gap-4 px-4 py-2.5 ${
                        idx !== items.length - 1 ? 'border-b border-slate-50' : ''
                      } ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
                    >
                      <span className="w-2/5 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {item.key || item.label}
                      </span>
                      <span className="w-3/5 text-right text-[12px] font-semibold text-slate-800">
                        {item.value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {images.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Package size={16} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Image Gallery</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {images.map((img: any, idx) => {
                const imageUrl = typeof img === 'string' ? img : (img?.image || img?.url || img?.image_url);
                return (
                  <div key={idx} className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2">
                    <img
                      src={resolveAssetUrl(imageUrl) || ''}
                      alt={`Gallery ${idx}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AdminModal>
  );
};

const Badge = ({ label, active }: { label: string; active?: boolean }) => (
  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
    active 
      ? 'border-primary/20 bg-primary/10 text-primary' 
      : 'border-slate-100 bg-slate-50 text-slate-300'
  }`}>
    {label}
  </span>
);

export default ProductDetailsModal;
