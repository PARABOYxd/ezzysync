const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDb } = require('./db');
const { login, me, requireSuperAdmin } = require('./auth');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EzzySync Master Admin Backend', time: new Date().toISOString() });
});

// Auth endpoints
app.post('/api/auth/login', login);
app.get('/api/auth/me', requireSuperAdmin, me);

// Master Admin Data & Operation Routes
app.use('/api', apiRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Boot Server & Initialize DB
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 [AdminBE] Super Admin Backend listening on port ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  });
}

startServer();
