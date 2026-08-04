const mongoose = require('mongoose');
const Match = require('../models/Match');
const { logger, logError } = require('../utils/logger');

// In-memory State
const rooms = new Map();
const quickQueue = [];
const socketToRoom = new Map();

const WIN_PATTERNS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // columns
    [0, 4, 8],
    [2, 4, 6], // diagonals
];

/**
 * Generate a unique 6-character room code
 */
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return rooms.has(code) ? generateCode() : code;
}

/**
 * Check winning condition on 3x3 board
 */
function checkWinner(board) {
    for (const [a, b, c] of WIN_PATTERNS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

/**
 * Lookup room object by socket ID
 */
function roomForSocket(socketId) {
    const code = socketToRoom.get(socketId);
    return code ? rooms.get(code) : null;
}

/**
 * Generate empty board state
 */
function freshBoard(existingScores = null) {
    return {
        board: Array(9).fill(''),
        turn: 'X',
        over: false,
        scores: existingScores ?? { X: 0, O: 0, D: 0 },
        rematch: { X: false, O: false },
    };
}

/**
 * Broadcast current room state to all clients in room
 */
function broadcastRoomState(io, room) {
    io.to(room.code).emit('room:state', {
        board: room.board,
        turn: room.turn,
        scores: room.scores,
        over: room.over,
        hostName: room.hostName,
        guestName: room.guestName,
        avatarX: room.avatarX,
        avatarO: room.avatarO,
        rematch: room.rematch,
        spectators: room.spectators.size,
    });
}

/**
 * Sanitize room details for client response
 */
function sanitizeRoomForClient(room, socketId) {
    const isHost = room.hostId === socketId;
    return {
        code: room.code,
        symbol: isHost ? 'X' : 'O',
        hostName: room.hostName,
        guestName: room.guestName,
        avatarX: room.avatarX,
        avatarO: room.avatarO,
        board: room.board,
        turn: room.turn,
        scores: room.scores,
        over: room.over,
        rematch: room.rematch,
        isHost,
        mode: room.mode,
    };
}

/**
 * Remove socket from quick match queue
 */
function removeFromQueue(socketId) {
    const idx = quickQueue.findIndex(q => q.socketId === socketId);
    if (idx !== -1) {
        quickQueue.splice(idx, 1);
    }
}

/**
 * Handle player leaving a room
 */
function leaveCurrentRoom(io, socket) {
    const code = socketToRoom.get(socket.id);
    if (!code) {
        return;
    }

    const room = rooms.get(code);
    socket.leave(code);
    socketToRoom.delete(socket.id);

    if (!room) {
        return;
    }

    const otherSocketId = room.hostId === socket.id ? room.guestId : room.hostId;

    if (!otherSocketId) {
        setTimeout(() => {
            const r = rooms.get(code);
            if (
                r &&
                (!r.hostId || !io.sockets.sockets.has(r.hostId)) &&
                (!r.guestId || !io.sockets.sockets.has(r.guestId))
            ) {
                rooms.delete(code);
                logger.info({ code }, 'Cleaned up empty room');
            }
        }, 15000);
        return;
    }

    io.to(otherSocketId).emit('game:opponent-left', {
        message: 'Your opponent left the game.',
    });

    setTimeout(() => {
        const r = rooms.get(code);
        if (r && (r.hostId === socket.id || r.guestId === socket.id)) {
            if (!io.sockets.sockets.has(r.hostId) && !io.sockets.sockets.has(r.guestId)) {
                rooms.delete(code);
                if (r.guestId) {
                    socketToRoom.delete(r.guestId);
                }
                logger.info({ code }, 'Cleaned up abandoned room');
            }
        }
    }, 15000);
}

/**
 * Persist finished match result into MongoDB
 */
async function persistMatchResult(room, winnerSymbol, endReason) {
    try {
        if (mongoose.connection.readyState !== 1) {
            logger.warn({ roomCode: room.code }, 'Skipping match persist — DB not connected');
            return;
        }
        const winner =
            winnerSymbol === 'D' ? 'draw' : winnerSymbol === 'X' ? room.hostName : room.guestName;
        const match = new Match({
            roomCode: room.code,
            mode: room.mode,
            hostName: room.hostName,
            guestName: room.guestName,
            hostAvatar: room.avatarX,
            guestAvatar: room.avatarO,
            winner,
            endReason,
            board: room.board,
            scores: room.scores,
            duration: Date.now() - room.createdAt,
            playedAt: new Date(),
        });
        await match.save();
        logger.info({ roomCode: room.code, winner, endReason }, 'Match persisted');
    } catch (err) {
        logError(err, { roomCode: room.code, action: 'persistMatch' });
    }
}

/**
 * Periodically purge stale inactive rooms
 */
function startStaleRoomCleaner(io) {
    setInterval(() => {
        const now = Date.now();
        for (const [code, room] of rooms) {
            const hostAlive = io.sockets.sockets.has(room.hostId);
            const guestAlive = room.guestId && io.sockets.sockets.has(room.guestId);
            const stale = now - room.createdAt > 3600000; // 1 hour

            if ((!hostAlive && !guestAlive) || stale) {
                rooms.delete(code);
                logger.info({ code, stale, hostAlive, guestAlive }, 'Removed stale room');
            }
        }
    }, 60000);
}

module.exports = {
    rooms,
    quickQueue,
    socketToRoom,
    WIN_PATTERNS,
    generateCode,
    checkWinner,
    roomForSocket,
    freshBoard,
    broadcastRoomState,
    sanitizeRoomForClient,
    removeFromQueue,
    leaveCurrentRoom,
    persistMatchResult,
    startStaleRoomCleaner,
};
