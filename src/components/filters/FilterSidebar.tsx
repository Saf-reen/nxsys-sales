import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, RotateCcw, Check } from 'lucide-react';

function FilterSection({ title, isOpen, onToggle, activeCount = 0, children }) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center justify-between py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-700 transition-colors group-hover:text-primary">
            {title}
          </span>
          {activeCount ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-black text-textMain">
              {activeCount}
            </span>
          ) : null}
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all group-hover:bg-primary group-hover:text-textMain">
          {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </span>
      </button>
      {isOpen ? <div className="pb-4">{children}</div> : null}
    </div>
  );
}

function FilterOption({ option, isChecked, onToggle }) {
  return (
    <label className="flex min-h-[40px] cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
            isChecked
              ? 'border-primary bg-primary text-textMain'
              : 'border-slate-300 bg-white'
          }`}
        >
          {isChecked && <Check size={10} strokeWidth={3} />}
        </span>
        <input type="checkbox" checked={isChecked} onChange={onToggle} className="sr-only" />
        <span className={`text-[13px] leading-snug transition-colors ${
          isChecked ? 'font-semibold text-textMain' : 'font-medium text-slate-600'
        }`}>
          {option.label}
        </span>
      </div>
    </label>
  );
}

function FilterSidebar({
  sections = [] as any[],
  filters,
  totalResults = 0,
  onToggleOption,
  onReset,
}: {
  sections?: any[];
  filters?: any;
  totalResults?: number;
  onToggleOption?: any;
  onReset?: any;
}) {
  const defaultOpenSections = useMemo(
    () => Object.fromEntries(sections.map((section, index) => [section.key, index < 2])),
    [sections],
  );

  const [openSections, setOpenSections] = useState(defaultOpenSections);

  useEffect(() => {
    setOpenSections((current) => {
      const next = { ...defaultOpenSections };
      Object.keys(current).forEach((key) => {
        if (key in next) next[key] = current[key];
      });
      return next;
    });
  }, [defaultOpenSections]);

  const toggleSection = (sectionKey) => {
    setOpenSections((current) => ({ ...current, [sectionKey]: !current[sectionKey] }));
  };

  const totalActive = sections.reduce((sum, s) => {
    const vals = filters?.[s.key];
    return sum + (Array.isArray(vals) ? vals.length : 0);
  }, 0);

  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] lg:rounded-3xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Filter size={14} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[13px] font-black uppercase tracking-widest text-textMain">Filters</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{totalResults} result{totalResults !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <RotateCcw size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="divide-y divide-slate-50 px-5 sm:px-6">
        {sections.map((section) => {
          const activeCount = Array.isArray(filters?.[section.key]) ? filters[section.key].length : 0;
          return (
            <FilterSection
              key={section.key}
              title={section.label}
              isOpen={Boolean(openSections[section.key])}
              onToggle={() => toggleSection(section.key)}
              activeCount={activeCount}
            >
              {section.options?.length ? (
                <div className="max-h-64 space-y-0.5 overflow-y-auto">
                  {section.options.map((option) => {
                    const selectedValues = filters?.[section.key] || [];
                    const isChecked = selectedValues.includes(option.value);
                    return (
                      <FilterOption
                        key={`${section.key}-${option.value}`}
                        option={option}
                        isChecked={isChecked}
                        onToggle={() => onToggleOption(section.key, option.value)}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="px-2.5 text-[12px] text-slate-400">{section.emptyLabel || 'No options available.'}</p>
              )}
            </FilterSection>
          );
        })}
      </div>
    </aside>
  );
}

export default FilterSidebar;
