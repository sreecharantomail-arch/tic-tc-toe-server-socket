/**
 * server.js — NexaClash Ultimate Edition Multiplayer Server
 * Node.js + Express + Socket.io + MongoDB
 *
 * Features:
 *   • Private rooms (create / join by 6-char code)
 *   • Quick match (random matchmaking queue)
 *   • In-game moves (board sync)
 *   • Real-time chat (room-scoped)
 *   • Emoji reactions
 *   • Rematch requests
 *   • Disconnect / timeout cleanup
 *   • Rate limiting, validation, logging, graceful shutdown
 *   • Socket.io authentication middleware
 *   • Match history persistence
 *
 * Deploy: node server.js
 * Or with PM2: pm2 start ecosystem.config.js
 */
require("dotenv").config();
const express = require("express");
const connectDB = require("./database");
const authRoutes = require("./routes/auth");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { socketAuthMiddleware, requireAuth, getPlayerInfo } = require("./middleware/socketAuth");
const { 
    validateRoomCode, 
    validatePlayerName, 
    validateChatMessage, 
    sanitizeString,
    PLAYER_NAME_MIN,
    PLAYER_NAME_MAX,
    PLAYER_NAME_REGEX,
    ROOM_CODE_REGEX,
    CHAT_MAX_LENGTH,
} = require("./utils/validation");
const { logger, logError, logSocketEvent } = require("./utils/logger");
const Match = require("./models/Match");

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const JWT_SECRET = process.env.JWT_SECRET || "replace_with_secure_secret_in_production";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 100;
const SOCKET_RATE_LIMIT_MAX = 30; // events per window
const SOCKET_RATE_LIMIT_WINDOW_MS = 1000; // 1 second

// ─── Socket Rate Limiter ──────────────────────────────────────────────────────
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

    if (timestamps.length > SOCKET_RATE_LIMIT_MAX) {
        return false; // rate limited
    }
    return true;
}

// Clean up rate limit map periodically
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

// ─── App & HTTP server ──────────────────────────────────────────────────────
const app = express();
connectDB();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", 1);

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: NODE_ENV === "production" ? undefined : false,
}));
app.use(cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev", {
    stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ─── Rate limiting ──────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
    handler: (req, res) => {
        logger.warn({ ip: req.ip, path: req.path }, "Rate limit exceeded");
        res.status(429).json({ success: false, message: "Too many requests, please try again later." });
    },
});
app.use("/api/", apiLimiter);

// ─── Static files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public"), {
    maxAge: NODE_ENV === "production" ? "1y" : "0",
    etag: true,
    lastModified: true,
}));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// Health check endpoint (for load balancers, PM2, etc.)
app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        rooms: rooms.size,
        queue: quickQueue.length,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
    });
});

// API version endpoint
app.get("/api/version", (_req, res) => {
    const pkg = require("./package.json");
    res.json({ version: pkg.version, name: pkg.name, env: NODE_ENV });
});

// ─── Socket.io ──────────────────────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(","),
        methods: ["GET", "POST"],
        credentials: true,
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 10000,
        skipMiddlewares: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
});

// Socket.io authentication middleware
io.use(socketAuthMiddleware);

// Per-socket event rate limiting
const socketRateLimits = new Map();
function socketRateLimiter(socket, eventName) {
    const key = `${socket.id}:${eventName}`;
    const now = Date.now();
    const windowStart = now - SOCKET_EVENT_WINDOW_MS;

    if (!socketRateLimits.has(key)) {
        socketRateLimits.set(key, []);
    }

    const timestamps = socketRateLimits.get(key).filter(t => t > windowStart);
    timestamps.push(now);
    socketRateLimits.set(key, timestamps);

    if (timestamps.length > SOCKET_EVENT_RATE_LIMIT) {
        return false; // rate limited
    }
    return true;
}

// Clean up rate limit map periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of socketRateLimits) {
        const recent = timestamps.filter(t => t > now - SOCKET_EVENT_WINDOW_MS);
        if (recent.length === 0) {
            socketRateLimits.delete(key);
        } else {
            socketRateLimits.set(key, recent);
        }
    }
}, 60000);

