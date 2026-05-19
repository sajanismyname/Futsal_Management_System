import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyCourts, deleteCourt } from '../../services/courtService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatCurrency, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CourtManagementPage = () => {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, court: null });
  const [deleting, setDeleting] = useState(false);

  const fetchCourts = async () => {
    setLoading(true);
    try { const r = await getMyCourts(); setCourts(r.data.courts); }
    catch { toast.error('Failed to load courts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourts(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCourt(deleteModal.court._id);
      toast.success('Court deleted');
      setDeleteModal({ open: false, court: null });
      fetchCourts();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>My courts</h1>
          <p className="text-sm text-slate mt-1">Manage your listed courts</p>
        </div>
        <Link to="/owner/courts/new" className="btn-primary">+ Add court</Link>
      </div>

      {loading ? <PageSpinner /> : courts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">🏟️</p>
          <p className="text-base font-medium text-ink-deep mb-2">No courts yet</p>
          <p className="text-sm text-slate mb-6">Add your first court to start receiving bookings</p>
          <Link to="/owner/courts/new" className="btn-primary">Add your first court</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Court</th><th>Type</th><th>Price</th><th>Hours</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {courts.map((c) => (
                <tr key={c._id}>
                  <td>
                    <p className="font-medium text-ink-deep">{c.courtName}</p>
                    <p className="text-xs text-steel">📍 {c.location}</p>
                  </td>
                  <td className="text-sm">{c.courtType} Side</td>
                  <td className="font-medium text-ink-deep">{formatCurrency(c.price)}/hr</td>
                  <td className="text-xs text-slate">{c.operatingHours?.open} – {c.operatingHours?.close}</td>
                  <td><Badge status={c.approvalStatus} label={c.approvalStatus} /></td>
                  <td>
                    <div className="flex gap-2">
                      <Link to={`/owner/courts/${c._id}/edit`} className="btn-ghost text-xs px-2 py-1">Edit</Link>
                      <button onClick={() => setDeleteModal({ open: true, court: c })} className="btn-ghost text-xs px-2 py-1 text-error hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, court: null })} title="Delete court">
        <p className="text-sm text-slate mb-5">
          Permanently delete <strong className="text-ink-deep">{deleteModal.court?.courtName}</strong>? All associated bookings will be affected.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteModal({ open: false, court: null })} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 btn-primary bg-error hover:bg-red-700">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default CourtManagementPage;
