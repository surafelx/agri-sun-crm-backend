const express = require('express');
const { body, param, query } = require('express-validator');
const EquipmentCategory    = require('../models/EquipmentCategory');
const EquipmentSubcategory = require('../models/EquipmentSubcategory');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

// ── Categories ────────────────────────────────────────────────────────────────

// GET /api/equipment/categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await EquipmentCategory.find().sort({ order: 1, name: 1 });
    res.json({ categories });
  } catch (err) { next(err); }
});

// POST /api/equipment/categories
router.post(
  '/categories',
  authorize('admin'),
  [body('name').trim().notEmpty().withMessage('Name is required')],
  validate,
  async (req, res, next) => {
    try {
      const cat = await EquipmentCategory.create({ name: req.body.name, description: req.body.description || '' });
      res.status(201).json({ category: cat });
    } catch (err) { next(err); }
  }
);

// PUT /api/equipment/categories/:id
router.put(
  '/categories/:id',
  authorize('admin'),
  [param('id').isMongoId(), body('name').optional().trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const cat = await EquipmentCategory.findByIdAndUpdate(
        req.params.id,
        { name: req.body.name, description: req.body.description },
        { new: true, runValidators: true }
      );
      if (!cat) return res.status(404).json({ message: 'Category not found' });
      res.json({ category: cat });
    } catch (err) { next(err); }
  }
);

// DELETE /api/equipment/categories/:id
router.delete('/categories/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    await EquipmentCategory.findByIdAndDelete(req.params.id);
    await EquipmentSubcategory.deleteMany({ category: req.params.id });
    res.json({ message: 'Category and its subcategories deleted' });
  } catch (err) { next(err); }
});

// ── Subcategories ─────────────────────────────────────────────────────────────

// GET /api/equipment/subcategories?category=id
router.get('/subcategories', async (req, res, next) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const subcategories = await EquipmentSubcategory.find(filter)
      .populate('category', 'name')
      .sort({ order: 1, name: 1 });
    res.json({ subcategories });
  } catch (err) { next(err); }
});

// POST /api/equipment/subcategories
router.post(
  '/subcategories',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').isMongoId().withMessage('Valid category ID required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const sub = await EquipmentSubcategory.create({
        name: req.body.name, category: req.body.category, description: req.body.description || '',
      });
      const populated = await EquipmentSubcategory.findById(sub._id).populate('category', 'name');
      res.status(201).json({ subcategory: populated });
    } catch (err) { next(err); }
  }
);

// PUT /api/equipment/subcategories/:id
router.put(
  '/subcategories/:id',
  authorize('admin'),
  [param('id').isMongoId(), body('name').optional().trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const sub = await EquipmentSubcategory.findByIdAndUpdate(
        req.params.id,
        { name: req.body.name, description: req.body.description },
        { new: true, runValidators: true }
      ).populate('category', 'name');
      if (!sub) return res.status(404).json({ message: 'Subcategory not found' });
      res.json({ subcategory: sub });
    } catch (err) { next(err); }
  }
);

// DELETE /api/equipment/subcategories/:id
router.delete('/subcategories/:id', authorize('admin'), [param('id').isMongoId()], validate, async (req, res, next) => {
  try {
    await EquipmentSubcategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subcategory deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
