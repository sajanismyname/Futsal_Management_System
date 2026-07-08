const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const { validatePassword } = require('../utils/passwordValidation');

const router = express.Router();

const phoneValidation = body('phone')
  .trim()
  .matches(/^(97|98)\d{8}$/)
  .withMessage('Phone must be a 10-digit number starting with 97 or 98');

const passwordValidation = body('password').custom((value) => {
  const error = validatePassword(value);
  if (error) throw new Error(error);
  return true;
});

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    passwordValidation,
    phoneValidation,
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/verify-email/:token', verifyEmail);

router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  resendVerificationEmail
);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').custom((value) => {
      const error = validatePassword(value);
      if (error) throw new Error(error);
      return true;
    }),
  ],
  validate,
  changePassword
);

module.exports = router;
