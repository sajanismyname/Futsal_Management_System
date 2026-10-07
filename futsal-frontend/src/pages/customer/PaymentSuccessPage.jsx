import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { verifyPayment } from '../../services/paymentService';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import { PageSpinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(location.state || null);
  const [loading, setLoading] = useState(true);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const pidx = searchParams.get('pidx');
    const paymentId = searchParams.get('paymentId');
    const bookingId = searchParams.get('bookingId') || searchParams.get('oid');
    const dataParam = searchParams.get('data');
    const refId = searchParams.get('refId');

    const payload = {};
    if (pidx) payload.pidx = pidx;
    if (paymentId) payload.paymentId = paymentId;
    if (bookingId) payload.bookingId = bookingId;
    if (dataParam) payload.data = dataParam;
    if (refId) payload.refId = refId;

    if (Object.keys(payload).length > 0) {
      verifyPayment(payload)
        .then((res) => {
          setData({ booking: res.data.booking, payment: res.data.payment });
        })
        .catch(() => {
          if (location.state?.booking && location.state?.payment) {
            setData(location.state);
          } else {
            toast.error('Payment verification failed or expired');
            navigate(`/payment/failure${bookingId ? `?bookingId=${bookingId}` : ''}`, { replace: true });
          }
        })
        .finally(() => setLoading(false));
    } else if (location.state?.booking && location.state?.payment) {
      setData(location.state);
      setLoading(false);
    } else {
      navigate('/my-bookings', { replace: true });
    }
  }, [searchParams, location.state, navigate]);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const { booking, payment } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold">✓</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-deep mb-2" style={{ letterSpacing: '-0.5px' }}>
            Booking Confirmed!
          </h1>
          <p className="text-slate text-sm mb-7">
            Your court booking and payment have been verified.
          </p>

          <div className="bg-gray-50 rounded-lg divide-y divide-hairline-soft mb-7 text-left border border-hairline">
            {[
              ['Court', booking?.courtId?.courtName],
              ['Date', formatDate(booking?.bookingDate)],
              ['Time', `${formatTime(booking?.startTime)} – ${formatTime(booking?.endTime)}`],
              ['Amount paid', formatCurrency(payment?.amount || booking?.totalAmount)],
              ['Payment Method', (payment?.paymentMethod || 'Online').toUpperCase()],
              ['Transaction ID', payment?.transactionId || payment?.pidx || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-slate">{label}</span>
                <span className="text-sm font-medium text-ink-deep">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/my-bookings" className="btn-primary w-full py-2.5">
              View my bookings
            </Link>
            <Link to="/courts" className="btn-secondary w-full py-2.5">
              Book another court
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
