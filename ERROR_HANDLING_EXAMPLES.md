# Error Handling Implementation Examples

This guide shows practical examples of how to use the global error handling system in NexaClash.

## Table of Contents
1. [Basic Error Handling](#basic-error-handling)
2. [API Error Handling](#api-error-handling)
3. [Socket.IO Error Handling](#socketio-error-handling)
4. [Game Event Error Handling](#game-event-error-handling)
5. [Storage Error Handling](#storage-error-handling)
6. [Audio/Media Error Handling](#audiomedia-error-handling)

---

## Basic Error Handling

### Example 1: Try-Catch with Error Logging

```javascript
// Safe operation with logging
async function safeUserAction() {
  try {
    // Perform operation
    const result = await performUserAction();
    return result;
  } catch (error) {
    // Log with context
    logError(
      'User action failed',
      ERROR_LEVELS.ERROR,
      error,
      { action: 'performUserAction', user: player.name }
    );
    
    // Show user notification
    showErrorNotification(
      'Action Failed',
      'Your action could not be completed. Please try again.',
      'error',
      3000
    );
  }
}
```

### Example 2: Simple Manual Error Logging

```javascript
// Log an error without throwing
function validateInput(input) {
  if (!input || input.trim().length === 0) {
    logError('Invalid input provided', ERROR_LEVELS.WARNING, null, { input });
    showErrorNotification('Invalid Input', 'Please provide valid input.', 'warning', 2000);
    return false;
  }
  return true;
}
```

### Example 3: Error Recovery

```javascript
// Attempt operation with fallback
async function loadDataWithFallback() {
  try {
    // Try primary source
    return await fetch('/api/data').then(r => r.json());
  } catch (error) {
    logError('Primary data load failed', ERROR_LEVELS.WARNING, error);
    
    try {
      // Try fallback source
      return await safeFetch('/api/data-backup').then(r => r.json());
    } catch (fallbackError) {
      logError('Fallback data load failed', ERROR_LEVELS.ERROR, fallbackError);
      showErrorNotification(
        'Data Unavailable',
        'Could not load data. Using cached version.',
        'error'
      );
      return getCachedData(); // Use cache
    }
  }
}
```

---

## API Error Handling

### Example 1: POST Request with SafeFetch

```javascript
// From auth.js - Login with error handling
async function loginPlayer() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showErrorNotification('Missing Fields', 'Please enter email and password.', 'warning');
    return;
  }

  try {
    // safeFetch automatically handles network errors
    const response = await safeFetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!data.success) {
      showErrorNotification(
        'Login Failed',
        data.message || 'Invalid credentials',
        'warning',
        3000
      );
      return;
    }

    // Success - continue with login
    localStorage.setItem("nexa_token", data.token);
    showGame();

  } catch (err) {
    // safeFetch already showed error notification
    // Additional logging for debugging
    logError('Login API error', ERROR_LEVELS.ERROR, err, { email });
  }
}
```

### Example 2: GET Request with Error Handling

```javascript
// Fetch player profile
async function loadPlayerProfile(userId) {
  try {
    const response = await safeFetch(`${API_BASE_URL}/profile/${userId}`);
    const profile = await response.json();
    
    return profile;
  } catch (error) {
    // Error already logged by safeFetch
    logError('Profile load failed', ERROR_LEVELS.WARNING, error, { userId });
    
    // Show user-friendly message
    showErrorNotification(
      'Profile Not Available',
      'Could not load player profile. Please try again later.',
      'warning',
      4000
    );
    
    return null; // Return fallback
  }
}
```

### Example 3: Retry Logic with Error Handling

```javascript
// Retry API call with exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await safeFetch(url, options);
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        logError(
          `API request failed after ${maxRetries} attempts`,
          ERROR_LEVELS.ERROR,
          error,
          { url, attempts: attempt }
        );
        throw error; // Final failure
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      logError(
        `API request attempt ${attempt} failed, retrying in ${delay}ms`,
        ERROR_LEVELS.INFO,
        null,
        { url, attempt, nextRetryMs: delay }
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Socket.IO Error Handling

### Example 1: Custom Socket Event Error Handler

```javascript
// Add custom error handler for specific socket events
socket.on('game:move', (data) => {
  try {
    // Process move
    processGameMove(data);
  } catch (error) {
    logError(
      'Game move processing failed',
      ERROR_LEVELS.ERROR,
      error,
      { moveData: data, playerId: socket.id }
    );
    
    // Emit error back to server
    socket.emit('game:error', {
      message: 'Failed to process move',
      originalEvent: 'game:move'
    });
  }
});
```

### Example 2: Connection Monitoring

```javascript
// Monitor socket connection health
function monitorSocketHealth() {
  const healthCheckInterval = setInterval(() => {
    if (!socket?.connected) {
      logError(
        'Socket connection lost unexpectedly',
        ERROR_LEVELS.WARNING,
        null,
        { lastConnected: new Date().toISOString() }
      );
    }
  }, 30000); // Check every 30 seconds
  
  return healthCheckInterval;
}
```

### Example 3: Handle Room Errors

```javascript
// From socket.js - Handle room join errors
socket.on('room:error', ({ message, code }) => {
  logError(
    `Room error: ${message}`,
    ERROR_LEVELS.WARNING,
    null,
    { roomCode: _activeRoomCode, errorCode: code }
  );
  
  // Show appropriate user message
  const messages = {
    'ROOM_NOT_FOUND': 'Room code not found. Please check and try again.',
    'ROOM_FULL': 'Room is full. Please try another room.',
    'ALREADY_JOINED': 'You are already in this room.',
  };
  
  showErrorNotification(
    'Room Error',
    messages[code] || message,
    'warning',
    3000
  );
  
  // Return to lobby
  navTo('sLobby');
});
```

---

## Game Event Error Handling

### Example 1: Move Validation Error

```javascript
// From game.js - Handle invalid move
function handleBoardClick(cellIndex) {
  try {
    // Validate move
    if (!isValidMove(cellIndex)) {
      throw new Error(`Invalid move: cell ${cellIndex} already occupied`);
    }
    
    // Make move
    makeMove(cellIndex);
    
  } catch (error) {
    logError(
      'Board move failed',
      ERROR_LEVELS.WARNING,
      error,
      { cellIndex, currentTurn: boardState.currentTurn }
    );
    
    showErrorNotification(
      'Invalid Move',
      'That cell is already taken. Try another.',
      'warning',
      2000
    );
  }
}
```

### Example 2: AI Move Generation Error

```javascript
// Get AI move with error handling
function getAIMoveWithErrorHandling() {
  try {
    const move = getAiMove(boardState.cells, aiDifficulty);
    
    if (move < 0 || move > 8) {
      throw new Error(`Invalid AI move: ${move}`);
    }
    
    return move;
    
  } catch (error) {
    logError(
      'AI move generation failed',
      ERROR_LEVELS.ERROR,
      error,
      { difficulty: aiDifficulty, boardState: boardState.cells }
    );
    
    // Fallback to random move
    const validMoves = boardState.cells
      .map((cell, i) => cell === '' ? i : null)
      .filter(i => i !== null);
    
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
}
```

### Example 3: Game State Error

```javascript
// Validate game state
function validateGameState() {
  try {
    if (!boardState || boardState.cells.length !== 9) {
      throw new Error('Invalid board state');
    }
    
    if (!['X', 'O'].includes(boardState.currentTurn)) {
      throw new Error(`Invalid turn: ${boardState.currentTurn}`);
    }
    
    const xCount = boardState.cells.filter(c => c === 'X').length;
    const oCount = boardState.cells.filter(c => c === 'O').length;
    
    if (Math.abs(xCount - oCount) > 1) {
      throw new Error('Invalid move count');
    }
    
  } catch (error) {
    logError(
      'Game state validation failed',
      ERROR_LEVELS.ERROR,
      error,
      { boardState }
    );
    
    // Reset game
    resetBoardState();
    showErrorNotification(
      'Game State Error',
      'Game state was corrupted. Board reset.',
      'error'
    );
  }
}
```

---

## Storage Error Handling

### Example 1: LocalStorage with Error Handling

```javascript
// Save with error logging
function saveGameDataWithErrorHandling() {
  try {
    const data = JSON.stringify(player);
    localStorage.setItem('nc_player', data);
    
    logError('Game data saved successfully', ERROR_LEVELS.INFO);
    
  } catch (error) {
    logError(
      'Failed to save game data',
      ERROR_LEVELS.ERROR,
      error,
      { reason: error.name, data: player }
    );
    
    showErrorNotification(
      'Save Failed',
      'Could not save your progress. Storage may be full.',
      'warning',
      3000
    );
  }
}
```

### Example 2: Load with Validation

```javascript
// Load with validation
function loadGameDataSafely() {
  try {
    const raw = localStorage.getItem('nc_player');
    if (!raw) {
      logError('No saved data found', ERROR_LEVELS.INFO);
      return DEFAULT_PLAYER;
    }
    
    const saved = JSON.parse(raw);
    
    // Validate structure
    if (!saved.name || !saved.stats) {
      throw new Error('Invalid save structure');
    }
    
    return saved;
    
  } catch (error) {
    logError(
      'Failed to load saved data',
      ERROR_LEVELS.WARNING,
      error,
      { action: 'loadGameData' }
    );
    
    showErrorNotification(
      'Save Corrupted',
      'Your save was corrupted. Starting fresh.',
      'warning'
    );
    
    return DEFAULT_PLAYER;
  }
}
```

---

## Audio/Media Error Handling

### Example 1: Audio Context Error

```javascript
// Improved Web Audio handling
function getAudioContextSafely() {
  try {
    const ctx = _getContext();
    
    if (!ctx) {
      throw new Error('Web Audio API not supported');
    }
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    return ctx;
    
  } catch (error) {
    logError(
      'Audio context error',
      ERROR_LEVELS.WARNING,
      error,
      { supportedFeature: 'WebAudio' }
    );
    
    // Audio will be silently disabled
    player.settings.sfx = false;
    return null;
  }
}
```

### Example 2: Sound Effect with Error Boundary

```javascript
// Play sound with error protection
function playSoundSafe(soundFunction, soundName) {
  try {
    if (!player.settings.sfx) return;
    
    soundFunction();
    
  } catch (error) {
    logError(
      `Failed to play sound: ${soundName}`,
      ERROR_LEVELS.INFO,
      error,
      { soundName }
    );
    
    // Silently fail - non-critical feature
  }
}

// Usage
playSoundSafe(() => sfxWin(), 'win');
playSoundSafe(() => sfxLose(), 'lose');
```

---

## Best Practices Summary

### ✅ DO:
```javascript
// Provide context
logError('User action failed', ERROR_LEVELS.ERROR, error, { userId, action });

// Use appropriate levels
if (criticalFailure) logError(msg, ERROR_LEVELS.CRITICAL);
if (recoverable) logError(msg, ERROR_LEVELS.WARNING);

// Use safeFetch for API
const res = await safeFetch(url, options);

// Chain error handlers
try { attempt1(); } catch { logError(...); try { attempt2(); } catch { fallback(); } }

// Provide user feedback
showErrorNotification('Title', 'Description', 'error', duration);
```

### ❌ DON'T:
```javascript
// Silent failures
try { operation(); } catch { }

// Using alert()
alert('Error occurred');

// Vague error messages
logError('Error', ERROR_LEVELS.ERROR);

// Direct fetch
await fetch(url); // Use safeFetch instead

// Not logging user-facing operations
user.performAction(); // Log this!
```

---

## Testing Scenarios

### Test 1: Trigger Window Error
```javascript
// In browser console
throw new Error('Test window error');
// Should see notification and log
```

### Test 2: Trigger Promise Rejection
```javascript
// In browser console
Promise.reject('Test rejection');
// Should see notification and log
```

### Test 3: Test API Error
```javascript
// In browser console
safeFetch('/api/nonexistent')
  .catch(err => console.log('Caught:', err));
// Should see notification and error log
```

### Test 4: View Error Statistics
```javascript
// In browser console
getErrorStats();
exportErrorLog();
// Check console for formatted output
```

---

## Integration Checklist

- [ ] errorHandler.js loaded first in HTML
- [ ] `initGlobalErrorHandling()` called in main.js
- [ ] `setupSocketErrorHandlers(socket)` in socket.js
- [ ] `safeFetch` used for all API calls
- [ ] Error logging added to critical paths
- [ ] User notifications shown for failures
- [ ] Error testing completed
- [ ] Error log monitoring working

---

This guide provides the foundation for comprehensive error handling throughout NexaClash!
