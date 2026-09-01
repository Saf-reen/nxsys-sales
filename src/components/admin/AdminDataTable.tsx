import type { ReactNode } from 'react';
import { PackageSearch } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  headerClassName?: string;
  cellClassName?: string;
  width?: number | string;
  render?: (row: any) => ReactNode;
}

interface AdminDataTableProps {
  columns: Column[];
  rows: any[];
  emptyText?: string;
  rowKey?: string;
  minWidthClassName?: string;
  tableFixed?: boolean;
}

function AdminDataTable({
  columns,
  rows,
  emptyText = 'No records found.',
  rowKey = 'id',
  minWidthClassName = 'min-w-[720px]',
  tableFixed = false,
}: AdminDataTableProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
          <PackageSearch size={24} />
        </div>
        <p className="text-[13px] font-semibold text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 lg:space-y-0">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.05)] lg:block">
        <div className="overflow-x-auto">
          <table className={`w-full text-left ${minWidthClassName} ${tableFixed ? 'table-fixed' : ''}`}>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 whitespace-nowrap ${col.headerClassName || ''}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {safeRows.map((row, idx) => (
                <tr
                  key={(row[rowKey] as string) || (row.id as string) || idx}
                  className="group transition-colors hover:bg-primary/[0.03]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-4 align-top text-[13px] leading-6 text-slate-700 ${col.cellClassName || ''}`}
                    >
                      <div className="min-w-0">
                        {col.render
                          ? col.render(row)
                          : (row[col.key] as ReactNode) ?? <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 lg:hidden">
        {safeRows.map((row, idx) => {
          const contentCols = columns.filter((c) => c.key !== 'actions');
          const actionCol = columns.find((c) => c.key === 'actions');
          return (
            <div
              key={(row[rowKey] as string) || (row.id as string) || idx}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
            >
              <div className="divide-y divide-slate-50">
                {contentCols.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
                    <span className="shrink-0 pt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {col.label}
                    </span>
                    <div className={`min-w-0 flex-1 text-right text-[13px] text-slate-700 ${col.cellClassName || ''}`}>
                      {col.render
                        ? col.render(row)
                        : (row[col.key] as ReactNode) ?? <span className="text-slate-300">—</span>}
                    </div>
                  </div>
                ))}
              </div>
              {actionCol && (
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                  {actionCol.render ? actionCol.render(row) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminDataTable;
