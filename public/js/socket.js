// ================================================================
// SOCKET.IO CLIENT MODULE
// Replaces all simulated multiplayer. Private rooms + Quick Match.
// ================================================================
let lastEmojiTime = 0;

let socket = null;        // the Socket.io connection
let _activeRoomCode = ''; // room code for the current online game

/** Connect (or reconnect) to the server. Called once on app boot. */
function initSocket() {
  // On platforms with cold-start behaviour (e.g. Render free tier) the
  // backend may still be booting when the page loads.  Poll /health until
  // we get a 200 so that the first Socket.IO request doesn't hit a
  // still-starting server and return 502 / 404.
  _pollHealthAndConnect();
}

let _healthPollId = null;

function _pollHealthAndConnect() {
  if (_healthPollId) return;

  let attempts = 0;
  const maxAttempts = 30; // ~30 seconds worst case

  _healthPollId = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch('/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        clearInterval(_healthPollId);
        _healthPollId = null;
        _createSocketConnection();
        return;
      }
    } catch (_) {
      // server not ready yet
    }

    if (attempts >= maxAttempts) {
      clearInterval(_healthPollId);
      _healthPollId = null;
      _createSocketConnection();
    }
  }, 1000);
}

function _createSocketConnection() {
  // io() is provided by /socket.io/socket.io.js loaded from our server
  socket = io({
    autoConnect: true,
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 30000,
    auth: { token: localStorage.getItem("nexa_token") || undefined },
  });

  // ── Connection lifecycle ──────────────────────────────────────
  socket.on('connect', () => {
    _setConnBadge('online', '🟢 Connected');
    setTimeout(() => _hideConnBadge(), 2500);
    console.log('[socket] connected', socket.id);
  });

  socket.on('disconnect', (reason) => {
    _setConnBadge('offline', '🔴 Disconnected');
    console.warn('[socket] disconnected', reason);
  });

  socket.on('connect_error', () => {
    _setConnBadge('connecting', '🟡 Reconnecting…');
  });

  // ── Room: created (you are the host) ─────────────────────────
  socket.on('room:created', ({ code, symbol }) => {
    localSymbol = symbol;   // always 'X' for host
    _activeRoomCode = code;
    document.getElementById('dispCode').textContent = code;
    showScreen('sWaiting');
  });

  // ── Room error (bad code, full room, etc.) ───────────────────
  socket.on('room:error', ({ message }) => {
    setErrorMessage(message);
    _setConnBadge('offline', '⚠ ' + message);
    setTimeout(() => _hideConnBadge(), 3000);
  });

  // ── Matched! Both players are in — start the game ────────────
  socket.on('room:matched', ({ code, symbol, hostName, guestName }) => {
    localSymbol = symbol;
    _activeRoomCode = code;

    playerNames.X = hostName;
    playerNames.O = guestName;

    const mode = gameMode === 'random' ? 'random' : 'room';
    addSystemMessage(`Matched! You are ${symbol}. ${playerNames.X} goes first.`);
    _initGame(mode);
  });

  // ── Waiting for quick match ───────────────────────────────────
  socket.on('quick:waiting', () => {
    showScreen('sMM');
  });

  socket.on('quick:cancelled', () => {
    showScreen('sLobby');
    document.getElementById('bnav-home')?.classList.add('active');
  });

  // ── Authoritative board state from server ────────────────────
  socket.on('room:state', ({ board, turn, scores, over, hostName, guestName, rematch }) => {
    boardState.cells       = board;
    boardState.currentTurn = turn;
    boardState.isOver      = over;
    boardState.scores      = scores;

    if (over) _stopTimer();

    // Sync board UI
    boardCells.forEach((cell, i) => {
      const val = board[i];
      if (val && !cell.classList.contains('taken')) {
        cell.classList.add('taken', val === 'X' ? 'xc' : 'oc');
        cell.textContent = val;
      }
    });

    _updateScoreDisplay();
    _setStatusText();
    _updateActivePlayerCards();

    // Show rematch button if round is over and we're in online mode
    const inOnline = gameMode === 'room' || gameMode === 'random';
    const rematchBtn = document.getElementById('btnRematch');
    if (rematchBtn) {
      rematchBtn.style.display = (over && inOnline) ? 'inline-block' : 'none';
    }
  });

  // ── Server says round ended ───────────────────────────────────
  socket.on('game:round-end', ({ type, winner, combo, board, scores }) => {
    boardState.cells  = board;
    boardState.scores = scores;
    boardState.isOver = true;
    _stopTimer();

    document.getElementById('btnPA').style.display = 'none';
    const rematchBtn = document.getElementById('btnRematch');
    if (rematchBtn) rematchBtn.style.display = 'inline-block';

    if (type === 'win') {
      combo.forEach(i => boardCells[i].classList.add('wc'));
      _drawWinLine(combo);
      const winnerName = winner === 'X' ? playerNames.X : playerNames.O;
      _setStatusEl(`${winnerName} Wins! 🎉`, 'sw');
      addSystemMessage(`${winnerName} wins this round!`);
      _updateSessionLbEntry(winnerName, 'win');
      sfxWin();
      _triggerWinEffects();
      _recordOutcome(winner);
    } else {
      _setStatusEl("It's a Draw!", 'sd');
      addSystemMessage("It's a draw!");
      _updateSessionLbEntry(playerNames.X, 'draw');
      _updateSessionLbEntry(playerNames.O, 'draw');
      sfxDraw();
      player.stats.draws++;
      player.stats.games++;
      player.stats.currentStreak = 0;
      awardCoins(5);
      awardXp(20);
      syncToGlobalLeaderboard();
    }

    _updateScoreDisplay();
    _updateSessionLeaderboard();
  });

  // ── Rematch ───────────────────────────────────────────────────
  socket.on('game:rematch-request', ({ from }) => {
    addSystemMessage(`${from === localSymbol ? 'You' : (from === 'X' ? playerNames.X : playerNames.O)} wants a rematch!`);
  });

  socket.on('game:rematch-start', ({ hostName, guestName, avatarX, avatarO }) => {
    playerNames.X = hostName;
    playerNames.O = guestName;

    boardState.cells       = Array(9).fill('');
    boardState.currentTurn = 'X';
    boardState.isOver      = false;

    boardCells.forEach(cell => { cell.className = 'cell'; cell.textContent = ''; });
    _hideWinLine();

    const rematchBtn = document.getElementById('btnRematch');
    if (rematchBtn) rematchBtn.style.display = 'none';
    document.getElementById('btnPA').style.display = 'none';

    _updatePlayerCards();
    _updateScoreDisplay();
    _resetTurnTimer();
    _setStatusText();
    _updateActivePlayerCards();
    addSystemMessage(`Rematch started! ${playerNames.X} goes first.`);
  });

  // ── Chat ──────────────────────────────────────────────────────
  socket.on('chat:message', ({ sender, text }) => {
    const cssClass = sender === player.name ? 'me' : 'them';
    _addChatMessage(sender, text, cssClass);
  });

  socket.on('chat:sys', (text) => {
    addSystemMessage(text);
  });

  // ── Emoji reactions ───────────────────────────────────────────
  socket.on('emoji:reaction', ({ sender, emoji }) => {
    // Float the emoji in the centre of the screen
    const floater = document.createElement('div');
    floater.className   = 'emoji-floater';
    floater.textContent = emoji;
    floater.style.left  = `${window.innerWidth / 2 - 15}px`;
    floater.style.top   = `${window.innerHeight / 2}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1600);
    addSystemMessage(`${sender}: ${emoji}`);
  });

  // ── Opponent left ─────────────────────────────────────────────
  socket.on('game:opponent-left', ({ message }) => {
    addSystemMessage(`⚠ ${message}`);
    boardState.isOver = true;
    _stopTimer();
    _setStatusEl('Opponent left!', 'sd');
    document.getElementById('btnPA').style.display = 'none';
    const rematchBtn = document.getElementById('btnRematch');
    if (rematchBtn) rematchBtn.style.display = 'none';
  });

  // Set up global error handlers for Socket.IO
  setupSocketErrorHandlers(socket);
}

// ── Connection badge helpers ────────────────────────────────────

function _setConnBadge(type, text) {
  const el = document.getElementById('conn-badge');
  if (!el) return;
  el.textContent = text;
  el.className   = `show ${type}`;
}

function _hideConnBadge() {
  const el = document.getElementById('conn-badge');
  if (el) el.classList.remove('show');
}

// ── Public: Private room ────────────────────────────────────────

function createPrivateRoom() {
  if (!player.name) { showXpNotification('Set a name first!'); return; }
  if (!socket?.connected) { showXpNotification('Not connected to server!'); return; }
  gameMode = 'room';
  socket.emit('room:create', { playerName: player.name, avatarId: player.avatar });
}

function joinPrivateRoom() {
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  if (!code || code.length < 4) { setErrorMessage('Enter a valid room code.'); return; }
  if (!socket?.connected) { setErrorMessage('Not connected to server!'); return; }
  gameMode = 'room';
  socket.emit('room:join', { code, playerName: player.name, avatarId: player.avatar });
}

function cancelWaiting() {
  if (socket?.connected) socket.emit('game:leave');
  _activeRoomCode = '';
  showScreen('sLobby');
  document.getElementById('bnav-home')?.classList.add('active');
}

async function copyRoomCode() {
  try {
    if (_activeRoomCode && navigator.clipboard) {
        await navigator.clipboard.writeText(_activeRoomCode);
    }
  } catch {
      showXpNotification("Copy failed");
      return;
  }
  const btn = document.querySelector('.copy-btn');
  if (!btn) return;
  btn.textContent = 'Copied!';
  setTimeout(() => (btn.textContent = 'Copy'), 1500);
}

// ── Public: Quick / random matchmaking ─────────────────────────

let _matchmakingTimeout = null;   // keep for leaveGame cancel

function _startMatchmaking() {
  if (!socket?.connected) { showXpNotification('Not connected to server!'); return; }
  gameMode = 'random';
  socket.emit('quick:join', { playerName: player.name, avatarId: player.avatar });
  showScreen('sMM');  // server will emit quick:waiting or room:matched
}

function cancelMatchmaking() {
  if (socket?.connected) socket.emit('quick:cancel');
  else showScreen('sLobby');
}

// ── Rematch ─────────────────────────────────────────────────────

function requestRematch() {
  if (socket?.connected && _activeRoomCode) {
    socket.emit('game:rematch');
    addSystemMessage('You requested a rematch…');
    document.getElementById('btnRematch').textContent = '🔄 Waiting…';
    const rematchBtn = document.getElementById('btnRematch');
  }
}

// ================================================================
// GAME INIT
// ================================================================

function _initGame(mode) {
  gameMode = mode;
  boardState.cells     = Array(9).fill('');
  boardState.currentTurn = 'X';
  boardState.isOver    = false;
  boardState.scores    = { X: 0, O: 0, D: 0 };

  sessionLeaderboard = [];

  _buildBoard();
  _updatePlayerCards();
  _updateScoreDisplay();

  document.getElementById('btnPA').style.display = 'none';

  const showChat = mode === 'room' || mode === 'random';
  document.getElementById('chatBox').style.display = showChat ? '' : 'none';

  const modeLabels = {
    '2p':     '2 PLAYER — OFFLINE',
    'ai':     `VS AI — ${aiDifficulty.toUpperCase()}`,
    'room': `PRIVATE ROOM — ${_activeRoomCode}`,
    'random': 'RANDOM MATCH',
  };
  document.getElementById('modePill').textContent = modeLabels[mode] || mode;

  showScreen('sGame');
  // Remove bottom-nav highlight while in-game
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));

  _updateSessionLeaderboard();
  addSystemMessage(`Game on! ${playerNames.X} goes first (X).`);
  _resetTurnTimer();
  _setStatusText();
  _updateActivePlayerCards();
}

// ================================================================
// BOARD
// ================================================================

function _buildBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  boardCells = [];

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className   = 'cell';
    cell.dataset.idx = i;
    cell.addEventListener('click', _onCellClick);
    boardEl.appendChild(cell);
    boardCells.push(cell);
  }
}

function _onCellClick() {
  const idx = Number(this.dataset.idx);
  if (boardState.isOver || boardState.cells[idx]) return;

  if (gameMode === '2p') { _placeMarker(idx, boardState.currentTurn); return; }
  if (gameMode === 'ai')  { if (boardState.currentTurn !== 'X') return; _placeMarker(idx, 'X'); return; }

  // Online modes — validate turn, send to server, optimistic local mark
  if (boardState.currentTurn !== localSymbol) return;
  if (!socket?.connected) return;
  socket.emit('game:move', { index: idx });
  boardState.cells[idx] = localSymbol;
  sfxPlace();
  const cell = boardCells[idx];
  cell.classList.add('taken', 'pop', localSymbol === 'X' ? 'xc' : 'oc');
  cell.textContent = localSymbol;
  setTimeout(() => cell.classList.remove('pop'), 350);
}

function _placeMarker(idx, symbol) {
  if (boardState.isOver || boardState.cells[idx]) return;

  boardState.cells[idx] = symbol;
  sfxPlace();

  const cell = boardCells[idx];
  cell.classList.add('taken', 'pop', symbol === 'X' ? 'xc' : 'oc');
  cell.textContent = symbol;
  setTimeout(() => cell.classList.remove('pop'), 350);

  const winCombo = _findWinningCombo();
  if (winCombo) {
    _endRound('win', winCombo, symbol);
    return;
  }

  if (boardState.cells.every(Boolean)) {
    _endRound('draw');
    return;
  }

  boardState.currentTurn = boardState.currentTurn === 'X' ? 'O' : 'X';
  _resetTurnTimer();
  _setStatusText();
  _updateActivePlayerCards();

  if (gameMode === 'ai' && boardState.currentTurn === 'O' && !boardState.isOver) {
    setTimeout(_runAiTurn, 900);
  }
}

// ================================================================
// AI TURN
// ================================================================


function _runAiTurn() {
  if (boardState.isOver || boardState.currentTurn !== 'O') return;
  const move = getAiMove(boardState.cells, aiDifficulty);

  if (move !== -1) {
    _placeMarker(move, boardState.currentTurn);
  }
}

function _runAssistantTurn() {

  if (boardState.isOver) return;

  const move = getAiMove(boardState.cells, aiDifficulty);

  if (move !== -1) {
    _placeMarker(move, boardState.currentTurn);
  }
}

// ================================================================
// WIN / DRAW DETECTION
// ================================================================

function _findWinningCombo() {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (boardState.cells[a] && boardState.cells[a] === boardState.cells[b] && boardState.cells[a] === boardState.cells[c]) {
      return [a, b, c];
    }
  }
  return null;
}

// ================================================================
// ROUND END
// ================================================================

function _endRound(type, combo = null, winnerSymbol = null) {
  boardState.isOver = true;
  _stopTimer();
  document.getElementById('btnPA').style.display = 'inline-block';

  if (type === 'win') {
    boardState.scores[winnerSymbol]++;
    _updateScoreDisplay();

    // Highlight winning cells
    combo.forEach(i => boardCells[i].classList.add('wc'));
    _drawWinLine(combo);

    const winnerName = winnerSymbol === 'X' ? playerNames.X : playerNames.O;
    _setStatusEl(`${winnerName} Wins! 🎉`, 'sw');
    addSystemMessage(`${winnerName} wins this round!`);
    _updateSessionLbEntry(winnerName, 'win');
    sfxWin();

    if (document.body.classList.contains("theme-royalgold")) {
      _triggerRoyalGoldWinEffects(combo);
    } else {
       _triggerWinEffects();
    }

_recordOutcome(winnerSymbol);

  } else {
    boardState.scores.D++;
    _setStatusEl("It's a Draw!", 'sd');
    addSystemMessage("It's a draw!");
    _updateSessionLbEntry(playerNames.X, 'draw');
    _updateSessionLbEntry(playerNames.O, 'draw');
    sfxDraw();

    player.stats.draws++;
    player.stats.currentStreak = 0;
    player.stats.games++;
    awardCoins(5);
    awardXp(20); // awardXp saves and checks achievements — keep it last
    syncToGlobalLeaderboard();
  }

  _updateSessionLeaderboard();

  // Auto-reset after a short pause so players can see the result
  roundResetTimeout = setTimeout(_resetRound, ROUND_RESET_DELAY);
}

/**
 * Record a win or loss for the local player after a round ends.
 * Handles all three game modes (2p, ai, online).
 */
function _recordOutcome(winnerSymbol) {
  const localWon = _didLocalPlayerWin(winnerSymbol);

  if (gameMode === '2p') {
    // In 2-player mode we don't track wins/losses — both are "the player"
    player.stats.games++;
    awardXp(localWon ? 50 : 10);
    awardCoins(localWon ? 20 : 5);
  } else if (localWon) {
    recordGameResult('win');
    if (aiDifficulty === 'hard' && gameMode === 'ai') recordHardAiBeat();
    awardXp(50);
    awardCoins(20);
  } else {
    recordGameResult('loss');
    sfxLose(); // Play loss sound effect
    awardXp(10); // consolation XP for participating
  }

  syncToGlobalLeaderboard();
}

function _didLocalPlayerWin(winnerSymbol) {
  if (gameMode === '2p') return winnerSymbol === 'X';
  return winnerSymbol === localSymbol;
}

function _triggerWinEffects() {
  spawnConfetti();
  const bwrap = document.getElementById('bwrap');
  const rect  = bwrap.getBoundingClientRect();
  spawnFireworks(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

// ================================================================
// ROUND RESET
// ================================================================

function _resetRound() {
  boardState.cells       = Array(9).fill('');
  boardState.isOver      = false;
  boardState.currentTurn = 'X';

  boardCells.forEach(cell => {
    cell.className   = 'cell';
    cell.textContent = '';
  });

  _hideWinLine();
  _resetTurnTimer();
  _setStatusText();
  _updateActivePlayerCards();
  document.getElementById('btnPA').style.display = 'none';
}

/** Public — called by "Play Again" button. */
function playAgain() {
  clearTimeout(roundResetTimeout);
  _resetRound();
}

/** Leave the current game and return to the lobby. */
function leaveGame() {
  if ((gameMode === 'room' || gameMode === 'random') && socket?.connected) {
    socket.emit('game:leave');
  }
  _activeRoomCode = '';
  const rematchBtn = document.getElementById('btnRematch');
  if (rematchBtn) rematchBtn.style.display = 'none';
  _stopTimer();
  clearTimeout(roundResetTimeout);
  clearTimeout(_matchmakingTimeout);
  navTo('sLobby');
}

// ================================================================
// TURN TIMER
// ================================================================

function _resetTurnTimer() {
  _stopTimer();
  timerSeconds = TURN_DURATION;
  _renderTimer();

  timerInterval = setInterval(() => {
    timerSeconds--;
    _renderTimer();
    if (timerSeconds <= 0) {
      _stopTimer();
      _handleTimerExpiry();
    }
  }, 1000);
}

function _stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

const arc    = document.getElementById('tarc');
const numEl  = document.getElementById('tnum');

const TIMER_RADIUS = 20;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function _renderTimer() {

  if (!arc || !numEl) return;

  const circumference = TIMER_CIRCUMFERENCE;
  const progress = timerSeconds / TURN_DURATION;

  arc.style.strokeDasharray = circumference;
  arc.style.strokeDashoffset = circumference * (1 - progress);

  numEl.textContent = timerSeconds;

  arc.className =
    'timer-arc' +
    (timerSeconds <= 5
      ? ' critical'
      : timerSeconds <= 8
      ? ' warning'
      : '');
}

function _handleTimerExpiry() {

  if (boardState.isOver) return;

  // Keep online games unchanged
  if (gameMode === 'room' || gameMode === 'random') {

      addSystemMessage("Time's up! Turn skipped.");

      boardState.currentTurn =
          boardState.currentTurn === 'X' ? 'O' : 'X';

      _resetTurnTimer();
      _setStatusText();
      _updateActivePlayerCards();
      return;
  }

  addSystemMessage("🤖 Assistant played.");

  // In AI mode the assistant is always O; in 2p mode the turn was already
  // flipped above, so play for the (now current) symbol.
  if (gameMode === 'ai') {
    _runAiMoveFor('O');
  } else {
    _runAssistantTurn();
  }

}

function _runAiMoveFor(symbol){

  const move = getAiMove(boardState.cells, aiDifficulty);

  if(move === -1) return;

  _placeMarker(move, symbol);

  // If the board is now full (draw), ensure turn flips and timer stops
  if (boardState.cells.every(Boolean)) {
    _stopTimer();
    return;
  }

  boardState.currentTurn = boardState.currentTurn === 'X' ? 'O' : 'X';
  _resetTurnTimer();
  _setStatusText();
  _updateActivePlayerCards();
}

// ================================================================
// STATUS TEXT & PLAYER CARDS
// ================================================================

function _setStatusText() {
  const sym  = boardState.currentTurn;
  const name = sym === 'X' ? playerNames.X : playerNames.O;

  let text;
  if (gameMode === '2p') {
    text = `${name}'s Turn (${sym})`;
  } else {
    const isOurTurn = sym === localSymbol;
    text = isOurTurn ? `Your Turn (${sym})` : `${name}'s Turn (${sym})`;
  }

  _setStatusEl(text, sym === 'X' ? 'sx' : 'so');
}

function _setStatusEl(text, cssClass) {
  const el = document.getElementById('gst');
  el.textContent = text;
  el.className   = cssClass;
}

function _updatePlayerCards() {
  const avatar = _findAvatarEmoji(player.avatar);
  document.getElementById('avX').textContent = localSymbol === 'X' ? avatar : '🤖';
  document.getElementById('avO').textContent = localSymbol === 'O' ? avatar : '🤖';
  document.getElementById('nX').textContent  = playerNames.X + (localSymbol === 'X' ? ' ★' : '');
  document.getElementById('nO').textContent  = playerNames.O + (localSymbol === 'O' ? ' ★' : '');
}

function _updateActivePlayerCards() {
  document.getElementById('cX').className = `player-card xc${boardState.currentTurn === 'X' ? ' ax' : ''}`;
  document.getElementById('cO').className = `player-card oc${boardState.currentTurn === 'O' ? ' ao' : ''}`;
}

function _updateScoreDisplay() {
  document.getElementById('scX').textContent = boardState.scores.X;
  document.getElementById('scO').textContent = boardState.scores.O;
}

// ================================================================
// WIN LINE
// ================================================================

/** Convert a flat board index to SVG coordinates (board is 296×296 units). */
function _indexToSvgCoords(idx) {
  const boardSize = 296;
  const gap       = 8;
  const cellSize  = (boardSize - gap * 2) / 3;
  return {
    x: (idx % 3) * (cellSize + gap) + cellSize / 2,
    y: Math.floor(idx / 3) * (cellSize + gap) + cellSize / 2,
  };
}


function _drawWinLine(combo) {

  if (document.body.classList.contains("theme-royalgold")) {
        _drawRoyalGoldLine(combo);
        return;
  }

  const start = _indexToSvgCoords(combo[0]);
  const end   = _indexToSvgCoords(combo[2]);

  const dx  = end.x - start.x;
  const dy  = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ext = 14; // extend past the cells slightly
  const ux  = dx / len;
  const uy  = dy / len;

  const x1 = start.x - ux * ext;
  const y1 = start.y - uy * ext;
  const x2 = end.x   + ux * ext;
  const y2 = end.y   + uy * ext;

  const lineLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const line    = document.getElementById('wline');

  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);

  // Animate from zero length to full
  line.style.strokeDasharray  = lineLen;
  line.style.strokeDashoffset = lineLen;
  line.style.transition = 'none';
  void line.getBoundingClientRect(); // force reflow
  line.style.transition       = 'stroke-dashoffset .45s ease-out';
  line.style.strokeDashoffset = '0';
}

