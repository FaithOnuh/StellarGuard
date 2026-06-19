require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const treasuryRoutes = require('./routes/treasury');
const proposalRoutes = require('./routes/proposals');
const payrollRoutes  = require('./routes/payroll');
const memberRoutes   = require('./routes/members');
const adminRoutes    = require('./routes/admin');

require('./services/payrollJob'); // start cron

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth',     authRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/payroll',  payrollRoutes);
app.use('/api/members',  memberRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`StellarGuard API running on port ${PORT}`));
module.exports = app;
