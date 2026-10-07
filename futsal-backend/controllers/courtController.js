const Court = require('../models/Court');
const Booking = require('../models/Booking');
const { cloudinary } = require('../config/cloudinary');
const { parsePagination, escapeRegex } = require('../utils/pagination');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const isValidOperatingHours = (hours) => {
  if (!hours || typeof hours !== 'object') return false;
  const { open, close } = hours;
  if (!open || !close) return false;
  if (!TIME_REGEX.test(open) || !TIME_REGEX.test(close)) return false;
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  return oh * 60 + om < ch * 60 + cm;
};

const parseJsonSafe = (raw, fieldName) => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error(`Malformed JSON in field '${fieldName}'`);
    error.statusCode = 400;
    throw error;
  }
};

const createCourt = async (req, res, next) => {
  try {
    const { courtName, location, address, price, courtType, operatingHours, amenities, description } = req.body;

    const parsedHours = operatingHours
      ? parseJsonSafe(operatingHours, 'operatingHours')
      : { open: '06:00', close: '22:00' };

    if (!isValidOperatingHours(parsedHours)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operating hours: open time must be earlier than close time (HH:MM)',
      });
    }

    const parsedAmenities = amenities ? parseJsonSafe(amenities, 'amenities') : [];

    const images = req.files
      ? req.files.map((f) => ({ url: f.path || f.secure_url, publicId: f.filename || f.public_id }))
      : [];

    const court = await Court.create({
      courtName,
      ownerId: req.user._id,
      location,
      address,
      price: Number(price),
      courtType,
      images,
      operatingHours: parsedHours,
      amenities: Array.isArray(parsedAmenities) ? parsedAmenities : [],
      description,
      isApproved: false,
      approvalStatus: 'pending',
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Court created. Awaiting admin approval.', court });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

const getCourts = async (req, res, next) => {
  try {
    const { location, courtType, minPrice, maxPrice, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const query = { isApproved: true, isActive: true };

    if (location) query.location = { $regex: escapeRegex(location), $options: 'i' };
    if (courtType) query.courtType = courtType;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { courtName: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [courts, total] = await Promise.all([
      Court.find(query)
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Court.countDocuments(query),
    ]);

    res.json({
      success: true,
      courts,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (error) {
    next(error);
  }
};

const getCourt = async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id).populate('ownerId', 'name email phone');
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    // Public detail must only expose active and approved courts (FMS-QA-052)
    const isOwner = req.user && court.ownerId?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin && (!court.isApproved || !court.isActive)) {
      return res.status(404).json({ success: false, message: 'Court not available' });
    }

    res.json({ success: true, court });
  } catch (error) {
    next(error);
  }
};

const getMyCourts = async (req, res, next) => {
  try {
    const courts = await Court.find({ ownerId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, courts });
  } catch (error) {
    next(error);
  }
};

const updateCourt = async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    if (req.user.role !== 'admin' && court.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this court' });
    }

    // Whitelist only allowed update fields (FMS-QA-049)
    const allowedFields = ['courtName', 'location', 'address', 'price', 'courtType', 'description'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
      if (isNaN(updates.price) || updates.price < 0) {
        return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
      }
    }

    let criticalFieldChanged = false;
    if (updates.price !== undefined && updates.price !== court.price) criticalFieldChanged = true;
    if (updates.courtType !== undefined && updates.courtType !== court.courtType) criticalFieldChanged = true;

    if (req.body.operatingHours !== undefined) {
      const parsedHours = parseJsonSafe(req.body.operatingHours, 'operatingHours');
      if (!isValidOperatingHours(parsedHours)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid operating hours: open time must be earlier than close time (HH:MM)',
        });
      }
      updates.operatingHours = parsedHours;
      if (
        court.operatingHours?.open !== parsedHours.open ||
        court.operatingHours?.close !== parsedHours.close
      ) {
        criticalFieldChanged = true;
      }
    }

    if (req.body.amenities !== undefined) {
      const parsedAmenities = parseJsonSafe(req.body.amenities, 'amenities');
      updates.amenities = Array.isArray(parsedAmenities) ? parsedAmenities : [];
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => ({
        url: f.path || f.secure_url,
        publicId: f.filename || f.public_id,
      }));
      updates.images = [...(court.images || []), ...newImages];
    }

    // Reset approval only if critical fields changed (FMS-QA-050)
    if (req.user.role === 'owner' && criticalFieldChanged) {
      updates.isApproved = false;
      updates.approvalStatus = 'pending';
    }

    const updated = await Court.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    res.json({
      success: true,
      message: criticalFieldChanged ? 'Court updated. Pending admin re-approval.' : 'Court updated successfully',
      court: updated,
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
};

const deleteCourt = async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    if (req.user.role !== 'admin' && court.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Handle future confirmed bookings during deactivation (FMS-QA-051)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const activeFutureBookings = await Booking.countDocuments({
      courtId: court._id,
      bookingDate: { $gte: today },
      status: { $in: ['pending', 'confirmed'] },
    });

    if (activeFutureBookings > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate court with ${activeFutureBookings} upcoming bookings. Please cancel or resolve them first.`,
      });
    }

    court.isActive = false;
    await court.save();

    res.json({ success: true, message: 'Court deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

const approveCourt = async (req, res, next) => {
  try {
    const { isApproved } = req.body;

    const court = await Court.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: !!isApproved,
        approvalStatus: isApproved ? 'approved' : 'rejected',
      },
      { new: true }
    );

    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    res.json({
      success: true,
      message: isApproved ? 'Court approved' : 'Court rejected',
      court,
    });
  } catch (error) {
    next(error);
  }
};

const removeImage = async (req, res, next) => {
  try {
    const { id, publicId } = req.params;
    const court = await Court.findById(id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    if (req.user.role !== 'admin' && court.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const decodedPublicId = decodeURIComponent(publicId);

    // Destroy Cloudinary asset (FMS-QA-053)
    try {
      if (cloudinary?.uploader?.destroy) {
        await cloudinary.uploader.destroy(decodedPublicId);
      }
    } catch (cErr) {
      console.warn('Cloudinary image destruction warning:', cErr.message);
    }

    court.images = court.images.filter(
      (img) => img.publicId !== decodedPublicId && img.publicId !== publicId
    );
    await court.save();

    res.json({ success: true, message: 'Image removed', court });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCourt,
  getCourts,
  getCourt,
  getMyCourts,
  updateCourt,
  deleteCourt,
  approveCourt,
  removeImage,
};
