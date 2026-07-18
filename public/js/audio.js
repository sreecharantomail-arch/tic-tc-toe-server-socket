/**
 * audio.js
 * Minimal Web Audio synth for UI and game feedback.
 *
 * AudioContext must be created (or resumed) inside a user-gesture handler.
 * We lazy-init on the first call to _getContext() so we don't need to
 * wire up a separate "click to unlock audio" flow.
 */

let _audioCtx = null;

/** Returns a running AudioContext, or null if Web Audio isn't supported. */
function _getContext() {
    if (_audioCtx) {
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }

        return _audioCtx;
    }

    const Ctor = window.AudioContext || window.webkitAudioContext;

    if (!Ctor) {
        return null;
    }

    try {
        _audioCtx = new Ctor();
    } catch (err) {
        console.warn('[audio] Could not create AudioContext:', err);
        return null;
    }

    return _audioCtx;
}

/**
 * Play a simple synthesised tone.
 * @param {number} frequency  Hz
 * @param {number} duration   seconds
 * @param {OscillatorType} waveform
 * @param {number} gain       0–1
 */
function playTone(frequency, duration, waveform = 'sine', gain = 0.8) {
    if (!player.settings.sfx) {
        return;
    }
    const ctx = _getContext();
    if (!ctx) {
        return;
    }

    try {
        const osc = ctx.createOscillator();
        const vol = ctx.createGain();
        osc.connect(vol);
        vol.connect(ctx.destination);
        osc.type = waveform;
        osc.frequency.value = frequency;
        vol.gain.setValueAtTime(gain, ctx.currentTime);
        vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (err) {
        // Silently ignore — audio is non-critical.
        console.warn('[audio] Tone failed:', err);
    }
}

// ----- Named sound effects -----
// Each function documents its intent so callers don't need to know frequencies.

/** Short click for button presses and navigation. */
function sfxClick() {
    playTone(440, 0.08, 'square', 0.8);
}

/** Softer confirmation when placing a mark on the board. */
function sfxPlace() {
    playTone(900, 0.04, 'square', 1.0);
    setTimeout(() => playTone(600, 0.05, 'triangle', 0.7), 15);
}

/** Ascending arpeggio on a win. */
function sfxWin() {
    [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.3, 'sine', 0.15), i * 120);
    });
}

/** Descending droop on a draw. */
function sfxDraw() {
    [300, 280, 260].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sawtooth', 0.8), i * 100);
    });
}

/** Bright chime for achievement unlocks and level-ups. */
function sfxAchievement() {
    [880, 1100, 1320].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'sine', 0.12), i * 100);
    });
}

/** Quick high ping for coin rewards. */
function sfxCoin() {
    playTone(1200, 0.15, 'sine', 0.1);
}

/** Sad descending sound for loss/defeat. */
function sfxLose() {
    [400, 300, 200, 150].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'sine', 0.12), i * 100);
    });
}

/** Ascending bonus/reward sound. */
function sfxBonus() {
    [600, 750, 900, 1050].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine', 0.14), i * 80);
    });
}

// ----- Sound Themes -----
// Allow users to customize which sound effects are used for different events.

const SOUND_THEMES = {
    classic: { label: '🎶 Classic', sounds: {} }, // uses default sfx
    energetic: { label: '⚡ Energetic', sounds: {} }, // variation
    mellow: { label: '🌙 Mellow', sounds: {} }, // softer sounds
};

// Default active sound theme
let activeSoundTheme = player?.settings?.soundTheme || 'classic';

/**
 * Set the active sound theme.
 * @param {string} theme - 'classic' | 'energetic' | 'mellow'
 */
function setSoundTheme(theme) {
    if (SOUND_THEMES[theme]) {
        activeSoundTheme = theme;
        if (player && player.settings) {
            player.settings.soundTheme = theme;
            saveGameData();
        }
    }
}

/**
 * Get current sound theme.
 */
function getSoundTheme() {
    return activeSoundTheme;
}

// ----- Background music -----
// Generates a simple ambient arpeggio — nothing fancy, just atmosphere.

let _bgMusicInterval = null;

function startBackgroundMusic() {
    if (!player.settings.music) {
        return;
    }
    stopBackgroundMusic();

    const notes = [261, 293, 329, 349, 392, 440, 493, 523];
    let noteIndex = 0;

    _bgMusicInterval = setInterval(() => {
        if (player.settings.music) {
            playTone(notes[noteIndex % notes.length], 0.4, 'triangle', 0.04);
        }
        noteIndex++;
    }, 600);
}

function stopBackgroundMusic() {
    clearInterval(_bgMusicInterval);
    _bgMusicInterval = null;
}

/**
 * Play a sound preview (for settings UI).
 * @param {string} soundName - 'click', 'place', 'win', 'loss', 'draw', 'coin', 'bonus', 'achievement'
 */
function previewSound(soundName) {
    sfxClick(); // Always play click first as feedback
    setTimeout(() => {
        switch (soundName) {
            case 'click':
                sfxClick();
                break;
            case 'place':
                sfxPlace();
                break;
            case 'win':
                sfxWin();
                break;
            case 'loss':
                sfxLose();
                break;
            case 'draw':
                sfxDraw();
                break;
            case 'coin':
                sfxCoin();
                break;
            case 'bonus':
                sfxBonus();
                break;
            case 'achievement':
                sfxAchievement();
                break;
        }
    }, 50);
}
