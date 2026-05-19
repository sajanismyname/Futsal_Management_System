const express = require('express');
const {
  createCourt, getCourts, getCourt, getMyCourts,
  updateCourt, deleteCourt, approveCourt, removeImage,
} = require('../controllers/courtController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

router.get('/', getCourts);
router.get('/my-courts', protect, authorize('owner', 'admin'), getMyCourts);
router.get('/:id', getCourt);

router.post('/', protect, authorize('owner', 'admin'), upload.array('images', 5), createCourt);
router.put('/:id', protect, authorize('owner', 'admin'), upload.array('images', 5), updateCourt);
router.delete('/:id', protect, authorize('owner', 'admin'), deleteCourt);
router.patch('/:id/approve', protect, authorize('admin'), approveCourt);
router.delete('/:id/images/:publicId', protect, authorize('owner', 'admin'), removeImage);

module.exports = router;
