const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters, start with a capital letter, and contain a special character';

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/^[A-Z]/.test(password)) {
    return 'Password must start with a capital letter';
  }

  if (!SPECIAL_CHAR_REGEX.test(password)) {
    return 'Password must contain a special character';
  }

  return null;
};

module.exports = {
  validatePassword,
  PASSWORD_REQUIREMENTS,
};
