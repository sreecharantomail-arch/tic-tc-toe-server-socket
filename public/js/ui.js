/**
 * ui.js
 * DOM rendering and screen navigation.
 *
 * Rule: this module reads from state.js and writes to the DOM.
 * It calls player.js for side-effecting actions (buy, claim, save).
 * It never contains game loop logic — that's game.js.
 */

// ----- Screen router -----

/**
 * Show exactly one screen by adding the 'active' class.
 * All other .screen elements are hidden.
 */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(screenId)?.classList.add('active');
}

/**
 * Navigate to a screen and update the bottom-nav highlight.
 * Also triggers any screen-specific data refresh.
 */
function navTo(screenId) {
  sfxClick();

  // Bottom-nav tab mapping
  const navMap = {
    sLobby:       'bnav-home',
    sLeaderboard: 'bnav-lb',
    sProfile:     'bnav-profile',
    sShop:        'bnav-shop',
  };
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const activeNav = navMap[screenId];
  if (activeNav) document.getElementById(activeNav)?.classList.add('active');

  // Refresh data for screens that display live state
  if (screenId === 'sProfile')     renderProfileScreen();
  if (screenId === 'sLeaderboard') renderGlobalLeaderboard('wins');
  if (screenId === 'sShop')        renderShop();
  if (screenId === 'sAvatars')     renderAvatarGrid();

  showScreen(screenId);
}

// ----- HUD (persistent top strip) -----

/** Re-render all persistent player-data displays — call after any XP, coin, name, or level change. */
function updateHud() {
  const avatar = _findAvatar(player.avatar);
  const { percentage } = getXpProgress();

  document.getElementById('hud-avatar').textContent  = avatar.emoji;
  document.getElementById('hud-name').textContent    = player.name || 'Guest';
  document.getElementById('hud-coins').textContent   = player.coins;
  document.getElementById('hud-level').textContent   = `LEVEL ${player.level} · ${player.xp} XP`;
  document.getElementById('hud-xp-fill').style.width = `${percentage}%`;

  // Keep any visible coin counters in sync (shop screen has its own display)
  const shopCoinsEl = document.getElementById('shop-coins');
  if (shopCoinsEl) shopCoinsEl.textContent = player.coins;
}

// ----- Lobby -----

/**
 * Decide which lobby view to show based on whether the player has set a name:
 *  - No name → show name-entry form, hide mode grid
 *  - Name set → show welcome card and mode grid
 */
function refreshLobbyView() {
  const hasName = player.name && player.name.length > 0;

  document.getElementById('name-setup-block').style.display    = hasName ? 'none'  : 'block';
  document.getElementById('welcome-back-block').style.display  = hasName ? 'block' : 'none';
  document.getElementById('mode-grid').style.display           = hasName ? 'grid'  : 'none';

  if (hasName) {
    const avatar = _findAvatar(player.avatar);
    document.getElementById('lobby-av').textContent   = avatar.emoji;
    document.getElementById('lobby-name').textContent = player.name;
    document.getElementById('lobby-sub').textContent  = `Level ${player.level} · ${player.xp} XP`;
  }

  // Clear the name-entry input for a fresh start
  const nameInput = document.getElementById('uname');
  if (nameInput) nameInput.value = '';
}

// ----- Name editing -----

/** Save the name typed in the initial name-setup form. */
function saveName() {
  const input = document.getElementById('uname');
  const name  = input.value.trim();

  if (!name) {
    _flashBorder(input);
    return;
  }

  player.name = name;
  saveGameData();
  sfxCoin();
  updateHud();
  refreshLobbyView();
}

/** Show the inline edit row within the welcome-back card. */
function showNameEditRow() {
  const editRow = document.getElementById('name-inline-edit');
  const editInput = document.getElementById('uname-edit');
  editRow.style.display = 'block';
  editInput.value = player.name;
  editInput.focus();
  editInput.select();
}

function cancelNameEditRow() {
  document.getElementById('name-inline-edit').style.display = 'none';
}

function saveNameFromEditRow() {
  const name = document.getElementById('uname-edit').value.trim();
  if (!name) return;
  _applyNewName(name);
  cancelNameEditRow();
}

/** Show the name-edit UI within Settings. */
function openSettingsNameEdit() {
  const container = document.getElementById('settings-name-edit');
  const input     = document.getElementById('settings-uname');
  container.style.display = 'block';
  input.value = player.name;
  input.focus();
  input.select();
}

function closeSettingsNameEdit() {
  document.getElementById('settings-name-edit').style.display = 'none';
}

function saveNameFromSettings() {
  const name = document.getElementById('settings-uname').value.trim();
  if (!name) return;

  _applyNewName(name);
  closeSettingsNameEdit();
  showXpNotification('Name saved!');
}

/** Shared logic for all name-save paths. */
function _applyNewName(name) {
  player.name = name;
  saveGameData();
  sfxCoin();
  updateHud();
  refreshLobbyView();
}

// ----- Helpers -----

/** Find an avatar definition by id, falling back to the first in the list. */
function _findAvatar(id) {
  return AVATARS.find(a => a.id === id) ?? AVATARS[0];
}

/** Briefly flash a red border on an input to signal validation failure. */
function _flashBorder(inputEl) {
  inputEl.style.borderColor = '#ff5566';
  setTimeout(() => (inputEl.style.borderColor = ''), 1200);
}

/** Show/clear any inline error message element(s) matching #errMsg. */
function setErrorMessage(msg) {
  document.querySelectorAll('#errMsg').forEach(el => (el.textContent = msg));
}



