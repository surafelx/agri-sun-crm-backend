const express = require('express');
const ExcelJS = require('exceljs');
const Customer = require('../models/Customer');
const Installation = require('../models/Installation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: escape CSV value
const csvVal = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

// Helper: set CSV response headers
const csvHeaders = (res, filename) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
};

// Helper: set Excel response headers
const excelHeaders = (res, filename) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
};

// ── GET /api/reports/customers ────────────────────────────────────────────────
router.get('/customers', async (req, res, next) => {
  try {
    const { region, search, format = 'csv' } = req.query;
    const filter = {};
    if (region) filter.region = { $regex: region, $options: 'i' };
    if (search) filter.$text = { $search: search };

    const customers = await Customer.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    const rows = customers.map((c) => ({
      'Full Name': c.fullName,
      'Phone': c.phone,
      'Region': c.region,
      'Zone': c.zone,
      'Woreda': c.woreda,
      'Specific Location': c.specificLocation,
      'Latitude': c.latitude ?? '',
      'Longitude': c.longitude ?? '',
      'Notes': c.notes,
      'Created By': c.createdBy?.fullName || '',
      'Created At': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    }));

    if (format === 'excel') {
      excelHeaders(res, 'customers-report.xlsx');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Customers');
      ws.columns = Object.keys(rows[0] || {}).map((k) => ({ header: k, key: k, width: 20 }));
      rows.forEach((r) => ws.addRow(r));
      // Style header row
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      await wb.xlsx.write(res);
      return res.end();
    }

    // CSV
    csvHeaders(res, 'customers-report.csv');
    if (rows.length === 0) return res.end('No data');
    const headers = Object.keys(rows[0]);
    res.write(headers.map(csvVal).join(',') + '\n');
    rows.forEach((r) => res.write(headers.map((h) => csvVal(r[h])).join(',') + '\n'));
    res.end();
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/installations ────────────────────────────────────────────
router.get('/installations', async (req, res, next) => {
  try {
    const { status, region, dateFrom, dateTo, format = 'csv' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.installationDate = {};
      if (dateFrom) filter.installationDate.$gte = new Date(dateFrom);
      if (dateTo) filter.installationDate.$lte = new Date(dateTo);
    }

    let installations = await Installation.find(filter)
      .populate('customer', 'fullName phone region zone woreda')
      .populate('createdBy', 'fullName email')
      .sort({ installationDate: -1, createdAt: -1 });

    if (region) {
      installations = installations.filter((i) =>
        i.customer?.region?.toLowerCase().includes(region.toLowerCase())
      );
    }

    const rows = installations.map((i) => ({
      'Project Title': i.projectTitle,
      'Category': i.projectCategory,
      'Customer': i.customer?.fullName || '',
      'Region': i.customer?.region || '',
      'Woreda': i.customer?.woreda || '',
      'Site Name': i.siteName,
      'Geo Location': i.geoLocation,
      'End User': i.endUserName || i.endUsers?.map((u) => u.name).join(', ') || '',
      'End User Phone': i.endUserPhone || i.endUsers?.map((u) => u.phone).join(', ') || '',
      'Status': i.status,
      'Installation Date': i.installationDate ? new Date(i.installationDate).toLocaleDateString() : '',
      'Well Depth (m)': i.wellData?.depth ?? '',
      'Well Diameter (m)': i.wellData?.diameter ?? '',
      'Water Level (m)': i.wellData?.waterLevel ?? '',
      'Casing Size': i.wellData?.casingSize || '',
      'Casing Type': i.wellData?.casingType || '',
      'Pump Brand': i.pumpData?.brand || '',
      'Pump Model': i.pumpData?.model || '',
      'Pump Type': i.pumpData?.type || '',
      'Pump Power': i.pumpData?.power || '',
      'Controller': i.pumpData?.controller || '',
      'Solar Panel': i.pumpData?.solarPanel || '',
      'Team': i.installationTeam?.join(', ') || '',
      'Delivered By': i.deliveredBy,
      'Received By': i.receivedBy,
      'Remarks': i.remarks,
      'Created By': i.createdBy?.fullName || '',
    }));

    if (format === 'excel') {
      excelHeaders(res, 'installations-report.xlsx');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Installations');
      ws.columns = Object.keys(rows[0] || {}).map((k) => ({ header: k, key: k, width: 20 }));
      rows.forEach((r) => ws.addRow(r));
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      await wb.xlsx.write(res);
      return res.end();
    }

    csvHeaders(res, 'installations-report.csv');
    if (rows.length === 0) return res.end('No data');
    const headers = Object.keys(rows[0]);
    res.write(headers.map(csvVal).join(',') + '\n');
    rows.forEach((r) => res.write(headers.map((h) => csvVal(r[h])).join(',') + '\n'));
    res.end();
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/installations-by-status ──────────────────────────────────
router.get('/installations-by-status', async (req, res, next) => {
  try {
    const result = await Installation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ data: result.map((r) => ({ status: r._id, count: r.count })) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/installations-by-region ──────────────────────────────────
router.get('/installations-by-region', async (req, res, next) => {
  try {
    const result = await Installation.aggregate([
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'cust',
        },
      },
      { $unwind: { path: '$cust', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cust.region', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ data: result.map((r) => ({ region: r._id || 'Unknown', count: r.count })) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/well-summary ─────────────────────────────────────────────
router.get('/well-summary', async (req, res, next) => {
  try {
    const installations = await Installation.find({
      $or: [
        { 'wellData.depth': { $gt: 0 } },
        { 'wellData.diameter': { $gt: 0 } },
        { 'wellData.waterLevel': { $gt: 0 } },
      ],
    }).populate('customer', 'fullName region woreda');

    const rows = installations.map((i) => ({
      'Customer': i.customer?.fullName || '',
      'Region': i.customer?.region || '',
      'Woreda': i.customer?.woreda || '',
      'Project': i.projectTitle || '',
      'Depth (m)': i.wellData?.depth ?? '',
      'Diameter (m)': i.wellData?.diameter ?? '',
      'Water Level (m)': i.wellData?.waterLevel ?? '',
      'Casing Size': i.wellData?.casingSize || '',
      'Casing Type': i.wellData?.casingType || '',
      'Status': i.status,
      'Date': i.installationDate ? new Date(i.installationDate).toLocaleDateString() : '',
    }));

    const format = req.query.format || 'csv';
    if (format === 'excel') {
      excelHeaders(res, 'well-summary.xlsx');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Well Summary');
      ws.columns = Object.keys(rows[0] || {}).map((k) => ({ header: k, key: k, width: 20 }));
      rows.forEach((r) => ws.addRow(r));
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      await wb.xlsx.write(res);
      return res.end();
    }

    csvHeaders(res, 'well-summary.csv');
    if (rows.length === 0) return res.end('No data');
    const headers = Object.keys(rows[0]);
    res.write(headers.map(csvVal).join(',') + '\n');
    rows.forEach((r) => res.write(headers.map((h) => csvVal(r[h])).join(',') + '\n'));
    res.end();
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/custom ───────────────────────────────────────────────────
// Custom report: pick entity type, fields, and filters
router.get('/custom', async (req, res, next) => {
  try {
    const { entity = 'customers', fields, format = 'csv', ...filters } = req.query;

    // Default field sets
    const fieldSets = {
      customers: {
        fullName: 'Full Name', phone: 'Phone', region: 'Region', zone: 'Zone',
        woreda: 'Woreda', specificLocation: 'Specific Location', notes: 'Notes',
        createdAt: 'Created At',
      },
      installations: {
        projectTitle: 'Project Title', projectCategory: 'Category', siteName: 'Site',
        status: 'Status', installationDate: 'Installation Date',
        'wellData.depth': 'Well Depth', 'wellData.diameter': 'Well Diameter',
        'wellData.waterLevel': 'Water Level', 'wellData.casingSize': 'Casing Size',
        'wellData.casingType': 'Casing Type',
        'pumpData.brand': 'Pump Brand', 'pumpData.model': 'Pump Model',
        'pumpData.power': 'Pump Power', 'pumpData.type': 'Pump Type',
        endUserName: 'End User', endUserPhone: 'End User Phone',
        deliveredBy: 'Delivered By', receivedBy: 'Received By', remarks: 'Remarks',
      },
      wells: {
        'wellData.depth': 'Depth (m)', 'wellData.diameter': 'Diameter (m)',
        'wellData.waterLevel': 'Water Level (m)', 'wellData.casingSize': 'Casing Size',
        'wellData.casingType': 'Casing Type', projectTitle: 'Project',
        status: 'Status', installationDate: 'Date',
      },
    };

    // Determine which fields to include
    let selectedFields;
    if (fields) {
      const requested = fields.split(',');
      const allFields = fieldSets[entity] || fieldSets.customers;
      selectedFields = {};
      requested.forEach((f) => {
        const key = f.trim();
        if (allFields[key]) selectedFields[key] = allFields[key];
      });
    } else {
      selectedFields = fieldSets[entity] || fieldSets.customers;
    }

    let data;
    if (entity === 'customers') {
      const filter = {};
      if (filters.region) filter.region = { $regex: filters.region, $options: 'i' };
      data = await Customer.find(filter).sort({ createdAt: -1 });
    } else if (entity === 'installations' || entity === 'wells') {
      const filter = {};
      if (filters.status) filter.status = filters.status;
      if (filters.dateFrom || filters.dateTo) {
        filter.installationDate = {};
        if (filters.dateFrom) filter.installationDate.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) filter.installationDate.$lte = new Date(filters.dateTo);
      }
      data = await Installation.find(filter)
        .populate('customer', 'fullName region woreda')
        .sort({ createdAt: -1 });

      if (filters.region) {
        data = data.filter((i) =>
          i.customer?.region?.toLowerCase().includes(filters.region.toLowerCase())
        );
      }
    } else {
      return res.status(400).json({ message: 'Invalid entity type. Use: customers, installations, or wells' });
    }

    // Flatten nested fields
    const flatten = (obj, prefix = '') => {
      const result = {};
      for (const [key, val] of Object.entries(obj || {})) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
          Object.assign(result, flatten(val, newKey));
        } else {
          result[newKey] = val;
        }
      }
      return result;
    };

    const rows = data.map((item) => {
      const flat = flatten(item.toObject());
      const row = {};
      for (const [dbKey, label] of Object.entries(selectedFields)) {
        let val = flat[dbKey];
        if (val instanceof Date) val = val.toLocaleDateString();
        if (val === undefined || val === null) val = '';
        row[label] = val;
      }
      // Add customer name for installations/wells
      if ((entity === 'installations' || entity === 'wells') && row['Customer'] === undefined) {
        const flat2 = flatten(item.toObject());
        row['Customer'] = flat2['customer'] || item.customer?.fullName || '';
      }
      return row;
    });

    if (format === 'excel') {
      excelHeaders(res, `${entity}-custom-report.xlsx`);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Custom Report');
      if (rows.length > 0) {
        ws.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 20 }));
        rows.forEach((r) => ws.addRow(r));
        ws.getRow(1).font = { bold: true };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      }
      await wb.xlsx.write(res);
      return res.end();
    }

    csvHeaders(res, `${entity}-custom-report.csv`);
    if (rows.length === 0) return res.end('No data');
    const headers = Object.keys(rows[0]);
    res.write(headers.map(csvVal).join(',') + '\n');
    rows.forEach((r) => res.write(headers.map((h) => csvVal(r[h])).join(',') + '\n'));
    res.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
