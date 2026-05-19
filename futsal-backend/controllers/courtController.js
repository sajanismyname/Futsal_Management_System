const Court = require('../models/Court');

const createCourt = async (req, res, next) => {
  try {
    const { courtName, location, address, price, courtType, operatingHours, amenities, description } = req.body;

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
      operatingHours: operatingHours ? JSON.parse(operatingHours) : { open: '06:00', close: '22:00' },
      amenities: amenities ? JSON.parse(amenities) : [],
      description,
    });

    res.status(201).json({ success: true, message: 'Court created. Awaiting admin approval.', court });
  } catch (error) {
    next(error);
  }
};

const getCourts = async (req, res, next) => {
  try {
    const { location, courtType, minPrice, maxPrice, search, page = 1, limit = 10 } = req.query;

    const query = { isApproved: true, isActive: true };

    if (location) query.location = { $regex: location, $options: 'i' };
    if (courtType) query.courtType = courtType;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { courtName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [courts, total] = await Promise.all([
      Court.find(query)
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Court.countDocuments(query),
    ]);

    res.json({
      success: true,
      courts,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getCourt = async (req, res, next) => {
  try {
    const court = await Court.findById(req.params.id).populate('ownerId', 'name email phone');
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    res.json({ success: true, court });
  } catch (error) {
    next(error);
  }
};

const getMyCourts = async (req, res, next) => {
  try {
    const courts = await Court.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
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

    const updates = { ...req.body };
    if (updates.price) updates.price = Number(updates.price);
    if (updates.operatingHours && typeof updates.operatingHours === 'string') {
      updates.operatingHours = JSON.parse(updates.operatingHours);
    }
    if (updates.amenities && typeof updates.amenities === 'string') {
      updates.amenities = JSON.parse(updates.amenities);
    }

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => ({
        url: f.path || f.secure_url,
        publicId: f.filename || f.public_id,
      }));
      updates.images = [...(court.images || []), ...newImages];
    }

    if (req.user.role === 'owner') {
      updates.isApproved = false;
    }

    const updated = await Court.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    res.json({ success: true, message: 'Court updated', court: updated });
  } catch (error) {
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
      { isApproved },
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
    const court = await Court.findById(req.params.id);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    if (req.user.role !== 'admin' && court.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    court.images = court.images.filter((img) => img.publicId !== req.params.publicId);
    await court.save();

    res.json({ success: true, message: 'Image removed', court });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCourt, getCourts, getCourt, getMyCourts, updateCourt, deleteCourt, approveCourt, removeImage };
