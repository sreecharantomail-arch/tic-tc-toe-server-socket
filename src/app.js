const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const { logger } = require('./utils/logger');

const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 100;

const app = express();

// Trust reverse proxies (e.g. Render, Nginx, Heroku)
app.set('trust proxy', 1);

// Security Headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: false,
    })
);

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https: wss:; " +
            "font-src 'self' data: https:; " +
            "object-src 'none'; " +
            "frame-ancestors 'none'; " +
            "form-action 'self'; " +
            "base-uri 'self'"
    );
    next();
});

// CORS Configuration
app.use(
    cors({
        origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Body Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP Request Logger
app.use(
    morgan(NODE_ENV === 'production' ? 'combined' : 'dev', {
        stream: { write: msg => logger.info(msg.trim()) },
    })
);

// API Rate Limiting
const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.',
        });
    },
});
app.use('/api/', apiLimiter);

// Static Asset Serving
const publicPath = path.join(__dirname, '..', 'public');
app.use(
    express.static(publicPath, {
        maxAge: NODE_ENV === 'production' ? '1y' : '0',
        etag: true,
        lastModified: true,
    })
);

// API Routes
app.use('/api/auth', authRoutes);

// Health Check Endpoint
app.get('/health', (_req, res) => {
    const { rooms, quickQueue } = require('./sockets/roomManager');
    res.json({
        ok: true,
        rooms: rooms.size,
        queue: quickQueue.length,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
    });
});

// API Version Endpoint
app.get('/api/version', (_req, res) => {
    const pkg = require('../package.json');
    res.json({ version: pkg.version, name: pkg.name, env: NODE_ENV });
});

module.exports = app;
