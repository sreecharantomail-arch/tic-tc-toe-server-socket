const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('../middleware/socketAuth');
const { logger, logSocketEvent } = require('../utils/logger');
const { rooms, quickQueue, startStaleRoomCleaner } = require('./roomManager');
const registerSocketHandlers = require('./socketHandlers');

const SOCKET_RATE_LIMIT_MAX = 30; // events per window
const SOCKET_RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const socketRateLimits = new Map();

function socketRateLimiter(socket, eventName) {
    const key = `${socket.id}:${eventName}`;
    const now = Date.now();
    const windowStart = now - SOCKET_RATE_LIMIT_WINDOW_MS;

    if (!socketRateLimits.has(key)) {
        socketRateLimits.set(key, []);
    }

    const timestamps = socketRateLimits.get(key).filter(t => t > windowStart);
    timestamps.push(now);
    socketRateLimits.set(key, timestamps);

    return timestamps.length <= SOCKET_RATE_LIMIT_MAX;
}

// Clean up socket rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of socketRateLimits) {
        const recent = timestamps.filter(t => t > now - SOCKET_RATE_LIMIT_WINDOW_MS);
        if (recent.length === 0) {
            socketRateLimits.delete(key);
        } else {
            socketRateLimits.set(key, recent);
        }
    }
}, 60000);

/**
 * Initialize Socket.io server instance
 */
function initSocketServer(server, corsOrigin) {
    const io = new Server(server, {
        cors: {
            origin: corsOrigin === '*' ? true : corsOrigin.split(','),
            methods: ['GET', 'POST'],
            credentials: true,
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 10000,
            skipMiddlewares: true,
        },
        pingTimeout: 20000,
        pingInterval: 10000,
    });

    // Attach Socket authentication middleware
    io.use(socketAuthMiddleware);

    // Start background room cleaner
    startStaleRoomCleaner(io);

    // Connection listener
    io.on('connection', socket => {
        const user = socket.user;
        logger.info(
            { socketId: socket.id, userId: user?.id, username: user?.username },
            'Socket connected'
        );

        // Intercept socket.on for rate limiting & logging
        const originalOn = socket.on.bind(socket);
        socket.on = (event, handler) => {
            if (typeof handler === 'function') {
                return originalOn(event, (...args) => {
                    if (!socketRateLimiter(socket, event)) {
                        logger.warn('Socket rate limit exceeded', { socketId: socket.id, event });
                        return;
                    }
                    logSocketEvent(event, args[0], socket.id);
                    return handler(...args);
                });
            }
            return originalOn(event, handler);
        };

        // Register feature event handlers
        registerSocketHandlers(io, socket);
    });

    return io;
}

module.exports = {
    initSocketServer,
    rooms,
    quickQueue,
};
