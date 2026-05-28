const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  fullName:         { type: String, required: true, trim: true },
  phone:            { type: String, trim: true, default: '' },
  region:           { type: String, required: true, trim: true },
  zone:             { type: String, trim: true, default: '' },
  woreda:           { type: String, trim: true, default: '' },
  specificLocation: { type: String, trim: true, default: '' },
  latitude:         { type: Number, default: null },
  longitude:        { type: Number, default: null },
  notes:            { type: String, trim: true, default: '' },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

customerSchema.index({ fullName: 'text', phone: 'text', region: 'text', woreda: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
