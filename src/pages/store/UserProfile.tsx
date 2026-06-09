import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Check, ArrowRight, Building2, Phone, Mail, MapPin,
  FileText, ClipboardList, Package, AlertCircle, CheckCircle, Clock, XCircle,
} from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import { authService, profileApi, getNormalizedApiError } from '@/services';
import { showToast } from '../../utils/helpers';

type HistoryTab = 'enquiries' | 'quotes';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  company_address: string;
}

/* ── Status helpers ── */
const ENQUIRY_STATUS: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  submitted: { label: 'Submitted', color: 'text-blue-700 bg-blue-50 border-blue-100', icon: <Clock size={12} /> },
  reviewed:  { label: 'Reviewed',  color: 'text-primary bg-primary/10 border-primary/20', icon: <CheckCircle size={12} /> },
  resolved:  { label: 'Resolved',  color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: <CheckCircle size={12} /> },
  closed:    { label: 'Closed',    color: 'text-rose-700 bg-rose-50 border-rose-100', icon: <XCircle size={12} /> },
};
const QUOTE_STATUS: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  pending:    { label: 'Pending', color: 'text-primary bg-primary/10 border-primary/20', icon: <Clock size={12} /> },
  quote_sent: { label: 'Quoted',  color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: <CheckCircle size={12} /> },
  quoted:     { label: 'Quoted',  color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: <CheckCircle size={12} /> },
  closed:     { label: 'Closed',  color: 'text-rose-700 bg-rose-50 border-rose-100', icon: <XCircle size={12} /> },
};
const getStatus = (map: typeof ENQUIRY_STATUS, status: string) => {
  const key = String(status || '').trim().toLowerCase();
  return map[key] || { label: status || 'Unknown', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: <AlertCircle size={12} /> };
};
const formatDate = (v: string) => {
  if (!v) return 'Recently';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
};

