import { useEffect, useState } from 'react';
import { reviewApi, getApiErrorMessage } from '@/services';
import { showToast } from '@/utils/helpers';
import AdminDataTable from '@/components/admin/AdminDataTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Star, Trash2, User, Package, CheckCircle2, ThumbsUp } from 'lucide-react';
import { formatAdminDate } from '@/utils/admin';

function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await reviewApi.getReviews();
      setReviews(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    setDeletingId(id);
    try {
      await reviewApi.deleteReview(id);
      showToast({ title: 'Review deleted', message: 'The review has been permanently removed.' });
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      showToast({ 
        title: 'Delete failed', 
        message: getApiErrorMessage(err, 'Unable to delete review'),
        type: 'error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
          <p className="text-sm font-medium">Synchronizing review data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="text-lg font-semibold text-rose-900">Error loading reviews</p>
        <p className="mt-2 text-sm">{error}</p>
        <button 
          onClick={loadReviews}
          className="admin-btn-secondary mt-4 !border-rose-200 !bg-rose-100 !text-rose-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Feedback moderation"
        title="Product Reviews"
        description="Monitor and moderate customer reviews across your product catalog."
      />

      <div className="surface-panel overflow-hidden">
        <AdminDataTable
          columns={[
            {
              key: 'product',
              label: 'Product ID',
              width: '15%',
              render: (row) => (
                <div className="flex items-center gap-2 py-1">
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                    <Package size={14} />
                  </div>
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">ID: {row.product}</span>
                </div>
              ),
            },
            {
              key: 'user',
              label: 'Customer',
              width: '25%',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate" title={row.username}>{row.username || 'Anonymous'}</p>
                    {row.is_verified && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} className="text-emerald-500 fill-emerald-50" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Verified Buyer</span>
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: 'rating',
              label: 'Score',
              width: '15%',
              render: (row) => (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        size={10} 
                        className={s <= row.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} 
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <ThumbsUp size={10} />
                    <span>{row.helpful_count || 0} Helpful</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'comment',
              label: 'Review Details',
              width: '35%',
              render: (row) => (
                <div className="py-2 pr-4">
                  <p className="text-xs font-black text-slate-900 mb-1">{row.title || 'Review'}</p>
                  <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                    {row.comment || 'No comment provided.'}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-2">
                    Posted {formatAdminDate(row.created_at)}
                  </p>
                </div>
              ),
            },
            {
              key: 'actions',
              label: 'Manage',
              width: '10%',
              cellClassName: 'text-right',
              render: (row) => (
                <button
                  onClick={() => handleDelete(row.id)}
                  disabled={deletingId === row.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  title="Remove Review"
                >
                  <Trash2 size={18} />
                </button>
              ),
            },
          ]}
          rows={reviews}
          emptyText="No customer reviews in the log."
          minWidthClassName="min-w-[900px]"
        />
      </div>
    </div>
  );
}

export default AdminReviewsPage;
