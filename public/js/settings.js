// ----- Settings -----

function renderSettings() {
  _setToggleVisual('sfx', player.settings.sfx);
  _setToggleVisual('music', player.settings.music);
  _setToggleVisual('confetti', player.settings.confetti);

  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = player.activeTheme;
  }

  const soundThemeSelect = document.getElementById('sound-theme-select');
  if (soundThemeSelect) {
    soundThemeSelect.value = player.settings.soundTheme || 'classic';
  }

  const diffSelect = document.getElementById('diff-select');
  if (diffSelect) {
    diffSelect.value = aiDifficulty;
  }

  const nameDisplay = document.getElementById('settings-name-display');
  if (nameDisplay) {
    nameDisplay.textContent = player.name || 'Not set';
  }
}

function toggleSetting(key) {
  if (!(key in player.settings)) return;

  player.settings[key] = !player.settings[key];

  _setToggleVisual(key, player.settings[key]);

  sfxClick();

  if (key === 'music') {
    if (player.settings.music) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  }

  saveGameData();
}

function setDefaultDifficulty(value) {
  aiDifficulty = value;
  renderSettings();
  saveGameData();
}

function _setToggleVisual(key, isOn) {
  const el = document.getElementById(`toggle-${key}`);
  if (!el) return;

  el.classList.toggle('on', isOn);
}

/**
 * Called by the "Reset All Progress" button in Settings.
 * Asks for confirmation before clearing all saved data.
 */
function confirmReset() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    resetAllData(); // Defined in storage.js
  }
}

/**
 * Set the sound theme and save it.
 */
function setSoundThemeFromSettings(value) {
  player.settings.soundTheme = value;
  setSoundTheme(value);
  saveGameData();
  sfxClick();
}

/**
 * Preview a specific sound effect.
 */
function previewSoundFromSettings(soundName) {
  previewSound(soundName);
}