import { useState, useEffect } from 'react';
import { getAdminBookings } from '../../services/adminService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      const r = await getAdminBookings(params);
      setBookings(r.data.bookings);
      setPagination(r.data.pagination);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>All bookings</h1>
          <p className="text-sm text-slate mt-1">Platform-wide booking overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['', 'pending', 'confirmed', 'cancelled', 'completed'].map((s) => (
            <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${statusFilter === s ? 'bg-ink-deep text-on-dark border-ink-deep' : 'text-slate border-hairline hover:border-hairline-strong hover:text-ink'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <>
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Court</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-slate py-10">No bookings found</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <p className="font-medium text-ink-deep text-sm">{b.userId?.name}</p>
                      <p className="text-xs text-steel">{b.userId?.email}</p>
                    </td>
                    <td className="text-sm">{b.courtId?.courtName}</td>
                    <td className="text-sm">{formatDate(b.bookingDate)}</td>
                    <td className="text-xs text-slate">{formatTime(b.startTime)} – {formatTime(b.endTime)}</td>
                    <td className="font-medium text-ink-deep">{formatCurrency(b.totalAmount)}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <Badge status={b.status} label={b.status} />
                        <Badge status={b.paymentStatus} label={b.paymentStatus} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AdminBookingsPage;
