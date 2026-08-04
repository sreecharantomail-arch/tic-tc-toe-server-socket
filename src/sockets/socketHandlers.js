const {
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
} = require('./roomManager');
const {
    validatePlayerName,
    validateRoomCode,
    validateChatMessage,
    sanitizeString,
} = require('../utils/validation');
const { logger, logError } = require('../utils/logger');

function registerSocketHandlers(io, socket) {
    const user = socket.user;

    function handlePlayerLeave() {
        leaveCurrentRoom(io, socket);
        removeFromQueue(socket.id);
    }

    // ── PRIVATE ROOM — Create ──────────────────────────────────────────────────
    socket.on('room:create', ({ playerName, avatarId }) => {
        try {
            if (!user) {
                socket.emit('room:error', { message: 'Authentication required' });
                return;
            }
            leaveCurrentRoom(io, socket);

            const name = validatePlayerName(playerName || user.username);
            const avatar = sanitizeString(avatarId || user.avatar || 'gamer', 20);

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
                mode: 'room',
                createdAt: Date.now(),
                spectators: new Set(),
            };

            rooms.set(code, room);
            socketToRoom.set(socket.id, code);
            socket.join(code);

            socket.emit('room:created', {
                code,
                symbol: 'X',
                room: sanitizeRoomForClient(room, socket.id),
            });
            logger.info({ code, userId: user.id, name }, 'Room created');
        } catch (err) {
            logError(err, { socketId: socket.id, action: 'room:create' });
            socket.emit('room:error', { message: err.message || 'Failed to create room' });
        }
    });

    // ── PRIVATE ROOM — Join ────────────────────────────────────────────────────
    socket.on('room:join', ({ code, playerName, avatarId }) => {
        try {
            if (!user) {
                socket.emit('room:error', { message: 'Authentication required' });
                return;
            }
            const roomCode = validateRoomCode(code);
            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit('room:error', { message: 'Room not found. Check the code.' });
                return;
            }
            if (room.guestId) {
                socket.emit('room:error', {
                    message: 'Room is full. Ask your friend for a new code.',
                });
                return;
            }
            if (room.hostId === socket.id) {
                socket.emit('room:error', { message: 'You created this room!' });
                return;
            }

            leaveCurrentRoom(io, socket);

            const name = validatePlayerName(playerName || user.username);
            const avatar = sanitizeString(avatarId || user.avatar || 'robot', 20);

            room.guestId = socket.id;
            room.guestName = name;
            room.avatarO = avatar;

            socketToRoom.set(socket.id, room.code);
            socket.join(room.code);

            // Notify both players
            io.to(room.hostId).emit('room:matched', sanitizeRoomForClient(room, room.hostId));
            socket.emit('room:matched', sanitizeRoomForClient(room, socket.id));

            io.to(room.code).emit('chat:sys', `${name} joined room ${roomCode}!`);
            broadcastRoomState(io, room);
            logger.info({ code: roomCode, userId: user.id, name }, 'Room joined');
        } catch (err) {
            logError(err, { socketId: socket.id, action: 'room:join' });
            socket.emit('room:error', { message: err.message || 'Failed to join room' });
        }
    });

    // ── SPECTATE ROOM ──────────────────────────────────────────────────────────
    socket.on('room:spectate', ({ code }) => {
        try {
            const roomCode = validateRoomCode(code);
            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit('room:error', { message: 'Room not found' });
                return;
            }
            if (room.hostId === socket.id || room.guestId === socket.id) {
                socket.emit('room:error', { message: 'You are already a player in this room' });
                return;
            }

            leaveCurrentRoom(io, socket);
            socketToRoom.set(socket.id, roomCode);
            socket.join(roomCode);
            room.spectators.add(socket.id);

            socket.emit('room:matched', {
                ...sanitizeRoomForClient(room, socket.id),
                symbol: 'SPECTATOR',
                isSpectator: true,
            });
            broadcastRoomState(io, room);
            logger.info({ code: roomCode, socketId: socket.id }, 'Spectator joined');
        } catch (err) {
            logError(err, { socketId: socket.id, action: 'room:spectate' });
            socket.emit('room:error', { message: err.message });
        }
    });

    // ── QUICK MATCH ────────────────────────────────────────────────────────────
    socket.on('quick:join', ({ playerName, avatarId }) => {
        try {
            if (!user) {
                socket.emit('room:error', { message: 'Authentication required' });
                return;
            }
            leaveCurrentRoom(io, socket);

            const waitingIdx = quickQueue.findIndex(q => q.socketId !== socket.id);

            if (waitingIdx !== -1) {
                // Match found!
                const opponent = quickQueue.splice(waitingIdx, 1)[0];
                const code = generateCode();
                const hostIsOpponent = Math.random() < 0.5;

                const room = {
                    code,
                    hostId: hostIsOpponent ? opponent.socketId : socket.id,
                    guestId: hostIsOpponent ? socket.id : opponent.socketId,
                    hostName: hostIsOpponent ? opponent.playerName : playerName || user.username,
                    guestName: hostIsOpponent ? playerName || user.username : opponent.playerName,
                    avatarX: hostIsOpponent
                        ? opponent.avatarId
                        : avatarId || user.avatar || 'gamer',
                    avatarO: hostIsOpponent
                        ? avatarId || user.avatar || 'gamer'
                        : opponent.avatarId,
                    ...freshBoard(),
                    mode: 'quick',
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

                io.to(room.hostId).emit('room:matched', sanitizeRoomForClient(room, room.hostId));
                io.to(room.guestId).emit('room:matched', sanitizeRoomForClient(room, room.guestId));

                io.to(code).emit(
                    'chat:sys',
                    `Quick Match found! ${room.hostName} vs ${room.guestName}`
                );
                broadcastRoomState(io, room);
                logger.info(
                    { code, host: room.hostName, guest: room.guestName },
                    'Quick match created'
                );
            } else {
                // Add to queue
                quickQueue.push({
                    socketId: socket.id,
                    playerName: playerName || user.username,
                    avatarId: avatarId || user.avatar || 'gamer',
                    userId: user.id,
                });
                socket.emit('quick:waiting');
                logger.info(
                    { userId: user.id, queueSize: quickQueue.length },
                    'Player queued for quick match'
                );
            }
        } catch (err) {
            logError(err, { socketId: socket.id, action: 'quick:join' });
            socket.emit('room:error', { message: err.message || 'Failed to join quick match' });
        }
    });

    socket.on('quick:cancel', () => {
        removeFromQueue(socket.id);
        socket.emit('quick:cancelled');
    });

    // ── GAME — Place marker ────────────────────────────────────────────────────
    socket.on('game:move', ({ index }) => {
        try {
            if (typeof index !== 'number' || index < 0 || index > 8) {
                return;
            }

            const room = roomForSocket(socket.id);
            if (!room || room.over) {
                return;
            }

            const symbol = room.hostId === socket.id ? 'X' : 'O';
            if (room.turn !== symbol || room.board[index] !== '') {
                return;
            }

            room.board[index] = symbol;

            const winner = checkWinner(room.board);
            if (winner) {
                room.over = true;
                room.scores[winner]++;
                io.to(room.code).emit('game:round-end', {
                    type: 'win',
                    winner,
                    combo: WIN_PATTERNS.find(
                        ([a, b, c]) =>
                            room.board[a] === winner &&
                            room.board[b] === winner &&
                            room.board[c] === winner
                    ),
                    board: room.board,
                    scores: room.scores,
                });
                broadcastRoomState(io, room);
                persistMatchResult(room, winner, 'win');
                return;
            }

            if (room.board.every(Boolean)) {
                room.over = true;
                room.scores.D++;
                io.to(room.code).emit('game:round-end', {
                    type: 'draw',
                    board: room.board,
                    scores: room.scores,
                });
                broadcastRoomState(io, room);
                persistMatchResult(room, 'D', 'draw');
                return;
            }

            room.turn = room.turn === 'X' ? 'O' : 'X';
            broadcastRoomState(io, room);
        } catch (err) {
            logError(err, { socketId: socket.id, action: 'game:move' });
        }
    });

    // ── REMATCH ────────────────────────────────────────────────────────────────
    socket.on('game:rematch', () => {
        const room = roomForSocket(socket.id);
        if (!room || !room.over) {
            return;
        }

        const sym = room.hostId === socket.id ? 'X' : 'O';
        room.rematch[sym] = true;

        const opponentId = sym === 'X' ? room.guestId : room.hostId;
        io.to(opponentId).emit('game:rematch-request', { from: sym });

        if (room.rematch.X && room.rematch.O) {
            [room.hostId, room.guestId] = [room.guestId, room.hostId];
            [room.hostName, room.guestName] = [room.guestName, room.hostName];
            [room.avatarX, room.avatarO] = [room.avatarO, room.avatarX];

            Object.assign(room, freshBoard(room.scores));

            io.to(room.code).emit('game:rematch-start', {
                hostName: room.hostName,
                guestName: room.guestName,
                avatarX: room.avatarX,
                avatarO: room.avatarO,
            });
            broadcastRoomState(io, room);
            io.to(room.code).emit('chat:sys', 'Rematch started!');
            logger.info({ code: room.code }, 'Rematch started');
        }
    });

    // ── CHAT ──────────────────────────────────────────────────────────────────
    socket.on('chat:message', ({ text }) => {
        try {
            const room = roomForSocket(socket.id);
            if (!room) {
                return;
            }

            const name = room.hostId === socket.id ? room.hostName : room.guestName;
            if (!name) {
                return;
            }

            const sanitized = validateChatMessage(text);
            if (!sanitized) {
                return;
            }

            io.to(room.code).emit('chat:message', {
                sender: name,
                text: sanitized,
            });
        } catch (err) {
            logError(err, { socketId: socket.id, action: 'chat:message' });
        }
    });

    // ── EMOJI REACTION ────────────────────────────────────────────────────────
    socket.on('emoji:send', ({ emoji }) => {
        const room = roomForSocket(socket.id);
        if (!room) {
            return;
        }

        const ALLOWED = ['🔥', '😂', '👏', '😤', '🤯', '👍', '💀', '❤️'];
        if (!ALLOWED.includes(emoji)) {
            return;
        }

        const name = room.hostId === socket.id ? room.hostName : room.guestName;
        io.to(room.code).emit('emoji:reaction', { sender: name, emoji });
    });

    // ── LEAVE / DISCONNECT / ERROR ────────────────────────────────────────────
    socket.on('game:leave', () => {
        handlePlayerLeave();
    });

    socket.on('disconnect', reason => {
        logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
        removeFromQueue(socket.id);
        handlePlayerLeave();
    });

    socket.on('error', err => {
        logError(err, { socketId: socket.id });
    });
}

module.exports = registerSocketHandlers;
