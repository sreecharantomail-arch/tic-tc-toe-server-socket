/**
 * errorHandler.js
 * Global error handling system for NexaClash
 *
 * Catches:
 *   • Uncaught JavaScript errors
 *   • Unhandled promise rejections
 *   • Socket.IO connection errors
 *   • API request failures
 *   • Timeout errors
 *
 * Shows user-friendly notifications and logs details to console
 */

// Error severity levels
const ERROR_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// Track error history to avoid spam
let _errorLog = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Initialize global error handling.
 * Should be called as early as possible in app initialization.
 */
function initGlobalErrorHandling() {
  // Handle uncaught JavaScript errors
  window.addEventListener('error', handleWindowError);

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Handle beforeunload errors (graceful shutdown)
  window.addEventListener('beforeunload', handleBeforeUnload);

  console.log('[errorHandler] Global error handling initialized');
}

/**
 * Main error logging function — logs with context and timestamp.
 * @param {string} message - Human-readable error message
 * @param {string} level - ERROR_LEVELS property
 * @param {Error|Object} error - The error object (optional)
 * @param {Object} context - Additional context (optional)
 */
function logError(message, level = ERROR_LEVELS.ERROR, error = null, context = {}) {
  const timestamp = new Date().toISOString();
  const errorEntry = {
    timestamp,
    message,
    level,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : null,
    context,
  };

  _errorLog.push(errorEntry);

  // Keep log size manageable
  if (_errorLog.length > MAX_ERROR_LOG_SIZE) {
    _errorLog.shift();
  }

  // Console output with formatting
  const logFn = console[level === ERROR_LEVELS.CRITICAL ? 'error' : level];
  const prefix = `[${level.toUpperCase()}] ${timestamp}`;
  logFn(`${prefix} ${message}`, error || context);
}

/**
 * Handle uncaught window errors.
 * @param {ErrorEvent} event
 */
function handleWindowError(event) {
  const { message, filename, lineno, colno, error } = event;

  logError(
    `JavaScript Error: ${message}`,
    ERROR_LEVELS.ERROR,
    error,
    { filename, line: lineno, column: colno }
  );

  // Show user-friendly notification
  showErrorNotification(
    'Oops! Something went wrong',
    'A JavaScript error occurred. The game may be unstable. Try refreshing.',
    'error'
  );

  // Prevent default error handling (browser popup)
  event.preventDefault();
}

/**
 * Handle unhandled promise rejections.
 * @param {PromiseRejectionEvent} event
 */
function handleUnhandledRejection(event) {
  const reason = event.reason;

  const errorMessage = reason instanceof Error
    ? reason.message
    : (typeof reason === 'string' ? reason : JSON.stringify(reason));

  logError(
    `Unhandled Promise Rejection: ${errorMessage}`,
    ERROR_LEVELS.ERROR,
    reason instanceof Error ? reason : null,
    { promiseReason: reason }
  );

  // Show user-friendly notification for critical promise rejections
  if (reason instanceof Error) {
    showErrorNotification(
      'Connection Issue',
      'A connection or data error occurred. Please try again.',
      'warning'
    );
  }

  // Prevent default unhandled rejection behavior
  event.preventDefault();
}

/**
 * Handle before unload (graceful shutdown).
 * @param {BeforeUnloadEvent} event
 */
function handleBeforeUnload(event) {
  // Clean up and log
  if (_errorLog.length > 0) {
    console.log('[errorHandler] Error log on unload:', _errorLog);
  }
}

/**
 * Show a user-friendly error notification.
 * @param {string} title - Main error message
 * @param {string} description - Detailed explanation
 * @param {string} type - 'error' | 'warning' | 'info'
 * @param {number} duration - ms to show (0 = persistent)
 */
