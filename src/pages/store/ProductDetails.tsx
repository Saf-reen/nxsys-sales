import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronRight, Heart, MessageSquare, Package, Star, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import ProductGallery from '@/components/product/ProductGallery';
import SpecificationsTable from '@/components/product/SpecificationsTable';
import { useProducts } from '@/hooks/useProducts';
import RequestPriceModal from '@/components/product/RequestPriceModal';
import placeholder from '@/assets/placeholder.jpg';
import { getBrandName, getCategoryName, catalogApi as productService, getApiErrorMessage, resolveAssetUrl } from '@/services';
import { slugify, showToast, formatCurrency } from '@/utils';
import { authService } from '@/services';
import { rfqIntentService } from '@/services';
import ProductReviews from '@/components/reviews/ProductReviews';
import { useWishlist } from '@/hooks/useWishlist';

const hasRenderableProductData = (candidate: any) =>
  Boolean(
    candidate &&
    (candidate.description ||
      (Array.isArray(candidate.images) && candidate.images.length > 0) ||
      (Array.isArray(candidate.specifications) && candidate.specifications.length > 0)),
  );

const TRUST_BADGES = [
  { Icon: ShieldCheck, label: 'Verified Seller',  color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { Icon: Truck,       label: 'Quick Dispatch',   color: 'text-blue-500',    bg: 'bg-blue-50'    },
  { Icon: BadgeCheck,  label: 'Genuine Product',  color: 'text-amber-500',   bg: 'bg-amber-50'   },
];

function ProductDetails({ productIdOverride = null }: { productIdOverride?: any }) {
  const params = useParams();
  const id = productIdOverride ?? params.id;
  const navigate = useNavigate();
  const location = useLocation();
  const {
    products = [],
    categories = [],
    subcategories = [],
    brands = [],
    loading: productsLoading = false,
    error: productsError = '',
  } = useProducts() ?? {};

  const [quantity, setQuantity] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState('');
  const [activeTab, setActiveTab] = useState('specifications');
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  const isAuthenticated = authService.isAuthenticated();
  const wishlist = useWishlist();
  const cachedProduct = useMemo(
    () => products.find((item) => String(item.id) === String(id)) || null,
    [products, id],
  );

  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      if (cachedProduct && isMounted) {
        setProduct(cachedProduct);
        setProductError('');
      }
      if (productsLoading && !cachedProduct) { setProductLoading(true); return; }
      if (hasRenderableProductData(cachedProduct)) { setProductLoading(false); return; }
      setProductLoading(true);
      setProductError('');
      try {
        const productData = await productService.getProductById(id, { categories, subcategories, brands });
        if (isMounted) setProduct(productData);
      } catch (error) {
        if (isMounted) {
          setProduct(null);
          setProductError(productsError || getApiErrorMessage(error, 'Failed to load product details'));
        }
      } finally {
        if (isMounted) setProductLoading(false);
      }
    };
    loadProduct();
    return () => { isMounted = false; };
  }, [brands, cachedProduct, categories, id, productsError, productsLoading, subcategories]);

  useEffect(() => {
    let isMounted = true;
    const loadSimilarProducts = async () => {
      if (!product?.id) { setSimilarProducts([]); return; }
      const apiSimilarProducts = await productService.getSimilarProducts(product.id, { categories, subcategories, brands });
      if (isMounted) setSimilarProducts(apiSimilarProducts);
    };
    loadSimilarProducts();
    return () => { isMounted = false; };
  }, [brands, categories, product?.id, subcategories]);

  useEffect(() => {
    if (!product) return;
    const pendingIntent = rfqIntentService.get();
    const shouldResumeIntent = isAuthenticated && pendingIntent && String(pendingIntent.productId) === String(id);
    if (shouldResumeIntent || (location.state?.openRFQ && isAuthenticated)) {
      if (pendingIntent?.quantity) setQuantity(Number(pendingIntent.quantity));
      setIsModalOpen(true);
      rfqIntentService.clear();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [id, location.pathname, location.state, navigate, product, isAuthenticated]);

  const handleRequestPrice = () => {
    if (isAuthenticated) {
      setIsModalOpen(true);
    } else {
      rfqIntentService.save({ productId: id, quantity, path: location.pathname });
      showToast({ title: 'Authentication Required', message: 'Please sign in to request pricing.' });
      navigate('/login', { state: { from: location, openRFQ: true } });
    }
  };

  const handleWishlistToggle = async () => {
    if (!product?.id || !wishlist) return;
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
      showToast({ title: 'Wishlist update failed', message: getApiErrorMessage(error, 'Unable to update wishlist'), type: 'error' });
    }
  };

  /* ── Loading ── */
  if (productLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 p-12">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Loading product…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (productError || !product) {
    return (
      <div className="container-shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-300">
          <Package size={40} />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {productError ? 'Something went wrong' : 'Product Not Found'}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-slate-500">
          {productError
            ? 'We had trouble loading this product. Please try again in a moment.'
            : "This product isn't available right now. It may have been removed or temporarily unlisted."}
        </p>
        <Link
          to="/products"
          className="mt-8 inline-flex items-center gap-2.5 rounded-full bg-primary px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-textMain transition-all hover:opacity-90 hover:shadow-[0_8px_24px_rgba(251,198,29,0.3)]"
        >
          Browse Catalog <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const categoryName = getCategoryName(product.category, categories);
  const galleryImages = product.images || [];
  const isWishlisted = wishlist?.isWishlisted(product.id) || false;
  const displayRating = Number(product.rating || 0);
  const stockQty = Number(product.stock ?? -1);
  const inStock = stockQty !== 0;

  const cleanHighlights = (() => {
    const raw = Array.isArray(product.highlights)
      ? product.highlights
      : typeof product.highlights === 'string'
        ? product.highlights.split('\n')
        : [];
    return raw.map((h: any) => String(h || '').replace(/^(?:[*-])\s*/, '').trim()).filter(Boolean);
  })();

  const relatedProducts = (Array.isArray(similarProducts) && similarProducts.length
    ? similarProducts
    : Array.isArray(products) ? products : [])
    .filter((item) => item && String(item.id) !== String(product?.id))
    .slice(0, 4);

  const breadcrumbItems = [
    { label: 'Catalog', path: '/products' },
    ...(categoryName ? [{ label: categoryName, path: `/products/${slugify(categoryName)}` }] : []),
    { label: product?.name || 'Product', active: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50/40 pb-24">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="container-shell mt-6 sm:mt-10 lg:mt-12">
        {/* ── 2-col layout ── */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">

          {/* Gallery */}
          <div className="rounded-[32px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_40px_rgba(15,23,42,0.07)] sm:p-8 lg:p-10">
            <ProductGallery images={galleryImages} alt={product.name} />
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-6">
            <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.07)] sm:p-8">

              {/* Brand + stock */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.36em] text-primary">
                  {product.brandName || getBrandName(product.brand, brands)}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                  inStock
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-600'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {inStock ? (stockQty > 0 ? `${stockQty} In Stock` : 'In Stock') : 'Out of Stock'}
                </span>
              </div>

              {/* Product name */}
              <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight text-textMain sm:text-3xl">
                {product.name}
              </h1>

              {/* Category + rating */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {categoryName && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {categoryName}
                  </span>
                )}
                {displayRating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={13} className={s <= Math.round(displayRating) ? 'fill-primary text-primary' : 'text-slate-200'} />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">{displayRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* MPN / SKU */}
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70">
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MPN</span>
                    <span className="text-[13px] font-bold text-slate-800">{product.mpn || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU</span>
                    <span className="text-[13px] font-bold text-slate-800">{product.sku || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              {product.price && (
                <div className="mt-6 flex items-baseline justify-between rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5">
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Best Price</span>
                  <span className="text-3xl font-black tracking-tighter text-textMain sm:text-4xl">
                    {formatCurrency(product.price)}
                  </span>
                </div>
              )}

              {/* Key highlights — only if they exist */}
              {cleanHighlights.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Key Highlights</p>
                  <ul className="space-y-2.5">
                    {cleanHighlights.slice(0, 5).map((h: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </span>
                        <span className="text-[13px] font-medium leading-relaxed text-slate-700">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quantity + CTAs */}
              <div className="mt-7 space-y-4 border-t border-slate-100 pt-7">
                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Qty</span>
                  <div className="flex h-12 items-center rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-2">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black text-slate-400 transition-colors hover:bg-white hover:text-textMain"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-12 bg-transparent text-center text-base font-black text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black text-slate-400 transition-colors hover:bg-white hover:text-textMain"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Primary CTA */}
                <button
                  onClick={handleRequestPrice}
                  className="flex w-full min-h-[54px] items-center justify-center gap-3 rounded-2xl bg-textMain px-8 text-[12px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-black hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                >
                  <MessageSquare size={18} className="text-primary" />
                  Get Price Quote
                </button>

                {/* Wishlist */}
                <button
                  type="button"
                  onClick={handleWishlistToggle}
                  className={`flex w-full min-h-[48px] items-center justify-center gap-3 rounded-2xl border-2 px-8 text-[11px] font-black uppercase tracking-[0.18em] transition-all active:scale-[0.98] ${
                    isWishlisted
                      ? 'border-primary bg-primary text-textMain'
                      : 'border-slate-200 bg-white text-textMain hover:border-primary'
                  }`}
                >
                  <Heart size={16} className={isWishlisted ? 'fill-textMain' : ''} />
                  {isWishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
                </button>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {TRUST_BADGES.map(({ Icon, label, color, bg }) => (
                    <div key={label} className={`flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 ${bg}/60 py-3 px-2 text-center`}>
                      <Icon size={16} className={color} />
                      <span className="text-[9px] font-bold uppercase leading-tight text-slate-500 tracking-wider">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        {product.description && (
          <div className="mt-14">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-1 w-5 rounded-full bg-primary" />
              <h2 className="text-xl font-black tracking-tight text-textMain sm:text-2xl">About This Product</h2>
            </div>
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-10">
              {typeof product.description === 'string' ? (
                product.description.split('\n').filter((p: any) => p.trim()).length === 1 ? (
                  <p className="text-[15px] font-medium leading-8 text-slate-600">
                    {product.description.trim()}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {product.description.split('\n').filter((p: any) => p.trim()).map((point: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-600">
                        <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </span>
                        <span className="text-[14px] font-medium leading-7">
                          {point.replace(/^(?:[*-])\s*/, '').trim()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* ── Specs / Reviews tabs ── */}
      <div className="container-shell mt-14 lg:mt-20">
        <div className="mb-8 border-b border-slate-200">
          <div className="flex gap-2">
            {['specifications', 'reviews'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`mb-[-1px] rounded-t-xl px-6 pb-4 pt-3 text-[11px] font-black uppercase tracking-[0.24em] transition-all ${
                  activeTab === tab
                    ? 'border border-b-white border-slate-200 bg-white text-textMain'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab === 'specifications' ? 'Specifications' : 'Customer Reviews'}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full">
          {activeTab === 'reviews' ? (
            <ProductReviews productId={product.id} />
          ) : (
            <SpecificationsTable specifications={product.specifications} />
          )}
        </div>
      </div>

      {/* ── Similar Products ── */}
      {relatedProducts.length > 0 && (
        <div className="container-shell mt-16 lg:mt-24">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2.5">
                <div className="h-1 w-5 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">You May Also Like</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-textMain sm:text-3xl">Similar Products</h2>
            </div>
            <Link
              to="/products"
              className="group inline-flex items-center gap-2 rounded-full border-2 border-slate-200 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-textMain hover:text-textMain"
            >
              View All <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item: any) => (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
              >
                <div className="overflow-hidden bg-gradient-to-br from-slate-50 to-white p-5">
                  <div className="aspect-square">
                    <img
                      src={resolveAssetUrl((item.images?.[0] as any)?.image || item.image) ?? undefined}
                      alt={item.name}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                      onError={(e) => { e.currentTarget.src = placeholder; }}
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pb-5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {item.brandName || getBrandName(item.brand, brands)}
                  </span>
                  <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-textMain transition-colors group-hover:text-primary">
                    {item.name}
                  </h3>
                  <div className="mt-auto pt-3">
                    <div className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors group-hover:bg-primary group-hover:text-textMain">
                      <span>View Details</span>
                      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* RFQ Modal */}
      <RequestPriceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        quantity={quantity}
      />
    </div>
  );
}

export default ProductDetails;
