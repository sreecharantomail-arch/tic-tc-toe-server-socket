# NexaClash Global Error Handling System

## Overview

A comprehensive error handling system that catches and gracefully handles all types of errors in the NexaClash application:
- Uncaught JavaScript errors
- Unhandled promise rejections
- Socket.IO connection errors
- API request failures
- Timeout errors

## Features

### 1. **Automatic Error Capturing**
- Catches all uncaught JavaScript errors
- Intercepts unhandled promise rejections
- Prevents app crashes with graceful fallbacks
- Non-intrusive error logging

### 2. **User-Friendly Notifications**
- Shows elegant error notifications instead of browser alerts
- Color-coded by severity (error, warning, info)
- Auto-dismiss or stay persistent
- Top-right toast notifications
- Close button for manual dismissal

### 3. **Detailed Error Logging**
- Timestamps for all errors
- Error stack traces
- Contextual information
- Error categorization by level
- Error history tracking (last 100 errors)

### 4. **Socket.IO Integration**
- Automatic connection error handling
- Disconnect reason tracking
- Server disconnection detection
- Reconnection notifications

### 5. **API Error Handling**
- Safe fetch wrapper (`safeFetch`)
- HTTP status code monitoring
- Network error detection
- Helpful error messages to users

## Usage Guide

### Automatic Features (No Code Required)

The error handler automatically catches:
```javascript
// Uncaught errors
throw new Error('Something broke!'); // Caught automatically

// Unhandled promise rejections
Promise.reject('Failed'); // Caught automatically

// Socket.IO errors
socket.on('connect_error', ...) // Caught automatically
```

### Manual Error Logging

Log errors manually with full context:
```javascript
// Simple error log
logError('User action failed', ERROR_LEVELS.ERROR);

// With error object
try {
  await someOperation();
} catch (err) {
  logError('Operation failed', ERROR_LEVELS.ERROR, err);
}

// With additional context
logError(
  'Failed to load data',
  ERROR_LEVELS.WARNING,
  error,
  { userId: player.id, action: 'loadProfile' }
);
```

### Error Severity Levels

```javascript
ERROR_LEVELS.INFO       // Information messages
ERROR_LEVELS.WARNING    // Non-critical issues
ERROR_LEVELS.ERROR      // Error conditions
ERROR_LEVELS.CRITICAL   // Critical failures
```

### Showing Error Notifications

Display user-friendly notifications:
```javascript
// Show error notification
showErrorNotification(
  'Operation Failed',           // Title
  'Could not save your data',   // Description
  'error',                       // Type: 'error' | 'warning' | 'info'
  5000                          // Duration in ms (0 = persistent)
);

// Examples
showErrorNotification('Connection Lost', 'Please check your internet', 'warning', 3000);
showErrorNotification('Success!', 'Data saved', 'info', 2000);
```

### Safe Fetch Wrapper

Use `safeFetch` instead of `fetch` for automatic error handling:
```javascript
// Automatic error handling
try {
  const response = await safeFetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await response.json();
} catch (err) {
  // Errors are already logged and notified to user
  console.log('Handle error if needed:', err);
}
```

### Socket.IO Error Handling

Automatically set up when socket initializes:
```javascript
// In socket.js - already integrated
setupSocketErrorHandlers(socket);

// Handles:
socket.on('connect_error', ...) // Connection errors
socket.on('disconnect', ...)     // Disconnection with reason
socket.on('error', ...)          // Socket errors
```

### Debug Functions

#### Get Error Statistics
```javascript
const stats = getErrorStats();
console.log(stats);
// {
//   total: 5,
//   byLevel: { error: 2, warning: 3 },
//   recent: [/* last 5 errors */]
// }
```

#### Export Error Log
```javascript
exportErrorLog();
// Prints formatted error history to console
```

#### View Formatted Log
```javascript
const log = getErrorLogFormatted();
console.log(log);
```

#### Clear Error History
```javascript
clearErrorLog();
```

## Files Modified

### New Files
- `public/js/errorHandler.js` - Main error handling module

### Modified Files
- `public/index.html` - Added errorHandler.js script (loads first)
- `public/js/socket.js` - Integrated Socket.IO error handlers
- `public/js/main.js` - Initialize error handling on app boot
- `public/js/auth.js` - Updated API calls to use safeFetch

