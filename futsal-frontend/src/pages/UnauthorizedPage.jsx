import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UnauthorizedPage = () => {
  const { user } = useAuth();

  const getHomePath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'owner') return '/owner/dashboard';
    return '/courts';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold">⚠️</span>
          </div>
          <h1 className="text-2xl font-semibold text-ink-deep mb-2" style={{ letterSpacing: '-0.5px' }}>
            Access Restricted
          </h1>
          <p className="text-slate text-sm mb-7">
            You do not have permission to access this page with your current account role ({user?.role || 'guest'}).
          </p>

          <div className="flex flex-col gap-3">
            <Link to={getHomePath()} className="btn-primary w-full py-2.5">
              Back to dashboard
            </Link>
            <Link to="/" className="btn-secondary w-full py-2.5">
              Go to home page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
