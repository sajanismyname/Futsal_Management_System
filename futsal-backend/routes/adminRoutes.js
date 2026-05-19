const express = require('express');
const {
  getStats, getRevenue, getUsers, toggleSuspend, deleteUser,
  getAllBookings, getAllPayments, getPendingCourts,
  restrictPhone, getRestrictedPhones,
} = require('../controllers/adminController');
const { approveCourt } = require('../controllers/courtController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

// All admin routes require admin role
router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/revenue', getRevenue);
router.get('/users', getUsers);
router.patch('/users/:id/suspend', toggleSuspend);
router.delete('/users/:id', deleteUser);
router.get('/bookings', getAllBookings);
router.get('/payments', getAllPayments);
router.get('/courts/pending', getPendingCourts);
router.patch('/courts/:id/approve', approveCourt);

router.post('/restrict-phone', restrictPhone);
router.get('/restricted-phones', getRestrictedPhones);

module.exports = router;
