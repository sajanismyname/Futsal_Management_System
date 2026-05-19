import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBooking } from '../../services/bookingService';
import { initiatePayment, verifyPayment } from '../../services/paymentService';
import { PageSpinner } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import { formatCurrency, formatDate, formatTime, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('khalti');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getBooking(bookingId).then((r) => setBooking(r.data.booking)).catch(() => toast.error('Booking not found')).finally(() => setLoading(false));
  }, [bookingId]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const res = await initiatePayment({ bookingId, paymentMethod });
      if (res.data.paymentMethod === 'mock') {
        const vRes = await verifyPayment({ paymentId: res.data.paymentId });
        toast.success('Payment verified!');
        navigate('/payment/success', { state: { booking: vRes.data.booking, payment: vRes.data.payment } });
        return;
      }
      if (res.data.paymentUrl) { window.location.href = res.data.paymentUrl; return; }
      if (res.data.esewaConfig) {
        const form = document.createElement('form');
        form.method = 'POST'; form.action = res.data.esewaUrl;
        Object.entries(res.data.esewaConfig).forEach(([k, v]) => {
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = k; inp.value = v;
          form.appendChild(inp);
        });
        document.body.appendChild(form); form.submit();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      setProcessing(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (!booking) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate">Booking not found</p></div>;

  const methods = [
    { id: 'khalti', label: 'Khalti', desc: 'Pay with Khalti digital wallet', color: 'bg-purple-100 text-purple-700' },
    { id: 'esewa', label: 'eSewa', desc: 'Pay with eSewa wallet', color: 'bg-green-100 text-green-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-page py-10 max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Complete payment</h1>
          <p className="text-sm text-slate mt-1">Secure checkout</p>
        </div>

        {/* Order summary */}
        <div className="card p-5 mb-5">
          <p className="text-xs font-semibold text-steel uppercase tracking-wide mb-4">Booking summary</p>
          <div className="space-y-0 divide-y divide-hairline-soft">
            {[
              ['Court', booking.courtId?.courtName],
              ['Location', booking.courtId?.location],
              ['Date', formatDate(booking.bookingDate)],
              ['Time', `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between items-center py-3">
                <span className="text-sm text-slate">{l}</span>
                <span className="text-sm font-medium text-ink-deep">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-hairline mt-2">
            <span className="text-base font-semibold text-ink-deep">Total due</span>
            <span className="text-2xl font-semibold text-ink-deep">{formatCurrency(booking.totalAmount)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="card p-5 mb-5">
          <p className="text-xs font-semibold text-steel uppercase tracking-wide mb-4">Payment method</p>
          <div className="space-y-2">
            {methods.map(({ id, label, desc, color }) => (
              <label
                key={id}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  paymentMethod === id ? 'border-primary bg-primary-light' : 'border-hairline hover:border-hairline-strong'
                }`}
              >
                <input type="radio" name="method" value={id} checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="sr-only" />
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
                  {id === 'khalti' ? 'K' : 'E'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-deep">{label}</p>
                  <p className="text-xs text-slate">{desc}</p>
                </div>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === id ? 'border-primary' : 'border-hairline-strong'}`}>
                  {paymentMethod === id && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handlePayment} disabled={processing} className="btn-primary w-full py-3 text-base">
          {processing ? <Spinner size="sm" /> : `Pay ${formatCurrency(booking.totalAmount)}`}
        </button>
        <p className="text-xs text-steel text-center mt-3">Your booking will be confirmed only after successful payment</p>
      </div>
    </div>
  );
};

export default PaymentPage;