## Integration Points

### 1. **Page Load**
```javascript
<!-- In index.html - loads BEFORE other scripts -->
<script src="js/errorHandler.js"></script>
```

### 2. **App Boot**
```javascript
// In main.js _bootApp()
function _bootApp() {
  initGlobalErrorHandling(); // Initialize first
  // ... rest of boot
}
```

### 3. **Socket.IO**
```javascript
// In socket.js initSocket()
function initSocket() {
  socket = io({...});
  // ... socket listeners
  setupSocketErrorHandlers(socket); // Register error handlers
}
```

### 4. **API Calls**
```javascript
// In auth.js and other API files
const response = await safeFetch('/api/endpoint', options);
```

## Error Notification UI

Notifications appear in the top-right corner:
- **Error** (Red): Critical issues, HTTP errors, failures
- **Warning** (Orange): Connection issues, retries
- **Info** (Blue): Informational messages
- **Success** (Green): Positive confirmations

### Notification Features
- Auto-dismiss after specified duration
- Manual close button
- Smooth slide-in animation
- Persistent container for multiple notifications
- Non-intrusive toast style

## Error Log Structure

Each error is logged with:
```javascript
{
  timestamp: "2026-07-09T14:23:15.123Z",
  message: "Human-readable error message",
  level: "error",
  error: {
    name: "TypeError",
    message: "Cannot read property",
    stack: "Error stack trace..."
  },
  context: {
    // Additional debugging information
  }
}
```

## Best Practices

### 1. **Always Use Error Levels Appropriately**
```javascript
// Bad
logError('User clicked button', ERROR_LEVELS.ERROR);

// Good
logError('User click handler failed', ERROR_LEVELS.ERROR, error);
```

### 2. **Provide Context for Debugging**
```javascript
// Better error handling
logError(
  'Failed to join room',
  ERROR_LEVELS.WARNING,
  error,
  { roomCode: code, playerId: socket.id }
);
```

### 3. **Use safeFetch for API Calls**
```javascript
// Automatic error handling
const response = await safeFetch(url, options);
// Don't use: await fetch(url, options);
```

### 4. **Don't Use alert() Anymore**
```javascript
// Old way - breaks with error handler
alert('Something failed');

// New way - consistent with system
showErrorNotification('Failed', 'Description', 'error', 3000);
```

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Error Events**: Supported in all modern browsers
- **Promise Rejection**: Requires ES6+ (modern browsers only)
- **Web Audio**: For audio feedback (fallback graceful)

## Performance Considerations

- **Error Log Size**: Limited to last 100 errors (auto-cleanup)
- **DOM Elements**: Reuses container for notifications
- **Memory**: Minimal overhead, automatic cleanup
- **CPU**: Negligible impact, errors logged asynchronously

## Debugging Tips

### 1. **Check Error Log in Console**
```javascript
exportErrorLog(); // View all errors
getErrorStats();  // Get statistics
```

### 2. **Monitor in Real-Time**
Open browser DevTools Console:
- Errors logged with `[ERROR]` prefix
- Warnings logged with `[WARNING]` prefix
- Info messages logged with `[INFO]` prefix

### 3. **Test Error Scenarios**
```javascript
// Test window error
throw new Error('Test error');

// Test promise rejection
Promise.reject('Test rejection');

// Test network error
safeFetch('/non-existent-api');
```

## Future Enhancements

Possible improvements:
- Error reporting to server/analytics
- Persistent error log to localStorage
- Error replay functionality
- Sentry integration
- Custom error recovery strategies
- User feedback collection
- Error categorization and filtering

## Support & Troubleshooting

### Errors Not Being Caught?
1. Ensure errorHandler.js loads first
2. Check `initGlobalErrorHandling()` is called
3. Verify no try-catch blocks are silencing errors

### Notifications Not Showing?
1. Check browser console for errors
2. Verify DOM container created
3. Check z-index CSS conflicts

### Performance Issues?
1. Check error log size: `getErrorStats()`
2. Clear old errors: `clearErrorLog()`
3. Monitor console for spam

---

## Summary

The NexaClash error handling system provides:
✅ Automatic error capture and logging
✅ User-friendly error notifications
✅ Detailed debugging information
✅ Socket.IO integration
✅ Safe API call wrapper
✅ Error history and statistics
✅ Production-ready robustness
