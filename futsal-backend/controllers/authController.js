const crypto = require('crypto');
const User = require('../models/User');
const RestrictedPhone = require('../models/RestrictedPhone');
const generateToken = require('../utils/generateToken');
const { sendEmail, emailVerificationEmail } = require('../services/notificationService');

const PHONE_REGEX = /^(97|98)\d{8}$/;

const createVerificationToken = () => ({
  emailVerificationToken: crypto.randomBytes(32).toString('hex'),
  emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
});

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be a 10-digit number starting with 97 or 98',
      });
    }

    const isRestricted = await RestrictedPhone.findOne({ phone });
    if (isRestricted) {
      return res.status(403).json({ success: false, message: 'This phone number has been restricted from creating an account.' });
    }

    const allowedRoles = ['customer', 'owner'];
    const userRole = allowedRoles.includes(role) ? role : 'customer';
    const verification = createVerificationToken();

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      phone,
      isEmailVerified: false,
      ...verification,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email/${user.emailVerificationToken}`;

    sendEmail(emailVerificationEmail(user, verificationUrl)).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account before logging in.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account has been suspended' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        needsVerification: true,
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ emailVerificationToken: token })
      .select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
    }

    if (user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'Verification successful. You may login.',
      });
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
    }

    user.isEmailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Verification successful. You may login.',
    });
  } catch (error) {
    next(error);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.json({ success: true, message: 'If an account exists with that email, a verification link has been sent.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'This email is already verified. You can log in.' });
    }

    const verification = createVerificationToken();
    user.emailVerificationToken = verification.emailVerificationToken;
    user.emailVerificationExpires = verification.emailVerificationExpires;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email/${user.emailVerificationToken}`;

    sendEmail(emailVerificationEmail(user, verificationUrl)).catch(() => {});

    res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, emailNotifications, smsNotifications } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (phone !== undefined) {
      if (!PHONE_REGEX.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone must be a 10-digit number starting with 97 or 98',
        });
      }
      user.phone = phone;
    }
    if (emailNotifications !== undefined) user.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) user.smsNotifications = smsNotifications;

    await user.save();

    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  updateProfile,
  changePassword,
};