function _drawRoyalGoldLine(combo) {

    // Draw the normal SVG line first
    const start = _indexToSvgCoords(combo[0]);
    const end   = _indexToSvgCoords(combo[2]);

    const dx  = end.x - start.x;
    const dy  = end.y - start.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;

    const ext = 14;
    const ux = dx / len;
    const uy = dy / len;

    const x1 = start.x - ux * ext;
    const y1 = start.y - uy * ext;
    const x2 = end.x + ux * ext;
    const y2 = end.y + uy * ext;

    const lineLen = Math.sqrt((x2-x1)**2 + (y2-y1)**2);

    const line = document.getElementById("wline");

    line.setAttribute("x1",x1);
    line.setAttribute("y1",y1);
    line.setAttribute("x2",x2);
    line.setAttribute("y2",y2);

    line.style.strokeDasharray=lineLen;
    line.style.strokeDashoffset=lineLen;
    line.style.transition="none";

    void line.getBoundingClientRect();

    line.style.transition="stroke-dashoffset .7s ease-out";
    line.style.strokeDashoffset="0";



    // ===== SCREEN COORDINATES =====

    const firstRect = boardCells[combo[0]].getBoundingClientRect();
    const lastRect  = boardCells[combo[2]].getBoundingClientRect();

    _animateRoyalGoldTrail(
        firstRect.left + firstRect.width/2,
        firstRect.top + firstRect.height/2,

        lastRect.left + lastRect.width/2,
        lastRect.top + lastRect.height/2
    );

}
function _animateRoyalGoldTrail(x1,y1,x2,y2){

    const duration=700;
    const start=performance.now();

    function frame(now){

        const t=Math.min((now-start)/duration,1);

        const x=x1+(x2-x1)*t;
        const y=y1+(y2-y1)*t;

        _spawnRoyalGoldTrail(x,y);

        if(t<1)
            requestAnimationFrame(frame);

    }

    requestAnimationFrame(frame);

}


