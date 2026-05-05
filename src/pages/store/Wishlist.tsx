import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Loader2, ChevronRight } from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ProductGrid from '@/components/product/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { useWishlist } from '@/hooks/useWishlist';
import { authService } from '@/services';

function Wishlist() {
  const { products = [], loading: productsLoading = false, error: productsError = '' } = useProducts() ?? {};
  const wishlist = useWishlist();
  const productIds = wishlist?.productIds || [];
  const wishlistProducts = products.filter((product) => productIds.includes(String(product.id)));
  const missingCount = Math.max(productIds.length - wishlistProducts.length, 0);
  const loading = productsLoading || wishlist?.loading;
  const isAuthenticated = authService.isAuthenticated();

  return (
    <div className="min-h-screen bg-slate-50/30">
      <Breadcrumbs items={[{ label: 'Wishlist', active: true }]} />
      
      <div className="container-shell pb-16 pt-10 sm:pt-14 lg:pb-24">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <div className="h-1 w-5 rounded-full bg-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Saved Catalog</p>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-textMain sm:text-4xl">Wishlist</h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-500">
            {isAuthenticated
              ? 'Your saved products are synced to your account.'
              : 'Your wishlist is saved on this device. Sign in to sync it across sessions.'}
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-textMain px-6 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-black shrink-0"
        >
          Browse Products
          <ArrowRight size={14} className="text-primary" />
        </Link>
      </div>

      {/* Error banners */}
      {wishlist?.error && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[13px] font-semibold text-amber-800">
          {wishlist.error}
        </div>
      )}

      {productsError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-12 text-center">
          <p className="text-lg font-black tracking-tight text-rose-700">Unable to load wishlist products</p>
          <p className="mx-auto mt-3 max-w-xl text-[13px] text-rose-600">{productsError}</p>
        </div>
      ) : loading ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading wishlist…</p>
        </div>
      ) : wishlistProducts.length ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-[13px] font-bold text-slate-700">
              {wishlistProducts.length} saved product{wishlistProducts.length === 1 ? '' : 's'}
            </p>
            {missingCount ? (
              <p className="text-[11px] font-medium text-slate-400">
                {missingCount} item{missingCount === 1 ? '' : 's'} no longer in catalog.
              </p>
            ) : null}
          </div>
          <ProductGrid products={wishlistProducts} />
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-24 text-center shadow-[0_8px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Heart size={28} className="text-slate-300" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-textMain">No saved products yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-slate-500">
            Tap the heart on any product card to build a shortlist for later.
          </p>
          <Link
            to="/products"
            className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full bg-primary px-8 text-[11px] font-black uppercase tracking-widest text-textMain transition-opacity hover:opacity-90"
          >
            Explore Catalog
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}

export default Wishlist;
