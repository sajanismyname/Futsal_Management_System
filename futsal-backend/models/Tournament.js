const mongoose = require('mongoose');

const fixtureSchema = new mongoose.Schema({
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamAName: String,
  teamBName: String,
  round: Number,
  date: Date,
  scoreA: { type: Number, default: null },
  scoreB: { type: Number, default: null },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled',
  },
});

const tournamentSchema = new mongoose.Schema(
  {
    tournamentName: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
      maxlength: 150,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
    },
    description: {
      type: String,
      maxlength: 500,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    registrationDeadline: {
      type: Date,
    },
    maxTeams: {
      type: Number,
      required: true,
      min: [2, 'Minimum 2 teams required'],
      max: [32, 'Maximum 32 teams allowed'],
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    prizePool: {
      type: String,
    },
    status: {
      type: String,
      enum: ['upcoming', 'registration_open', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    registeredTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    fixtures: [fixtureSchema],
    format: {
      type: String,
      enum: ['round_robin', 'knockout'],
      default: 'round_robin',
    },
    banner: {
      url: String,
      publicId: String,
    },
  },
  { timestamps: true }
);

tournamentSchema.index({ status: 1 });
tournamentSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