function _createRoyalGoldSweep(x1,y1,x2,y2){

    const sweep=document.createElement("div");

    sweep.className="rg-line-sweep";

    document.body.appendChild(sweep);

    const duration=700;
    const start=performance.now();

    function animate(now){

        const t=Math.min((now-start)/duration,1);

        const x=x1+(x2-x1)*t;
        const y=y1+(y2-y1)*t;

        sweep.style.left=x+"px";
        sweep.style.top=y+"px";

        if(t<1){

            requestAnimationFrame(animate);

        }else{

            sweep.remove();

        }

    }

    requestAnimationFrame(animate);

}

function _hideWinLine() {
  const line = document.getElementById('wline');
  [['x1', -999], ['y1', -999], ['x2', -999], ['y2', -999]].forEach(([attr, val]) =>
    line.setAttribute(attr, val)
  );
}

// ================================================================
// CHAT
// ================================================================

function sendChat() {
  const input = document.getElementById('cin');
  const text = input.value.trim();
  if (text.length > 200) {
    showXpNotification("Message too long!");
    return;
  }
  if (!text) return;
  sfxClick();
  input.value = '';

  if ((gameMode === 'room' || gameMode === 'random') && socket?.connected) {
    // Route through server — broadcast back to both players including sender
    socket.emit('chat:message', { text });
  } else {
    // Offline modes (2p / AI) — local only
    _addChatMessage(player.name, text, 'me');
    if (Math.random() < 0.4) {
      const delay    = 700 + Math.random() * 1000;
      const response = OPPONENT_CHAT_RESPONSES[Math.floor(Math.random() * OPPONENT_CHAT_RESPONSES.length)];
      const opponent = localSymbol === 'X' ? playerNames.O : playerNames.X;
      setTimeout(() => _addChatMessage(opponent, response, 'them'), delay);
    }
  }
}

