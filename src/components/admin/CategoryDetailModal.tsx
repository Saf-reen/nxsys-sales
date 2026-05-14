import React from 'react';
import AdminModal from './AdminModal';
import { Network, FolderTree, Info } from 'lucide-react';

interface CategoryDetailModalProps {
  open: boolean;
  onClose: () => void;
  onAddSub?: (category: any) => void;
  onEditSub?: (subcategory: any) => void;
  onDeleteSub?: (subcategory: any) => void;
  category: any;
  subcategories: any[];
}

function CategoryDetailModal({
  open,
  onClose,
  onAddSub,
  onEditSub,
  onDeleteSub,
  category,
  subcategories = [],
}: CategoryDetailModalProps) {
  if (!category) return null;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Category Details"
      description="Detailed overview of the category and its linked taxonomy."
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={onClose} className="admin-btn-secondary">
            Close
          </button>
          {onAddSub && (
            <button 
              type="button" 
              onClick={() => onAddSub(category)}
              className="admin-btn-primary"
            >
              Add Subcategory
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* --- Header Info --- */}
        <div className="flex items-start gap-4 rounded-[28px] bg-slate-50 p-6 border border-slate-100">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
            <FolderTree className="text-primary" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{category.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${category.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {category.is_active !== false ? 'Active Category' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>

        {/* --- Subcategories List --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Network size={16} className="text-slate-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Linked Subcategories</h4>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
              {subcategories.length} Total
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-[28px] border border-slate-100 bg-white p-3 shadow-inner">
            {subcategories.length > 0 ? (
              subcategories.map((sub) => (
                <div 
                  key={sub.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-50 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary/40" />
                    <p className="text-sm font-bold text-slate-700">{sub.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onEditSub && (
                      <button
                        type="button"
                        onClick={() => onEditSub(sub)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-white hover:shadow-sm transition-all"
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteSub && (
                      <button
                        type="button"
                        onClick={() => onDeleteSub(sub)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-500 hover:bg-white hover:shadow-sm transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-slate-50 p-3 mb-3">
                  <Info className="text-slate-300" size={20} />
                </div>
                <p className="text-sm font-medium text-slate-400 italic">No subcategories found for this category.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

export default CategoryDetailModal;
