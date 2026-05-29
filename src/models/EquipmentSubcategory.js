const mongoose = require('mongoose');

const equipmentSubcategorySchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentCategory', required: true },
  description: { type: String, trim: true, default: '' },
  order:       { type: Number, default: 0 },
}, { timestamps: true });

equipmentSubcategorySchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('EquipmentSubcategory', equipmentSubcategorySchema);
