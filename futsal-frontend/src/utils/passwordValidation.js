const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}';

export const PASSWORD_REQUIREMENTS =
  'At least 8 characters, starting with a capital letter, and including a special character';

export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!/^[A-Z]/.test(password)) {
    return 'Password must start with a capital letter';
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must contain a special character';
  }

  return '';
};

const pickRandom = (chars) => chars[Math.floor(Math.random() * chars.length)];

const shuffle = (value) => value.split('').sort(() => Math.random() - 0.5).join('');

export const generateRandomPassword = (length = 12) => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const pool = upper + lower + digits + SPECIAL_CHARS;

  const first = pickRandom(upper);
  const required = pickRandom(SPECIAL_CHARS);
  let rest = required;

  while (rest.length < length - 1) {
    rest += pickRandom(pool);
  }

  return first + shuffle(rest);
};
