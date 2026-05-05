import { useEffect, useState } from 'react';
import { getDashboardData, reviewApi } from '@/services';
import { getApiErrorMessage } from '@/services';
import AdminDataTable from '@/components/admin/AdminDataTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { formatRequestStatus, getRequestStatusClasses, formatAdminDate } from '@/utils/admin';
import { Users, ShoppingBag, Package, TrendingUp, Zap, Star, User, Trophy, Award } from 'lucide-react';

const roundedTopBar = (x: number, y: number, w: number, h: number, r: number): string => {
  const cr = Math.min(r, h, w / 2);
  return `M ${x + cr},${y} H ${x + w - cr} Q ${x + w},${y} ${x + w},${y + cr} V ${y + h} H ${x} V ${y + cr} Q ${x},${y} ${x + cr},${y} Z`;
};

const CircleRing = ({
  pct,
  color,
  size = 66,
  stroke = 5,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
}) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Poppins">
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

const MarketplacePulseChart = ({
  counts, inventory, customers, wishlists,
}: {
  counts: any; inventory: any; customers: any; wishlists: any;
}) => {
  const metrics = [
    { label: 'Categories', val: counts.total_categories || 0, from: '#818cf8', to: '#4338ca' },
    { label: 'Products', val: counts.total_products || 0, from: '#38bdf8', to: '#0369a1' },
    { label: 'Stock', val: inventory.total_stock_items || 0, from: '#34d399', to: '#047857' },
    { label: 'Wishlists', val: wishlists.total_wishlists || 0, from: '#fb7185', to: '#be123c' },
    { label: 'Customers', val: customers.total_users || 0, from: '#c084fc', to: '#6d28d9' },
    { label: 'Requests', val: counts.total_requests || 0, from: '#fbbf24', to: '#b45309' },
  ];

  const svgW = 580, svgH = 210;
  const padL = 40, padR = 12, padT = 28, padB = 34;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const n = metrics.length;
  const barW = 52;
  const gap = (chartW - n * barW) / (n + 1);
  const max = Math.max(...metrics.map(m => m.val), 10);

  const bx = (i: number) => padL + gap + i * (barW + gap);
  const bh = (val: number) => Math.max((val / max) * chartH, 3);
  const by = (val: number) => padT + chartH - bh(val);
  const fmtY = (v: number): string => {
    if (v === 0) return '0';
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return `${v}`;
  };

  return (
    <div
      className="relative overflow-hidden rounded-[24px] border border-white/[0.07]"
      style={{
        background: 'linear-gradient(140deg, #080e20 0%, #060c18 100%)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 28px 70px rgba(0,0,0,0.45), 0 0 90px rgba(99,102,241,0.06)',
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 12% -5%, rgba(99,102,241,0.16) 0%, transparent 65%)' }} />

      <div className="relative p-6 pb-5">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Live Dashboard</span>
            </div>
            <h3 className="text-[22px] font-black leading-none tracking-tight text-white">Platform Analytics</h3>
            <p className="mt-1 text-[11px] font-medium text-slate-500">Real-time marketplace health overview</p>
          </div>
          <div className="flex max-w-[220px] flex-wrap justify-end gap-1.5">
            {metrics.map((m, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.from }} />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: 210 }}>
          <defs>
            {metrics.map((m, i) => (
              <linearGradient key={i} id={`ppg-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.from} stopOpacity="1" />
                <stop offset="100%" stopColor={m.to} stopOpacity="0.72" />
              </linearGradient>
            ))}
            <filter id="ppglow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const gy = padT + chartH - p * chartH;
            return (
              <g key={idx}>
                <line x1={padL} y1={gy} x2={svgW - padR} y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={p === 0 ? '0' : '3 6'} />
                <text x={padL - 6} y={gy + 3.5} textAnchor="end" fill="rgba(255,255,255,0.18)" fontSize="8.5" fontFamily="Poppins">{fmtY(Math.round(max * p))}</text>
              </g>
            );
          })}
          {metrics.map((m, i) => {
            const x = bx(i); const h = bh(m.val); const y = by(m.val); const cx = x + barW / 2;
            return (
              <g key={i}>
                <path d={roundedTopBar(x + 5, y + 5, barW - 10, h, 5)} fill={m.from} opacity="0.2" filter="url(#ppglow)" />
                <path d={roundedTopBar(x, y, barW, h, 8)} fill={`url(#ppg-${i})`} />
                {h > 14 && <path d={roundedTopBar(x + 6, y + 2, barW - 12, Math.min(h - 4, 5), 3)} fill="rgba(255,255,255,0.18)" />}
                <text x={cx} y={y - 8} textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize="10" fontWeight="800" fontFamily="Poppins">{m.val.toLocaleString()}</text>
                <text x={cx} y={svgH - 3} textAnchor="middle" fill="rgba(255,255,255,0.26)" fontSize="8" fontWeight="700" letterSpacing="0.1em">{m.label.toUpperCase()}</text>
              </g>
            );
          })}
          <line x1={padL} y1={padT + chartH} x2={svgW - padR} y2={padT + chartH} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};

function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, reviewsData] = await Promise.all([
        getDashboardData(),
        reviewApi.getReviews(),
      ]);
      setData(dashboardData);
      setRecentReviews(Array.isArray(reviewsData) ? reviewsData.slice(0, 5) : (reviewsData.results?.slice(0, 5) || []));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load admin dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">Synchronizing live operations…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="text-lg font-black text-rose-900">Unable to load admin dashboard</p>
        <p className="mt-2 text-[13px]">{error}</p>
        <button
          onClick={loadDashboard}
          className="admin-btn-secondary mt-4 !min-h-[40px] !border-rose-200 !bg-rose-100 !px-4 !py-2 !text-xs !font-bold !uppercase !tracking-[0.18em] !text-rose-800 hover:!bg-rose-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const counts = summary.counts || {};
  const alerts = summary.alerts || {};
  const performance = summary.performance || {};
  const recent = summary.recent || {};

  const customers = data?.customers || {};
  const inventory = data?.inventory || {};

  const lowStockProducts = alerts.low_stock_products || [];
  const recentRequests = recent.requests || [];
  const topSelling = performance.top_selling || [];
  const topRated = performance.top_rated || [];

  return (
    <div className="space-y-8 pb-12">
      <AdminPageHeader
        eyebrow="Marketplace Command"
        title="Dashboard"
        description="Unified operational intelligence for categories, products, inventory, and customer engagement."
      />

      {/* Chart + Daily Momentum */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <MarketplacePulseChart
            counts={counts}
            inventory={inventory}
            customers={customers}
            wishlists={data?.wishlists || {}}
          />
        </div>

        {/* Daily Momentum */}
        <div
          className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.06] p-5 text-white"
          style={{
            background: 'linear-gradient(150deg, #0d1117 0%, #090e1a 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 28px 60px rgba(0,0,0,0.4)',
            minHeight: 280,
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(250,204,21,0.1) 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <Zap className="mb-3 text-yellow-400" size={20} />
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Daily Momentum</p>
            <p className="text-[44px] font-black leading-none tabular-nums text-white">{customers.active_today || 0}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Users Today</p>
          </div>
          <div className="relative border-t border-white/[0.07] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">Weekly Goal</p>
                <p className="text-base font-black leading-tight text-white">85% Complete</p>
                <p className="mt-0.5 text-[10px] text-slate-600">On track</p>
              </div>
              <CircleRing pct={85} color="#facc15" />
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Catalog Strength"
          value={<span className="text-slate-900">{counts.total_products || 0}</span>}
          helper={`${counts.total_categories || 0} Categories Live`}
          icon={<ShoppingBag className="text-slate-400" size={18} />}
        />
        <AdminStatCard
          label="Market Stock"
          value={<span className="text-emerald-600">{inventory.total_stock_quantity?.toLocaleString() || 0}</span>}
          helper={`${inventory.out_of_stock || 0} Out of Stock`}
          icon={<Package className="text-emerald-400" size={18} />}
        />
        <AdminStatCard
          label="Customer Base"
          value={<span className="text-blue-600">{customers.total_users || 0}</span>}
          helper={`${customers.new_users_today || 0} Joined Today`}
          icon={<Users className="text-blue-400" size={18} />}
        />
        <AdminStatCard
          label="System RFQs"
          value={<span className="text-amber-600">{counts.total_requests || 0}</span>}
          helper={`${counts.pending_requests || 0} Pending Review`}
          icon={<TrendingUp className="text-amber-400" size={18} />}
        />
      </div>

      {/* Performance Section — Top Rated & Top Selling */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Top Rated */}
        <div
          className="relative overflow-hidden rounded-[24px] border border-white/[0.07]"
          style={{
            background: 'linear-gradient(140deg, #0f0c00 0%, #0d0a00 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.4)',
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 10% -5%, rgba(251,191,36,0.12) 0%, transparent 65%)' }} />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.35em] text-amber-500/70">Feedback Leaders</p>
                <h3 className="text-[20px] font-black leading-tight text-white">Top Rated Products</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                <Trophy size={18} />
              </div>
            </div>
            <div className="space-y-2">
              {topRated.length > 0 ? (
                topRated.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-[10px] font-black text-amber-400">
                      #{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-white">{item.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-[11px] font-black text-amber-400">{item.rating || '5.0'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-white/20">
                    <Star size={22} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/30">Waiting for ratings</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling */}
        <div
          className="relative overflow-hidden rounded-[24px] border border-white/[0.07]"
          style={{
            background: 'linear-gradient(140deg, #000d1a 0%, #000b17 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.4)',
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 10% -5%, rgba(56,189,248,0.1) 0%, transparent 65%)' }} />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.35em] text-sky-400/70">Market Velocity</p>
                <h3 className="text-[20px] font-black leading-tight text-white">Top Selling Products</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-400">
                <Award size={18} />
              </div>
            </div>
            <div className="space-y-2">
              {topSelling.length > 0 ? (
                topSelling.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-[10px] font-black text-sky-400">
                      #{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 truncate text-[13px] font-bold text-white">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${100 - i * 18}%` }} />
                        </div>
                        <span className="text-[10px] font-black tabular-nums text-sky-400/70">{100 - i * 18}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04] text-white/20">
                    <Award size={22} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/30">No sales data yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Watchlist + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[3px] w-4 rounded-full bg-primary" />
            <h2 className="text-[15px] font-black uppercase tracking-tight text-slate-900">Stock Watchlist</h2>
            <div className="mx-2 h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Alerts</span>
          </div>
          <AdminDataTable
            tableFixed={true}
            columns={[
              {
                key: 'name', label: 'Product', width: '75%',
                render: (row) => (
                  <div className="min-w-0 py-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">{row.name || row.product_name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{row.brand || 'General'}</p>
                  </div>
                ),
              },
              {
                key: 'stock', label: 'Qty', width: '25%',
                headerClassName: 'text-right', cellClassName: 'text-right',
                render: (row) => {
                  const stock = Number(row.stock || 0);
                  return (
                    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[12px] font-black ${stock <= 5 ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-amber-200 bg-amber-50 text-amber-600'
                      }`}>
                      {stock}
                    </span>
                  );
                },
              },
            ]}
            rows={lowStockProducts}
            emptyText="No critical stock levels detected."
            minWidthClassName="min-w-[400px]"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[3px] w-4 rounded-full bg-primary" />
            <h2 className="text-[15px] font-black uppercase tracking-tight text-slate-900">Recent Activity</h2>
            <div className="mx-2 h-px flex-1 bg-slate-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inbound Leads</span>
          </div>
          <AdminDataTable
            tableFixed={true}
            columns={[
              {
                key: 'name', label: 'Lead', width: '45%',
                render: (row) => <p className="truncate text-[13px] font-semibold text-slate-900">{row.name}</p>,
              },
              {
                key: 'product', label: 'Inquiry', width: '35%',
                render: (row) => <p className="truncate text-[12px] font-medium text-slate-500">{row.product || row.product_name}</p>,
              },
              {
                key: 'status', label: 'Action', width: '20%',
                headerClassName: 'text-right', cellClassName: 'text-right',
                render: (row) => (
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${getRequestStatusClasses(row.status)}`}>
                    {formatRequestStatus(row.status)}
                  </span>
                ),
              },
            ]}
            rows={recentRequests}
            emptyText="No recent engagement logs."
            minWidthClassName="min-w-[400px]"
          />
        </div>
      </div>

      {/* Latest Reviews Feed */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-[3px] w-4 rounded-full bg-primary" />
          <h2 className="text-[15px] font-black uppercase tracking-tight text-slate-900">Latest Customer Feedback</h2>
          <div className="mx-2 h-px flex-1 bg-slate-100" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review Feed</span>
        </div>
        <AdminDataTable
          tableFixed={true}
          columns={[
            {
              key: 'user', label: 'Customer', width: '25%',
              render: (row) => (
                <div className="flex items-center gap-2.5 py-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <User size={13} />
                  </div>
                  <p className="truncate text-[13px] font-bold text-slate-800">{row.username || 'Anonymous'}</p>
                </div>
              ),
            },
            {
              key: 'rating', label: 'Rating', width: '15%',
              render: (row) => (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={11} className={s <= row.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                  ))}
                </div>
              ),
            },
            {
              key: 'comment', label: 'Review', width: '40%',
              render: (row) => (
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-900">{row.title || 'Review'}</p>
                  <p className="truncate text-[11px] text-slate-500">{row.comment || ''}</p>
                </div>
              ),
            },
            {
              key: 'date', label: 'Posted', width: '20%',
              headerClassName: 'text-right', cellClassName: 'text-right',
              render: (row) => (
                <span className="text-[11px] font-bold text-slate-400">{formatAdminDate(row.created_at)}</span>
              ),
            },
          ]}
          rows={recentReviews}
          emptyText="Waiting for customer feedback…"
          minWidthClassName="min-w-[800px]"
        />
      </div>
    </div>
  );
}

export default AdminDashboardPage;
