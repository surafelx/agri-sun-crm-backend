const mongoose = require('mongoose');

const installationSchema = new mongoose.Schema({
  customer:        { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  projectTitle:    { type: String, trim: true, default: '' },
  projectCategory: { type: String, trim: true, default: '' },

  // Site / end-users
  siteName:    { type: String, trim: true, default: '' },
  geoLocation: { type: String, trim: true, default: '' },
  endUsers: [{
    name:  { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
  }],
  // Legacy single-enduser fields kept for backward compat
  endUserName:  { type: String, trim: true, default: '' },
  endUserPhone: { type: String, trim: true, default: '' },

  wellData: {
    diameter:   { type: Number, default: null },
    depth:      { type: Number, default: null },
    waterLevel: { type: Number, default: null },
    casingSize: { type: String, trim: true, default: '' },
    casingType: { type: String, trim: true, default: '' },
  },

  // Pump
  pumpData: {
    type:         { type: String, trim: true, default: '' },
    serialNumber: { type: String, trim: true, default: '' },
    brand:        { type: String, trim: true, default: '' },
    model:        { type: String, trim: true, default: '' },
    power:        { type: String, trim: true, default: '' },
    maxDischarge: { type: String, trim: true, default: '' },
    maxHead:      { type: String, trim: true, default: '' },
    controller:   { type: String, trim: true, default: '' },
    solarPanel:   { type: String, trim: true, default: '' },
  },

  // Package items delivered
  packageItems: {
    pipe:             { type: String, trim: true, default: '' },
    acCables:         { type: String, trim: true, default: '' },
    dcCables:         { type: String, trim: true, default: '' },
    accessories:      { type: String, trim: true, default: '' },
    pvMountedStructure: { type: String, trim: true, default: '' },
    fence:            { type: String, trim: true, default: '' },
  },

  // Equipment items
  equipment: [{
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentCategory', default: null },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentSubcategory', default: null },
    categoryName:    { type: String, trim: true, default: '' }, // denormalised for display
    subcategoryName: { type: String, trim: true, default: '' },
    quantity: { type: String, trim: true, default: '' },
    specs:    { type: String, trim: true, default: '' },
  }],

  // Installation team
  installationTeam: [{ type: String, trim: true }],

  activitiesPerformed: {
    casing:              { type: Boolean, default: false },
    solarPump:           { type: Boolean, default: false },
    testing:             { type: Boolean, default: false },
    solarPanelStructure: { type: Boolean, default: false },
    sprinkler:           { type: Boolean, default: false },
    practicalTraining:   { type: Boolean, default: false },
  },

  deliveredBy:      { type: String, trim: true, default: '' },
  receivedBy:       { type: String, trim: true, default: '' },
  installationDate: { type: Date, default: null },
  status:           { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  remarks:          { type: String, trim: true, default: '' },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Installation', installationSchema);
