const jwt = require("jsonwebtoken");
const Player = require("../models/Player");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "replace_with_secure_secret_in_production";

/**
 * Socket.io authentication middleware
 * Attaches user object to socket if valid token provided
 * Allows unauthenticated connections (guest play)
 */
async function socketAuthMiddleware(socket, next) {
    try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;

        if (!token) {
            // No token - allow as guest
            socket.user = null;
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch fresh user data from DB (optional, could cache)
        const player = await Player.findById(decoded.id).select("-password").lean();

        if (!player) {
            logger.warn("Token valid but user not found", { socketId: socket.id, userId: decoded.id });
            socket.user = null;
            return next();
        }

        // Attach user to socket
        socket.user = {
            id: player._id.toString(),
            username: player.username,
            email: player.email,
            avatar: player.avatar,
            activeTheme: player.activeTheme,
            nexaId: player.nexaId,
        };

        logger.debug({ socketId: socket.id, userId: player._id }, "Socket authenticated");
        next();
    } catch (err) {
        // Invalid token - allow as guest
        logger.warn("Socket auth failed, continuing as guest", { socketId: socket.id, error: err.message });
        socket.user = null;
        next();
    }
}

/**
 * Require authentication for socket events
 * Returns middleware that rejects unauthenticated sockets
 */
function requireAuth(socket, next) {
    if (!socket.user) {
        return next(new Error("Authentication required"));
    }
    next();
}

/**
 * Extract player info from socket for room events
 */
function getPlayerInfo(socket) {
    return {
        id: socket.user?.id,
        username: socket.user?.username || `Guest_${socket.id.slice(0, 4)}`,
        avatar: socket.user?.avatar || "gamer",
        nexaId: socket.user?.nexaId,
        isGuest: !socket.user,
    };
}

module.exports = {
    socketAuthMiddleware,
    requireAuth,
    getPlayerInfo,
    JWT_SECRET,
};