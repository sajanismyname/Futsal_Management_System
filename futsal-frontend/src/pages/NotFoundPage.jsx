import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="card p-8">
          <p className="text-6xl font-extrabold text-ink-deep mb-4 tracking-tight">404</p>
          <h1 className="text-2xl font-semibold text-ink-deep mb-2" style={{ letterSpacing: '-0.5px' }}>
            Page not found
          </h1>
          <p className="text-slate text-sm mb-7 leading-relaxed">
            The page you are looking for doesn&apos;t exist or may have been moved.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/" className="btn-primary w-full py-2.5">
              Back to Home
            </Link>
            <Link to="/courts" className="btn-secondary w-full py-2.5">
              Browse Courts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
