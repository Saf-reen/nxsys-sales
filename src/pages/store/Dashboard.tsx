import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Package,
  RefreshCcw,
  XCircle,
  FileText,
  ClipboardList,
  User,
  AlertCircle,
} from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { authService, profileApi, getApiErrorMessage } from '@/services';

const formatDate = (value: string) => {
  if (!value) return 'Recently';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

const ENQUIRY_STATUS_MAP: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  submitted: {
    label: 'Submitted',
    color: 'text-blue-700 bg-blue-50 border-blue-100',
    icon: <Clock size={13} />,
  },
  reviewed: {
    label: 'Reviewed',
    color: 'text-primary bg-primary/10 border-primary/20',
    icon: <CheckCircle size={13} />,
  },
  resolved: {
    label: 'Resolved',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    icon: <CheckCircle size={13} />,
  },
  closed: {
    label: 'Closed',
    color: 'text-rose-700 bg-rose-50 border-rose-100',
    icon: <XCircle size={13} />,
  },
};

const QUOTE_STATUS_MAP: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  pending: {
    label: 'Pending',
    color: 'text-primary bg-primary/10 border-primary/20',
    icon: <Clock size={13} />,
  },
  quote_sent: {
    label: 'Quoted',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    icon: <CheckCircle size={13} />,
  },
  quoted: {
    label: 'Quoted',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    icon: <CheckCircle size={13} />,
  },
  closed: {
    label: 'Closed',
    color: 'text-rose-700 bg-rose-50 border-rose-100',
    icon: <XCircle size={13} />,
  },
};

const getStatus = (map: typeof ENQUIRY_STATUS_MAP, status: string) => {
  const key = String(status || '').trim().toLowerCase();
  return (
    map[key] || {
      label: status || 'Unknown',
      color: 'text-slate-600 bg-slate-50 border-slate-100',
      icon: <AlertCircle size={13} />,
    }
  );
};

type Tab = 'enquiries' | 'quotes';

