const mongoose = require('mongoose');

const installationSchema = new mongoose.Schema({
  customer:     { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  projectTitle: { type: String, trim: true, default: '' },

  wellData: {
    diameter:    { type: Number, default: null },
    depth:       { type: Number, default: null },
    waterLevel:  { type: Number, default: null },
    casingSize:  { type: String, trim: true, default: '' },
    casingType:  { type: String, trim: true, default: '' },
  },

  activitiesPerformed: {
    casing:             { type: Boolean, default: false },
    solarPump:          { type: Boolean, default: false },
    testing:            { type: Boolean, default: false },
    solarPanelStructure:{ type: Boolean, default: false },
    sprinkler:          { type: Boolean, default: false },
    practicalTraining:  { type: Boolean, default: false },
  },

  deliveredBy:      { type: String, trim: true, default: '' },
  receivedBy:       { type: String, trim: true, default: '' },
  installationDate: { type: Date, default: null },
  status:           { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
  remarks:          { type: String, trim: true, default: '' },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Installation', installationSchema);
