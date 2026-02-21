const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const agentsRouter = require('./routes/agents');
const deployedRouter = require('./routes/deployed');
const workflowsRouter = require('./routes/workflows');
const governanceRouter = require('./routes/governance');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://coreidentity.coreholdingcorp.com').split(',');

// ── Security ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy violation: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rate limiting ────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
}));

// ── Parsing & logging ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── Health check ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    service: 'CoreIdentity API',
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/agents',     agentsRouter);
app.use('/api/deployed',   deployedRouter);
app.use('/api/workflows',  workflowsRouter);
app.use('/api/governance', governanceRouter);

// ── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', path: req.path });
});

// ── Error handler ────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

module.exports = app;
