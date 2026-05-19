import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../../services/adminService';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then((r) => setStats(r.data.stats))   // backend wraps data in .stats
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: 'Total users',        value: stats?.totalUsers ?? '—',      icon: '👥', tint: 'bg-tint-sky',      text: 'text-link-blue' },
    { label: 'Total courts',       value: stats?.totalCourts ?? '—',     icon: '🏟️', tint: 'bg-tint-lavender', text: 'text-primary' },
    { label: 'Total bookings',     value: stats?.totalBookings ?? '—',   icon: '📋', tint: 'bg-tint-mint',     text: 'text-success' },
    { label: 'Total revenue',      value: stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : '—', icon: '💰', tint: 'bg-tint-yellow', text: 'text-warning' },
    { label: 'Pending approvals',  value: stats?.pendingCourts ?? '—',  icon: '⏳', tint: 'bg-tint-peach',    text: 'text-brand-orange-deep' },
    { label: 'Active tournaments', value: stats?.activeTournaments ?? '—',icon: '🏆', tint: 'bg-tint-rose',    text: 'text-brand-pink-deep' },
  ];

  const quickLinks = [
    { to: '/admin/users',    label: 'Manage users',    icon: '👥', tint: 'bg-tint-sky' },
    { to: '/admin/courts',   label: 'Approve courts',  icon: '🏟️', tint: 'bg-tint-lavender',
      badge: stats?.pendingCourts > 0 ? stats.pendingCourts : null },
    { to: '/admin/bookings', label: 'View bookings',   icon: '📋', tint: 'bg-tint-mint' },
    { to: '/admin/payments', label: 'Payments',        icon: '💰', tint: 'bg-tint-yellow' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Banner ───────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0f0e2a 0%, #1a1940 50%, #1e3a5f 100%)' }}>
        <div className="px-7 py-7 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
               style={{ color: 'rgba(96,165,250,0.8)' }}>Admin Panel</p>
            <h1 className="text-white font-bold text-2xl" style={{ letterSpacing: '-0.5px' }}>
              System Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Full platform overview and controls
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {stats?.pendingCourts > 0 && (
              <Link to="/admin/courts"
                className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                style={{ backgroundColor: 'rgba(217,119,6,0.2)', border: '1px solid rgba(217,119,6,0.4)' }}>
                <span className="text-base">⚠️</span>
                <span className="text-sm text-white font-medium">
                  {stats.pendingCourts} court{stats.pendingCourts > 1 ? 's' : ''} awaiting approval
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* ── Quick links ──────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map(({ to, label, icon, tint, badge }) => (
          <Link key={to} to={to}
            className={`${tint} rounded-xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity relative`}>
            <span className="text-xl">{icon}</span>
            <p className="text-sm font-semibold text-ink-deep">{label}</p>
            {badge && (
              <span className="absolute top-3 right-3 w-5 h-5 bg-error rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Revenue chart ────────────────────────────── */}
      {stats?.revenueByMonth?.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-ink-deep">Monthly revenue</h2>
            <span className="text-xs text-steel bg-gray-50 rounded-full px-3 py-1">NPR</span>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByMonth} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e2e0" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                       tick={{ fill: '#9b9a97', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false}
                       tick={{ fill: '#9b9a97', fontSize: 11 }}
                       tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e3e2e0', borderRadius: 8, fontSize: 12, color: '#373530' }}
                  formatter={(v) => [formatCurrency(v), 'Revenue']}
                  cursor={{ fill: '#f7f6f3' }}
                />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