function showErrorNotification(title, description, type = 'error', duration = 5000) {
  // Find or create error notification container
  let container = document.getElementById('error-notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'error-notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  // Create notification element
  const notification = document.createElement('div');
  const typeClass = `error-notif-${type}`;
  notification.className = `error-notification ${typeClass}`;
  notification.style.cssText = `
    background: ${getNotificationColor(type)};
    border-left: 4px solid ${getNotificationBorderColor(type)};
    color: #fff;
    padding: 16px;
    margin-bottom: 12px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    font-family: inherit;
    animation: slideIn 0.3s ease-out;
  `;

  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 4px;
  `;

  const descEl = document.createElement('div');
  descEl.textContent = description;
  descEl.style.cssText = `
    font-size: 0.85rem;
    opacity: 0.95;
    line-height: 1.4;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = () => notification.remove();

  notification.style.position = 'relative';
  notification.appendChild(titleEl);
  notification.appendChild(descEl);
  notification.appendChild(closeBtn);

  container.appendChild(notification);

  // Add animation keyframes
  if (!document.getElementById('error-notif-styles')) {
    const style = document.createElement('style');
    style.id = 'error-notif-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(420px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(420px);
        }
      }
      .error-notification.fade-out {
        animation: fadeOut 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  return notification;
}

/**
 * Get color for notification based on type.
 */
function getNotificationColor(type) {
  const colors = {
    error: '#d32f2f',
    warning: '#f57c00',
    info: '#1976d2',
    success: '#388e3c',
  };
  return colors[type] || colors.error;
}

/**
 * Get border color for notification based on type.
 */
function getNotificationBorderColor(type) {
  const colors = {
    error: '#ff6b6b',
    warning: '#ffb74d',
    info: '#64b5f6',
    success: '#81c784',
  };
  return colors[type] || colors.error;
}

/**
 * Handle Socket.IO connection errors.
 * Call this after socket is initialized.
 * @param {Socket} socket - Socket.io socket instance
 */
function setupSocketErrorHandlers(socket) {
  if (!socket) return;

  socket.on('connect_error', (error) => {
    logError(
      `Socket.IO Connection Error: ${error.message}`,
      ERROR_LEVELS.WARNING,
      error,
      { code: error.code }
    );

    showErrorNotification(
      'Connection Lost',
      'Unable to connect to the server. Reconnecting…',
      'warning',
      3000
    );
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      logError(
        'Socket.IO: Server disconnected client',
        ERROR_LEVELS.WARNING,
        null,
        { reason }
      );
      showErrorNotification(
        'Server Disconnect',
        'The server has disconnected you. Please refresh.',
        'error'
      );
    } else if (reason === 'io client disconnect') {
      logError('Socket.IO: Client disconnected', ERROR_LEVELS.INFO, null, { reason });
    } else {
      logError(
        `Socket.IO Disconnect: ${reason}`,
        ERROR_LEVELS.WARNING,
        null,
        { reason }
      );
      showErrorNotification(
        'Connection Issues',
        'Your connection was interrupted. Reconnecting…',
        'warning',
        2000
      );
    }
  });

  socket.on('error', (error) => {
    logError(
      `Socket.IO Error: ${error}`,
      ERROR_LEVELS.ERROR,
      null,
      { socketError: error }
    );

    showErrorNotification(
      'Network Error',
      'A network error occurred. Please try again.',
      'error',
      4000
    );
  });

  console.log('[errorHandler] Socket.IO error handlers installed');
}

/**
 * Wrap fetch calls to catch API errors.
 * @param {string} url - API endpoint
 * @param {Object} options - fetch options
 * @returns {Promise}
 */
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || `HTTP ${response.status}`;

      logError(
        `API Error (${response.status}): ${url}`,
        ERROR_LEVELS.WARNING,
        null,
        { status: response.status, url, error: errorMsg }
      );

      showErrorNotification(
        'API Request Failed',
        `Failed to contact server: ${errorMsg}`,
        'warning',
        3000
      );

      throw new Error(`HTTP Error: ${response.status} - ${errorMsg}`);
    }

    return response;
  } catch (error) {
    logError(
      `Fetch Error: ${error.message}`,
      ERROR_LEVELS.ERROR,
      error,
      { url, options: { method: options.method || 'GET' } }
    );

    showErrorNotification(
      'Network Error',
      'Failed to reach the server. Check your connection.',
      'error',
      3000
    );

    throw error;
  }
}

/**
 * Get formatted error log for debugging.
 * @returns {string} Formatted error log
 */
function getErrorLogFormatted() {
  if (_errorLog.length === 0) return 'No errors logged.';

  return _errorLog.map((entry) => {
    const errorStr = entry.error
      ? `${entry.error.name}: ${entry.error.message}`
      : 'N/A';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}\nError: ${errorStr}\nContext: ${JSON.stringify(entry.context, null, 2)}`;
  }).join('\n---\n');
}

/**
 * Export error log to console (useful for debugging).
 */
function exportErrorLog() {
  console.group('📋 NexaClash Error Log');
  console.log(getErrorLogFormatted());
  console.groupEnd();
}

/**
 * Clear error log.
 */
function clearErrorLog() {
  _errorLog = [];
  console.log('[errorHandler] Error log cleared');
}

/**
 * Get error statistics.
 */
function getErrorStats() {
  const stats = {
    total: _errorLog.length,
    byLevel: {},
    recent: _errorLog.slice(-5),
  };

  _errorLog.forEach((entry) => {
    stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
  });

  return stats;
}
