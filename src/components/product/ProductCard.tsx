import { memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Heart } from 'lucide-react';
import placeholder from '../../assets/placeholder.jpg';
import { formatCurrency, showToast } from '../../utils/helpers';
import { getApiErrorMessage, resolveAssetUrl, authService } from '@/services';
import { useWishlist } from '@/hooks/useWishlist';

function ProductCard({ product, viewMode = 'grid' }) {
  const isListView = viewMode === 'list';
  const detailPath = `/products/${product.id}`;
  const mainImage = resolveAssetUrl(product.images?.[0]?.image || product.image || placeholder) ?? '';
  const wishlist = useWishlist();
  const isWishlisted = wishlist?.isWishlisted(product.id) || false;
  const navigate = useNavigate();
  const location = useLocation();

  const handleImageError = (e) => { e.currentTarget.src = placeholder; };

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!wishlist) return;

    if (!authService.isAuthenticated() && !isWishlisted) {
      showToast({
        title: 'Authentication Required',
        message: 'Please sign in to save items to your wishlist.',
        type: 'info'
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      const wasWishlisted = wishlist.isWishlisted(product.id);
      await wishlist.toggleWishlist(product.id);
      showToast({
        title: wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
        message: wasWishlisted
          ? `${product.name} was removed from your saved items.`
          : `${product.name} was saved to your wishlist.`,
      });
    } catch (error) {
      showToast({ title: 'Wishlist error', message: getApiErrorMessage(error, 'Unable to update wishlist'), type: 'error' });
    }
  };

  const WishlistBtn = () => (
    <button
      type="button"
      onClick={handleWishlistToggle}
      className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-all sm:h-10 sm:w-10 ${
        isWishlisted
          ? 'border-primary bg-primary text-textMain shadow-primary/25'
          : 'border-white/80 bg-white/90 text-slate-400 backdrop-blur-sm hover:border-primary hover:bg-primary hover:text-textMain'
      }`}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart size={15} className={isWishlisted ? 'fill-textMain' : ''} />
    </button>
  );

  const Badges = ({ stack = false }) => (
    <div className={`absolute left-3 top-3 flex gap-1 ${stack ? 'flex-col' : 'flex-row flex-wrap'}`}>
      {product.featured && (
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-textMain shadow-sm">
          Featured
        </span>
      )}
      {product.topSelling && (
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
          Top
        </span>
      )}
      {product.isNew && (
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary shadow-sm">
          New
        </span>
      )}
    </div>
  );

  /* ── LIST VIEW ── */
  if (isListView) {
    return (
      <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)]">
        <WishlistBtn />
        <Link to={detailPath} className="block">
          <div className="flex flex-col sm:flex-row">
            {/* Image */}
            <div className="relative flex h-48 w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-white p-5 sm:h-auto sm:w-56 sm:p-6 lg:w-64">
              <img
                src={mainImage}
                alt={product.name}
                onError={handleImageError}
                className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
              <Badges stack />
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6 lg:p-7">
              <div className="space-y-3">
                {/* Brand + category */}
                <div className="flex flex-wrap items-center gap-2">
                  {(product.brandName || product.brand) ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {product.brandName || product.brand}
                    </span>
                  ) : null}
                  {(product.brandName || product.brand) && product.categoryName ? (
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                  ) : null}
                  {product.categoryName ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {product.categoryName}
                    </span>
                  ) : null}
                </div>

                {/* Name */}
                <h3 className="text-[17px] font-bold leading-snug tracking-tight text-textMain transition-colors group-hover:text-primary sm:text-xl">
                  {product.name}
                </h3>

                {/* MPN / SKU chips */}
                <div className="flex flex-wrap gap-2">
                  {product.mpn && (
                    <span className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                      MPN: <span className="text-slate-800">{product.mpn}</span>
                    </span>
                  )}
                  {product.sku && (
                    <span className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                      SKU: <span className="text-slate-800">{product.sku}</span>
                    </span>
                  )}
                </div>

                {/* Price */}
                {product.price ? (
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">B2B Rate</span>
                    <p className="mt-0.5 text-2xl font-black tracking-tighter text-textMain">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* CTA */}
              <div>
                <div className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl bg-textMain px-5 text-[10px] font-black uppercase tracking-widest text-white transition-all duration-200 group-hover:bg-primary group-hover:text-textMain sm:min-h-[48px]">
                  View Details
                  <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  /* ── GRID VIEW ── */
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)]">
      <WishlistBtn />
      <Link to={detailPath} className="flex h-full flex-col">
        {/* Image */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-white">
          <div className="aspect-square p-4 sm:aspect-[4/3] sm:p-5">
            <img
              src={mainImage}
              alt={product.name}
              onError={handleImageError}
              className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
              decoding="async"
            />
          </div>
          <Badges />
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          {/* Brand */}
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {product.brandName || product.brand || ''}
          </p>

          {/* Name */}
          <h3 className="line-clamp-2 text-[14px] font-bold leading-snug tracking-tight text-textMain transition-colors group-hover:text-primary sm:text-[15px]">
            {product.name}
          </h3>

          {/* MPN / SKU */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MPN</span>
                <span className="max-w-[60%] truncate text-right text-[11px] font-semibold text-slate-700">{product.mpn || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</span>
                <span className="max-w-[60%] truncate text-right text-[11px] font-semibold text-slate-700">{product.sku || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Price */}
          {product.price ? (
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">B2B Rate</span>
              <p className="mt-0.5 text-lg font-black tracking-tighter text-textMain sm:text-xl">
                {formatCurrency(product.price)}
              </p>
            </div>
          ) : null}

          {/* CTA */}
          <div className="mt-auto flex min-h-[40px] w-full items-center justify-between rounded-xl bg-textMain px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all duration-200 group-hover:bg-primary group-hover:text-textMain sm:min-h-[44px]">
            <span>View Details</span>
            <ArrowRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </article>
  );
}

export default memo(ProductCard);