function addSystemMessage(text) {
  _addChatMessage(null, text, 'sys');
}

function _addChatMessage(sender, text, cssClass) {
  const box = document.getElementById('cmsgs');
  if (!box) return;

  const div = document.createElement('div');
  div.className = `msg ${cssClass}`;

  if (sender) {
    const name = document.createElement('span');
    name.className   = 'sn';
    name.textContent = `${sender}:`;
    div.appendChild(name);
  }

  div.appendChild(document.createTextNode(text));
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ================================================================
// EMOJI REACTIONS
// ================================================================

function sendEmojiReaction(emoji, triggerEvent) {
  sfxClick();

  if (Date.now() - lastEmojiTime < 1000) return;
  lastEmojiTime = Date.now();

  if ((gameMode === 'room' || gameMode === 'random') && socket?.connected) {
    // Send to server — server broadcasts to both players
    socket.emit('emoji:send', { emoji });
  } else {
    // Offline float (2p / AI)
    const floater = document.createElement('div');
    floater.className   = 'emoji-floater';
    floater.textContent = emoji;
    const btn  = triggerEvent.currentTarget;
    const rect = btn.getBoundingClientRect();
    floater.style.left = `${rect.left + rect.width / 2 - 15}px`;
    floater.style.top  = `${rect.top - 10}px`;
    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), 1600);
    addSystemMessage(`Reaction: ${emoji}`);
  }
}

