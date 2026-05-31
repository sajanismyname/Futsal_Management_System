import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/authService';
import toast from 'react-hot-toast';
import { getErrorMessage, sanitizePhoneInput, validateNepalPhone } from '../../utils/helpers';
import Spinner from '../../components/ui/Spinner';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? sanitizePhoneInput(value) : value;
    setForm({ ...form, [name]: nextValue });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Full name is required';
    if (!form.email.trim()) nextErrors.email = 'Email is required';

    const phoneError = validateNepalPhone(form.phone);
    if (phoneError) nextErrors.phone = phoneError;

    if (!form.password || form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await registerUser(form);
      toast.success('Account created! Check your email to verify your account.');
      navigate('/login', { state: { email: form.email, verificationSent: true } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', boxShadow: '0 6px 20px rgba(124,58,237,0.45)' }}
            >
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <div className="text-center">
              <p className="font-bold text-ink-deep text-xl" style={{ letterSpacing: '-0.5px' }}>Futsal</p>
              <p className="text-sm font-semibold" style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '0.02em',
              }}>for fit and health</p>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-ink-deep" style={{ letterSpacing: '-0.5px' }}>
            Create your account
          </h1>
          <p className="text-sm text-slate mt-2">Free forever. No credit card required.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="input-group col-span-2">
                <label className="input-label">Full name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Full Name"
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div className="input-group col-span-2">
                <label className="input-label">Email address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div className="input-group">
                <label className="input-label">Phone number</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="98XXXXXXXX"
                  inputMode="numeric"
                  pattern="(97|98)[0-9]{8}"
                  maxLength={10}
                  required
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>

            <div>
              <p className="input-label mb-2">Account type</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'customer', label: 'Player', desc: 'Book courts & join tournaments', icon: '⚽' },
                  { value: 'owner', label: 'Court Owner', desc: 'List & manage courts', icon: '🏟️' },
                ].map(({ value, label, desc, icon }) => {
                  const isSelected = form.role === value;
                  return (
                    <div
                      key={value}
                      onClick={() => setForm(prev => ({ ...prev, role: value }))}
                      className="flex flex-col gap-1 p-4 rounded-lg border-2 cursor-pointer transition-all select-none"
                      style={{
                        borderColor: isSelected ? '#7c3aed' : '#e3e2e0',
                        backgroundColor: isSelected ? '#ede9fe' : '#ffffff',
                      }}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="text-sm font-semibold text-ink-deep">{label}</span>
                      <span className="text-xs" style={{ color: isSelected ? '#6d28d9' : '#6b6b6b' }}>{desc}</span>
                      {isSelected && (
                        <span className="mt-1 w-4 h-4 rounded-full flex items-center justify-center self-end"
                              style={{ border: '2px solid #7c3aed' }}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Spinner size="sm" /> : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-sm text-slate text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:text-primary-pressed transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
