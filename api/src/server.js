const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

const authRouter = require('./routes/auth');
const agentsRouter = require('./routes/agents');
const deployedRouter = require('./routes/deployed');
const workflowsRouter = require('./routes/workflows');
const smartnationRouter = require('./routes/smartnation');
const sentinelRouter = require('./routes/sentinel');
const executeRouter = require('./routes/execute');
const adminRouter = require('./routes/admin');
const governanceRouter = require('./routes/governance');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://coreidentity.coreholdingcorp.com,https://coreidentity-dashboard.pages.dev').split(',');

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
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict limit on auth endpoints
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
}));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
}));

// ── Parsing & logging ────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── Health check (public) ────────────────────────────────────────────────
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

// ── Public routes ────────────────────────────────────────────────────────
// Public auth — register disabled, use /api/admin/users for customer creation
app.use('/api/auth', authRouter);

// ── Protected routes (JWT required) ─────────────────────────────────────
app.use('/api/agents',     authenticate, agentsRouter);
app.use('/api/deployed',   authenticate, deployedRouter);
app.use('/api/workflows',  authenticate, workflowsRouter);
app.use('/api/smartnation', smartnationRouter);
app.use('/api/sentinel', authenticate, sentinelRouter);
app.use('/api/execute', authenticate, executeRouter);
app.use('/api/admin',     authenticate, adminRouter);
app.use('/api/governance', authenticate, governanceRouter);

// ── 404 ──────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', code: 'NOT_FOUND', path: req.path });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info('server_started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});

module.exports = app;
// rebuild Sat Feb 21 08:09:51 EST 2026
// rebuild Sat Feb 21 13:17:04 EST 2026
