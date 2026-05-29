const express = require('express');
const { body, param, query } = require('express-validator');
const Customer = require('../models/Customer');
const Installation = require('../models/Installation');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, region } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (region) filter.region = { $regex: region, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Customer.countDocuments(filter),
    ]);

    res.json({ customers, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('createdBy', 'fullName email');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id/installations — inline on customer page
router.get('/:id/installations', [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    const installations = await Installation.find({ customer: req.params.id })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ installations });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post(
  '/',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('region').trim().notEmpty().withMessage('Region is required'),
    body('phone').optional().trim(),
    body('zone').optional().trim(),
    body('woreda').optional().trim(),
    body('specificLocation').optional().trim(),
    body('latitude').optional({ nullable: true }).isFloat(),
    body('longitude').optional({ nullable: true }).isFloat(),
    body('notes').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { fullName, phone, region, zone, woreda, specificLocation, latitude, longitude, notes, attachments } = req.body;
      const customer = await Customer.create({
        fullName, phone, region, zone, woreda, specificLocation, latitude, longitude, notes,
        attachments: attachments || [],
        createdBy: req.user._id,
      });
      res.status(201).json({ customer });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/customers/:id
router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('fullName').optional().trim().notEmpty(),
    body('region').optional().trim().notEmpty(),
    body('latitude').optional({ nullable: true }).isFloat(),
    body('longitude').optional({ nullable: true }).isFloat(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const allowed = ['fullName', 'phone', 'region', 'zone', 'woreda', 'specificLocation', 'latitude', 'longitude', 'notes', 'attachments'];
      const updates = {};
      allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const customer = await Customer.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
        .populate('createdBy', 'fullName email');
      if (!customer) return res.status(404).json({ message: 'Customer not found' });
      res.json({ customer });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/customers/:id
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await Installation.deleteMany({ customer: req.params.id });
    res.json({ message: 'Customer and related installations deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
