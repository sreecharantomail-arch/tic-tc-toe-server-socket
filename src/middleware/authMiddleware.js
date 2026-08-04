const jwt = require('jsonwebtoken');
const Player = require('../models/Player');
const { JWT_SECRET } = require('./socketAuth');

/**
 * HTTP Middleware to protect Express routes with JWT authentication
 */
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Authorization token missing or malformed.',
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const player = await Player.findById(decoded.id).select('-password');
        if (!player) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization token.',
            });
        }

        req.user = player;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
}

module.exports = authMiddleware;
