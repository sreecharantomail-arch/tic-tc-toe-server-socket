const request = require('supertest');
const app = require('../src/app');
const {
    validatePlayerName,
    validateRoomCode,
    validateChatMessage,
    validateEmail,
    validatePassword,
    sanitizeString,
    validatePagination,
} = require('../src/utils/validation');
const {
    generateCode,
    checkWinner,
    freshBoard,
    sanitizeRoomForClient,
} = require('../src/sockets/roomManager');

describe('--- NexaClash Feature & Function Verification Suite ---', () => {
    // ── 1. Validation Utility Tests ──────────────────────────────────────────
    describe('Validation Utilities', () => {
        test('validatePlayerName should allow valid names and throw on invalid', () => {
            expect(validatePlayerName('Alex_99')).toBe('Alex_99');
            expect(validatePlayerName('  Ninja   ')).toBe('Ninja');
            expect(() => validatePlayerName('')).toThrow();
            expect(() => validatePlayerName('A')).toThrow(); // min length 2
            expect(() => validatePlayerName('ThisNameIsWayTooLongForGame')).toThrow();
            expect(() => validatePlayerName('admin')).toThrow('This name is reserved');
            expect(() => validatePlayerName('bot')).toThrow('This name is reserved');
        });

        test('validateRoomCode should format and validate 6-character room codes', () => {
            expect(validateRoomCode('abc234')).toBe('ABC234');
            expect(validateRoomCode('XYZ987')).toBe('XYZ987');
            expect(() => validateRoomCode('123')).toThrow();
            expect(() => validateRoomCode('INVALID!')).toThrow();
        });

        test('validateChatMessage should sanitize text and block dangerous input', () => {
            expect(validateChatMessage('GG WP!')).toBe('GG WP!');
            expect(() => validateChatMessage('   ')).toThrow('Message cannot be empty');
            expect(() => validateChatMessage('<script>alert("xss")</script>')).toThrow(
                'Invalid message content'
            );
        });

        test('validateEmail and validatePassword should enforce format and strength', () => {
            expect(validateEmail('User@Example.com')).toBe('user@example.com');
            expect(() => validateEmail('not-an-email')).toThrow();

            expect(validatePassword('Secret123')).toBe('Secret123');
            expect(() => validatePassword('short')).toThrow();
            expect(() => validatePassword('onlyletters')).toThrow();
            expect(() => validatePassword('123456789')).toThrow();
        });

        test('sanitizeString and validatePagination should handle bounds properly', () => {
            expect(sanitizeString('  hello world  ', 5)).toBe('hello');
            expect(validatePagination(0, 500)).toEqual({ page: 1, limit: 100 });
            expect(validatePagination(3, 15)).toEqual({ page: 3, limit: 15 });
        });
    });

    // ── 2. Socket Room & Game Engine Tests ──────────────────────────────────
    describe('Game Engine & Room Management Logic', () => {
        test('generateCode should produce a 6-character uppercase alphanumeric code', () => {
            const code = generateCode();
            expect(code).toMatch(/^[A-Z2-9]{6}$/);
        });

        test('checkWinner should accurately detect 3x3 win lines and non-wins', () => {
            // Horizontal row 0
            expect(checkWinner(['X', 'X', 'X', '', '', '', '', '', ''])).toBe('X');
            // Vertical column 1
            expect(checkWinner(['', 'O', '', '', 'O', '', '', 'O', ''])).toBe('O');
            // Diagonal
            expect(checkWinner(['X', '', '', '', 'X', '', '', '', 'X'])).toBe('X');
            // Anti-diagonal
            expect(checkWinner(['', '', 'O', '', 'O', '', 'O', '', ''])).toBe('O');
            // Ongoing game
            expect(checkWinner(['X', 'O', 'X', '', 'O', '', '', '', ''])).toBeNull();
        });

        test('freshBoard should return initialized board state', () => {
            const state = freshBoard();
            expect(state.board).toEqual(Array(9).fill(''));
            expect(state.turn).toBe('X');
            expect(state.over).toBe(false);
            expect(state.scores).toEqual({ X: 0, O: 0, D: 0 });
        });

        test('sanitizeRoomForClient should assign symbols based on host socket ID', () => {
            const mockRoom = {
                code: 'ROOM12',
                hostId: 'socket_host',
                guestId: 'socket_guest',
                hostName: 'HostPlayer',
                guestName: 'GuestPlayer',
                avatarX: 'gamer',
                avatarO: 'robot',
                board: Array(9).fill(''),
                turn: 'X',
                scores: { X: 0, O: 0, D: 0 },
                over: false,
                rematch: { X: false, O: false },
                mode: 'room',
            };

            const clientHost = sanitizeRoomForClient(mockRoom, 'socket_host');
            expect(clientHost.symbol).toBe('X');
            expect(clientHost.isHost).toBe(true);

            const clientGuest = sanitizeRoomForClient(mockRoom, 'socket_guest');
            expect(clientGuest.symbol).toBe('O');
            expect(clientGuest.isHost).toBe(false);
        });
    });

    // ── 3. Express HTTP Route Integration Tests ───────────────────────────────
    describe('Express HTTP API Endpoints', () => {
        test('GET /health should return 200 OK with server stats', async () => {
            const res = await request(app).get('/health');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('ok', true);
            expect(res.body).toHaveProperty('rooms');
            expect(res.body).toHaveProperty('queue');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('timestamp');
        });

        test('GET /api/version should return version and environment info', async () => {
            const res = await request(app).get('/api/version');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('version');
            expect(res.body).toHaveProperty('name', 'nexaclash-ultimate');
        });

        test('POST /api/auth/register without required fields should return 400', async () => {
            const res = await request(app).post('/api/auth/register').send({
                username: 'test',
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('All fields are required.');
        });

        test('POST /api/auth/login without required fields should return 400', async () => {
            const res = await request(app).post('/api/auth/login').send({});
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email and password are required.');
        });
    });
});
