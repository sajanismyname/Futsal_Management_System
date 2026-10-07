import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCourts } from '../services/courtService';
import { formatCurrency } from '../utils/helpers';
import { KhaltiLogo, EsewaLogo } from '../components/ui/PaymentLogos';
import Footer from '../components/layout/Footer';

const features = [
  {
    tint: 'bg-tint-lavender',
    icon: '⚡',
    title: 'Real-time booking',
    body: 'Atomic slot conflict detection eliminates double-bookings entirely. Book and pay in under 60 seconds.',
  },
  {
    tint: 'bg-tint-mint',
    icon: '💳',
    title: 'Khalti & eSewa payments',
    body: 'Both Nepal payment gateways supported with server-side verification. Your money is always safe.',
  },
  {
    tint: 'bg-tint-sky',
    icon: '🏆',
    title: 'Tournament engine',
    body: 'Round-robin fixtures, live score updates, and auto-calculated standings — full lifecycle management.',
  },
  {
    tint: 'bg-tint-peach',
    icon: '🔒',
    title: 'Role-based access',
    body: 'Customer, Owner, and Admin roles with precisely scoped permissions at every layer.',
  },
];

const stats = [
  { value: '2 sec', label: 'Average booking time' },
  { value: '100%', label: 'Payment verification' },
  { value: '3 roles', label: 'Access control levels' },
  { value: '24/7', label: 'Slot availability' },
];

