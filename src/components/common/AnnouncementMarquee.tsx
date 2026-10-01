import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

const MESSAGE = 'Live Sale — Lenovo ThinkBook 14 G8 IAL: Core Ultra 9 · 16GB DDR5 · 512GB SSD · Bulk pricing available';
const HREF = '/products?search=ThinkBook%2014%20G8%20IAL';

function MarqueeItem() {
  return (
    <Link
      to={HREF}
      className="mx-4 flex shrink-0 items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-textMain hover:underline"
    >
      <Zap size={13} className="shrink-0 fill-textMain" />
      {MESSAGE}
    </Link>
  );
}

function AnnouncementMarquee() {
  const items = Array.from({ length: 8 });

  return (
    <div className="marquee-shell relative overflow-hidden border-b border-black/10 bg-primary py-2">
      <div className="overflow-hidden flex">
        <div
          className="animate-marquee-rtl flex w-max items-center"
          style={{ '--marquee-duration': '26s' } as React.CSSProperties}
        >
          {items.map((_, index) => (
            <MarqueeItem key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(AnnouncementMarquee);
