/**
 * player.js
 * Player progression — XP, levelling, coins, achievements, daily rewards.
 *
 * This module only mutates `player` (from state.js) and calls persistence
 * (storage.js). It never touches the DOM directly; callers in ui.js and
 * game.js are responsible for re-rendering after calling these functions.
 */

// ----- XP & Levelling -----

/**
 * Return the total cumulative XP required to reach a given level.
 * Past the defined thresholds we extrapolate linearly (1000 XP per level).
 */
function getXpForLevel(level) {
  if (level < XP_THRESHOLDS.length) return XP_THRESHOLDS[level];
  return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + (level - XP_THRESHOLDS.length + 1) * 1000;
}

/**
 * Add XP to the player, handle level-ups, update the HUD, and show a notif.
 * Returns the number of levels gained (0 if none).
 */
function awardXp(amount) {
  if (amount <= 0) return 0;
  player.xp = Math.max(0, player.xp + amount);
  const prevLevel = player.level;
  while (player.level < XP_THRESHOLDS.length - 1 && player.xp >= getXpForLevel(player.level + 1)) {
    player.level++;
  }

  showXpNotification(`+${amount} XP`);
  updateHud();

  const levelsGained = player.level - prevLevel;
  if (levelsGained > 0) {
    showToastNotification({ label: 'Level Up!', icon: '⬆️', description: `You reached Level ${player.level}!` });
    sfxAchievement();
  }

  saveGameData();
  checkAndUnlockAchievements();

  return levelsGained;
}

/**
 * Compute XP progress within the current level.
 * Returns { current, required, percentage }.
 */
function getXpProgress() {
  const currentLevelXp = getXpForLevel(player.level);
  const nextLevelXp    = getXpForLevel(player.level + 1);
  const current        = player.xp - currentLevelXp;
  const required       = nextLevelXp - currentLevelXp;
  const percentage     = Math.max(0, Math.min(100, Math.round((current / required) * 100)));
  return { current: player.xp, required: nextLevelXp, percentage };
}

// ----- Coins -----

/**
 * Add coins and persist. Plays a brief audio cue.
 * Does NOT handle the shop (buying items) — that's done in ui.js
 * where we need DOM feedback like error toasts.
 */
function awardCoins(amount) {
  if (amount <= 0) return;
  player.coins = Math.max(0, player.coins + amount);
  sfxCoin();
  updateHud(); // updateHud() in ui.js handles all coin displays
  saveGameData();
}

// ----- Achievements -----

/**
 * Check every achievement against the current player state.
 * Unlocks any newly-qualified achievements, awards their coin rewards,
 * and shows a popup. Safe to call after every stat change.
 */
function checkAndUnlockAchievements() {
  let unlocked = false;

  for (const ach of ACHIEVEMENTS) {
    if (player.unlockedAchievements.includes(ach.id)) continue;
    if (!ach.req(player)) continue;

    player.unlockedAchievements.push(ach.id);
    unlocked = true;

    if (ach.reward > 0) {
      // Award coins without re-calling checkAndUnlockAchievements to avoid recursion
      player.coins += ach.reward;
      sfxCoin();
      updateHud();
    }

    showToastNotification(ach);
    sfxAchievement();
  }

  if (unlocked) saveGameData();
}

// ----- Daily Reward -----

/**
 * Check whether a daily reward is pending.
 * Returns true if the player hasn't claimed today's reward yet.
 */
function isDailyRewardPending() {
  const today = new Date().toDateString();
  return player.lastDailyDate !== today;
}

/**
 * Compute how many coins the daily reward is worth based on streak length.
 * Day 1 = 50 coins, +25 per day, capped at 7 days (200 coins max).
 */
function getDailyRewardCoins(streak) {
  return 50 + Math.min(streak - 1, 6) * 25;
}

/**
 * Called when the player taps "Claim Reward".
 * Updates streak, awards coins and XP, persists, then re-checks achievements.
 */
function claimDailyReward() {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();

  // Streak resets if they missed a day
  if (player.lastDailyDate !== yesterday) player.dailyStreak = 0;

  player.dailyStreak++;
  player.lastDailyDate = today;
  player.totalDailyClaims++;

  const coins = getDailyRewardCoins(player.dailyStreak);
  awardCoins(coins);
  awardXp(30);
  sfxBonus(); // Play bonus sound effect

  saveGameData();
  checkAndUnlockAchievements();
}

// ----- Stat recording -----

/** Record the outcome of a completed game for the local player. */
function recordGameResult(outcome) {
  // outcome: 'win' | 'loss' | 'draw'
  player.stats.games++;

  if (outcome === 'win') {
    player.stats.wins++;
    player.stats.currentStreak++;
    player.stats.bestStreak = Math.max(player.stats.bestStreak, player.stats.currentStreak);
  } else {
    player.stats.currentStreak = 0;
    if (outcome === 'loss') player.stats.losses++;
    if (outcome === 'draw') player.stats.draws++;
  }

  saveGameData();
  checkAndUnlockAchievements();
}

/** Mark that the player beat the hard AI (one-time achievement trigger). */
function recordHardAiBeat() {
  if (!player.stats.beatHardAi) {
    player.stats.beatHardAi = true;
    saveGameData();
    checkAndUnlockAchievements();
  }
}

// ----- Global leaderboard sync -----

/**
 * Upsert the current player's entry in the global leaderboard array.
 * Called after any stat change that should be reflected on the Ranks screen.
 */
function syncToGlobalLeaderboard() {
  const entry = {
    name:   player.name,
    avatar: player.avatar,
    wins:   player.stats.wins,
    games:  player.stats.games,
    xp:     player.xp,
  };

  const existingIndex = globalLeaderboard.findIndex(
  e =>
    e.name &&
    player.name &&
    e.name.toLowerCase() === player.name.toLowerCase()
  );

  if (existingIndex !== -1) {
    globalLeaderboard[existingIndex] = entry;
  } else if (player.name) {
    globalLeaderboard.push(entry);
  }
  if (player.name) {
  saveGameData();
  }
}