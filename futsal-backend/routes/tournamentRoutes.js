const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/tournamentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

// Team management routes (FMS-QA-083, FMS-QA-084)
router.post(
  '/teams',
  protect,
  authorize('customer', 'owner', 'admin'),
  [body('teamName').trim().notEmpty().withMessage('Team name is required')],
  validate,
  createTeam
);
router.get('/teams/my-teams', protect, getMyTeams);
router.post('/teams/:teamId/members', protect, addTeamMember);
router.delete('/teams/:teamId/members/:memberId', protect, removeTeamMember);
router.post('/teams/:teamId/leave', protect, leaveTeam);
router.patch(
  '/teams/:teamId/captain',
  protect,
  [body('newCaptainId').isMongoId().withMessage('Valid new captain ID is required')],
  validate,
  transferCaptain
);

router.get('/', getTournaments);

router.post(
  '/',
  protect,
  authorize('owner', 'admin'),
  [
    body('tournamentName').trim().notEmpty().withMessage('Tournament name is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
  ],
  validate,
  createTournament
);

router.get('/:id', getTournament);
router.put('/:id', protect, authorize('owner', 'admin'), updateTournament);

router.post(
  '/:id/register',
  protect,
  authorize('customer', 'owner', 'admin'),
  [body('teamId').isMongoId().withMessage('Valid team ID is required')],
  validate,
  registerTeam
);

router.post('/:id/fixtures', protect, authorize('owner', 'admin'), generateFixtures);

router.put(
  '/:id/scores',
  protect,
  authorize('owner', 'admin'),
  [
    body('fixtureIndex').isInt({ min: 0 }).withMessage('Valid fixture index is required'),
    body('scoreA').isInt({ min: 0 }).withMessage('Score A must be a non-negative integer'),
    body('scoreB').isInt({ min: 0 }).withMessage('Score B must be a non-negative integer'),
  ],
  validate,
  updateScore
);

module.exports = router;
