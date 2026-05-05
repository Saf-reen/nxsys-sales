import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import HomeProductCard from './HomeProductCard';

function CategorySection({ section, index = 0 }) {
  if (!section || !section.products?.length) return null;

  const surfaceClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80';

  return (
    <section className={`${surfaceClass} py-12 sm:py-16 md:py-20`}>
      <div className="container-shell space-y-8 sm:space-y-10">
        {/* Section header */}
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-8">
          <div className="max-w-xl">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="h-1 w-5 rounded-full bg-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                Shop Now
              </p>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {section.title}
            </h3>
          </div>

          <Link
            to={section.viewAllPath || '/products'}
            className="group inline-flex items-center gap-3 rounded-full border-2 border-slate-900 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 transition-all hover:bg-slate-900 hover:text-white shrink-0"
          >
            <span>View All</span>
            <ArrowRight
              size={13}
              className="shrink-0 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {section.products?.map((product) => (
            <HomeProductCard key={product.id || product.sku} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategorySection;
