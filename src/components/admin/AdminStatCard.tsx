import type { ReactNode } from 'react';

interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  accent?: string;
  icon?: ReactNode;
}

function AdminStatCard({ label, value, helper, accent = 'border-l-primary', icon }: AdminStatCardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] hover:-translate-y-0.5 sm:p-6`}>
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl transition-colors group-hover:bg-primary ${accent.startsWith('border-l-') ? accent.replace('border-l-', 'bg-') : 'bg-primary/30'}`} />

      <div className="flex justify-between items-start pl-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:mt-4 sm:text-3xl leading-none">
            {value}
          </p>
          {helper && (
            <p className="mt-2.5 text-xs font-medium leading-relaxed text-slate-500 sm:mt-3">
              {helper}
            </p>
          )}
        </div>
        
        {icon && (
          <div className="shrink-0 p-2 rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            {icon}
          </div>
        )}
      </div>

      {/* Subtle background glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/0 transition-all duration-300 group-hover:from-primary/[0.03] group-hover:to-transparent" />
    </div>
  );
}

export default AdminStatCard;
