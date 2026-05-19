import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyCourts } from '../../services/courtService';
import { getBookings } from '../../services/bookingService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats]               = useState(null);
  const [courts, setCourts]             = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      getMyCourts().catch(() => null),
      getBookings({ page: 1 }).catch(() => null),
    ]).then(([courtsRes, bookingsRes]) => {
      const cs = courtsRes?.data?.courts || [];
      const bs = bookingsRes?.data?.bookings || [];
      setCourts(cs);
      setStats({
        totalCourts:    cs.length,
        totalBookings:  bookingsRes?.data?.pagination?.total || 0,
        pendingBookings: bs.filter((b) => b.status === 'pending').length,
        totalRevenue:   bs.filter((b) => b.paymentStatus === 'paid').reduce((s, b) => s + (b.totalAmount || 0), 0),
      });
      setRecentBookings(bs.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const pendingCourts = courts.filter((c) => c.approvalStatus === 'pending');

  const statCards = [
    { label: 'My courts',      value: stats.totalCourts,    icon: '🏟️', tint: 'bg-tint-lavender', text: 'text-primary' },
    { label: 'Total bookings', value: stats.totalBookings,  icon: '📋', tint: 'bg-tint-sky',      text: 'text-link-blue' },
    { label: 'Awaiting',       value: stats.pendingBookings,icon: '⏳', tint: 'bg-tint-yellow',   text: 'text-warning' },
    { label: 'Revenue (paid)', value: formatCurrency(stats.totalRevenue), icon: '💰', tint: 'bg-tint-mint', text: 'text-success' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0f0e2a 0%, #1a1940 60%, #2d1b69 100%)' }}>
        <div className="px-7 py-7">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                 style={{ color: 'rgba(167,139,250,0.8)' }}>Owner Panel</p>
              <h1 className="text-white font-bold text-2xl" style={{ letterSpacing: '-0.5px' }}>
                Welcome back, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Here's what's happening with your courts today
              </p>
            </div>
            <Link to="/owner/courts/new" className="btn-primary flex-shrink-0">
              + Add court
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pending approval notice ───────────────────── */}
      {pendingCourts.length > 0 && (
        <div className="bg-tint-yellow rounded-xl p-4 flex items-center gap-4 border border-yellow-200">
          <span className="text-2xl">⏳</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-brown">
              {pendingCourts.length} court{pendingCourts.length > 1 ? 's' : ''} awaiting admin approval
            </p>
            <p className="text-xs text-brand-brown/70 mt-0.5">
              {pendingCourts.map((c) => c.courtName).join(', ')}
            </p>
          </div>
          <Link to="/owner/courts" className="btn-sm flex-shrink-0">View</Link>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, tint, text }) => (
          <div key={label} className={`rounded-xl p-5 ${tint}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{icon}</span>
            </div>
            <p className={`text-2xl font-bold ${text}`}>{value}</p>
            <p className="text-sm text-charcoal mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Quick actions ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { to: '/owner/courts', label: '🏟️  Manage courts', sub: `${stats.totalCourts} listed`, tint: 'bg-tint-lavender' },
          { to: '/owner/bookings', label: '📋  View bookings', sub: `${stats.pendingBookings} pending`, tint: 'bg-tint-sky' },
          { to: '/tournaments/new', label: '🏆  Create tournament', sub: 'For court owners', tint: 'bg-tint-mint' },
        ].map(({ to, label, sub, tint }) => (
          <Link key={to} to={to}
            className={`${tint} rounded-xl p-4 flex items-center justify-between hover:opacity-90 transition-opacity`}>
            <div>
              <p className="text-sm font-semibold text-ink-deep">{label}</p>
              <p className="text-xs text-charcoal mt-0.5">{sub}</p>
            </div>
            <span className="text-steel text-lg">→</span>
          </Link>
        ))}
      </div>

      {/* ── Recent bookings ───────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h2 className="text-sm font-semibold text-ink-deep">Recent bookings</h2>
          <Link to="/owner/bookings" className="btn-link text-xs">View all →</Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-slate text-sm">No bookings yet</p>
            <p className="text-xs text-steel mt-1">Bookings appear here once customers reserve your courts</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Court</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b._id}>
                  <td className="font-medium text-ink-deep">{b.courtId?.courtName || '—'}</td>
                  <td>
                    <p className="text-sm text-ink-deep">{b.userId?.name || '—'}</p>
                    {b.userId?.phone && <p className="text-xs text-steel">{b.userId.phone}</p>}
                  </td>
                  <td className="text-sm">{formatDate(b.bookingDate)}</td>
                  <td className="font-medium text-ink-deep text-sm">{formatCurrency(b.totalAmount)}</td>
                  <td><Badge status={b.status} label={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default OwnerDashboard;
