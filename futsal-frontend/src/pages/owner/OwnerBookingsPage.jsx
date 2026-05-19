import { useState, useEffect } from 'react';
import { getBookings } from '../../services/bookingService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { value: '',          label: 'All',       activeColor: '#191919' },
  { value: 'pending',   label: 'Pending',   activeColor: '#d97706' },
  { value: 'confirmed', label: 'Confirmed', activeColor: '#16a34a' },
  { value: 'cancelled', label: 'Cancelled', activeColor: '#dc2626' },
  { value: 'completed', label: 'Completed', activeColor: '#7c3aed' },
];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

const avatarColor = (name = '') => {
  const colors = ['bg-tint-lavender text-primary','bg-tint-mint text-success','bg-tint-sky text-link-blue','bg-tint-peach text-brand-orange-deep'];
  return colors[name.charCodeAt(0) % colors.length];
};

const OwnerBookingsPage = () => {
  const [bookings, setBookings]     = useState([]);
  const [allStats, setAllStats]     = useState({ total: 0, pending: 0, confirmed: 0, revenue: 0 });
  const [loading, setLoading]       = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]             = useState(1);
  const [status, setStatus]         = useState('');

  useEffect(() => {
    setStatsLoading(true);
    getBookings({ limit: 500 })
      .then((res) => {
        const all = res.data.bookings || [];
        setAllStats({
          total:     all.length,
          pending:   all.filter((b) => b.status === 'pending').length,
          confirmed: all.filter((b) => b.status === 'confirmed').length,
          revenue:   all.filter((b) => b.paymentStatus === 'paid').reduce((s, b) => s + (b.totalAmount || 0), 0),
        });
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page };
    if (status) params.status = status;
    getBookings(params)
      .then((res) => { setBookings(res.data.bookings); setPagination(res.data.pagination); })
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, [page, status]);

  const statCards = [
    { label: 'Total bookings', value: allStats.total,     tint: 'bg-tint-lavender', icon: '📋', text: 'text-primary' },
    { label: 'Pending',        value: allStats.pending,   tint: 'bg-tint-yellow',   icon: '⏳', text: 'text-warning' },
    { label: 'Confirmed',      value: allStats.confirmed, tint: 'bg-tint-mint',     icon: '✅', text: 'text-success' },
    { label: 'Revenue (paid)', value: formatCurrency(allStats.revenue), tint: 'bg-tint-sky', icon: '💰', text: 'text-link-blue' },
  ];

  return (
    <div className="space-y-6">

      <div className="rounded-2xl overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0f0e2a 0%, #1a1940 60%, #2d1b69 100%)' }}>
        <div className="px-7 py-7">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                 style={{ color: 'rgba(167,139,250,0.8)' }}>Owner Panel</p>
              <h1 className="text-white font-bold text-2xl" style={{ letterSpacing: '-0.5px' }}>
                Bookings
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                All reservations across your courts
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span className="text-sm text-white/80 font-medium">Live updates</span>
            </div>
          </div>

          {!statsLoading && (
            <div className="flex flex-wrap gap-3 mt-5">
              {statCards.map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-[11px] text-white/50 leading-none">{label}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, tint, icon, text }) => (
          <div key={label} className={`rounded-xl p-5 ${tint}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{icon}</span>
              <span className={`text-xs font-semibold ${text} bg-white/60 rounded-full px-2 py-0.5`}>
                {label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${text}`}>{statsLoading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ value, label, activeColor }) => {
          const isActive = status === value;
          return (
            <button
              key={value || 'all'}
              onClick={() => { setStatus(value); setPage(1); }}
              className="text-sm font-semibold px-4 py-1.5 rounded-full border transition-all"
              style={isActive
                ? { backgroundColor: activeColor, color: '#ffffff', borderColor: activeColor }
                : { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <PageSpinner />
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-hairline p-14 text-center">
          <div className="w-16 h-16 bg-tint-lavender rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📅</span>
          </div>
          <p className="text-base font-semibold text-ink-deep">No bookings yet</p>
          <p className="text-sm text-slate mt-1">
            {status ? `No ${status} bookings found.` : 'Bookings will appear here once customers reserve your courts.'}
          </p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-hairline flex items-center justify-between bg-gray-50/60">
              <p className="text-xs font-semibold text-steel uppercase tracking-wider">
                {pagination?.total ?? bookings.length} booking{(pagination?.total ?? bookings.length) !== 1 ? 's' : ''}
              </p>
              {status && (
                <span className="text-xs text-primary font-medium bg-primary-light rounded-full px-3 py-0.5 capitalize">
                  Filtered: {status}
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Court</th>
                    <th>Date</th>
                    <th>Time slot</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(b.userId?.name)}`}>
                            {initials(b.userId?.name || '?')}
                          </div>
                          <div>
                            <p className="font-medium text-ink-deep text-sm leading-tight">{b.userId?.name || 'Unknown'}</p>
                            {b.userId?.phone && <p className="text-xs text-steel">{b.userId.phone}</p>}
                          </div>
                        </div>
                      </td>

                      <td>
                        <p className="text-sm font-medium text-ink-deep">{b.courtId?.courtName || '—'}</p>
                        {b.courtId?.location && <p className="text-xs text-steel">{b.courtId.location}</p>}
                      </td>

                      <td>
                        <p className="text-sm text-ink-deep">{formatDate(b.bookingDate)}</p>
                      </td>

                      <td>
                        <span className="text-xs bg-tint-sky text-link-blue font-medium px-2 py-1 rounded-md whitespace-nowrap">
                          {formatTime(b.startTime)} – {formatTime(b.endTime)}
                        </span>
                      </td>

                      <td>
                        <p className="font-semibold text-ink-deep text-sm">{formatCurrency(b.totalAmount)}</p>
                        <Badge
                          status={b.paymentStatus === 'paid' ? 'confirmed' : 'pending'}
                          label={b.paymentStatus}
                        />
                      </td>

                      <td>
                        <Badge status={b.status} label={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default OwnerBookingsPage;
