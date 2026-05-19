import { useState, useEffect } from 'react';
import { getAdminUsers, toggleSuspendUser, restrictPhone, getRestrictedPhones } from '../../services/adminService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ROLE_FILTERS = ['', 'customer', 'owner', 'admin'];

const AdminUsersPage = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [pagination, setPagination]     = useState(null);
  const [page, setPage]                 = useState(1);
  const [roleFilter, setRoleFilter]     = useState('');
  const [restrictedNums, setRestrictedNums] = useState(new Set());

  // Restrict modal state
  const [restrictModal, setRestrictModal] = useState({ open: false, user: null });
  const [restrictReason, setRestrictReason] = useState('');
  const [restricting, setRestricting]     = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (roleFilter) params.role = roleFilter;
      const r = await getAdminUsers(params);
      setUsers(r.data.users);
      setPagination(r.data.pagination);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const fetchRestricted = async () => {
    try {
      const r = await getRestrictedPhones();
      setRestrictedNums(new Set(r.data.phones.map((p) => p.phone)));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);
  useEffect(() => { fetchRestricted(); }, []);

  const handleToggleSuspend = async (userId, isSuspended) => {
    try {
      await toggleSuspendUser(userId);
      toast.success(isSuspended ? 'User activated' : 'User suspended');
      fetchUsers();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const openRestrictModal = (u) => {
    setRestrictModal({ open: true, user: u });
    setRestrictReason('');
  };

  const handleRestrict = async () => {
    if (!restrictModal.user?.phone) return;
    setRestricting(true);
    try {
      const r = await restrictPhone(restrictModal.user.phone, restrictReason);
      toast.success(r.data.message);
      setRestrictModal({ open: false, user: null });
      fetchRestricted();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setRestricting(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Users</h1>
          <p className="text-sm text-slate mt-1">Manage platform accounts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r || 'all'}
              onClick={() => { setRoleFilter(r); setPage(1); }}
              className="text-sm font-semibold px-4 py-1.5 rounded-full border transition-all"
              style={roleFilter === r
                ? { backgroundColor: '#191919', color: '#fff', borderColor: '#191919' }
                : { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }}
            >
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Restricted phones notice */}
      {restrictedNums.size > 0 && (
        <div className="bg-tint-rose rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-lg">🚫</span>
          <p className="text-sm text-error font-medium">
            {restrictedNums.size} phone number{restrictedNums.size > 1 ? 's' : ''} currently restricted from registration
          </p>
        </div>
      )}

      {/* Table */}
      {loading ? <PageSpinner /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-slate py-10">No users found</td></tr>
                  ) : users.map((u) => {
                    const isSuspended = u.isSuspended;
                    const isPhoneRestricted = u.phone && restrictedNums.has(u.phone);
                    return (
                      <tr key={u._id}>
                        {/* User */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                              <span className="text-primary text-xs font-bold">{u.name?.[0]?.toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium text-ink-deep text-sm leading-tight">{u.name}</p>
                              <p className="text-xs text-steel">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td><Badge status={u.role} label={u.role} /></td>

                        {/* Phone */}
                        <td>
                          {u.phone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-ink-deep">{u.phone}</span>
                              {isPhoneRestricted && (
                                <span className="text-[10px] font-bold bg-tint-rose text-error px-1.5 py-0.5 rounded-full">
                                  Restricted
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-steel text-sm">—</span>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="text-sm text-slate">{formatDate(u.createdAt)}</td>

                        {/* Status */}
                        <td>
                          <Badge
                            status={isSuspended ? 'suspended' : 'active'}
                            label={isSuspended ? 'suspended' : 'active'}
                          />
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex items-center gap-3">
                            {/* Suspend/Activate */}
                            <button
                              onClick={() => handleToggleSuspend(u._id, isSuspended)}
                              className="text-xs font-semibold transition-colors"
                              style={{ color: isSuspended ? '#16a34a' : '#d97706' }}
                            >
                              {isSuspended ? 'Activate' : 'Suspend'}
                            </button>

                            {/* Restrict phone — customers only */}
                            {u.phone && u.role === 'customer' && (
                              <button
                                onClick={() => openRestrictModal(u)}
                                className="text-xs font-semibold transition-colors"
                                style={{ color: isPhoneRestricted ? '#7c3aed' : '#dc2626' }}
                              >
                                {isPhoneRestricted ? 'Unrestrict' : 'Restrict'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}

      {/* Restrict Phone Modal */}
      <Modal
        isOpen={restrictModal.open}
        onClose={() => setRestrictModal({ open: false, user: null })}
        title={restrictedNums.has(restrictModal.user?.phone) ? 'Unrestrict phone number' : 'Restrict phone number'}
      >
        {restrictModal.user && (
          <div className="space-y-4">
            <div className="bg-tint-rose rounded-lg p-4 flex items-start gap-3">
              <span className="text-xl mt-0.5">🚫</span>
              <div>
                <p className="text-sm font-semibold text-error">
                  {restrictedNums.has(restrictModal.user.phone) ? 'Remove restriction for:' : 'Restrict phone number:'}
                </p>
                <p className="text-base font-bold text-ink-deep mt-0.5">{restrictModal.user.phone}</p>
                <p className="text-xs text-slate mt-1">Belongs to: {restrictModal.user.name} ({restrictModal.user.email})</p>
              </div>
            </div>

            {!restrictedNums.has(restrictModal.user.phone) && (
              <div className="input-group">
                <label className="input-label">Reason (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Fraudulent activity, spam..."
                  value={restrictReason}
                  onChange={(e) => setRestrictReason(e.target.value)}
                />
              </div>
            )}

            <p className="text-xs text-slate">
              {restrictedNums.has(restrictModal.user.phone)
                ? 'This will allow new accounts to be created with this phone number again.'
                : 'This phone number will be blocked from creating new accounts. Existing account is not affected.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setRestrictModal({ open: false, user: null })}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRestrict}
                disabled={restricting}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg text-white transition-colors"
                style={{ backgroundColor: restrictedNums.has(restrictModal.user.phone) ? '#7c3aed' : '#dc2626' }}
              >
                {restricting ? <Spinner size="sm" /> : restrictedNums.has(restrictModal.user.phone) ? 'Remove restriction' : 'Restrict phone'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsersPage;
