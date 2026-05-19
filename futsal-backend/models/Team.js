const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    logo: {
      url: String,
      publicId: String,
    },
    description: {
      type: String,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

teamSchema.index({ captainId: 1 });

module.exports = mongoose.model('Team', teamSchema);
