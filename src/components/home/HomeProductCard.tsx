import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import placeholder from '@/assets/placeholder.jpg';

function HomeProductCard({ product }) {
  if (!product) return null;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_40px_rgba(251,198,29,0.14)]"
    >
      {/* Image area */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="aspect-[4/3] p-4 sm:p-5">
          <img
            src={product.image || placeholder}
            alt={product.name}
            onError={(e) => { e.currentTarget.src = placeholder; }}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {product.isNew && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-textMain shadow-sm">
              New
            </span>
          )}
          {product.featured && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
              Featured
            </span>
          )}
        </div>

        {product.topSelling && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-textMain px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
            Top
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
        {/* Brand + type row */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className="truncate text-[10px] font-black uppercase tracking-wider text-primary">
            {product.brandName || product.brand || '—'}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
            {product.category || product.productType || ''}
          </span>
        </div>

        {/* Product name */}
        <h4 className="line-clamp-2 text-sm font-bold leading-snug text-textMain transition-colors group-hover:text-primary">
          {product.name}
        </h4>

        {/* MPN / SKU */}
        <div className="mt-auto rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MPN</span>
            <span className="truncate text-right text-[10px] font-semibold text-slate-700">{product.mpn || 'N/A'}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</span>
            <span className="truncate text-right text-[10px] font-semibold text-slate-700">{product.sku || 'N/A'}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex min-h-[40px] w-full items-center justify-between rounded-xl bg-textMain px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all duration-200 group-hover:bg-primary group-hover:text-textMain sm:min-h-[42px]">
          <span>View Details</span>
          <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

export default memo(HomeProductCard);
