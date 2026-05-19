import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyPayment } from '../../services/paymentService';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import { PageSpinner } from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    if (location.state) return;
    const pidx = searchParams.get('pidx');
    const oid = searchParams.get('oid');
    const paymentId = pidx || oid;
    if (!paymentId) { navigate('/my-bookings'); return; }
    verifyPayment({ paymentId, method: pidx ? 'khalti' : 'esewa', data: Object.fromEntries(searchParams) })
      .then((res) => setData({ booking: res.data.booking, payment: res.data.payment }))
      .catch(() => { toast.error('Payment verification failed'); navigate('/my-bookings'); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const { booking, payment } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-tint-mint rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-deep mb-2" style={{ letterSpacing: '-0.5px' }}>
            Booking confirmed!
          </h1>
          <p className="text-slate text-sm mb-7">Your court has been successfully booked and payment processed.</p>

          <div className="bg-gray-50 rounded-lg divide-y divide-hairline-soft mb-7 text-left">
            {[
              ['Court', booking?.courtId?.courtName],
              ['Date', formatDate(booking?.bookingDate)],
              ['Time', `${formatTime(booking?.startTime)} – ${formatTime(booking?.endTime)}`],
              ['Amount paid', formatCurrency(payment?.amount)],
              ['Transaction ID', payment?.transactionId || '—'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-slate">{l}</span>
                <span className="text-sm font-medium text-ink-deep">{v}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/my-bookings" className="btn-primary w-full py-2.5">View my bookings</Link>
            <Link to="/courts" className="btn-secondary w-full py-2.5">Book another court</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
