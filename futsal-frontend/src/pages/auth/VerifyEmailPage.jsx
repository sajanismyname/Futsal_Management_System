import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyEmail } from '../../services/authService';
import Spinner from '../../components/ui/Spinner';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await verifyEmail(token);
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Verification failed. Please try again.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="card p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Spinner size="lg" />
            <p className="text-slate mt-4">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-ink-deep mb-2">Email verified</h1>
            <p className="text-slate text-sm mb-6">{message}</p>
            <Link to="/login" className="btn-primary inline-block px-6 py-2.5">Go to login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-ink-deep mb-2">Verification failed</h1>
            <p className="text-slate text-sm mb-6">{message}</p>
            <Link to="/login" className="btn-primary inline-block px-6 py-2.5">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
