import { useSearchParams, Link } from 'react-router-dom';

const PaymentFailurePage = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const message = searchParams.get('message') || 'Your payment was not completed or was cancelled by the payment gateway.';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold">✕</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-deep mb-2" style={{ letterSpacing: '-0.5px' }}>
            Payment Unsuccessful
          </h1>
          <p className="text-slate text-sm mb-7">
            {message}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-7 text-left">
            <p className="text-xs text-amber-800 leading-relaxed">
              If any amount was deducted from your account, it will be automatically refunded by the payment gateway within their standard processing window.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {bookingId ? (
              <Link to={`/payment/${bookingId}`} className="btn-primary w-full py-2.5">
                Retry payment
              </Link>
            ) : null}
            <Link to="/my-bookings" className="btn-secondary w-full py-2.5">
              View my bookings
            </Link>
            <Link to="/courts" className="text-sm text-slate hover:text-ink-deep transition-colors py-1">
              Browse other courts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage;
