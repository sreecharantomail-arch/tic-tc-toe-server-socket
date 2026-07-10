/**
 * main.js
 * Application entry point
 *
 * Responsibilities:
 * 1. Animate loading screen
 * 2. Restore saved game data
 * 3. Initialize all modules
 * 4. Register global event listeners
 * 5. Connect multiplayer
 */

// ----- Loading screen -----

function runLoadingScreen() {
  const bar = document.getElementById('loading-bar');
  const msgEl = document.getElementById('loading-msg');

  if (!bar || !msgEl) {
    _bootApp();
    return;
  }

  let progress = 0;
  let msgIndex = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 18 + 5;

    if (progress >= 100) progress = 100;

    bar.style.width = `${progress}%`;

    msgEl.textContent =
      LOADING_MESSAGES[Math.min(msgIndex++, LOADING_MESSAGES.length - 1)];

    if (progress === 100) {
      clearInterval(interval);

      setTimeout(() => {
        const screen = document.getElementById('loading-screen');

        if (!screen) {
          _bootApp();
          return;
        }

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
  // Initialize global error handling first
  initGlobalErrorHandling();

  // Restore saved player data
  try {
    loadGameData();
  } catch (err) {
    console.error("Failed to load saved data:", err);
  }

  // Apply saved theme
  applyTheme(player.activeTheme || 'dark', true);

  // Particle background
  const canvas = document.getElementById('particle-canvas');
  if (canvas) {
    initParticles(canvas);
  }

  // Background music
  if (player.settings.music) {
    startBackgroundMusic();
  }

  // Render UI
  updateHud();
  renderAvatarGrid();
  renderShop();
  renderSettings();
  renderGlobalLeaderboard('wins');

  // Lobby
  refreshLobbyView();
// -------------------------
// Authentication
// -------------------------

const token = localStorage.getItem("nexa_token");

if (token) {

    showGame();

} else {

    showAuth();

}

  // Chat Enter key
  const chatInput = document.getElementById('cin');

  if (chatInput) {
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // Daily reward
  if (isDailyRewardPending()) {
    showDailyRewardModal();
  }

  // Multiplayer
  if (typeof initSocket === 'function') {
    initSocket();
  }
}

// ----- Start app -----

document.addEventListener('DOMContentLoaded', runLoadingScreen);