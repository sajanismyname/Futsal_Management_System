const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || req.user.isDeleted) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    if (req.user.isSuspended) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    if (
      decoded.tokenVersion !== undefined &&
      req.user.tokenVersion !== undefined &&
      decoded.tokenVersion !== req.user.tokenVersion
    ) {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

const optionalProtect = async (req, _res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && !user.isDeleted && !user.isSuspended) {
      req.user = user;
    }
  } catch {
    // Treat as anonymous
  }

  next();
};

module.exports = { protect, optionalProtect };
