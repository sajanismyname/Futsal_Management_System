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
}) => {
  const handleGenerate = async () => {
    const password = generateRandomPassword();
    onChange(password);

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
      <input
        type="password"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        placeholder={placeholder}
        required
        minLength={8}
      />
      {showRequirements && (
        <p className="text-xs text-steel mt-1">{PASSWORD_REQUIREMENTS}</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default PasswordField;
