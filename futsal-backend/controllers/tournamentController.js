const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const { generateRoundRobinFixtures, calculateStandings } = require('../utils/fixtureGenerator');

const createTournament = async (req, res, next) => {
  try {
    const { tournamentName, courtId, description, startDate, endDate, registrationDeadline, maxTeams, entryFee, prizePool, format } = req.body;

    const tournament = await Tournament.create({
      tournamentName,
      ownerId: req.user._id,
      courtId,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      maxTeams: Number(maxTeams),
      entryFee: Number(entryFee) || 0,
      prizePool,
      format: format || 'round_robin',
      status: 'upcoming',
    });

    res.status(201).json({ success: true, message: 'Tournament created', tournament });
  } catch (error) {
    next(error);
  }
};

const getTournaments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [tournaments, total] = await Promise.all([
      Tournament.find(query)
        .populate('ownerId', 'name email')
        .populate('courtId', 'courtName location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Tournament.countDocuments(query),
    ]);

    res.json({
      success: true,
      tournaments,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
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
      .populate('registeredTeams', 'teamName captainId members');

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

    const updates = { ...req.body };
    const updated = await Tournament.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    res.json({ success: true, message: 'Tournament updated', tournament: updated });
  } catch (error) {
    next(error);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const { teamName, description } = req.body;

    const team = await Team.create({
      teamName,
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
    }).populate('captainId', 'name email');

    res.json({ success: true, teams });
  } catch (error) {
    next(error);
  }
};

const registerTeam = async (req, res, next) => {
  try {
    const { teamId } = req.body;

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    if (!['upcoming', 'registration_open'].includes(tournament.status)) {
      return res.status(400).json({ success: false, message: 'Registration is not open' });
    }

    if (tournament.registeredTeams.length >= tournament.maxTeams) {
      return res.status(400).json({ success: false, message: 'Tournament is full' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.captainId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only team captain can register' });
    }

    if (tournament.registeredTeams.includes(teamId)) {
      return res.status(400).json({ success: false, message: 'Team already registered' });
    }

    tournament.registeredTeams.push(teamId);
    if (tournament.status === 'upcoming') tournament.status = 'registration_open';
    await tournament.save();

    res.json({ success: true, message: 'Team registered successfully', tournament });
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

    if (tournament.registeredTeams.length < 2) {
      return res.status(400).json({ success: false, message: 'Need at least 2 teams to generate fixtures' });
    }

    const fixtures = generateRoundRobinFixtures(tournament.registeredTeams, tournament.startDate);
    tournament.fixtures = fixtures;
    tournament.status = 'ongoing';
    await tournament.save();

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

    if (fixtureIndex < 0 || fixtureIndex >= tournament.fixtures.length) {
      return res.status(400).json({ success: false, message: 'Invalid fixture index' });
    }

    tournament.fixtures[fixtureIndex].scoreA = Number(scoreA);
    tournament.fixtures[fixtureIndex].scoreB = Number(scoreB);
    tournament.fixtures[fixtureIndex].status = 'completed';
    tournament.markModified('fixtures');

    await tournament.save();

    const standings = calculateStandings(tournament.fixtures, await Team.find({ _id: { $in: tournament.registeredTeams } }));

    res.json({ success: true, message: 'Score updated', fixtures: tournament.fixtures, standings });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTournament, getTournaments, getTournament, updateTournament, createTeam, getMyTeams, registerTeam, generateFixtures, updateScore };
