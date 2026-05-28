require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes         = require('./routes/auth');
const usersRoutes        = require('./routes/users');
const customersRoutes    = require('./routes/customers');
const installationsRoutes = require('./routes/installations');
const dashboardRoutes    = require('./routes/dashboard');

const app = express();

connectDB().catch((err) => { console.error('DB connection failed:', err); process.exit(1); });

app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : null;

app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    : '*',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth',          authRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/customers',     customersRoutes);
app.use('/api/installations', installationsRoutes);
app.use('/api/dashboard',     dashboardRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`CRM server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
