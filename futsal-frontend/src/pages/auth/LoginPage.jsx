import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/ui/Spinner';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success('Welcome back!');
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'owner') navigate('/owner/dashboard');
      else navigate(from && from !== '/' && from !== '/login' ? from : '/courts');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', boxShadow: '0 6px 20px rgba(124,58,237,0.45)' }}
            >
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <div>
              <p className="font-bold text-ink-deep text-xl" style={{ letterSpacing: '-0.5px' }}>
                Futsal
              </p>
              <p
                className="text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '0.02em',
                }}
              >
                for fit and health
              </p>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>
            Welcome back
          </h1>
          <p className="text-sm text-slate mt-2">Log in to your account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} className="input"
                placeholder="you@example.com" required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange} className="input"
                placeholder="Your password" required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? <Spinner size="sm" /> : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-sm text-slate text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-medium hover:text-primary-pressed transition-colors">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