function UserProfile() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) navigate('/login', { replace: true });
  }, [navigate]);

  /* profile form */
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '', last_name: '', email: '', phone: '', company_name: '', company_address: '',
  });
  const [memberSince, setMemberSince] = useState('');
  const [lastLogin, setLastLogin] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  /* history */
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('enquiries');

  /* change password */
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    profileApi.getProfile()
      .then((data: any) => {
        const u = data?.user || {};
        const p = data?.profile || {};
        setProfileData({
          first_name:      u.first_name || '',
          last_name:       u.last_name  || '',
          email:           u.email      || '',
          phone:           p.phone      || '',
          company_name:    p.company_name    || '',
          company_address: p.company_address || '',
        });
        if (u.date_joined) setMemberSince(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(u.date_joined)));
        if (u.last_login)  setLastLogin(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(u.last_login)));
        setEnquiries(Array.isArray(data?.enquiries?.results) ? data.enquiries.results : []);
        setQuotes(Array.isArray(data?.quote_requests?.results) ? data.quote_requests.results : []);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) setProfileErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileErrors({});
    try {
      await profileApi.updateProfile({
        first_name: profileData.first_name, last_name: profileData.last_name,
        email: profileData.email, phone: profileData.phone,
        company_name: profileData.company_name, company_address: profileData.company_address,
      });
      showToast({ title: 'Profile Updated', message: 'Your account details have been saved.' });
    } catch (err) {
      const n = getNormalizedApiError(err, { fallbackMessage: 'Failed to update profile.' });
      const fe: Record<string, string> = {};
      Object.entries(n.fieldErrors || {}).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? v[0] : String(v); });
      setProfileErrors(fe);
      if (!Object.keys(fe).length) showToast({ title: 'Error', message: n.message, type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pwOld)           errs.old = 'Enter your current password.';
    if (pwNew.length < 6) errs.new = 'Password must be at least 6 characters.';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwSubmitting(true);
    try {
      await authService.resetPassword({ old_password: pwOld, new_password: pwNew });
      showToast({ title: 'Password Changed', message: 'Your password has been updated successfully.' });
      setPwDone(true);
      setPwOld(''); setPwNew(''); setPwErrors({});
    } catch (err) {
      const n = getNormalizedApiError(err, { fallbackMessage: 'Failed to change password.' });
      const fe: Record<string, string> = {};
      if (n.fieldErrors) {
        if (n.fieldErrors.old_password) fe.old = Array.isArray(n.fieldErrors.old_password) ? n.fieldErrors.old_password[0] : String(n.fieldErrors.old_password);
        if (n.fieldErrors.new_password) fe.new = Array.isArray(n.fieldErrors.new_password) ? n.fieldErrors.new_password[0] : String(n.fieldErrors.new_password);
      }
      if (!Object.keys(fe).length && n.message) fe.new = n.message;
      setPwErrors(fe);
    } finally {
      setPwSubmitting(false);
    }
  };

  const inp = (err?: boolean) =>
    `w-full rounded-2xl border-2 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:bg-white focus:ring-0 ${err ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-primary'}`;

  const displayName = [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || profileData.email;

  return (
    <div className="min-h-screen bg-slate-50/30">
      <Breadcrumbs items={[{ label: 'Profile', active: true }]} />

      <div className="container-shell pb-8 pt-8 sm:pb-16 lg:pb-20">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Header */}
          <header>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="h-[3px] w-5 rounded-full bg-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">My Account</p>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Account Profile</h1>
            <p className="mt-3 text-[13px] leading-6 text-slate-500">
              Manage your contact details, change your password, and view your request history.
            </p>
          </header>

          {profileLoading ? (
            <div className="section-panel py-16 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading profile...</p>
            </div>
          ) : (
            <>
              {/* ── Top two-column grid ── */}
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

                {/* Left column */}
                <div className="space-y-6">

                  {/* Profile form */}
                  <form onSubmit={handleProfileSave} className="section-panel space-y-6">
                    <div>
                      <p className="section-eyebrow">Account Details</p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Contact information</h2>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">First Name</label>
                        <input name="first_name" value={profileData.first_name} onChange={handleChange} placeholder="First name" className={inp(Boolean(profileErrors.first_name))} />
                        {profileErrors.first_name && <p className="text-[11px] font-semibold text-rose-500">{profileErrors.first_name}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Last Name</label>
                        <input name="last_name" value={profileData.last_name} onChange={handleChange} placeholder="Last name" className={inp(Boolean(profileErrors.last_name))} />
                        {profileErrors.last_name && <p className="text-[11px] font-semibold text-rose-500">{profileErrors.last_name}</p>}
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"><Mail size={11} />Email Address <span className="text-rose-400">*</span></label>
                        <input name="email" type="email" value={profileData.email} onChange={handleChange} placeholder="business@example.com" className={inp(Boolean(profileErrors.email))} />
                        {profileErrors.email && <p className="text-[11px] font-semibold text-rose-500">{profileErrors.email}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"><Phone size={11} />Phone Number</label>
                        <input name="phone" value={profileData.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inp()} />
                      </div>

                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"><Building2 size={11} />Company Name</label>
                        <input name="company_name" value={profileData.company_name} onChange={handleChange} placeholder="Your company name" className={inp(Boolean(profileErrors.company_name))} />
                        {profileErrors.company_name && <p className="text-[11px] font-semibold text-rose-500">{profileErrors.company_name}</p>}
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"><MapPin size={11} />Company Address</label>
                        <textarea name="company_address" value={profileData.company_address} onChange={handleChange} placeholder="Office / billing address" rows={2} className="w-full resize-none rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 transition-all focus:border-primary focus:bg-white focus:ring-0" />
                      </div>
                    </div>

                    {profileErrors.non_field_errors && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">{profileErrors.non_field_errors}</div>
                    )}

                    <div className="flex justify-end">
                      <button type="submit" disabled={profileSaving} className="inline-flex items-center justify-center gap-2 rounded-full bg-textMain px-7 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-black disabled:opacity-50">
                        {profileSaving ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving...</> : 'Save Changes'}
                      </button>
                    </div>
                  </form>

                  {/* Change password */}
                  <div className="section-panel space-y-5">
                    <div>
                      <p className="section-eyebrow">Security</p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Change Password</h2>
                    </div>

                    {pwDone ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                          <Check size={18} className="text-emerald-600" />
                        </div>
                        <p className="text-sm font-semibold text-emerald-800">Password updated successfully!</p>
                        <button type="button" onClick={() => setPwDone(false)} className="mt-3 text-[11px] font-semibold text-emerald-700 underline">Change again</button>
                      </div>
                    ) : (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Current Password <span className="text-rose-400">*</span></label>
                          <input type="password" value={pwOld} onChange={e => { setPwOld(e.target.value); if (pwErrors.old) setPwErrors(p => ({ ...p, old: '' })); }} placeholder="••••••••" autoComplete="current-password" className={inp(Boolean(pwErrors.old))} />
                          {pwErrors.old && <p className="text-[11px] font-semibold text-rose-500">{pwErrors.old}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">New Password <span className="text-rose-400">*</span></label>
                          <input type="password" value={pwNew} onChange={e => { setPwNew(e.target.value); if (pwErrors.new) setPwErrors(p => ({ ...p, new: '' })); }} placeholder="••••••••" autoComplete="new-password" className={inp(Boolean(pwErrors.new))} />
                          {pwErrors.new && <p className="text-[11px] font-semibold text-rose-500">{pwErrors.new}</p>}
                        </div>
                        <div className="flex justify-end">
                          <button type="submit" disabled={pwSubmitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-textMain px-7 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-black disabled:opacity-50">
                            {pwSubmitting ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />Updating...</> : 'Reset Password'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="space-y-6">
                  {/* Account card */}
                  <div className="surface-panel-dark relative overflow-hidden p-6">
                    <div className="absolute right-0 top-0 h-32 w-32 translate-x-16 -translate-y-16 rotate-45 bg-primary opacity-20" />
                    <div className="relative z-10">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Your account</p>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                          <User size={22} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{displayName}</p>
                          <p className="truncate text-[11px] text-white/60">{profileData.email}</p>
                        </div>
                      </div>
                      <div className="mt-4 divide-y divide-white/10">
                        {profileData.company_name && (
                          <div className="flex items-start justify-between gap-3 py-2.5">
                            <span className="text-[11px] font-medium uppercase text-white/50">Company</span>
                            <span className="max-w-[55%] break-words text-right text-[12px] font-semibold text-white">{profileData.company_name}</span>
                          </div>
                        )}
                        {profileData.company_address && (
                          <div className="flex items-start justify-between gap-3 py-2.5">
                            <span className="text-[11px] font-medium uppercase text-white/50">Location</span>
                            <span className="max-w-[55%] break-words text-right text-[12px] font-semibold text-white">{profileData.company_address}</span>
                          </div>
                        )}
                        {memberSince && (
                          <div className="flex items-start justify-between gap-3 py-2.5">
                            <span className="text-[11px] font-medium uppercase text-white/50">Member since</span>
                            <span className="text-right text-[12px] font-semibold text-white">{memberSince}</span>
                          </div>
                        )}
                        {lastLogin && (
                          <div className="flex items-start justify-between gap-3 py-2.5">
                            <span className="text-[11px] font-medium uppercase text-white/50">Last login</span>
                            <span className="max-w-[55%] break-words text-right text-[12px] font-semibold text-white">{lastLogin}</span>
                          </div>
                        )}
                        <div className="pt-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Verified partner</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity counts */}
                  <div className="section-panel space-y-4">
                    <p className="section-eyebrow">Activity</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setHistoryTab('enquiries')} className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-4 transition-colors ${historyTab === 'enquiries' ? 'border-primary/30 bg-primary/5' : 'border-slate-100 bg-slate-50 hover:border-primary/20'}`}>
                        <FileText size={18} className={historyTab === 'enquiries' ? 'text-primary' : 'text-slate-400'} />
                        <p className="text-2xl font-black text-slate-900">{enquiries.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Enquiries</p>
                      </button>
                      <button type="button" onClick={() => setHistoryTab('quotes')} className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-4 transition-colors ${historyTab === 'quotes' ? 'border-primary/30 bg-primary/5' : 'border-slate-100 bg-slate-50 hover:border-primary/20'}`}>
                        <ClipboardList size={18} className={historyTab === 'quotes' ? 'text-primary' : 'text-slate-400'} />
                        <p className="text-2xl font-black text-slate-900">{quotes.length}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quotes</p>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">Click a card to jump to that section below</p>
                  </div>

                  {/* Quick links */}
                  <div className="section-panel space-y-3">
                    <p className="section-eyebrow">Quick Links</p>
                    <Link to="/products" className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/30 hover:bg-primary/5">
                      <span>Browse Catalog</span>
                      <ArrowRight size={14} className="text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* ── Full-width request history ── */}
              <div className="section-panel space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="section-eyebrow">History</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Request History</h2>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => setHistoryTab('enquiries')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${historyTab === 'enquiries' ? 'bg-textMain text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    <FileText size={12} />
                    Enquiries
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${historyTab === 'enquiries' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{enquiries.length}</span>
                  </button>
                  <button type="button" onClick={() => setHistoryTab('quotes')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all ${historyTab === 'quotes' ? 'bg-textMain text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    <ClipboardList size={12} />
                    Quote Requests
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${historyTab === 'quotes' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{quotes.length}</span>
                  </button>
                </div>

                {/* Enquiries list */}
                {historyTab === 'enquiries' && (
                  enquiries.length === 0 ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center">
                      <FileText size={36} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No enquiries yet</p>
                      <p className="mt-2 text-[13px] text-slate-400">Browse the catalog and send an enquiry from a product page.</p>
                      <Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-textMain hover:opacity-90">
                        Explore products <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {enquiries.map((item: any) => {
                        const st = getStatus(ENQUIRY_STATUS, item.status);
                        return (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-primary/30">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-300">
                                  <Package size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{item.product_name || 'General Enquiry'}</p>
                                    {item.product_id && (
                                      <Link to={`/product/${item.product_id}`} className="text-[10px] font-black uppercase tracking-wide text-primary hover:underline">View product</Link>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    {item.company_name && <span>{item.company_name}</span>}
                                    {item.quantity && <><span className="hidden sm:inline">·</span><span>Qty: {item.quantity}</span></>}
                                    <span className="hidden sm:inline">·</span>
                                    <span>#{String(item.id).padStart(5, '0')}</span>
                                    <span className="hidden sm:inline">·</span>
                                    <span>{formatDate(item.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${st.color}`}>
                                {st.icon}{st.label}
                              </div>
                            </div>
                            {item.description && (
                              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">Description</p>
                                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Quote requests list */}
                {historyTab === 'quotes' && (
                  quotes.length === 0 ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 py-12 text-center">
                      <ClipboardList size={36} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No quote requests yet</p>
                      <p className="mt-2 text-[13px] text-slate-400">Open any product and click "Request Price" to submit a quote.</p>
                      <Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-textMain hover:opacity-90">
                        Explore products <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map((item: any) => {
                        const st = getStatus(QUOTE_STATUS, item.status);
                        return (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-primary/30">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-300">
                                  <ClipboardList size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{item.product_name || item.product?.name || 'Price Request'}</p>
                                    {(item.product_id || item.product?.id) && (
                                      <Link to={`/product/${item.product_id || item.product?.id}`} className="text-[10px] font-black uppercase tracking-wide text-primary hover:underline">View product</Link>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    {item.company_name && <span>{item.company_name}</span>}
                                    {item.quantity && <><span className="hidden sm:inline">·</span><span>Qty: {item.quantity}</span></>}
                                    <span className="hidden sm:inline">·</span>
                                    <span>#{String(item.id).padStart(5, '0')}</span>
                                    <span className="hidden sm:inline">·</span>
                                    <span>{formatDate(item.created_at || item.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${st.color}`}>
                                {st.icon}{st.label}
                              </div>
                            </div>
                            {(item.description || item.message) && (
                              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">Message</p>
                                <p className="text-sm leading-relaxed text-slate-600">{item.description || item.message}</p>
                              </div>
                            )}
                            {['quoted', 'quote_sent'].includes(String(item.status).toLowerCase()) && item.quoted_price && (
                              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 mb-1">Quoted Price</p>
                                <p className="text-xl font-black text-emerald-700">₹{Number(item.quoted_price).toLocaleString('en-IN')}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
