const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Server error';

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Safe user-friendly duplicate key errors without internal leaks (FMS-QA-097)
  if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyValue
      ? Object.keys(err.keyValue)[0]
      : err.keyPattern
        ? Object.keys(err.keyPattern)[0]
        : 'Field';

    const friendlyMessages = {
      email: 'An account with this email already exists',
      phone: 'An account with this phone number already exists',
      transactionId: 'A payment with this transaction identifier already exists',
      pidx: 'A payment with this gateway transaction identifier already exists',
      teamName: 'A team with this name already exists',
    };

    message = friendlyMessages[field] || `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Normalize payment gateway and external Axios errors (FMS-QA-098)
  if (err.isAxiosError) {
    statusCode = 502;
    message = 'Payment gateway communication failure. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