// ─── In-memory state ────────────────────────────────────────────────────────
/**
 * rooms   Map<code, RoomObject>
 *
 * RoomObject {
 *   code      : string           — 6-char room code
 *   hostId    : string           — socket.id of X player
 *   guestId   : string | null    — socket.id of O player (null while waiting)
 *   hostName  : string
 *   guestName : string | null
 *   avatarX   : string
 *   avatarO   : string | null
 *   board     : string[9]        — '' | 'X' | 'O'
 *   turn      : 'X' | 'O'
 *   scores    : { X, O, D }
 *   over      : boolean
 *   mode      : 'room' | 'quick'
 *   rematch   : { X: bool, O: bool }
 *   createdAt : number           — timestamp
 *   spectators: Set<string>      — socket IDs watching
 * }
 */
const rooms = new Map();

/**
 * quickQueue   Array<{ socketId, playerName, avatarId, userId }>
 * Players waiting for a quick-match opponent.
 */
const quickQueue = [];

/** socketToRoom   Map<socketId, roomCode>  — reverse lookup */
const socketToRoom = new Map();

// ─── Helpers ────────────────────────────────────────────────────────────────
function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateCode() : code;
}

const WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],            // diagonals
];

function checkWinner(board) {
    for (const [a, b, c] of WIN_PATTERNS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function roomForSocket(socketId) {
    const code = socketToRoom.get(socketId);
    return code ? rooms.get(code) : null;
}

function freshBoard(existingScores = null) {
    return {
        board: Array(9).fill(""),
        turn: "X",
        over: false,
        scores: existingScores ?? { X: 0, O: 0, D: 0 },
        rematch: { X: false, O: false },
    };
}

function broadcastRoomState(room) {
    io.to(room.code).emit("room:state", {
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

function sanitizeRoomForClient(room, socketId) {
    const isHost = room.hostId === socketId;
    return {
        code: room.code,
        symbol: isHost ? "X" : "O",
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

// ─── Internal helpers ───────────────────────────────────────────────────────
function _removeFromQueue(socketId) {
    const idx = quickQueue.findIndex((q) => q.socketId === socketId);
    if (idx !== -1) quickQueue.splice(idx, 1);
}

function _leaveCurrentRoom(socket) {
    const code = socketToRoom.get(socket.id);
    if (!code) return;

    const room = rooms.get(code);
    socket.leave(code);
    socketToRoom.delete(socket.id);

    if (!room) return;

    const otherSocketId = room.hostId === socket.id ? room.guestId : room.hostId;

    // If both players are gone, clean up room after grace period
    if (!otherSocketId) {
        setTimeout(() => {
            const r = rooms.get(code);
            if (r && (!r.hostId || !io.sockets.sockets.has(r.hostId)) && (!r.guestId || !io.sockets.sockets.has(r.guestId))) {
                rooms.delete(code);
                logger.info({ code }, "Cleaned up empty room");
            }
        }, 15000);
        return;
    }

    // Notify the remaining player
    io.to(otherSocketId).emit("game:opponent-left", {
        message: "Your opponent left the game.",
    });

    // Keep room alive briefly for reconnection
    setTimeout(() => {
        const r = rooms.get(code);
        if (r && (r.hostId === socket.id || r.guestId === socket.id)) {
            if (!io.sockets.sockets.has(r.hostId) && !io.sockets.sockets.has(r.guestId)) {
                rooms.delete(code);
                if (r.guestId) socketToRoom.delete(r.guestId);
                logger.info({ code }, "Cleaned up abandoned room");
            }
        }
    }, 15000);
}

function _handlePlayerLeave(socket) {
    _leaveCurrentRoom(socket);
    _removeFromQueue(socket.id);
}

async function persistMatchResult(room, winnerSymbol, endReason) {
    try {
        const winner = winnerSymbol === "D" ? "draw" : (winnerSymbol === "X" ? room.hostName : room.guestName);
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
        logger.info({ roomCode: room.code, winner, endReason }, "Match persisted");
    } catch (err) {
        logError(err, { roomCode: room.code, action: "persistMatch" });
    }
}

// ─── Periodic cleanup — remove stale empty rooms ────────────────────────────
setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
        const hostAlive = io.sockets.sockets.has(room.hostId);
        const guestAlive = room.guestId && io.sockets.sockets.has(room.guestId);
        const stale = now - room.createdAt > 3600000; // 1 hour

        if ((!hostAlive && !guestAlive) || stale) {
            rooms.delete(code);
            logger.info({ code, stale, hostAlive, guestAlive }, "Removed stale room");
        }
    }
}, 60000);

// ─── Connection handler ──────────────────────────────────────────────────────
io.on("connection", (socket) => {
    const user = socket.user;
    logger.info({ socketId: socket.id, userId: user?.id, username: user?.username }, "Socket connected");

    // Per-socket event wrapper for rate limiting and logging
    const originalOn = socket.on.bind(socket);
    socket.on = (event, handler) => {
        if (typeof handler === "function") {
            return originalOn(event, (...args) => {
                if (!socketRateLimiter(socket, event)) {
                    logger.warn({ socketId: socket.id, event }, "Socket rate limit exceeded");
                    return;
                }
                logSocketEvent(event, args[0], socket.id);
                return handler(...args);
            });
        }
        return originalOn(event, handler);
    };

    // ── PRIVATE ROOM — Create ──────────────────────────────────────────────────
    socket.on("room:create", ({ playerName, avatarId }) => {
        try {
            if (!user) {
                socket.emit("room:error", { message: "Authentication required" });
                return;
            }
            _leaveCurrentRoom(socket);

            const name = validatePlayerName(playerName || user.username);
            const avatar = sanitizeString(avatarId || user.avatar || "gamer", 20);

            const code = generateCode();
            const room = {
                code,
                hostId: socket.id,
                guestId: null,
                hostName: name,
                guestName: null,
                avatarX: avatar,
                avatarO: null,
                ...freshBoard(),
                mode: "room",
                createdAt: Date.now(),
                spectators: new Set(),
            };

            rooms.set(code, room);
            socketToRoom.set(socket.id, code);
            socket.join(code);

            socket.emit("room:created", { code, symbol: "X", room: sanitizeRoomForClient(room, socket.id) });
            logger.info({ code, userId: user.id, name }, "Room created");
        } catch (err) {
            logError(err, { socketId: socket.id, action: "room:create" });
            socket.emit("room:error", { message: err.message || "Failed to create room" });
        }
    });

    // ── PRIVATE ROOM — Join ────────────────────────────────────────────────────
    socket.on("room:join", ({ code, playerName, avatarId }) => {
        try {
            if (!user) {
                socket.emit("room:error", { message: "Authentication required" });
                return;
            }
            const roomCode = validateRoomCode(code);
            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit("room:error", { message: "Room not found. Check the code." });
                return;
            }
            if (room.guestId) {
                socket.emit("room:error", { message: "Room is full. Ask your friend for a new code." });
                return;
            }
            if (room.hostId === socket.id) {
                socket.emit("room:error", { message: "You created this room!" });
                return;
            }

            _leaveCurrentRoom(socket);

            const name = validatePlayerName(playerName || user.username);
            const avatar = sanitizeString(avatarId || user.avatar || "robot", 20);

            room.guestId = socket.id;
            room.guestName = name;
            room.avatarO = avatar;

            socketToRoom.set(socket.id, room.code);
            socket.join(room.code);

            // Notify both players
            io.to(room.hostId).emit("room:matched", sanitizeRoomForClient(room, room.hostId));
            socket.emit("room:matched", sanitizeRoomForClient(room, socket.id));

            io.to(room.code).emit("chat:sys", `${name} joined room ${roomCode}!`);
            broadcastRoomState(room);
            logger.info({ code: roomCode, userId: user.id, name }, "Room joined");
        } catch (err) {
            logError(err, { socketId: socket.id, action: "room:join" });
            socket.emit("room:error", { message: err.message || "Failed to join room" });
        }
    });

    // ── SPECTATE ROOM ──────────────────────────────────────────────────────────
    socket.on("room:spectate", ({ code }) => {
        try {
            const roomCode = validateRoomCode(code);
            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit("room:error", { message: "Room not found" });
                return;
            }
            if (room.hostId === socket.id || room.guestId === socket.id) {
                socket.emit("room:error", { message: "You are already a player in this room" });
                return;
            }

            _leaveCurrentRoom(socket);
            socketToRoom.set(socket.id, roomCode);
            socket.join(roomCode);
            room.spectators.add(socket.id);

            socket.emit("room:matched", {
                ...sanitizeRoomForClient(room, socket.id),
                symbol: "SPECTATOR",
                isSpectator: true,
            });
            broadcastRoomState(room);
            logger.info({ code: roomCode, socketId: socket.id }, "Spectator joined");
        } catch (err) {
            logError(err, { socketId: socket.id, action: "room:spectate" });
            socket.emit("room:error", { message: err.message });
        }
    });

    // ── QUICK MATCH ────────────────────────────────────────────────────────────
    socket.on("quick:join", ({ playerName, avatarId }) => {
        try {
            if (!user) {
                socket.emit("room:error", { message: "Authentication required" });
                return;
            }
            _leaveCurrentRoom(socket);

            // Check if someone is already waiting
            const waitingIdx = quickQueue.findIndex((q) => q.socketId !== socket.id);

            if (waitingIdx !== -1) {
                // Match found!
                const opponent = quickQueue.splice(waitingIdx, 1)[0];

                const code = generateCode();
                const hostIsOpponent = Math.random() < 0.5;

                const room = {
                    code,
                    hostId: hostIsOpponent ? opponent.socketId : socket.id,
                    guestId: hostIsOpponent ? socket.id : opponent.socketId,
                    hostName: hostIsOpponent ? opponent.playerName : (playerName || user.username),
                    guestName: hostIsOpponent ? (playerName || user.username) : opponent.playerName,
                    avatarX: hostIsOpponent ? opponent.avatarId : (avatarId || user.avatar || "gamer"),
                    avatarO: hostIsOpponent ? (avatarId || user.avatar || "gamer") : opponent.avatarId,
                    ...freshBoard(),
                    mode: "quick",
                    createdAt: Date.now(),
                    spectators: new Set(),
                };

                rooms.set(code, room);

                const hostSock = io.sockets.sockets.get(room.hostId);
                const guestSock = io.sockets.sockets.get(room.guestId);

                if (hostSock) {
                    socketToRoom.set(room.hostId, code);
                    hostSock.join(code);
                }
                if (guestSock) {
                    socketToRoom.set(room.guestId, code);
                    guestSock.join(code);
                }

                io.to(room.hostId).emit("room:matched", sanitizeRoomForClient(room, room.hostId));
                io.to(room.guestId).emit("room:matched", sanitizeRoomForClient(room, room.guestId));

                io.to(code).emit("chat:sys", `Quick Match found! ${room.hostName} vs ${room.guestName}`);
                broadcastRoomState(room);
                logger.info({ code, host: room.hostName, guest: room.guestName }, "Quick match created");
            } else {
                // Add to queue
                quickQueue.push({
                    socketId: socket.id,
                    playerName: playerName || user.username,
                    avatarId: avatarId || user.avatar || "gamer",
                    userId: user.id,
                });
                socket.emit("quick:waiting");
                logger.info({ userId: user.id, queueSize: quickQueue.length }, "Player queued for quick match");
            }
        } catch (err) {
            logError(err, { socketId: socket.id, action: "quick:join" });
            socket.emit("room:error", { message: err.message || "Failed to join quick match" });
        }
    });

    // Cancel quick-match search
    socket.on("quick:cancel", () => {
        _removeFromQueue(socket.id);
        socket.emit("quick:cancelled");
    });

    // ── GAME — Place marker ────────────────────────────────────────────────────
    socket.on("game:move", ({ index }) => {
        try {
            if (typeof index !== "number" || index < 0 || index > 8) {
                return; // Invalid index, ignore silently
            }

            const room = roomForSocket(socket.id);
            if (!room || room.over) return;

            // Validate it's this socket's turn
            const symbol = room.hostId === socket.id ? "X" : "O";
            if (room.turn !== symbol) return;
            if (room.board[index] !== "") return;

            // Optimistic update for local player
            room.board[index] = symbol;

            const winner = checkWinner(room.board);
            if (winner) {
                room.over = true;
                room.scores[winner]++;
                io.to(room.code).emit("game:round-end", {
                    type: "win",
                    winner,
                    combo: WIN_PATTERNS.find(
                        ([a, b, c]) => room.board[a] === winner && room.board[b] === winner && room.board[c] === winner
                    ),
                    board: room.board,
                    scores: room.scores,
                });
                broadcastRoomState(room);
                persistMatchResult(room, winner, "win");
                return;
            }

            if (room.board.every(Boolean)) {
                room.over = true;
                room.scores.D++;
                io.to(room.code).emit("game:round-end", {
                    type: "draw",
                    board: room.board,
                    scores: room.scores,
                });
                broadcastRoomState(room);
                persistMatchResult(room, "D", "draw");
                return;
            }

            // Flip turn
            room.turn = room.turn === "X" ? "O" : "X";
            broadcastRoomState(room);
        } catch (err) {
            logError(err, { socketId: socket.id, action: "game:move" });
        }
    });

    // ── REMATCH ────────────────────────────────────────────────────────────────
    socket.on("game:rematch", () => {
        const room = roomForSocket(socket.id);
        if (!room || !room.over) return;

        const sym = room.hostId === socket.id ? "X" : "O";
        room.rematch[sym] = true;

        // Notify the opponent that this player wants a rematch
        const opponentId = sym === "X" ? room.guestId : room.hostId;
        io.to(opponentId).emit("game:rematch-request", { from: sym });

        // Both agreed → reset board, swap who goes first
        if (room.rematch.X && room.rematch.O) {
            // Swap host/guest so the loser goes first next round
            [room.hostId, room.guestId] = [room.guestId, room.hostId];
            [room.hostName, room.guestName] = [room.guestName, room.hostName];
            [room.avatarX, room.avatarO] = [room.avatarO, room.avatarX];

            Object.assign(room, freshBoard(room.scores));

            io.to(room.code).emit("game:rematch-start", {
                hostName: room.hostName,
                guestName: room.guestName,
                avatarX: room.avatarX,
                avatarO: room.avatarO,
            });
            broadcastRoomState(room);
            io.to(room.code).emit("chat:sys", "Rematch started!");
            logger.info({ code: room.code }, "Rematch started");
        }
    });

    // ── CHAT ──────────────────────────────────────────────────────────────────
    socket.on("chat:message", ({ text }) => {
        try {
            const room = roomForSocket(socket.id);
            if (!room) return;

            const name = room.hostId === socket.id ? room.hostName : room.guestName;
            if (!name) return;

            const sanitized = validateChatMessage(text);
            if (!sanitized) return;

            // Broadcast to everyone in the room including sender
            io.to(room.code).emit("chat:message", {
                sender: name,
                text: sanitized,
            });
        } catch (err) {
            logError(err, { socketId: socket.id, action: "chat:message" });
        }
    });

    // ── EMOJI REACTION ────────────────────────────────────────────────────────
    socket.on("emoji:send", ({ emoji }) => {
        const room = roomForSocket(socket.id);
        if (!room) return;

        const ALLOWED = ["🔥", "😂", "👏", "😤", "🤯", "👍", "💀", "❤️"];
        if (!ALLOWED.includes(emoji)) return;

        const name = room.hostId === socket.id ? room.hostName : room.guestName;
        io.to(room.code).emit("emoji:reaction", { sender: name, emoji });
    });

    // ── LEAVE GAME ────────────────────────────────────────────────────────────
    socket.on("game:leave", () => {
        _handlePlayerLeave(socket);
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
        logger.info({ socketId: socket.id, reason }, "Socket disconnected");
        _removeFromQueue(socket.id);
        _handlePlayerLeave(socket);
    });

    // Error handler for socket
    socket.on("error", (err) => {
        logError(err, { socketId: socket.id });
    });
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────
let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        logger.warn("Force shutdown initiated");
        process.exit(1);
    }
    isShuttingDown = true;

    logger.info({ signal }, "Shutting down gracefully...");

    // Stop accepting new connections
    server.close(() => {
        logger.info("HTTP server closed");
    });

    // Close socket.io connections
    io.close(() => {
        logger.info("Socket.io server closed");
    });

    // Close database connection
    try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
    } catch (err) {
        logError(err, { action: "closeDB" });
    }

    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logError(err, { fatal: true });
    gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error({ reason, promise }, "Unhandled rejection");
});

// ─── Start ───────────────────────────────────────────────────────────────────
const mongoose = require("mongoose");
server.listen(PORT, () => {
    console.log(`\n🎮 NexaClash Ultimate server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${NODE_ENV}`);
    console.log(`   Serving static files from ./public\n`);
});

module.exports = { app, server, io };