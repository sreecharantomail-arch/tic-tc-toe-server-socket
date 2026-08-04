/**
 * src/server.js — Server Entry Point
 * NexaClash Ultimate Edition Multiplayer Game Server
 */
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocketServer } = require('./sockets');
const { logger, logError } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Connect to MongoDB database
connectDB().catch(err => {
    logError(err, { action: 'connectDB' });
});

// Create HTTP server
const server = http.createServer(app);

// Increase socket & keepalive timeouts for cloud proxies (e.g. Render, Railway)
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
server.timeout = 120000;

// Attach Socket.io server instance
const io = initSocketServer(server, CORS_ORIGIN);

// Graceful Shutdown Handler
let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        logger.warn('Force shutdown initiated');
        process.exit(1);
    }
    isShuttingDown = true;

    logger.info({ signal }, 'Shutting down gracefully...');

    server.close(() => {
        logger.info('HTTP server closed');
    });

    io.close(() => {
        logger.info('Socket.io server closed');
    });

    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');
        }
    } catch (err) {
        logError(err, { action: 'closeDB' });
    }

    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', err => {
    logError(err, { fatal: true });
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
});

// Start Server Listener
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🎮 NexaClash Ultimate server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info('Serving static files from ./public');
});

module.exports = { app, server, io };
