require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const EquipmentCategory    = require('../models/EquipmentCategory');
const EquipmentSubcategory = require('../models/EquipmentSubcategory');

const SEED = [
  { name: 'Solar Pump',        subs: ['Submersible', 'Surface', 'Centrifugal'] },
  { name: 'Solar Panel',       subs: ['Monocrystalline', 'Polycrystalline', 'Thin Film'] },
  { name: 'Controller',        subs: ['MPPT Controller', 'PWM Controller', 'Inverter'] },
  { name: 'Battery',           subs: ['Lithium', 'Lead Acid', 'AGM'] },
  { name: 'Pipe & Fittings',   subs: ['HDPE', 'PVC', 'GI Pipe', 'Fittings'] },
  { name: 'Cable',             subs: ['AC Cable', 'DC Cable', 'Extension Cable'] },
  { name: 'PV Structure',      subs: ['Mounted Structure', 'Ground Mount', 'Pole Mount'] },
  { name: 'Fence',             subs: ['Mush Wire', 'Chain Link', 'Barbed Wire'] },
  { name: 'Accessories',       subs: ['Sprinkler', 'Bulbs', 'Junction Box', 'Connectors', 'Breaker'] },
  { name: 'Casing',            subs: ['Steel Casing', 'PVC Casing', 'uPVC Casing'] },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [i, item] of SEED.entries()) {
    let cat = await EquipmentCategory.findOne({ name: item.name });
    if (!cat) {
      cat = await EquipmentCategory.create({ name: item.name, order: i });
      console.log(`  Created category: ${cat.name}`);
    } else {
      console.log(`  Exists: ${cat.name}`);
    }
    for (const [j, subName] of item.subs.entries()) {
      const exists = await EquipmentSubcategory.findOne({ name: subName, category: cat._id });
      if (!exists) {
        await EquipmentSubcategory.create({ name: subName, category: cat._id, order: j });
        console.log(`    + ${subName}`);
      }
    }
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
