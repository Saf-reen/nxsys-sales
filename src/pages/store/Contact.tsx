import { Clock, Mail, MapPin, Phone, ChevronRight } from 'lucide-react';
import Breadcrumbs from '@/components/common/Breadcrumbs';

const contactItems = [
  {
    Icon: MapPin,
    label: 'Our Office',
    content: (
      <p className="text-[15px] font-semibold leading-7 text-slate-700">
        First Floor, 1-121/63 Survey No. 63 Part Hotel,<br />
        Sitara Grand Backside, Miyapur, Hyderabad,<br />
        Telangana, India 500049
      </p>
    ),
  },
  {
    Icon: Phone,
    label: 'Phone',
    content: (
      <a
        href="tel:+919701314138"
        className="text-[18px] font-bold text-slate-800 transition-colors hover:text-primary sm:text-[22px]"
      >
        +91 97013 14138
      </a>
    ),
  },
  {
    Icon: Mail,
    label: 'Email',
    content: (
      <a
        href="mailto:sales@sriainfotech.com"
        className="break-all text-[18px] font-bold text-slate-800 transition-colors hover:text-primary sm:text-[22px]"
      >
        sales@sriainfotech.com
      </a>
    ),
  },
];

function Contact() {
  return (
    <div className="min-h-screen bg-greyLight">
      <Breadcrumbs items={[{ label: 'Contact', active: true }]} />
      {/* Hero */}
      <div className="relative overflow-hidden bg-textMain py-20 sm:py-32">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'rgba(251,198,29,0.08)' }}
        />
        <div className="container-shell relative">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">B2B Support</p>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Enterprise Contact
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-300">
              Connect with our team for custom bulk quote inquiries, infrastructure proposals,
              and strategic after-sales support.
            </p>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="container-shell -mt-10 mb-20 sm:-mt-14 sm:mb-28">
        <div className="mx-auto max-w-4xl space-y-6">

          {/* Contact info card */}
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-12">
            <div className="space-y-10">
              {contactItems.map(({ Icon, label, content }) => (
                <div key={label} className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-[0_8px_20px_rgba(251,198,29,0.25)]">
                    <Icon size={24} className="text-textMain" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      {label}
                    </p>
                    {content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business hours card */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-textMain p-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-10">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div
              className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl"
              style={{ background: 'rgba(251,198,29,0.08)' }}
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-[0_8px_20px_rgba(251,198,29,0.3)]">
                <Clock size={24} className="text-textMain" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                  Business Hours
                </p>
                <p className="text-[16px] font-bold text-white sm:text-[18px]">
                  Always available for our partners
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                    Active &amp; Operational 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Help note */}
          <p className="text-center text-[12px] font-medium text-slate-400">
            For technical support call our emergency line or email{' '}
            <a href="mailto:sales@sriainfotech.com" className="font-semibold text-slate-600 hover:text-primary transition-colors">
              sales@sriainfotech.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Contact;
