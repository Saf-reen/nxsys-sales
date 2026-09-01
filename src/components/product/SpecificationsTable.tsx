function SpecificationsTable({ specifications = [] as any[] }: { specifications?: any[] }) {
  const sections = (Array.isArray(specifications) ? specifications : []).filter(
    (s) => Array.isArray(s.items) && s.items.length > 0,
  );

  if (!sections.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/60 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-slate-400">
          Technical specifications are being updated for this product.
        </p>
      </div>
    );
  }

  const allItems = sections.flatMap((s) => s.items);

  return (
    <div className="grid grid-cols-2 gap-2 pb-8 sm:grid-cols-3 lg:grid-cols-4">
      {allItems.map((item: any, i: number) => (
        <div
          key={`${item.key}-${i}`}
          className="group relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-slate-100 bg-white p-3.5 transition-all hover:border-slate-200 hover:shadow-sm sm:p-4"
        >
          <div className="absolute bottom-0 left-0 h-[3px] w-full origin-left scale-x-0 rounded-full bg-primary transition-transform duration-300 group-hover:scale-x-100" />
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
            {item.key}
          </span>
          <span className="text-[13px] font-semibold leading-snug text-slate-800 sm:text-[14px]">
            {item.value || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SpecificationsTable;
