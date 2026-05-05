function SpecificationsTable({ specifications = [] as any[] }: { specifications?: any[] }) {
  if (!specifications || specifications.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-slate-50/60 px-8 py-14 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-slate-400">
          Technical specifications are being updated for this catalog entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {(Array.isArray(specifications) ? specifications : []).map((section: any, idx: number) => (
        <div key={section.category || idx}>
          {/* Section header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-1 w-4 rounded-full bg-primary" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.32em] text-primary">
              {section.category}
            </h3>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Specs grid */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <div className="grid md:grid-cols-2">
              {Array.isArray(section.items) ? section.items.map((item: any, i: number) => (
                <div
                  key={`${item.key}-${i}`}
                  className="flex items-start justify-between gap-4 border-b border-slate-50 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-slate-50/60 md:odd:border-r md:odd:border-slate-50 md:[&:nth-last-child(2)]:border-b-0"
                >
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {item.key}
                  </span>
                  <span className="text-right text-[12px] font-semibold text-slate-800">
                    {item.value || '—'}
                  </span>
                </div>
              )) : (
                <p className="px-5 py-4 text-[11px] italic text-slate-400">
                  No attributes recorded for this section.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SpecificationsTable;
