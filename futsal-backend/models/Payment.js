const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    pidx: {
      type: String,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['khalti', 'esewa', 'mock'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'completed', 'failed', 'refunded'],
      default: 'initiated',
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    refundedAt: {
      type: Date,
    },
    refundReason: {
      type: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