// ================================================================
// IN-SESSION LEADERBOARD
// ================================================================

function _updateSessionLbEntry(name, result) {
  let entry = sessionLeaderboard.find(e => e.name === name);
  if (!entry) {
    entry = { name, wins: 0, draws: 0 };
    sessionLeaderboard.push(entry);
  }
  if (result === 'win')  entry.wins++;
  if (result === 'draw') entry.draws++;
  sessionLeaderboard.sort((a, b) => b.wins - a.wins || b.draws - a.draws);
}

function _updateSessionLeaderboard() {
  const container = document.getElementById('lbody');
  if (!container) return;
  container.innerHTML = '';

  sessionLeaderboard.slice(0, 5).forEach((entry, i) => {
    const row   = document.createElement('div');
    row.className = 'session-lb-row';
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

    row.innerHTML = `
      <span class="session-lb-rank">${medal}</span>
      <span class="session-lb-name">${entry.name}</span>
      <span class="session-lb-wins">${entry.wins}</span>
      <span class="session-lb-draws">${entry.draws}</span>
    `;
    container.appendChild(row);
  });
}

// ================================================================
// UTILITIES
// ================================================================

function _generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function _randomNpcName() {
  return NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
}

function _findAvatarEmoji(id) {
  return (AVATARS.find(a => a.id === id) ?? AVATARS[0]).emoji;
}
