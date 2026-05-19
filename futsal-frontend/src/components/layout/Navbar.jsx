import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setMobileOpen(false); };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'owner') return '/owner/dashboard';
    return '/my-bookings';
  };

  const navLinks = [
    ...(user?.role !== 'owner' ? [{ to: '/courts', label: 'Courts' }] : []),
    { to: '/tournaments', label: 'Tournaments' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-hairline">
      <div className="container-page h-16 flex items-center justify-between gap-4">

        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
          >
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-ink-deep hidden sm:block" style={{ fontSize: '15px', letterSpacing: '-0.3px' }}>
            Futsal<span className="text-primary font-semibold">Mgmt</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="px-3 py-2 text-sm text-slate hover:text-ink hover:bg-gray-50 rounded-md transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/notifications" className="px-3 py-2 text-sm text-slate hover:text-ink hover:bg-gray-50 rounded-md transition-colors">
                Notifications
              </Link>
              <Link
                to={getDashboardLink()}
                className="px-3 py-2 text-sm text-slate hover:text-ink hover:bg-gray-50 rounded-md transition-colors"
              >
                {user?.name?.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="btn-secondary">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 text-sm text-slate hover:text-ink hover:bg-gray-50 rounded-md transition-colors">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">Get started free</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-50 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 flex flex-col gap-1">
            <span className={`block h-0.5 bg-ink transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <span className={`block h-0.5 bg-ink transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-ink transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </div>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-hairline bg-white">
          <nav className="container-page py-4 flex flex-col gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-sm text-ink hover:bg-gray-50 rounded-md transition-colors"
              >
                {label}
              </Link>
            ))}
            <div className="border-t border-hairline mt-3 pt-3 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-ink hover:bg-gray-50 rounded-md">
                    Dashboard
                  </Link>
                  <Link to="/notifications" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-ink hover:bg-gray-50 rounded-md">
                    Notifications
                  </Link>
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-ink hover:bg-gray-50 rounded-md">
                    Profile
                  </Link>
                  <button onClick={handleLogout} className="btn-secondary w-full">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary w-full text-center">Log in</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-center">Get started free</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
