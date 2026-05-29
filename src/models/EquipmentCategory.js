const mongoose = require('mongoose');

const equipmentCategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true, default: '' },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('EquipmentCategory', equipmentCategorySchema);
