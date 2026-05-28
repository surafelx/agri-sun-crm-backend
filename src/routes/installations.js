const express = require('express');
const { body, param } = require('express-validator');
const Installation = require('../models/Installation');
const Customer = require('../models/Customer');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// GET /api/installations
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, customer } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (customer) filter.customer = customer;

    const skip = (Number(page) - 1) * Number(limit);
    const [installations, total] = await Promise.all([
      Installation.find(filter)
        .populate('customer', 'fullName phone region woreda')
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Installation.countDocuments(filter),
    ]);

    res.json({ installations, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/installations/:id
router.get('/:id', [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    const installation = await Installation.findById(req.params.id)
      .populate('customer', 'fullName phone region zone woreda specificLocation latitude longitude')
      .populate('createdBy', 'fullName email');
    if (!installation) return res.status(404).json({ message: 'Installation not found' });
    res.json({ installation });
  } catch (err) {
    next(err);
  }
});

// POST /api/installations
router.post(
  '/',
  [
    body('customer').isMongoId().withMessage('Valid customer ID required'),
    body('projectTitle').optional().trim(),
    body('projectCategory').optional().trim(),
    body('siteName').optional().trim(),
    body('geoLocation').optional().trim(),
    body('endUserName').optional().trim(),
    body('endUserPhone').optional().trim(),
    body('status').optional().isIn(['Pending', 'In Progress', 'Completed', 'Cancelled']),
    body('installationDate').optional({ nullable: true }).isISO8601().toDate(),
    body('wellData.diameter').optional({ nullable: true }).isFloat(),
    body('wellData.depth').optional({ nullable: true }).isFloat(),
    body('wellData.waterLevel').optional({ nullable: true }).isFloat(),
    body('wellData.casingSize').optional().trim(),
    body('wellData.casingType').optional().trim(),
    body('deliveredBy').optional().trim(),
    body('receivedBy').optional().trim(),
    body('remarks').optional().trim(),
    body('installationTeam').optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const customer = await Customer.findById(req.body.customer);
      if (!customer) return res.status(404).json({ message: 'Customer not found' });

      const installation = await Installation.create({
        customer:        req.body.customer,
        projectTitle:    req.body.projectTitle,
        projectCategory: req.body.projectCategory,
        siteName:        req.body.siteName,
        geoLocation:     req.body.geoLocation,
        endUserName:     req.body.endUserName,
        endUserPhone:    req.body.endUserPhone,
        wellData:        req.body.wellData,
        pumpData:        req.body.pumpData,
        packageItems:    req.body.packageItems,
        installationTeam: req.body.installationTeam,
        activitiesPerformed: req.body.activitiesPerformed,
        deliveredBy:     req.body.deliveredBy,
        receivedBy:      req.body.receivedBy,
        installationDate: req.body.installationDate,
        status:          req.body.status,
        remarks:         req.body.remarks,
        createdBy:       req.user._id,
      });

      const populated = await Installation.findById(installation._id)
        .populate('customer', 'fullName phone region zone woreda')
        .populate('createdBy', 'fullName email');

      res.status(201).json({ installation: populated });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/installations/:id
router.put(
  '/:id',
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['Pending', 'In Progress', 'Completed', 'Cancelled']),
    body('installationDate').optional({ nullable: true }).isISO8601().toDate(),
    body('wellData.diameter').optional({ nullable: true }).isFloat(),
    body('wellData.depth').optional({ nullable: true }).isFloat(),
    body('wellData.waterLevel').optional({ nullable: true }).isFloat(),
    body('installationTeam').optional().isArray(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const allowed = [
        'projectTitle', 'projectCategory', 'siteName', 'geoLocation',
        'endUserName', 'endUserPhone',
        'wellData', 'pumpData', 'packageItems', 'installationTeam',
        'activitiesPerformed', 'deliveredBy', 'receivedBy',
        'installationDate', 'status', 'remarks',
      ];
      const updates = {};
      allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

      const installation = await Installation.findByIdAndUpdate(
        req.params.id, updates, { new: true, runValidators: true }
      )
        .populate('customer', 'fullName phone region zone woreda')
        .populate('createdBy', 'fullName email');
      if (!installation) return res.status(404).json({ message: 'Installation not found' });
      res.json({ installation });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/installations/:id
router.delete('/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    const installation = await Installation.findByIdAndDelete(req.params.id);
    if (!installation) return res.status(404).json({ message: 'Installation not found' });
    res.json({ message: 'Installation deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
