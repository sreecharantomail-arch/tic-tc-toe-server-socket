/**
 * state.js
 * All mutable runtime state lives here.
 *
 * Rule: if a value can change after the page loads, it's here.
 * If it's fixed game data, it belongs in constants.js.
 *
 * Nothing in this file does DOM work — that's ui.js and game.js.
 */

// ----- Player (persisted to localStorage) -----

// Default shape for a brand-new player.
// loadPlayerData() in storage.js deep-merges saved data on top of this,
// so adding new fields here gives existing saves safe defaults.
const DEFAULT_PLAYER = {
    name: '',
    avatar: 'gamer',
    xp: 0,
    level: 1,
    coins: 0,
    unlockedAvatars: ['gamer', 'robot'],
    unlockedThemes: ['dark', 'light'],
    activeTheme: 'dark',
    unlockedAchievements: [],
    stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        games: 0,
        currentStreak: 0,
        bestStreak: 0,
        beatHardAi: false,
    },
    lastDailyDate: null,
    dailyStreak: 0,
    totalDailyClaims: 0,
    settings: {
        sfx: true,
        music: false,
        confetti: true,
        soundTheme: 'classic',
    },
};

// Live player object — mutated by player.js, persisted by storage.js.
// Exported as a plain object (not a class) so any module can mutate it directly.
// NOTE: `let`, not `const` — reassigned from other <script> files (auth.js logout).
let player = structuredClone(DEFAULT_PLAYER);

// ----- Current game session -----

// Which player this browser controls ('X' or 'O').
// NOTE: these session globals are reassigned from game.js / socket.js / settings.js,
// so they must stay `let` (prefer-const can't see cross-file writes).
let localSymbol = '';

// Display names keyed by board symbol.
const playerNames = { X: '', O: '' };

// Active game mode: '2p' | 'ai' | 'room' | 'random'
let gameMode = '';

// Difficulty selected on the AI screen.
let aiDifficulty = 'easy';

// Board state — mutated each round, reset between rounds.
let boardState = {
    cells: Array(9).fill(''), // '' | 'X' | 'O'
    currentTurn: 'X',
    isOver: false,
    scores: { X: 0, O: 0, D: 0 },
};

// ----- Online room simulation -----
// Keyed by room code. In a real multiplayer build this would be server-side.
const rooms = {};

// ----- Leaderboard (in-game session, not the global persistent one) -----
// Tracks W/D for the two players in the current game session only.
// NOTE: `let` — reassigned (reset) from socket.js.
let sessionLeaderboard = [];

// ----- Global (persistent) leaderboard -----
// Array of { name, avatar, wins, games, xp } — one entry per named player.
// NOTE: `let` — reassigned from storage.js when loading saved data.
let globalLeaderboard = [];

// ----- Helpers that read/write state -----

function resetBoardState() {
    boardState = {
        cells: Array(9).fill(''),
        currentTurn: 'X',
        isOver: false,
        scores: { ...boardState.scores }, // scores persist across rounds
    };
}

function resetScores() {
    boardState.scores = { X: 0, O: 0, D: 0 };
}

/** Returns the emoji string for the player's current avatar. */
function getPlayerAvatar() {
    // AVATARS is defined in constants.js which loads before state.js
    return (AVATARS?.find(a => a.id === player.avatar) ?? AVATARS?.[0])?.emoji ?? '🎮';
}
