const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema(
  {
    courtName: {
      type: String,
      required: [true, 'Court name is required'],
      trim: true,
      maxlength: [150, 'Court name cannot exceed 150 characters'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    courtType: {
      type: String,
      enum: ['5A', '7A'],
      required: [true, 'Court type is required'],
    },
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    operatingHours: {
      open: {
        type: String,
        required: [true, 'Opening time is required'],
        default: '06:00',
      },
      close: {
        type: String,
        required: [true, 'Closing time is required'],
        default: '22:00',
      },
    },
    amenities: [String],
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

courtSchema.index({ ownerId: 1 });
courtSchema.index({ isApproved: 1, isActive: 1 });
courtSchema.index({ location: 'text', courtName: 'text' });

module.exports = mongoose.model('Court', courtSchema);
