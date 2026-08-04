# 🎮 NexaClash Ultimate Edition — Multiplayer Tic-Tac-Toe Server

An enterprise-grade, real-world real-time multiplayer Web game engine built with **Node.js**, **Express**, **Socket.io**, and **MongoDB**. Features private rooms, matchmaking queue, move validation, live chat, emoji reactions, rematch loops, user authentication, and comprehensive logging.

---

## 📁 Real-World Project Architecture

```text
tic-tc-toe-server-socket/
├── docs/                                  # Project Documentation & System Guides
│   └── error-handling/                    # Frontend/Backend Error Handling Manuals
│       ├── INDEX.md
│       └── QUICK_REFERENCE.md
├── public/                                # Production Static Web App Assets
│   ├── css/                               # Responsive Styling Rules
│   ├── images/                            # Graphical Assets & Logos
│   ├── js/                                # Modular Client Scripts
│   └── index.html                         # Core Web App Shell
├── src/                                   # Application Source Code
│   ├── config/                            # Environment & Database Connections
│   │   └── database.js                    # Resilient MongoDB Driver Connection
│   ├── controllers/                       # HTTP API Business Logic
│   │   └── authController.js              # Authentication (Register, Login, JWT)
│   ├── middleware/                        # Express & Socket.io Security Filters
│   │   ├── authMiddleware.js              # Express JWT Verification
│   │   └── socketAuth.js                  # Handshake Token Authenticator
│   ├── models/                            # Mongoose Schemas & Database Entities
│   │   ├── Match.js                       # Match History & Leaderboard Analytics
│   │   └── Player.js                      # Player Profile, XP, Stats & Unlocks
│   ├── routes/                            # RESTful API Endpoint Declarations
│   │   └── auth.js                        # Authentication Routes
│   ├── sockets/                           # Real-Time WebSocket Logic (Socket.io)
│   │   ├── roomManager.js                 # In-Memory State (Rooms, Queue, Winners)
│   │   ├── socketHandlers.js              # Real-Time Event Dispatchers & Handlers
│   │   └── index.js                       # Socket Engine Setup & Rate Limiting
│   ├── utils/                             # Shared Helper Libraries
│   │   ├── logger.js                      # Winston Logging with Rotation
│   │   ├── rateLimiter.js                 # Redis/Memory Rate Limiting
│   │   └── validation.js                  # Input Sanitization & Safety Guards
│   ├── app.js                             # Express App Initialization & Security Setup
│   └── server.js                          # Node HTTP/Socket Server Entry Point
├── .env                                   # Environment Configuration File
├── .eslintrc.js                           # ESLint Code Quality Rules
├── .prettierrc                            # Prettier Formatting Rules
├── ecosystem.config.js                    # PM2 Cluster Deployment Blueprint
├── package.json                           # NPM Package & Build Declarations
└── server.js                              # Backwards-Compatible Entry Point Wrapper
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** `>= 18.0.0`
- **MongoDB** (Local or MongoDB Atlas Cluster)

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/nexaclash
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=*
LOG_LEVEL=debug
```

### 3. Installation & Running

```bash
# Install dependencies
npm install

# Run development server with live reload
npm run dev

# Run production server
npm start
```

---

## 🌐 HTTP API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health, room metrics, & memory status | ❌ No |
| `GET` | `/api/version` | Server package version and environment info | ❌ No |
| `POST` | `/api/auth/register` | Register a new player account | ❌ No |
| `POST` | `/api/auth/login` | Authenticate player and receive JWT bearer token | ❌ No |

---

## 🔌 WebSocket (Socket.io) Events Reference

### Client -> Server Events

- `room:create` (`{ playerName, avatarId }`): Create a private 6-character room.
- `room:join` (`{ code, playerName, avatarId }`): Join an existing private room code.
- `room:spectate` (`{ code }`): Join a game room as a passive spectator.
- `quick:join` (`{ playerName, avatarId }`): Enter the matchmaking queue for quick play.
- `quick:cancel`: Cancel quick match search.
- `game:move` (`{ index }`): Place marker on board index `(0-8)`.
- `game:rematch`: Signal readiness for a rematch after round end.
- `chat:message` (`{ text }`): Send room-scoped chat message.
- `emoji:send` (`{ emoji }`): Broadcast animated emoji reaction.
- `game:leave`: Leave current active match or room.

### Server -> Client Events

- `room:created`: Fired when a private room is initialized.
- `room:matched`: Fired when opponent joins or match found.
- `room:state`: Broadcasts updated board, turn, scores, and spectators.
- `game:round-end`: Fired on round win or draw.
- `game:rematch-request`: Notifies opponent of incoming rematch request.
- `game:rematch-start`: Signals start of new rematch round with swapped symbols.
- `chat:message`: Delivers chat message to room participants.
- `emoji:reaction`: Delivers emoji reaction to room.
- `game:opponent-left`: Notifies remaining player if opponent disconnects.

---

## 🛠 Tech Stack

- **Server Framework:** Express.js 4.x
- **Real-Time Engine:** Socket.io 4.x
- **Database ORM:** Mongoose 8.x (MongoDB)
- **Logging:** Winston 3.x with automatic log rotation
- **Security:** Helmet, Express Rate Limit, Cors, Bcrypt, JsonWebToken
- **Process Manager:** PM2 Cluster mode ready (`ecosystem.config.js`)
