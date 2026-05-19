const mongoose = require('mongoose');

const restrictedPhoneSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    restrictedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RestrictedPhone', restrictedPhoneSchema);
