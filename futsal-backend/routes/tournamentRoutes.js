const express = require('express');
const {
  createTournament, getTournaments, getTournament, updateTournament,
  createTeam, getMyTeams, registerTeam, generateFixtures, updateScore,
} = require('../controllers/tournamentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/teams', protect, authorize('customer', 'owner', 'admin'), createTeam);
router.get('/teams/my-teams', protect, getMyTeams);

router.get('/', getTournaments);
router.post('/', protect, authorize('owner', 'admin'), createTournament);

router.get('/:id', getTournament);
router.put('/:id', protect, authorize('owner', 'admin'), updateTournament);
router.post('/:id/register', protect, authorize('customer'), registerTeam);
router.post('/:id/fixtures', protect, authorize('owner', 'admin'), generateFixtures);
router.put('/:id/scores', protect, authorize('owner', 'admin'), updateScore);

module.exports = router;
