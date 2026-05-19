import { useState, useEffect } from 'react';
import { getAdminPayments } from '../../services/adminService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      const r = await getAdminPayments(params);
      setPayments(r.data.payments);
      setPagination(r.data.pagination);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayments(); }, [page, statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Payments</h1>
          <p className="text-sm text-slate mt-1">Transaction history across the platform</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['', 'pending', 'completed', 'failed', 'refunded'].map((s) => (
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
              <thead><tr><th>User</th><th>Court</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-slate py-10">No payments found</td></tr>
                ) : payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <p className="font-medium text-ink-deep text-sm">{p.userId?.name}</p>
                      <p className="text-xs text-steel">{p.userId?.email}</p>
                    </td>
                    <td className="text-sm text-slate">{p.bookingId?.courtId?.courtName || '—'}</td>
                    <td className="font-semibold text-ink-deep">{formatCurrency(p.amount)}</td>
                    <td>
                      <span className="text-xs font-medium bg-gray-50 border border-hairline rounded-md px-2 py-1 text-ink">
                        {(p.paymentMethod || '').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-sm text-slate">{formatDate(p.createdAt)}</td>
                    <td><Badge status={p.status === 'completed' ? 'confirmed' : p.status} label={p.status} /></td>
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

export default AdminPaymentsPage;
