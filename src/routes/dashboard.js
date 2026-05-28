const express = require('express');
const Customer = require('../models/Customer');
const Installation = require('../models/Installation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      totalInstallations,
      pendingInstallations,
      inProgressInstallations,
      completedInstallations,
      cancelledInstallations,
      newCustomersThisMonth,
      newInstallationsThisMonth,
      recentCustomers,
      recentInstallations,
    ] = await Promise.all([
      Customer.countDocuments(),
      Installation.countDocuments(),
      Installation.countDocuments({ status: 'Pending' }),
      Installation.countDocuments({ status: 'In Progress' }),
      Installation.countDocuments({ status: 'Completed' }),
      Installation.countDocuments({ status: 'Cancelled' }),
      Customer.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Installation.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Customer.find().sort({ createdAt: -1 }).limit(5).select('fullName phone region createdAt'),
      Installation.find().sort({ createdAt: -1 }).limit(5)
        .populate('customer', 'fullName region')
        .select('projectTitle status installationDate createdAt'),
    ]);

    res.json({
      totalCustomers,
      totalInstallations,
      pendingInstallations,
      inProgressInstallations,
      completedInstallations,
      cancelledInstallations,
      newCustomersThisMonth,
      newInstallationsThisMonth,
      recentCustomers,
      recentInstallations,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/installations-by-status
router.get('/installations-by-status', async (req, res, next) => {
  try {
    const data = await Installation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/customers-by-region
router.get('/customers-by-region', async (req, res, next) => {
  try {
    const data = await Customer.aggregate([
      { $group: { _id: '$region', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/monthly-installations
router.get('/monthly-installations', async (req, res, next) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const data = await Installation.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
