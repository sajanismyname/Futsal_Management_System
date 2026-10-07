import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBooking } from '../../services/bookingService';
import { initiatePayment, verifyPayment } from '../../services/paymentService';
import { PageSpinner } from '../../components/ui/Spinner';
import Spinner from '../../components/ui/Spinner';
import { KhaltiLogo, EsewaLogo } from '../../components/ui/PaymentLogos';
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
        navigate(`/payment/success?bookingId=${vRes.data.booking._id}&paymentId=${vRes.data.payment._id}`, {
          state: { booking: vRes.data.booking, payment: vRes.data.payment },
        });
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
    {
      id: 'khalti',
      label: 'Khalti',
      desc: 'Pay instantly with Khalti digital wallet',
      activeColor: '#5c2d91',
      activeBg: '#f5f3ff',
      Logo: KhaltiLogo,
    },
    {
      id: 'esewa',
      label: 'eSewa',
      desc: 'Pay securely with eSewa mobile wallet',
      activeColor: '#16a34a',
      activeBg: '#f0fdf4',
      Logo: EsewaLogo,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-page py-8 sm:py-12 max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>Complete payment</h1>
          <p className="text-sm text-slate mt-1">Select your preferred payment gateway in Nepal</p>
        </div>

        {/* Order summary */}
        <div className="card p-5 mb-5 shadow-sm">
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
                <span className="text-sm font-medium text-ink-deep text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-hairline mt-2">
            <span className="text-base font-semibold text-ink-deep">Total due</span>
            <span className="text-2xl font-bold text-ink-deep">{formatCurrency(booking.totalAmount)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="card p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-steel uppercase tracking-wide">Payment method</p>
            <span className="text-xs text-slate">Fast & Secure</span>
          </div>
          <div className="space-y-3">
            {methods.map(({ id, label, desc, activeColor, activeBg, Logo }) => {
              const isSelected = paymentMethod === id;
              return (
                <div
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className="flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all select-none hover:shadow-sm"
                  style={{
                    borderColor: isSelected ? activeColor : '#e5e7eb',
                    backgroundColor: isSelected ? activeBg : '#ffffff',
                  }}
                >
                  <Logo className="w-10 h-10 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-semibold text-ink-deep">{label}</p>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${activeColor}22`, color: activeColor }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate truncate mt-0.5">{desc}</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ borderColor: isSelected ? activeColor : '#d1d5db' }}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeColor }} />}
                  </div>
                </div>
              );
            })}
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
