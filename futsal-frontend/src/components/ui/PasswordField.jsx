import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { generateRandomPassword, PASSWORD_REQUIREMENTS } from '../../utils/passwordValidation';

const PasswordField = ({
  label,
  name,
  value,
  onChange,
  error,
  placeholder = 'Min. 8 characters',
  showGenerate = true,
  showRequirements = true,
  required = true,
  minLength = 8,
}) => {
  const [visible, setVisible] = useState(false);

  const handleGenerate = async () => {
    const password = generateRandomPassword();
    onChange(password);
    setVisible(true);

    try {
      await navigator.clipboard.writeText(password);
      toast.success('Strong password generated and copied');
    } catch {
      toast.success('Strong password generated');
    }
  };

  return (
    <div className="input-group">
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="input-label mb-0">{label}</label>
        {showGenerate && (
          <button
            type="button"
            onClick={handleGenerate}
            className="text-xs font-medium text-primary hover:text-primary-pressed transition-colors"
          >
            Generate password
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input pr-11"
          placeholder={placeholder}
          required={required}
          {...(minLength ? { minLength } : {})}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ink transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>

      {showRequirements && (
        <p className="text-xs text-steel mt-1">{PASSWORD_REQUIREMENTS}</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default PasswordField;
