import { useState, useEffect } from 'react';
import { getAdminCourts, adminApproveCourt } from '../../services/adminService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency, getErrorMessage, getCourtApprovalStatus, getCourtApprovalLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminCourtsPage = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [approvalFilter, setApprovalFilter] = useState('');

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (approvalFilter) params.approvalStatus = approvalFilter;
      const r = await getAdminCourts(params);
      setCourts(r.data.courts);
      setPagination(r.data.pagination);
    } catch {
      toast.error('Failed to load courts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourts(); }, [page, approvalFilter]);

  const handleApprove = async (id) => {
    try {
      await adminApproveCourt(id, true);
      toast.success('Court approved');
      fetchCourts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleReject = async (id) => {
    try {
      await adminApproveCourt(id, false);
      toast.success('Court rejected');
      fetchCourts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const showApprovalActions = approvalFilter === 'pending';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Courts</h1>
          <p className="text-sm text-slate mt-1">Review and manage court listings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setApprovalFilter(s); setPage(1); }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                approvalFilter === s
                  ? 'bg-ink-deep text-on-dark border-ink-deep'
                  : 'text-slate border-hairline hover:border-hairline-strong hover:text-ink'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Court</th>
                    <th>Owner</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>{showApprovalActions ? 'Actions' : 'Approval'}</th>
                  </tr>
                </thead>
                <tbody>
                  {courts.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-slate py-10">No courts found</td></tr>
                  ) : courts.map((c) => {
                    const status = getCourtApprovalStatus(c);
                    const label = getCourtApprovalLabel(status);

                    return (
                      <tr key={c._id}>
                        <td>
                          <p className="font-medium text-ink-deep text-sm">{c.courtName}</p>
                          <p className="text-xs text-steel">📍 {c.location}</p>
                        </td>
                        <td className="text-sm text-slate">{c.ownerId?.name}</td>
                        <td className="font-medium text-ink-deep">{formatCurrency(c.price)}/hr</td>
                        <td><Badge status={status} label={label} /></td>
                        <td>
                          {showApprovalActions ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(c._id)}
                                className="text-xs font-medium text-success hover:text-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(c._id)}
                                className="text-xs font-medium text-error hover:text-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <Badge status={status} label={label} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {pagination?.pages > 1 && <Pagination pagination={pagination} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
};

export default AdminCourtsPage;
