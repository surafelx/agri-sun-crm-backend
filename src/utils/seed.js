require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  const existing = await User.findOne({ email: 'admin@agrisun.com' });
  if (existing) {
    console.log('Admin user already exists');
  } else {
    await User.create({ fullName: 'Admin', email: 'admin@agrisun.com', password: 'Admin@1234', role: 'admin' });
    console.log('Admin user created: admin@agrisun.com / Admin@1234');
  }

  console.log('Seed complete!');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
