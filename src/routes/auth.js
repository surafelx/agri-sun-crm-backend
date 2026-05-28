const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !user.isActive || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      res.json({ token: signToken(user._id), user });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/register
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'agent']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { fullName, email, password, role } = req.body;
      const user = await User.create({ fullName, email, password, role });
      res.status(201).json({ token: signToken(user._id), user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

// PUT /api/auth/me
router.put(
  '/me',
  authenticate,
  [body('fullName').optional().trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { fullName } = req.body;
      if (fullName) req.user.fullName = fullName;
      await req.user.save();
      res.json({ user: req.user });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticate,
  [body('currentPassword').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select('+password');
      if (!(await user.comparePassword(req.body.currentPassword))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.password = req.body.newPassword;
      await user.save();
      res.json({ message: 'Password updated' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
