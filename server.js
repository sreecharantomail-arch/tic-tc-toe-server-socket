/**
 * server.js — Nexa Clash Multiplayer Server
 * Node.js + Express + Socket.io
 *
 * Handles:
 *   • Private rooms  (create / join by 6-char code)
 *   • Quick match    (random matchmaking queue)
 *   • In-game moves  (board sync)
 *   • Real-time chat (room-scoped)
 *   • Emoji reactions
 *   • Rematch requests
 *   • Disconnect / timeout cleanup
 *
 * Deploy: node server.js
 * Or with PM2: pm2 start server.js --name nexaclash
 */
require("dotenv").config();
const express = require("express");
const connectDB = require("./database");
const authRoutes = require("./routes/auth");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ─── Config ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*"; // lock this down in production

// ─── App & HTTP server ──────────────────────────────────────────────────────
const app = express();
connectDB();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin = origin && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  if (isAllowedOrigin || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
const server = http.createServer(app);

// Serve the game's HTML/assets from the same directory
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);

// Health-check endpoint (useful for Render / Railway keep-alive pings)
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));

// ─── Socket.io ──────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
  // Reconnection window — client keeps the same socket id for up to 10 s after disconnect
  connectionStateRecovery: {
    maxDisconnectionDuration: 10_000,
  },
});

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
 *   board     : string[9]        — '' | 'X' | 'O'
 *   turn      : 'X' | 'O'
 *   scores    : { X, O, D }
 *   over      : boolean
 *   mode      : 'room' | 'quick'
 *   rematch   : { X: bool, O: bool }
 * }
 */
const rooms = new Map();

/**
 * quickQueue   Array<{ socketId, playerName, avatarId }>
 * Players waiting for a quick-match opponent.
 */
const quickQueue = [];

/** socketToRoom   Map<socketId, roomCode>  — reverse lookup */
const socketToRoom = new Map();

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  // Guarantee uniqueness
  return rooms.has(code) ? generateCode() : code;
}

const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a];
  }
  return null;
}

function roomForSocket(socketId) {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : null;
}

/** Create a fresh board state object (scores preserved if passed). */
function freshBoard(existingScores = null) {
  return {
    board: Array(9).fill(""),
    turn: "X",
    over: false,
    scores: existingScores ?? { X: 0, O: 0, D: 0 },
    rematch: { X: false, O: false },
  };
}

/** Send a room's current state to both players. */
function broadcastRoomState(room) {
  io.to(room.code).emit("room:state", {
    board: room.board,
    turn: room.turn,
    scores: room.scores,
    over: room.over,
    hostName: room.hostName,
    guestName: room.guestName,
    rematch: room.rematch,
  });
}

