const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Court = require('../models/Court');
const User = require('../models/User');
const {
  generateRoundRobinFixtures,
  generateKnockoutFixtures,
  calculateStandings,
} = require('../utils/fixtureGenerator');
const { emitFixtureUpdate } = require('../services/socketService');
const { parsePagination } = require('../utils/pagination');

const createTournament = async (req, res, next) => {
  try {
    const {
      tournamentName,
      courtId,
      description,
      startDate,
      endDate,
      registrationDeadline,
      maxTeams,
      entryFee,
      prizePool,
      format,
    } = req.body;

    // Date validations (FMS-QA-044)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date' });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date' });
    }

    if (start < today) {
      return res.status(400).json({ success: false, message: 'Start date cannot be in the past' });
    }

    let deadlineDate;
    if (registrationDeadline) {
      deadlineDate = new Date(registrationDeadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid registration deadline' });
      }
      if (deadlineDate > start) {
        return res.status(400).json({ success: false, message: 'Registration deadline must be on or before tournament start date' });
      }
    }

    // Verify court ownership and approval if courtId provided (FMS-QA-037)
    if (courtId) {
      if (!mongoose.Types.ObjectId.isValid(courtId)) {
        return res.status(400).json({ success: false, message: 'Invalid court ID' });
      }

      const court = await Court.findById(courtId);
      if (!court) {
        return res.status(404).json({ success: false, message: 'Selected court not found' });
      }

      if (!court.isApproved || !court.isActive) {
        return res.status(400).json({ success: false, message: 'Court must be approved and active to host tournaments' });
      }

      if (req.user.role === 'owner' && court.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only host tournaments at courts you own' });
      }
    }

    const tournament = await Tournament.create({
      tournamentName,
      ownerId: req.user._id,
      courtId: courtId || undefined,
      description,
      startDate: start,
      endDate: end,
      registrationDeadline: deadlineDate,
      maxTeams: Number(maxTeams) || 8,
      entryFee: Number(entryFee) || 0,
      prizePool,
      format: format === 'knockout' ? 'knockout' : 'round_robin',
      status: 'upcoming',
    });

    res.status(201).json({ success: true, message: 'Tournament created', tournament });
  } catch (error) {
    next(error);
  }
};

const getTournaments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = {};
    if (status) query.status = status;

    const [tournaments, total] = await Promise.all([
      Tournament.find(query)
        .populate('ownerId', 'name email')
        .populate('courtId', 'courtName location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tournament.countDocuments(query),
    ]);

    res.json({
      success: true,
      tournaments,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('courtId', 'courtName location')
      .populate({
        path: 'registeredTeams',
        populate: { path: 'captainId', select: 'name email' },
      });

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    let standings = [];
    if (tournament.fixtures.length > 0 && tournament.registeredTeams.length > 0) {
      standings = calculateStandings(tournament.fixtures, tournament.registeredTeams);
    }

    res.json({ success: true, tournament, standings });
  } catch (error) {
    next(error);
  }
};

const updateTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    if (req.user.role !== 'admin' && tournament.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Whitelist allowed fields to prevent overwriting internal state (FMS-QA-040)
    const allowed = [
      'tournamentName',
      'courtId',
      'description',
      'startDate',
      'endDate',
      'registrationDeadline',
      'maxTeams',
      'entryFee',
      'prizePool',
      'format',
      'status',
    ];

    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.courtId) {
      const court = await Court.findById(updates.courtId);
      if (!court || !court.isApproved || !court.isActive) {
        return res.status(400).json({ success: false, message: 'Court must be approved and active' });
      }
      if (req.user.role === 'owner' && court.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only host tournaments at courts you own' });
      }
    }

    // Status state machine validation (FMS-QA-039)
    if (updates.status) {
      const validStatuses = [
        'upcoming',
        'registration_open',
        'registration_closed',
        'ongoing',
        'completed',
        'cancelled',
      ];
      if (!validStatuses.includes(updates.status)) {
        return res.status(400).json({ success: false, message: 'Invalid tournament status' });
      }
    }

    const updated = await Tournament.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    res.json({ success: true, message: 'Tournament updated', tournament: updated });
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const { teamName, description } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }

    const team = await Team.create({
      teamName: teamName.trim(),
      captainId: req.user._id,
      members: [req.user._id],
      description,
    });

    res.status(201).json({ success: true, message: 'Team created', team });
  } catch (error) {
    next(error);
  }
};

const getMyTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({
      $or: [{ captainId: req.user._id }, { members: req.user._id }],
    })
      .populate('captainId', 'name email')
      .populate('members', 'name email');

    res.json({ success: true, teams });
  } catch (error) {
    next(error);
  }
};

// Team membership management (FMS-QA-083)
const addTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { email, userId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.captainId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only team captain can add members' });
    }

    let memberUser;
    if (userId) {
      memberUser = await User.findById(userId);
    } else if (email) {
      memberUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (!memberUser) {
      return res.status(404).json({ success: false, message: 'User to add was not found' });
    }

    if (team.members.some((m) => m.toString() === memberUser._id.toString())) {
      return res.status(400).json({ success: false, message: 'User is already a member of this team' });
    }

    team.members.push(memberUser._id);
    await team.save();

    res.json({ success: true, message: 'Member added to team', team });
  } catch (error) {
    next(error);
  }
};

const removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.captainId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only team captain can remove members' });
    }

    if (team.captainId.toString() === memberId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove captain from team' });
    }

    team.members = team.members.filter((m) => m.toString() !== memberId.toString());
    await team.save();

    res.json({ success: true, message: 'Member removed from team', team });
  } catch (error) {
    next(error);
  }
};

const leaveTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.captainId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Captain cannot leave team. Transfer captain role first.' });
    }

    team.members = team.members.filter((m) => m.toString() !== req.user._id.toString());
    await team.save();

    res.json({ success: true, message: 'You have left the team', team });
  } catch (error) {
    next(error);
  }
};

const transferCaptain = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { newCaptainId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.captainId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only current captain can transfer role' });
    }

    if (!team.members.some((m) => m.toString() === newCaptainId.toString())) {
      return res.status(400).json({ success: false, message: 'New captain must be a current team member' });
    }

    team.captainId = newCaptainId;
    await team.save();

    res.json({ success: true, message: 'Captain role transferred successfully', team });
  } catch (error) {
    next(error);
  }
};

const registerTeam = async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ success: false, message: 'Valid team ID is required' });
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    if (!['upcoming', 'registration_open'].includes(tournament.status)) {
      return res.status(400).json({ success: false, message: 'Tournament registration is closed' });
    }

    // Check registration deadline (FMS-QA-043)
    if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
      return res.status(400).json({ success: false, message: 'Tournament registration deadline has passed' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.captainId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only team captain can register the team' });
    }

    // Safe string comparison for duplicate check (FMS-QA-041)
    const isAlreadyRegistered = tournament.registeredTeams.some(
      (t) => t.toString() === team._id.toString()
    );
    if (isAlreadyRegistered) {
      return res.status(400).json({ success: false, message: 'Team is already registered for this tournament' });
    }

    // Atomic registration capacity guard (FMS-QA-042)
    const updatedTournament = await Tournament.findOneAndUpdate(
      {
        _id: tournament._id,
        status: { $in: ['upcoming', 'registration_open'] },
        $expr: { $lt: [{ $size: '$registeredTeams' }, '$maxTeams'] },
        registeredTeams: { $ne: team._id },
      },
      {
        $addToSet: { registeredTeams: team._id },
        $set: { status: 'registration_open' },
      },
      { new: true }
    );

    if (!updatedTournament) {
      // Find out why atomic update failed
      const current = await Tournament.findById(tournament._id);
      if (current.registeredTeams.length >= current.maxTeams) {
        return res.status(400).json({ success: false, message: 'Tournament is full' });
      }
      return res.status(400).json({ success: false, message: 'Could not register team. Please try again.' });
    }

    res.json({
      success: true,
      message: 'Team registered successfully',
      tournament: updatedTournament,
    });
  } catch (error) {
    next(error);
  }
};

const generateFixtures = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('registeredTeams', 'teamName');

    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    if (req.user.role !== 'admin' && tournament.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Prevent duplicate fixture generation (FMS-QA-045)
    if (tournament.fixtures && tournament.fixtures.length > 0) {
      return res.status(400).json({ success: false, message: 'Fixtures have already been generated for this tournament' });
    }

    if (tournament.registeredTeams.length < 2) {
      return res.status(400).json({ success: false, message: 'Need at least 2 teams to generate fixtures' });
    }

    // Dispatch based on format (FMS-QA-038, FMS-QA-046)
    let fixtures = [];
    if (tournament.format === 'knockout') {
      fixtures = generateKnockoutFixtures(tournament.registeredTeams, tournament.startDate);
    } else {
      fixtures = generateRoundRobinFixtures(tournament.registeredTeams, tournament.startDate);
    }

    tournament.fixtures = fixtures;
    tournament.status = 'ongoing';
    await tournament.save();

    const standings = calculateStandings(tournament.fixtures, tournament.registeredTeams);
    emitFixtureUpdate(tournament._id, tournament.fixtures, standings);

    res.json({ success: true, message: `${fixtures.length} fixtures generated`, fixtures, tournament });
  } catch (error) {
    next(error);
  }
};

const updateScore = async (req, res, next) => {
  try {
    const { fixtureIndex, scoreA, scoreB } = req.body;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    if (req.user.role !== 'admin' && tournament.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (fixtureIndex === undefined || fixtureIndex < 0 || fixtureIndex >= tournament.fixtures.length) {
      return res.status(400).json({ success: false, message: 'Invalid fixture index' });
    }

    // Validate scores are non-negative integers (FMS-QA-047)
    const numA = Number(scoreA);
    const numB = Number(scoreB);
    if (!Number.isInteger(numA) || !Number.isInteger(numB) || numA < 0 || numB < 0) {
      return res.status(400).json({ success: false, message: 'Scores must be non-negative integers' });
    }

    tournament.fixtures[fixtureIndex].scoreA = numA;
    tournament.fixtures[fixtureIndex].scoreB = numB;
    tournament.fixtures[fixtureIndex].status = 'completed';
    tournament.markModified('fixtures');

    await tournament.save();

    const teams = await Team.find({ _id: { $in: tournament.registeredTeams } });
    const standings = calculateStandings(tournament.fixtures, teams);

    emitFixtureUpdate(tournament._id, tournament.fixtures, standings);

    res.json({ success: true, message: 'Score updated', fixtures: tournament.fixtures, standings });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTournament,
  getTournaments,
  getTournament,
  updateTournament,
  createTeam,
  getMyTeams,
  addTeamMember,
  removeTeamMember,
  leaveTeam,
  transferCaptain,
  registerTeam,
  generateFixtures,
  updateScore,
};
