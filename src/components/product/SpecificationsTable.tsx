import { useState } from 'react';

function SpecificationsTable({ specifications = [] as any[] }: { specifications?: any[] }) {
  const sections = (Array.isArray(specifications) ? specifications : []).filter(
    (s) => Array.isArray(s.items) && s.items.length > 0,
  );

  const [activeIdx, setActiveIdx] = useState(0);

  /* ── Empty state ── */
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

  const activeSection = sections[Math.min(activeIdx, sections.length - 1)];

  return (
    <div className="pb-8">
      {/* Section tab strip */}
      {sections.length > 1 && (
        <div className="mb-0 flex flex-wrap gap-0 overflow-x-auto border-b border-slate-100">
          {sections.map((section, idx) => (
            <button
              key={section.category || idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative shrink-0 border-b-2 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
                idx === activeIdx
                  ? 'border-primary text-textMain'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {section.category}
              {idx === activeIdx && (
                <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-t-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Single-section header (when no tabs) */}
      {sections.length === 1 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-primary" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
            {activeSection.category}
          </h3>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
      )}

      {/* Spec rows */}
      <div className={`overflow-hidden border border-slate-100 bg-white ${sections.length > 1 ? 'rounded-b-2xl rounded-t-none border-t-0' : 'rounded-2xl'}`}>
        {activeSection.items.map((item: any, i: number) => (
          <div
            key={`${item.key}-${i}`}
            className={`flex items-start justify-between gap-6 px-5 py-3.5 transition-colors hover:bg-slate-50/70 ${
              i !== activeSection.items.length - 1 ? 'border-b border-slate-50' : ''
            } ${i % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}
          >
            <span className="w-2/5 shrink-0 text-[11px] font-bold uppercase leading-relaxed tracking-wider text-slate-500">
              {item.key}
            </span>
            <span className="w-3/5 text-right text-[13px] font-semibold leading-relaxed text-slate-800">
              {item.value || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Section count hint */}
      {sections.length > 1 && (
        <p className="mt-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-300">
          {activeIdx + 1} / {sections.length} sections
        </p>
      )}
    </div>
  );
}

export default SpecificationsTable;
