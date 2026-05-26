import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import HomeProductCard from './HomeProductCard';
import { slugify } from '@/utils';

export type CarouselVariant = 'light' | 'dark' | 'tinted' | 'slate';

function CategoryCarousel({
  category,
  products,
  variant = 'light',
}: {
  category: string;
  products: any[];
  variant?: CarouselVariant;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 560 : -560, behavior: 'smooth' });
  };

  if (!products.length) return null;

  const categoryPath = `/products/${slugify(category)}`;

  const Cards = () => (
    <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[200px] shrink-0 sm:w-[230px] lg:w-[255px]">
          <HomeProductCard product={p} />
        </div>
      ))}
    </div>
  );

  /* ── Variant 1: Light — white background, minimal header ── */
  if (variant === 'light') {
    return (
      <section className="bg-white py-12 sm:py-16">
        <div className="container-shell space-y-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-[3px] w-6 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Browse</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">{category}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronRight size={15} />
              </button>
              <Link
                to={categoryPath}
                className="group ml-1 inline-flex items-center gap-2 rounded-full border-2 border-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-900 transition-all hover:bg-slate-900 hover:text-white"
              >
                <span>View All</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <Cards />
        </div>
      </section>
    );
  }

  /* ── Variant 2: Dark — near-black background, inverted header ── */
  if (variant === 'dark') {
    return (
      <section className="bg-textMain py-12 sm:py-16">
        <div className="container-shell space-y-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-primary">Collection</span>
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-[28px]">{category}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronRight size={15} />
              </button>
              <Link
                to={categoryPath}
                className="ml-1 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[11px] font-black uppercase tracking-wider text-textMain transition-opacity hover:opacity-85"
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
          <Cards />
        </div>
      </section>
    );
  }

  /* ── Variant 3: Tinted — primary-washed background, icon accent ── */
  if (variant === 'tinted') {
    return (
      <section className="py-12 sm:py-16" style={{ background: 'rgba(251,198,29,0.07)' }}>
        <div className="container-shell space-y-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-textMain shadow-[0_8px_24px_rgba(251,198,29,0.3)]">
                {category[0].toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Explore</span>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">{category}</h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-primary hover:text-primary"
              >
                <ChevronRight size={15} />
              </button>
              <Link
                to={categoryPath}
                className="group ml-1 inline-flex items-center gap-2 rounded-full border-2 border-primary px-4 py-2 text-[11px] font-black uppercase tracking-wider text-primary transition-all hover:bg-primary hover:text-textMain"
              >
                <span>View All</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <Cards />
        </div>
      </section>
    );
  }

  /* ── Variant 4: Slate — soft grey, underline header, text-only CTA ── */
  return (
    <section className="bg-slate-50 py-12 sm:py-16">
      <div className="container-shell space-y-7">
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">{category}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-colors hover:border-primary hover:text-primary"
            >
              <ChevronRight size={15} />
            </button>
            <Link
              to={categoryPath}
              className="group ml-2 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 transition-colors hover:text-primary"
            >
              <span>All {category}</span>
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
        <Cards />
      </div>
    </section>
  );
}

export default CategoryCarousel;
