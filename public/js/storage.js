/**
 * storage.js
 * Thin wrapper around localStorage.
 *
 * All keys are namespaced under 'nc_' (Nexa Clash) to avoid collisions.
 * Every operation is wrapped in try/catch — storage can be blocked by
 * browser privacy settings or exceeded quota.
 */

const STORAGE_KEY_PLAYER = 'nc_player';
const STORAGE_KEY_LEADERBOARD = 'nc_leaderboard';

/**
 * Persist the current player object and global leaderboard to localStorage.
 * Called after any mutation that should survive a page refresh.
 */
function saveGameData() {
    try {
        localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
    } catch (err) {
        console.warn('[storage] Failed to save player data:', err);
    }

    try {
        localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(globalLeaderboard));
    } catch (err) {
        console.warn('[storage] Failed to save leaderboard:', err);
    }
}

/**
 * Load saved data into the live `player` and `globalLeaderboard` objects.
 * Deep-merges so that new fields added to DEFAULT_PLAYER get their defaults
 * even for players with older saves.
 */
function loadGameData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYER);
        if (raw) {
            const saved = JSON.parse(raw);
            // Shallow-merge top-level, then individual nested objects,
            // so a new top-level key in DEFAULT_PLAYER isn't wiped out.
            Object.assign(player, saved);
            player.stats = { ...DEFAULT_PLAYER.stats, ...saved.stats };
            player.settings = { ...DEFAULT_PLAYER.settings, ...saved.settings };
        }
    } catch (err) {
        console.warn('[storage] Failed to load player data — using defaults:', err);
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                globalLeaderboard = parsed;
            }
        }
    } catch (err) {
        console.warn('[storage] Failed to load leaderboard:', err);
    }
}

/**
 * Wipe all saved data and reload the page.
 * Used by the "Reset All Progress" button in Settings.
 */
function resetAllData() {
    try {
        localStorage.removeItem(STORAGE_KEY_PLAYER);
        localStorage.removeItem(STORAGE_KEY_LEADERBOARD);
    } catch (err) {
        console.warn('[storage] Failed to clear data:', err);
    }
    location.reload();
}
