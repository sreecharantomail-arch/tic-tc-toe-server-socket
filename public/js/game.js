/**
 * game.js
 * Game lifecycle — mode selection, board, timer, chat, emoji, win/draw handling.
 *
 * Reads from state.js, calls player.js for stat recording, and calls ui.js
 * for any rendering that doesn't belong directly to the board.
 */

// ----- Board cell elements (set during initGame) -----
let boardCells = [];

// ----- Timer internals -----
let timerInterval = null;
let timerSeconds  = TURN_DURATION;

// ----- Auto-reset after a round ends -----
let roundResetTimeout = null;

// ================================================================
// MODE SELECTION
// ================================================================

/** Called when the player taps one of the four mode cards in the lobby. */
function pickMode(mode) {
    sfxClick();
    gameMode = mode;

    switch (mode) {
        case "2p":
            _start2PlayerGame();
            break;

        case "ai":
            showScreen("sAI");
            break;

        case "room":
            showScreen("sRoom");
            break;

        case "random":
            _startMatchmaking();
            break;
    }
}

function _start2PlayerGame() {
  const p2Name = prompt('Enter Player 2 name:', 'Player 2') || 'Player 2';
  playerNames.X = player.name;
  playerNames.O = p2Name.trim() || 'Player 2';
  localSymbol   = 'X';
  _initGame('2p');
}

// ----- AI mode -----

function selectDifficulty(buttonEl) {
  document.querySelectorAll('.diff-btn').forEach(b => (b.className = 'diff-btn'));
  aiDifficulty         = buttonEl.dataset.d;
  buttonEl.classList.add(`sel-${aiDifficulty}`);
}

function startAiGame() {
  playerNames.X = player.name;
  playerNames.O = `AI (${aiDifficulty})`;
  localSymbol   = 'X';
  _initGame('ai');
}
