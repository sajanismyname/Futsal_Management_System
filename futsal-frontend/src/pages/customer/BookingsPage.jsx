import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookings, cancelBooking } from '../../services/bookingService';
import { PageSpinner } from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency, formatDate, formatTime, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await getBookings({ page });
      setBookings(res.data.bookings);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [page]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelBooking(cancelModal.booking._id);
      toast.success('Booking cancelled');
      setCancelModal({ open: false, booking: null });
      fetchBookings();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCancelling(false); }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container-page py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>My bookings</h1>
            <p className="text-sm text-slate mt-1">Your court reservation history</p>
          </div>
          <Link to="/courts" className="btn-primary">Book a court</Link>
        </div>

        {loading ? <PageSpinner /> : bookings.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-4">📅</p>
            <p className="text-base font-medium text-ink-deep mb-2">No bookings yet</p>
            <p className="text-sm text-slate mb-6">Book your first futsal session today</p>
            <Link to="/courts" className="btn-primary">Find a court</Link>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Court</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <p className="font-medium text-ink-deep">{b.courtId?.courtName}</p>
                        <p className="text-xs text-steel">{b.courtId?.location}</p>
                      </td>
                      <td className="text-sm">{formatDate(b.bookingDate)}</td>
                      <td className="text-sm text-slate">{formatTime(b.startTime)} – {formatTime(b.endTime)}</td>
                      <td className="font-medium text-ink-deep">{formatCurrency(b.totalAmount)}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <Badge status={b.status} label={b.status} />
                          <Badge status={b.paymentStatus} label={b.paymentStatus} />
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {b.status === 'pending' && b.paymentStatus === 'unpaid' && (
                            <Link to={`/payment/${b._id}`} className="btn-primary text-xs px-3 py-1.5">Pay</Link>
                          )}
                          {['pending', 'confirmed'].includes(b.status) && (
                            <button onClick={() => setCancelModal({ open: true, booking: b })} className="btn-ghost text-xs text-error hover:bg-red-50">
                              Cancel
                            </button>
                          )}
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

      <Modal isOpen={cancelModal.open} onClose={() => setCancelModal({ open: false, booking: null })} title="Cancel booking">
        <p className="text-sm text-slate mb-5">Are you sure you want to cancel this booking? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={() => setCancelModal({ open: false, booking: null })} className="btn-secondary flex-1">Keep booking</button>
          <button onClick={handleCancel} disabled={cancelling} className="flex-1 btn-primary bg-error hover:bg-red-700">
            {cancelling ? 'Cancelling...' : 'Yes, cancel'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default BookingsPage;
