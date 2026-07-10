
/**
 * main.js
 * Application entry point — runs after all other scripts have loaded.
 *
 * Responsibilities:
 *  1. Animate the loading screen
 *  2. Call loadGameData() to restore the player's saved state
 *  3. Boot all subsystems (theme, particles, audio, UI)
 *  4. Wire up event listeners that span multiple modules
 *  5. Check for a pending daily reward
 */

// ----- Loading screen -----

function runLoadingScreen() {
  const bar     = document.getElementById('loading-bar');
  const msgEl   = document.getElementById('loading-msg');
  let progress  = 0;
  let msgIndex  = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 18 + 5;
    if (progress >= 100) progress = 100;

    bar.style.width    = `${progress}%`;
    msgEl.textContent  = LOADING_MESSAGES[Math.min(msgIndex++, LOADING_MESSAGES.length - 1)];

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        const screen = document.getElementById('loading-screen');
        screen.classList.add('hidden');
        setTimeout(() => {
          screen.style.display = 'none';
          _bootApp();
        }, 500);
      }, 400);
    }
  }, 120);
}

// ----- Boot -----

function _bootApp() {
  // Restore saved progress (merges into the live `player` object in state.js)
  loadGameData();

  // Apply the player's chosen theme before anything renders
  applyTheme(player.activeTheme, /* silent */ true);

  // Start the particle canvas render loop
  initParticles(document.getElementById('particle-canvas'));

  // Restore background music if the player had it on
  if (player.settings.music) startBackgroundMusic();

  // Render all persistent UI components
  updateHud();
  renderAvatarGrid();
  renderShop();
  renderSettings();
  renderGlobalLeaderboard('wins');

  // Show the lobby (name-entry or welcome-back depending on saved state)
  refreshLobbyView();

  // Wire up the chat Enter key handler (once, here, not inside game.js)
  document.getElementById('cin')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });

  // Show daily reward modal if one is pending
  if (isDailyRewardPending()) showDailyRewardModal();

  // Connect to the Socket.io multiplayer server
  initSocket();
}

// ----- Kick off the loading animation on DOMContentLoaded -----
document.addEventListener('DOMContentLoaded', runLoadingScreen);
