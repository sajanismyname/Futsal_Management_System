const { validatePassword } = require('../utils/passwordValidation');

describe('passwordValidation', () => {
  it('accepts a valid password', () => {
    expect(validatePassword('Secure@12')).toBeNull();
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePassword('Sec@1')).toBe('Password must be at least 8 characters');
  });

  it('requires a leading capital letter', () => {
    expect(validatePassword('secure@12')).toBe('Password must start with a capital letter');
  });

  it('requires a special character', () => {
    expect(validatePassword('Secure12')).toBe('Password must contain a special character');
  });
});
