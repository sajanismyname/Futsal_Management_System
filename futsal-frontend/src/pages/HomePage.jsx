import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

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

        <div className="container-page py-24 lg:py-32 text-center relative z-10">
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

          <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Real-time bookings, secure payments, and tournament management — all in one workspace built for Nepal's futsal community.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Get started free
            </Link>
            <Link to="/courts" className="btn-secondary-on-dark text-base px-6 py-3">
              Browse courts
            </Link>
          </div>

          {/* Mockup browser card */}
          <div className="mt-16 mx-auto max-w-3xl">
            <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: 'rgba(0,0,0,0.4) 0px 24px 64px -8px, rgba(124,58,237,0.3) 0px 0px 0px 1px' }}>
              {/* Browser chrome */}
              <div className="h-9 bg-gray-100 flex items-center gap-1.5 px-4 border-b border-gray-200">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#febc2e' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
                <span className="text-xs text-gray-400 ml-3 bg-white rounded px-3 py-0.5 border border-gray-200">
                  futsalmgmt.com/courts
                </span>
              </div>
              {/* Content */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left bg-white">
                {[
                  { name: 'Green Arena', loc: 'Kathmandu', price: 'Rs 1,500/hr', dot: '#22c55e', tag: 'Open', tagBg: '#d1fae5', tagColor: '#16a34a' },
                  { name: 'Thunder Court', loc: 'Lalitpur',  price: 'Rs 1,200/hr', dot: '#2563eb', tag: 'Open', tagBg: '#dbeafe', tagColor: '#2563eb' },
                  { name: 'Goal Zone',    loc: 'Bhaktapur', price: 'Rs 1,000/hr', dot: '#8b5cf6', tag: 'Open', tagBg: '#ede9fe', tagColor: '#5b21b6' },
                ].map((c) => (
                  <div key={c.name} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="w-full h-14 rounded-md mb-3 flex items-center justify-center"
                         style={{ background: `linear-gradient(135deg, ${c.dot}22, ${c.dot}44)` }}>
                      <span className="text-2xl">⚽</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.loc}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-gray-700">{c.price}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: c.tagBg, color: c.tagColor }}>
                        {c.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="border-b border-hairline bg-gray-50">
        <div className="container-page py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>{value}</p>
                <p className="text-sm text-slate mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section className="section-band">
        <div className="container-page">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Why Futsal Management</p>
            <h2 className="text-4xl font-semibold text-ink-deep mb-4" style={{ letterSpacing: '-0.5px' }}>
              Keep your courts running 24/7
            </h2>
            <p className="text-lg text-slate max-w-xl mx-auto">
              Every tool you need to manage bookings, payments, and tournaments in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ tint, icon, title, body }) => (
              <div key={title} className={`rounded-xl p-6 ${tint}`}>
                <div className="text-2xl mb-4">{icon}</div>
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