function CustomerDashboard() {
  const navigate = useNavigate();
  const sessionUser = authService.getCurrentUser();

  useEffect(() => {
    if (!authService.isAuthenticated()) navigate('/login', { replace: true });
  }, [navigate]);

  const [activeTab, setActiveTab] = useState<Tab>('enquiries');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [profileInfo, setProfileInfo] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await profileApi.getProfile();
      setUserData(data?.user || null);
      setProfileInfo(data?.profile || null);
      setEnquiries(Array.isArray(data?.enquiries?.results) ? data.enquiries.results : []);
      setQuotes(Array.isArray(data?.quote_requests?.results) ? data.quote_requests.results : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load your requests right now.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authService.isAuthenticated()) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName =
    [userData?.first_name, userData?.last_name].filter(Boolean).join(' ') ||
    userData?.full_name ||
    sessionUser?.name ||
    'Customer';

  return (
    <div className="min-h-screen bg-slate-50/30">
      <Breadcrumbs items={[{ label: 'My Requests', active: true }]} />

      <div className="container-shell pb-8 pt-8 sm:pb-16 lg:pb-20">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Header */}
          <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="h-[3px] w-5 rounded-full bg-primary" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">My Account</p>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Request History</h1>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-500">
                Track your product enquiries and price quote requests. Check status updates from our team.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-textMain px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-black"
              >
                Browse Catalog
                <ArrowRight size={14} className="text-primary" />
              </Link>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 transition-colors hover:border-primary hover:bg-primary/10"
              >
                <RefreshCcw size={13} />
                Refresh
              </button>
            </div>
          </header>

          {/* Stat cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Total Enquiries',
                value: enquiries.length,
                sub: 'General product enquiries submitted',
                color: 'text-slate-950',
              },
              {
                label: 'Quote Requests',
                value: quotes.length,
                sub: 'Pricing requests awaiting response',
                color: 'text-primary',
              },
              {
                label: 'Submitted',
                value: enquiries.filter((e) => String(e.status).toLowerCase() === 'submitted').length,
                sub: 'Awaiting review from our team',
                color: 'text-blue-600',
              },
              {
                label: 'Resolved',
                value: enquiries.filter((e) =>
                  ['resolved', 'quoted'].includes(String(e.status).toLowerCase()),
                ).length,
                sub: 'Enquiries & quotes that are resolved',
                color: 'text-emerald-600',
              },
            ].map((card) => (
              <article key={card.label} className="metric-card">
                <p className="metric-card-label">{card.label}</p>
                <p className={`metric-card-value ${card.color}`}>{loading ? '—' : card.value}</p>
                <p className="metric-card-helper">{card.sub}</p>
              </article>
            ))}
          </section>

          {error && (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-rose-700">
              <p className="font-semibold text-rose-900">Unable to load requests</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          <div className="grid items-start gap-6 xl:grid-cols-[1fr_300px] xl:gap-8">
            {/* Main content */}
            <div className="space-y-5">
              {/* Tabs */}
              <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('enquiries')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
                    activeTab === 'enquiries'
                      ? 'bg-textMain text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText size={13} />
                  Enquiries
                  {!loading && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        activeTab === 'enquiries' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {enquiries.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quotes')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${
                    activeTab === 'quotes'
                      ? 'bg-textMain text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ClipboardList size={13} />
                  Quote Requests
                  {!loading && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                        activeTab === 'quotes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {quotes.length}
                    </span>
                  )}
                </button>
              </div>

              {/* List */}
              {loading ? (
                <div className="section-panel py-16 text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Loading requests...
                  </p>
                </div>
              ) : activeTab === 'enquiries' ? (
                <EnquiryList items={enquiries} />
              ) : (
                <QuoteList items={quotes} />
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 xl:sticky xl:top-32">
              {/* Account card */}
              <div className="surface-panel-dark relative overflow-hidden p-6">
                <div className="absolute right-0 top-0 h-28 w-28 translate-x-14 -translate-y-14 rotate-45 bg-primary opacity-20" />
                <div className="relative z-10">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Account</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <User size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{displayName}</p>
                      <p className="truncate text-[11px] text-white/60">
                        {userData?.email || sessionUser?.email}
                      </p>
                    </div>
                  </div>
                  {profileInfo?.company_name && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="text-[11px] text-white/50 uppercase">Company</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-white">{profileInfo.company_name}</p>
                    </div>
                  )}
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      Verified partner
                    </span>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="section-panel space-y-3">
                <p className="section-eyebrow">Quick Links</p>
                <Link
                  to="/profile"
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span>Edit Profile</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </Link>
                <Link
                  to="/products"
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span>Browse Catalog</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </Link>
              </div>

              {/* How it works */}
              <div className="section-panel">
                <p className="section-eyebrow">Procurement flow</p>
                <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-950">How it works</h3>
                <div className="mt-3 space-y-2.5 text-[13px] leading-6 text-slate-500">
                  <p>1. Browse products and specifications without public pricing.</p>
                  <p>2. Submit an enquiry or request a price quote with quantity.</p>
                  <p>3. Track status here until your request is responded to.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Enquiry list ── */
function EnquiryList({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <div className="section-panel py-14 text-center">
        <FileText size={38} className="mx-auto mb-4 text-slate-200" />
        <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">No enquiries yet</h3>
        <p className="mx-auto max-w-sm text-sm text-slate-400">
          Browse the catalog and use the enquiry form on a product page to get in touch with our team.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-textMain transition-colors hover:opacity-90"
        >
          Explore products <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const st = getStatus(ENQUIRY_STATUS_MAP, item.status);
        return (
          <article
            key={item.id}
            className="section-panel space-y-4 transition-colors hover:border-primary/40"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Package size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">
                      {item.product_name || 'General Enquiry'}
                    </h3>
                    {item.product_id && (
                      <Link
                        to={`/product/${item.product_id}`}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline"
                      >
                        View product
                      </Link>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {item.company_name && <span>{item.company_name}</span>}
                    {item.quantity && (
                      <>
                        <span className="hidden h-1 w-1 rounded-full bg-slate-200 sm:inline-block" />
                        <span>Qty: {item.quantity}</span>
                      </>
                    )}
                    <span className="hidden h-1 w-1 rounded-full bg-slate-200 sm:inline-block" />
                    <span>#{String(item.id).padStart(5, '0')}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-200 sm:inline-block" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
              <div
                className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${st.color}`}
              >
                {st.icon}
                {st.label}
              </div>
            </div>

            {item.description && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Description
                </p>
                <p className="break-words text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

/* ── Quote request list ── */
function QuoteList({ items }: { items: any[] }) {
  if (!items.length) {
    return (
      <div className="section-panel py-14 text-center">
        <ClipboardList size={38} className="mx-auto mb-4 text-slate-200" />
        <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-500">
          No quote requests yet
        </h3>
        <p className="mx-auto max-w-sm text-sm text-slate-400">
          Open any product and click "Request Price" to submit a quote request with your quantity and
          requirements.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-textMain transition-colors hover:opacity-90"
        >
          Explore products <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const st = getStatus(QUOTE_STATUS_MAP, item.status);
        return (
          <article
            key={item.id}
            className="section-panel space-y-4 transition-colors hover:border-primary/40"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <ClipboardList size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">
                      {item.product_name || item.product?.name || 'Price Request'}
                    </h3>
                    {(item.product_id || item.product?.id) && (
                      <Link
                        to={`/product/${item.product_id || item.product?.id}`}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline"
                      >
                        View product
                      </Link>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {item.company_name && <span>{item.company_name}</span>}
                    {item.quantity && (
                      <>
                        <span className="hidden h-1 w-1 rounded-full bg-slate-200 sm:inline-block" />
                        <span>Qty: {item.quantity}</span>
                      </>
                    )}
                    <span className="hidden h-1 w-1 rounded-full bg-slate-200 sm:inline-block" />
                    <span>#{String(item.id).padStart(5, '0')}</span>
                    <span className="hidden h-1 w-1 rounded-full bg-slate-200 sm:inline-block" />
                    <span>{formatDate(item.created_at || item.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div
                className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${st.color}`}
              >
                {st.icon}
                {st.label}
              </div>
            </div>

            {(item.description || item.message) && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Message
                </p>
                <p className="break-words text-sm leading-relaxed text-slate-600">
                  {item.description || item.message}
                </p>
              </div>
            )}

            {['quoted', 'quote_sent'].includes(String(item.status).toLowerCase()) && item.quoted_price && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                  Quoted Price
                </p>
                <p className="text-2xl font-black text-emerald-700">₹{Number(item.quoted_price).toLocaleString('en-IN')}</p>
                <p className="mt-1 text-xs text-emerald-800/70">
                  Pricing is visible only because this request has been quoted.
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default CustomerDashboard;
