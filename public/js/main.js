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

        if (progress >= 100) {
            progress = 100;
        }

        bar.style.width = `${progress}%`;

        msgEl.textContent = LOADING_MESSAGES[Math.min(msgIndex++, LOADING_MESSAGES.length - 1)];

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

function setupDOMEventListeners() {
    // ── Daily reward modal ──────────────────────────────────────
    const dailyClaimBtn = document.getElementById('daily-modal').querySelector('.btn-y');
    if (dailyClaimBtn) {
        dailyClaimBtn.addEventListener('click', function () {
            handleClaimDaily();
        });
    }

    // ── Auth: register ──────────────────────────────────────────
    const registerSubmit = document.getElementById('register-submit-btn');
    if (registerSubmit) {
        registerSubmit.addEventListener('click', function () {
            registerPlayer();
        });
    }

    // ── Header navigation ───────────────────────────────────────
    document.querySelectorAll('#game-header .nav-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (this.getAttribute('title') === 'Settings') {
                navTo('sSettings');
            } else if (this.getAttribute('title') === 'Shop') {
                navTo('sShop');
            }
        });
    });

    // ── Player HUD avatar ───────────────────────────────────────
    const hudAvatar = document.getElementById('hud-avatar');
    if (hudAvatar) {
        hudAvatar.addEventListener('click', function () {
            navTo('sProfile');
        });
        // role="button" elements must also respond to Enter/Space
        hudAvatar.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navTo('sProfile');
            }
        });
    }

    // ── Profile avatar → avatar picker ──────────────────────────
    const profileAvatar = document.getElementById('profile-av-lg');
    if (profileAvatar) {
        profileAvatar.addEventListener('click', function () {
            navTo('sAvatars');
        });
    }

    // ── Lobby: name setup ───────────────────────────────────────
    const uname = document.getElementById('uname');
    if (uname) {
        uname.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                saveName();
            }
        });
    }
    const nameSaveBtn = document.querySelector('#name-setup-block .name-save-btn');
    if (nameSaveBtn) {
        nameSaveBtn.addEventListener('click', function () {
            saveName();
        });
    }

    // ── Lobby: welcome back / edit name ─────────────────────────
    const editNameBtn = document.querySelector('#welcome-back-block .edit-name-btn');
    if (editNameBtn) {
        editNameBtn.addEventListener('click', function () {
            showNameEditRow();
        });
    }

    const unameEdit = document.getElementById('uname-edit');
    if (unameEdit) {
        unameEdit.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                saveNameFromEditRow();
            }
            if (event.key === 'Escape') {
                cancelNameEditRow();
            }
        });
    }
    const nameEditSaveBtn = document.querySelector('#name-inline-edit .name-save-btn');
    if (nameEditSaveBtn) {
        nameEditSaveBtn.addEventListener('click', function () {
            saveNameFromEditRow();
        });
    }
    const nameEditCancelBtn = document.querySelector('#name-inline-edit .btn-ghost');
    if (nameEditCancelBtn) {
        nameEditCancelBtn.addEventListener('click', function () {
            cancelNameEditRow();
        });
    }

    // ── Lobby: mode selection ───────────────────────────────────
    document.querySelectorAll('#mode-grid .mode-card').forEach(function (card) {
        card.addEventListener('click', function () {
            const map = { 'mc-x': '2p', 'mc-o': 'ai', 'mc-y': 'room', 'mc-p': 'random' };
            let mode = null;
            this.classList.forEach(function (c) {
                if (map[c]) {
                    mode = map[c];
                }
            });
            if (mode) {
                pickMode(mode);
            }
        });
    });

    // ── AI difficulty ───────────────────────────────────────────
    document.querySelectorAll('#sAI .diff-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            selectDifficulty(this);
        });
    });
    const startAiBtn = document.querySelector('#sAI .btn-o');
    if (startAiBtn) {
        startAiBtn.addEventListener('click', function () {
            startAiGame();
        });
    }
    const aiBackBtn = document.querySelector('#sAI .btn-ghost');
    if (aiBackBtn) {
        aiBackBtn.addEventListener('click', function () {
            showScreen('sLobby');
        });
    }

    // ── Private room setup ──────────────────────────────────────
    const createRoomBtn = document.querySelector('#sRoom .btn-y');
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', function () {
            createPrivateRoom();
        });
    }
    const joinRoomBtn = document.querySelector('#sRoom .btn-o');
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', function () {
            joinPrivateRoom();
        });
    }
    const roomBackBtn = document.querySelector('#sRoom .btn-ghost');
    if (roomBackBtn) {
        roomBackBtn.addEventListener('click', function () {
            showScreen('sLobby');
        });
    }

    // ── Waiting for opponent ────────────────────────────────────
    const copyBtn = document.querySelector('#sWaiting .copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            copyRoomCode();
        });
    }
    const waitingCancelBtn = document.querySelector('#sWaiting .btn-ghost');
    if (waitingCancelBtn) {
        waitingCancelBtn.addEventListener('click', function () {
            cancelWaiting();
        });
    }

    // ── Matchmaking ─────────────────────────────────────────────
    const mmCancelBtn = document.querySelector('#sMM .btn-ghost');
    if (mmCancelBtn) {
        mmCancelBtn.addEventListener('click', function () {
            cancelMatchmaking();
        });
    }

    // ── Game: emoji reactions ───────────────────────────────────
    const emojiBar = document.querySelector('.emoji-bar');
    if (emojiBar) {
        emojiBar.querySelectorAll('.emoji-btn').forEach(function (btn) {
            btn.addEventListener('click', function (event) {
                const lookup = {
                    'Fire reaction': '🔥',
                    'Laugh reaction': '😂',
                    'Clap reaction': '👏',
                    'Frustrated reaction': '😤',
                    'Mind blown reaction': '🤯',
                };
                const key = lookup[btn.getAttribute('aria-label')] || '';
                sendEmojiReaction(key, event);
            });
        });
    }

    // ── Game: chat send ─────────────────────────────────────────
    const chatSendBtn = document.querySelector('#chatBox .chat-input-row button');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', function () {
            sendChat();
        });
    }

    // ── Game: actions ───────────────────────────────────────────
    const btnPA = document.getElementById('btnPA');
    if (btnPA) {
        btnPA.addEventListener('click', function () {
            playAgain();
        });
    }
    const btnRematch = document.getElementById('btnRematch');
    if (btnRematch) {
        btnRematch.addEventListener('click', function () {
            requestRematch();
        });
    }
    const leaveGameBtn = document.querySelector('#sGame .action-row .btn-ghost:last-child');
    if (leaveGameBtn) {
        leaveGameBtn.addEventListener('click', function () {
            leaveGame();
        });
    }

    // ── Leaderboard tabs ────────────────────────────────────────
    document.querySelectorAll('#sLeaderboard .tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const label = this.textContent.trim();
            let tab = 'wins';
            if (label === 'XP') {
                tab = 'xp';
            } else if (label === 'Games') {
                tab = 'games';
            }
            switchLeaderboardTab(tab, this);
        });
    });

    // ── Avatars: back ───────────────────────────────────────────
    const avatarsBackBtn = document.querySelector('#sAvatars .btn-ghost');
    if (avatarsBackBtn) {
        avatarsBackBtn.addEventListener('click', function () {
            navTo('sProfile');
        });
    }

    // ── Shop tabs ───────────────────────────────────────────────
    const themeTab = document.getElementById('theme-tab');
    if (themeTab) {
        themeTab.addEventListener('click', function () {
            showShopTab('themes');
        });
    }
    const avatarTab = document.getElementById('avatar-tab');
    if (avatarTab) {
        avatarTab.addEventListener('click', function () {
            showShopTab('avatars');
        });
    }

    // ── Settings: toggles & selects & previews ─────────────────
    const toggleSfx = document.getElementById('toggle-sfx');
    if (toggleSfx) {
        toggleSfx.addEventListener('click', function () {
            toggleSetting('sfx');
        });
    }
    const toggleMusic = document.getElementById('toggle-music');
    if (toggleMusic) {
        toggleMusic.addEventListener('click', function () {
            toggleSetting('music');
        });
    }
    const toggleConfetti = document.getElementById('toggle-confetti');
    if (toggleConfetti) {
        toggleConfetti.addEventListener('click', function () {
            toggleSetting('confetti');
        });
    }

    const soundThemeSelect = document.getElementById('sound-theme-select');
    if (soundThemeSelect) {
        soundThemeSelect.addEventListener('change', function () {
            setSoundThemeFromSettings(this.value);
        });
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', function () {
            applyTheme(this.value);
        });
    }

    const diffSelect = document.getElementById('diff-select');
    if (diffSelect) {
        diffSelect.addEventListener('change', function () {
            setDefaultDifficulty(this.value);
        });
    }

    const settingsPreviewBtns = document.querySelectorAll('#sSettings .panel .btn-o');
    const previewMap = ['click', 'place', 'win', 'loss', 'bonus', 'coin'];
    settingsPreviewBtns.forEach(function (btn, idx) {
        const sound = previewMap[idx];
        if (sound) {
            btn.addEventListener('click', function () {
                previewSoundFromSettings(sound);
            });
        }
    });

    const settingsEditNameBtn = document.querySelector('#sSettings .edit-name-btn');
    if (settingsEditNameBtn) {
        settingsEditNameBtn.addEventListener('click', function () {
            openSettingsNameEdit();
        });
    }

    const settingsUname = document.getElementById('settings-uname');
    if (settingsUname) {
        settingsUname.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                saveNameFromSettings();
            }
            if (event.key === 'Escape') {
                closeSettingsNameEdit();
            }
        });
    }
    const settingsNameSaveBtn = document.querySelector('#settings-name-edit .name-save-btn');
    if (settingsNameSaveBtn) {
        settingsNameSaveBtn.addEventListener('click', function () {
            saveNameFromSettings();
        });
    }
    const settingsNameCancelBtn = document.querySelector('#settings-name-edit .btn-ghost');
    if (settingsNameCancelBtn) {
        settingsNameCancelBtn.addEventListener('click', function () {
            closeSettingsNameEdit();
        });
    }

    const resetBtn = document.querySelector('#sSettings .panel:nth-of-type(2) .btn-o');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            confirmReset();
        });
    }

    const logoutBtn = document.querySelector('#sSettings > .btn-o');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            logoutPlayer();
        });
    }

    // ── Bottom navigation ───────────────────────────────────────
    const bnavHome = document.getElementById('bnav-home');
    if (bnavHome) {
        bnavHome.addEventListener('click', function () {
            navTo('sLobby');
        });
    }
    const bnavLb = document.getElementById('bnav-lb');
    if (bnavLb) {
        bnavLb.addEventListener('click', function () {
            navTo('sLeaderboard');
        });
    }
    const bnavProfile = document.getElementById('bnav-profile');
    if (bnavProfile) {
        bnavProfile.addEventListener('click', function () {
            navTo('sProfile');
        });
    }
    const bnavShop = document.getElementById('bnav-shop');
    if (bnavShop) {
        bnavShop.addEventListener('click', function () {
            navTo('sShop');
        });
    }
}

// ----- Boot -----

function _bootApp() {
    // Initialize global error handling first
    initGlobalErrorHandling();

    // Restore saved player data
    try {
        loadGameData();
    } catch (err) {
        console.error('Failed to load saved data:', err);
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

    const token = localStorage.getItem('nexa_token');

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

    // DOM event listeners (replaces inline onclick/onchange/onkeydown)
    setupDOMEventListeners();
}

// ----- Start app -----

document.addEventListener('DOMContentLoaded', runLoadingScreen);
