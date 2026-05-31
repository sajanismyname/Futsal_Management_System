import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, changePassword } from '../../services/authService';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { getErrorMessage, sanitizePhoneInput, validateNepalPhone } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const phoneError = validateNepalPhone(profileForm.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await updateProfile(profileForm);
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoadingProfile(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoadingPassword(true);
    try {
      await changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password updated!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoadingPassword(false); }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container-page py-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink-deep mb-6" style={{ letterSpacing: '-0.5px' }}>Profile settings</h1>

        {/* Account info */}
        <div className="card p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-semibold text-lg">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink-deep">{user?.name}</p>
            <p className="text-sm text-slate">{user?.email}</p>
          </div>
          <Badge status={user?.role} label={user?.role} />
        </div>

        {/* Personal info */}
        <div className="card p-6 mb-5">
          <h2 className="text-base font-semibold text-ink-deep mb-5">Personal information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input type="text" className="input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input type="email" className="input bg-gray-50" value={user?.email} disabled />
            </div>
            <div className="input-group">
              <label className="input-label">Phone number</label>
              <input
                type="tel"
                className="input"
                placeholder="98XXXXXXXX"
                inputMode="numeric"
                maxLength={10}
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: sanitizePhoneInput(e.target.value) })}
              />
            </div>
            <button type="submit" disabled={loadingProfile} className="btn-primary">
              {loadingProfile ? <Spinner size="sm" /> : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-deep mb-5">Change password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { field: 'currentPassword', label: 'Current password' },
              { field: 'newPassword', label: 'New password' },
              { field: 'confirmPassword', label: 'Confirm new password' },
            ].map(({ field, label }) => (
              <div key={field} className="input-group">
                <label className="input-label">{label}</label>
                <input type="password" className="input" placeholder="••••••••" value={passwordForm[field]} onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })} />
              </div>
            ))}
            <button type="submit" disabled={loadingPassword} className="btn-primary">
              {loadingPassword ? <Spinner size="sm" /> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
