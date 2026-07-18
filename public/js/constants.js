/**
 * constants.js
 * Static game data — none of these change at runtime.
 * If a value comes from user input or game logic, it belongs in state.js instead.
 */

// All eight winning combinations on a 3x3 board, as flat board indices.
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

// Cumulative XP required to *reach* each level (index = level number).
// Past index 10 we extrapolate linearly in getXpForLevel().
const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

// Per-round timer in seconds.
const TURN_DURATION = 15;

// How long (ms) to pause after a round ends before resetting the board.
const ROUND_RESET_DELAY = 1400;

// -------------------------------------------------------------------
// Avatars — id is the storage key, cost 0 = free from the start.
// -------------------------------------------------------------------
const AVATARS = [
    { id: 'gamer', emoji: '🎮', label: 'Gamer', cost: 0 },
    { id: 'robot', emoji: '🤖', label: 'Robot', cost: 0 },
    { id: 'fire', emoji: '🔥', label: 'Flame', cost: 100 },
    { id: 'star', emoji: '⭐', label: 'Star', cost: 150 },
    { id: 'dragon', emoji: '🐉', label: 'Dragon', cost: 300 },
    { id: 'ninja', emoji: '🥷', label: 'Ninja', cost: 200 },
    { id: 'alien', emoji: '👽', label: 'Alien', cost: 250 },
    { id: 'crown', emoji: '👑', label: 'Crown', cost: 500 },
    { id: 'gem', emoji: '💎', label: 'Gem', cost: 400 },
    { id: 'ghost', emoji: '👻', label: 'Ghost', cost: 150 },
    { id: 'fox', emoji: '🦊', label: 'Fox', cost: 200 },
    { id: 'shark', emoji: '🦈', label: 'Shark', cost: 350 },
    { id: 'bolt', emoji: '⚡', label: 'Thunder', cost: 300 },
    { id: 'ice', emoji: '🧊', label: 'Ice', cost: 200 },
    { id: 'skull', emoji: '💀', label: 'Skull', cost: 600 },
];

// -------------------------------------------------------------------
// Themes — id maps to a CSS body class ("theme-<id>"), cost 0 = free.
// bg/accent colours are only used for the shop preview swatches.
// -------------------------------------------------------------------
const THEMES = [
    {
        id: 'dark',
        label: 'Dark Neon',
        bg: '#0a0a1a',
        accent1: '#00f5ff',
        accent2: '#ff2d78',
        cost: 0,
    },
    {
        id: 'light',
        label: 'Light Mode',
        bg: '#f0f4ff',
        accent1: '#0066ff',
        accent2: '#ff2d78',
        cost: 0,
    },
    {
        id: 'cyber',
        label: 'Cyberpunk',
        bg: '#000800',
        accent1: '#00ff44',
        accent2: '#ff6600',
        cost: 200,
    },
    {
        id: 'ocean',
        label: 'Deep Ocean',
        bg: '#000d1a',
        accent1: '#00aaff',
        accent2: '#ff6688',
        cost: 300,
    },
    {
        id: 'fire',
        label: 'Inferno',
        bg: '#1a0500',
        accent1: '#ff6600',
        accent2: '#ff2244',
        cost: 400,
    },
    {
        id: 'mint',
        label: 'Neon Mint',
        bg: '#001a10',
        accent1: '#00ffaa',
        accent2: '#ff44aa',
        cost: 350,
    },
    {
        id: 'royalgold',
        label: '👑 Royal Gold',
        bg: '#0b0b0b',
        accent1: '#FFD700',
        accent2: '#FFF4C2',
        cost: 500,
    },
];

// -------------------------------------------------------------------
// Achievements — req() receives the full player object and returns bool.
// reward: 0 means the achievement itself IS the reward (bragging rights).
// -------------------------------------------------------------------
const ACHIEVEMENTS = [
    {
        id: 'first_win',
        label: 'First Blood',
        description: 'Win your first game',
        icon: '🎯',
        reward: 50,
        req: p => p.stats.wins >= 1,
    },
    {
        id: 'win_5',
        label: 'On a Roll',
        description: 'Win 5 games',
        icon: '🔥',
        reward: 100,
        req: p => p.stats.wins >= 5,
    },
    {
        id: 'win_25',
        label: 'Veteran',
        description: 'Win 25 games',
        icon: '⚔️',
        reward: 300,
        req: p => p.stats.wins >= 25,
    },
    {
        id: 'play_10',
        label: 'Regular',
        description: 'Play 10 games',
        icon: '🎮',
        reward: 75,
        req: p => p.stats.games >= 10,
    },
    {
        id: 'play_50',
        label: 'Dedicated',
        description: 'Play 50 games',
        icon: '🏅',
        reward: 200,
        req: p => p.stats.games >= 50,
    },
    {
        id: 'beat_hard_ai',
        label: 'AI Slayer',
        description: 'Beat the Hard AI',
        icon: '🤖',
        reward: 200,
        req: p => p.stats.beatHardAi,
    },
    {
        id: 'streak_3',
        label: 'Hat Trick',
        description: 'Win 3 games in a row',
        icon: '🎩',
        reward: 150,
        req: p => p.stats.bestStreak >= 3,
    },
    {
        id: 'streak_5',
        label: 'Unstoppable',
        description: 'Win 5 games in a row',
        icon: '⚡',
        reward: 400,
        req: p => p.stats.bestStreak >= 5,
    },
    {
        id: 'level_5',
        label: 'Rising Star',
        description: 'Reach Level 5',
        icon: '⭐',
        reward: 250,
        req: p => p.level >= 5,
    },
    {
        id: 'coins_100',
        label: 'Penny Pincher',
        description: 'Accumulate 100 coins',
        icon: '🪙',
        reward: 0,
        req: p => p.coins >= 100,
    },
    {
        id: 'coins_500',
        label: 'High Roller',
        description: 'Accumulate 500 coins',
        icon: '💰',
        reward: 0,
        req: p => p.coins >= 500,
    },
    {
        id: 'daily_3',
        label: 'Loyal',
        description: 'Claim 3 daily rewards',
        icon: '📅',
        reward: 100,
        req: p => p.totalDailyClaims >= 3,
    },
];

// NPC names used by matchmaking simulation and room-join simulation.
const NPC_NAMES = [
    'Alex',
    'Jordan',
    'Sam',
    'Taylor',
    'Morgan',
    'Casey',
    'Riley',
    'Quinn',
    'Nova',
    'Ash',
    'Sky',
    'River',
    'Blake',
    'Drew',
    'Avery',
];

// Loading screen flavour text — shown in sequence during the fake progress bar.
const LOADING_MESSAGES = [
    'Initializing game engine…',
    'Loading assets…',
    'Calibrating AI brain…',
    'Setting up arenas…',
    'Almost there…',
];
// Random opponent chat responses — keeps async matches feeling alive.
const OPPONENT_CHAT_RESPONSES = [
    'Nice!',
    'Hmm 🤔',
    "Let's go!",
    'GG!',
    'Watch out 👀',
    'Ez game 😏',
    'Oops 😅',
    "You're good!",
    '🔥🔥',
    'gg wp',
];