// ─── Connection handler ──────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // ── PRIVATE ROOM — Create ──────────────────────────────────────────────────

  socket.on("room:create", ({ playerName, avatarId }) => {
    // Clean up any prior room this socket was in
    _leaveCurrentRoom(socket);

    const code = generateCode();
    const room = {
      code,
      hostId: socket.id,
      guestId: null,
      hostName: playerName,
      guestName: null,
      avatarX: avatarId,
      avatarO: null,
      ...freshBoard(),
      mode: "room",
    };

    rooms.set(code, room);
    socketToRoom.set(socket.id, code);
    socket.join(code);

    socket.emit("room:created", { code, symbol: "X" });
    console.log(`[room] ${playerName} created ${code}`);
  });

  // ── PRIVATE ROOM — Join ────────────────────────────────────────────────────

  socket.on("room:join", ({ code, playerName, avatarId }) => {
    const room = rooms.get(code.toUpperCase());

    if (!room) {
      socket.emit("room:error", { message: "Room not found. Check the code." });
      return;
    }
    if (room.guestId) {
      socket.emit("room:error", {
        message: "Room is full. Ask your friend for a new code.",
      });
      return;
    }
    if (room.hostId === socket.id) {
      socket.emit("room:error", { message: "You created this room!" });
      return;
    }

    _leaveCurrentRoom(socket);

    room.guestId = socket.id;
    room.guestName = playerName;
    room.avatarO = avatarId;

    socketToRoom.set(socket.id, room.code);
    socket.join(room.code);

    // Tell both players the match is starting
    io.to(room.hostId).emit("room:matched", {
      code,
      symbol: "X",
      opponentName: playerName,
      opponentAvatar: avatarId,
    });
    socket.emit("room:matched", {
      code,
      symbol: "O",
      opponentName: room.hostName,
      opponentAvatar: room.avatarX,
    });

    io.to(room.code).emit("chat:sys", `${playerName} joined room ${code}!`);
    broadcastRoomState(room);
    console.log(`[room] ${playerName} joined ${code}`);
  });

  // ── QUICK MATCH ────────────────────────────────────────────────────────────

  socket.on("quick:join", ({ playerName, avatarId }) => {
    _leaveCurrentRoom(socket);

    // Check if someone is already waiting
    const waiting = quickQueue.findIndex((q) => q.socketId !== socket.id);

    if (waiting !== -1) {
      // Match found!
      const opponent = quickQueue.splice(waiting, 1)[0];

      const code = generateCode();
      // Randomly decide who gets X
      const hostIsOpponent = Math.random() < 0.5;

      const room = {
        code,
        hostId: hostIsOpponent ? opponent.socketId : socket.id,
        guestId: hostIsOpponent ? socket.id : opponent.socketId,
        hostName: hostIsOpponent ? opponent.playerName : playerName,
        guestName: hostIsOpponent ? playerName : opponent.playerName,
        avatarX: hostIsOpponent ? opponent.avatarId : avatarId,
        avatarO: hostIsOpponent ? avatarId : opponent.avatarId,
        ...freshBoard(),
        mode: "quick",
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

      io.to(room.hostId).emit("room:matched", {
        code,
        symbol: "X",
        opponentName: room.guestName,
        opponentAvatar: room.avatarO,
      });
      io.to(room.guestId).emit("room:matched", {
        code,
        symbol: "O",
        opponentName: room.hostName,
        opponentAvatar: room.avatarX,
      });

      io.to(code).emit(
        "chat:sys",
        `Quick Match found! ${room.hostName} vs ${room.guestName}`
      );
      broadcastRoomState(room);
      console.log(
        `[quick] matched ${room.hostName} vs ${room.guestName} in ${code}`
      );
    } else {
      // Add to queue
      quickQueue.push({ socketId: socket.id, playerName, avatarId });
      socket.emit("quick:waiting");
      console.log(
        `[quick] ${playerName} queued (queue size: ${quickQueue.length})`
      );
    }
  });

  // Cancel quick-match search
  socket.on("quick:cancel", () => {
    _removeFromQueue(socket.id);
    socket.emit("quick:cancelled");
  });

  // ── GAME — Place marker ────────────────────────────────────────────────────

  socket.on("game:move", ({ index }) => {
    const room = roomForSocket(socket.id);
    if (!room || room.over) return;

    // Validate it's this socket's turn
    const symbol = room.hostId === socket.id ? "X" : "O";
    if (room.turn !== symbol) return;
    if (room.board[index] !== "") return;

    room.board[index] = symbol;

    const winner = checkWinner(room.board);
    if (winner) {
      room.over = true;
      room.scores[winner]++;
      io.to(room.code).emit("game:round-end", {
        type: "win",
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
      broadcastRoomState(room);
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
      return;
    }

    // Flip turn
    room.turn = room.turn === "X" ? "O" : "X";
    broadcastRoomState(room);
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
    }
  });

  // ── CHAT ──────────────────────────────────────────────────────────────────

  socket.on("chat:message", ({ text }) => {
    const room = roomForSocket(socket.id);
    if (!room) return;

    const name = room.hostId === socket.id ? room.hostName : room.guestName;
    if (!name || !text?.trim()) return;

    // Broadcast to everyone in the room including sender
    io.to(room.code).emit("chat:message", {
      sender: name,
      text: text.trim().slice(0, 200), // hard cap
    });
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
    console.log(`[-] ${socket.id} disconnected (${reason})`);
    _removeFromQueue(socket.id);
    _handlePlayerLeave(socket);
  });
});

// ─── Internal helpers ────────────────────────────────────────────────────────

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

  // If both players are gone, delete the room
  const otherSocketId = room.hostId === socket.id ? room.guestId : room.hostId;
  if (!otherSocketId) {
    rooms.delete(code);
    return;
  }

  // Notify the remaining player
  io.to(otherSocketId).emit("game:opponent-left", {
    message: "Your opponent left the game.",
  });

  // Keep room alive briefly so reconnect is possible, then clean up
  setTimeout(() => {
    const r = rooms.get(code);
    if (r && (r.hostId === socket.id || r.guestId === socket.id)) {
      rooms.delete(code);
      socketToRoom.delete(otherSocketId);
    }
  }, 15_000);
}

function _handlePlayerLeave(socket) {
  _leaveCurrentRoom(socket);
  _removeFromQueue(socket.id);
}

// ─── Periodic cleanup — remove stale empty rooms ─────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const hostAlive = io.sockets.sockets.has(room.hostId);
    const guestAlive = room.guestId && io.sockets.sockets.has(room.guestId);
    if (!hostAlive && !guestAlive) {
      rooms.delete(code);
      console.log(`[cleanup] removed stale room ${code}`);
    }
  }
}, 60_000);

// ─── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🎮 Nexa Clash server running on http://localhost:${PORT}`);
  console.log(`   Serving static files from ./public\n`);
});