const fallbackCourts = [
  { name: 'Green Arena', loc: 'Kathmandu', price: 1500, courtType: '5A', dot: '#22c55e', tag: 'Open', tagBg: '#d1fae5', tagColor: '#16a34a' },
  { name: 'Thunder Court', loc: 'Lalitpur', price: 1200, courtType: '7A', dot: '#2563eb', tag: 'Open', tagBg: '#dbeafe', tagColor: '#2563eb' },
  { name: 'Goal Zone', loc: 'Bhaktapur', price: 1000, courtType: '5A', dot: '#8b5cf6', tag: 'Open', tagBg: '#ede9fe', tagColor: '#5b21b6' },
];

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [courts, setCourts] = useState([]);
  const [loadingCourts, setLoadingCourts] = useState(true);

  useEffect(() => {
    getCourts({ limit: 6 })
      .then((res) => {
        setCourts(res.data?.courts || []);
      })
      .catch(() => {})
      .finally(() => setLoadingCourts(false));
  }, []);

  const displayCourts = courts.length > 0 ? courts.slice(0, 3) : fallbackCourts;

  return (
    <div className="bg-white">

      {/* ── HERO BAND ─────────────────────────────────────── */}
      <section className="hero-band relative overflow-hidden">
        {/* Large decorative blur orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
               style={{ background: '#8b5cf6', top: '-60px', left: '-80px' }} />
          <div className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
               style={{ background: '#2563eb', bottom: '0px', right: '-60px' }} />
          <div className="absolute w-64 h-64 rounded-full opacity-10 blur-2xl"
               style={{ background: '#f472b6', top: '40%', right: '20%' }} />
        </div>

        <div className="container-page py-20 lg:py-28 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Nepal's premier futsal platform
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-semibold mb-6 mx-auto max-w-4xl"
            style={{ fontSize: 'clamp(38px, 6.5vw, 76px)', lineHeight: 1.06, letterSpacing: '-2px', color: '#ffffff' }}
          >
            Manage futsal courts<br />
            <span style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              like never before.
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed px-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Real-time bookings, secure payments, and tournament management — all in one workspace built for Nepal's futsal community.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Get started free
            </Link>
            <Link to="/courts" className="btn-secondary-on-dark text-base px-6 py-3">
              Browse courts
            </Link>
          </div>

          {/* Mockup browser card with REAL CLICKABLE COURTS */}
          <div className="mt-14 sm:mt-16 mx-auto max-w-3xl px-2">
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl transition-all" style={{ boxShadow: 'rgba(0,0,0,0.4) 0px 24px 64px -8px, rgba(124,58,237,0.3) 0px 0px 0px 1px' }}>
              {/* Browser chrome */}
              <div className="h-9 bg-gray-100 flex items-center justify-between px-4 border-b border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
                  <span className="text-xs text-gray-400 ml-3 bg-white rounded px-3 py-0.5 border border-gray-200">
                    futsalmgmt.com/courts
                  </span>
                </div>
                <Link to="/courts" className="text-xs text-primary font-medium hover:underline hidden sm:block">
                  Explore all →
                </Link>
              </div>
              {/* Content with Clickable Cards */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left bg-white">
                {displayCourts.map((c, i) => {
                  const targetId = c._id;
                  const courtName = c.courtName || c.name;
                  const location = c.location || c.loc;
                  const price = c.price || 1200;
                  const type = c.courtType || '5A';
                  const imgUrl = c.images?.[0]?.url;

                  return (
                    <Link
                      key={targetId || i}
                      to={targetId ? `/courts/${targetId}` : '/courts'}
                      className="bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-primary/40 hover:shadow-md transition-all group block text-decoration-none"
                    >
                      <div className="w-full h-20 sm:h-24 rounded-lg mb-2.5 overflow-hidden relative bg-gray-200">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={courtName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(37,99,235,0.12))' }}
                          >
                            <span className="text-2xl">🏟️</span>
                          </div>
                        )}
                        <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-gray-800 shadow-sm">
                          {type}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                        {courtName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">📍 {location}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60">
                        <span className="text-xs font-bold text-gray-900">{formatCurrency(price)}<span className="text-[10px] text-gray-500 font-normal">/hr</span></span>
                        <span className="text-[10px] font-semibold text-primary group-hover:underline">
                          Book →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="border-b border-hairline bg-gray-50">
        <div className="container-page py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl sm:text-3xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>{value}</p>
                <p className="text-xs sm:text-sm text-slate mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DISCOVER COURTS SECTION ──────────────────────── */}
      <section className="section-band bg-white">
        <div className="container-page">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <p className="section-label mb-2">Discover Courts</p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>
                Featured arenas near you
              </h2>
              <p className="text-slate text-sm sm:text-base mt-1.5">
                Check real-time slot availability, instant confirmation, and verified venues
              </p>
            </div>
            <Link to="/courts" className="btn-secondary self-start sm:self-auto flex items-center gap-2">
              Browse all courts <span className="text-base">→</span>
            </Link>
          </div>

          {loadingCourts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="card p-4 animate-pulse">
                  <div className="w-full h-44 bg-gray-200 rounded-lg mb-4" />
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-12 card bg-gray-50 p-6">
              <span className="text-4xl mb-3 block">🏟️</span>
              <p className="text-ink-deep font-semibold">No courts listed yet</p>
              <p className="text-slate text-sm mt-1">Be the first to list a futsal court in your area!</p>
              <Link to="/register" className="btn-primary mt-4 inline-flex">Register as owner</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courts.map((court) => (
                <Link
                  key={court._id}
                  to={`/courts/${court._id}`}
                  className="card hover:shadow-card transition-all duration-200 hover:-translate-y-1 overflow-hidden group flex flex-col"
                >
                  <div className="aspect-[16/10] bg-gray-100 overflow-hidden relative">
                    {court.images?.[0] ? (
                      <img
                        src={court.images[0].url}
                        alt={court.courtName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
                        <span className="text-4xl">🏟️</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/95 backdrop-blur-sm shadow-sm text-xs font-semibold px-2.5 py-1 rounded-full text-brand-navy">
                        {court.courtType} Side
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-ink-deep text-lg mb-1 group-hover:text-primary transition-colors">
                        {court.courtName}
                      </h3>
                      <p className="text-sm text-slate mb-4">📍 {court.location}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-hairline">
                      <div>
                        <span className="text-lg font-bold text-ink-deep">{formatCurrency(court.price)}</span>
                        <span className="text-xs text-slate"> / hr</span>
                      </div>
                      <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Book now →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="section-band bg-gray-50/60 border-t border-hairline">
        <div className="container-page">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Why Futsal Management</p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-ink-deep mb-4" style={{ letterSpacing: '-0.5px' }}>
              Keep your courts running 24/7
            </h2>
            <p className="text-base sm:text-lg text-slate max-w-xl mx-auto">
              Every tool you need to manage bookings, payments, and tournaments in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ tint, icon, title, body }) => (
              <div key={title} className={`rounded-xl p-6 ${tint}`}>
                {title.includes('Khalti & eSewa') ? (
                  <div className="flex items-center gap-2 mb-4">
                    <KhaltiLogo className="w-8 h-8 rounded-lg" />
                    <EsewaLogo className="w-8 h-8 rounded-lg" />
                  </div>
                ) : (
                  <div className="text-2xl mb-4">{icon}</div>
                )}
                <h3 className="text-base font-semibold text-ink-deep mb-2">{title}</h3>
                <p className="text-sm text-charcoal leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── YELLOW BANNER ─────────────────────────────────── */}
      <section className="section-band-sm">
        <div className="container-page">
          <div className="bg-tint-yellow-bold rounded-2xl p-10 lg:p-16 flex flex-col lg:flex-row items-center gap-8 justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-brown mb-2">For Court Owners</p>
              <h2 className="text-3xl font-semibold text-ink-deep mb-3" style={{ letterSpacing: '-0.5px' }}>
                List your court,<br />grow your business.
              </h2>
              <p className="text-base text-charcoal max-w-md leading-relaxed">
                Create your court profile, set your prices and hours, and start receiving bookings today. No setup fees.
              </p>
            </div>
            <div className="flex flex-col gap-3 flex-shrink-0">
              <Link to="/register" className="btn-dark text-base px-6 py-3">
                Register as owner
              </Link>
              <Link to="/courts" className="btn-ghost text-base text-center">
                See example listings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="section-band bg-gray-50">
          <div className="container-page text-center max-w-2xl mx-auto">
            <h2 className="text-4xl font-semibold text-ink-deep mb-4" style={{ letterSpacing: '-0.5px' }}>
              Ready to play?
            </h2>
            <p className="text-lg text-slate mb-8">
              Join thousands of players and court owners across Nepal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="btn-primary text-base px-6 py-3">Get started free</Link>
              <Link to="/courts" className="btn-secondary text-base px-6 py-3">Browse courts</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Full footer — landing page only ──────────────── */}
      <Footer />
    </div>
  );
};

export default HomePage;
