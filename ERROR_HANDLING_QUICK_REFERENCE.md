# NexaClash Error Handling - Quick Reference

## Core Functions

### Error Logging
```javascript
logError(message, level, error?, context?)
```
- `message`: Human-readable description
- `level`: ERROR_LEVELS.INFO | WARNING | ERROR | CRITICAL
- `error`: (Optional) Error object
- `context`: (Optional) Additional debugging info

### Show Notification
```javascript
showErrorNotification(title, description, type?, duration?)
```
- `title`: Main message
- `description`: Detailed explanation
- `type`: 'error' | 'warning' | 'info' | 'success'
- `duration`: ms to auto-dismiss (0 = persistent)

### Safe API Calls
```javascript
await safeFetch(url, options)
```
- Automatic error handling
- Returns Response object
- Throws on HTTP errors
- Shows user notifications

### Socket.IO Errors
```javascript
setupSocketErrorHandlers(socket)
```
- Call in `initSocket()`
- Automatic error tracking
- Handles disconnects

## Common Patterns

### Try-Catch with Logging
```javascript
try {
  result = await operation();
} catch (err) {
  logError('Operation failed', ERROR_LEVELS.ERROR, err, { context });
  showErrorNotification('Failed', 'Please try again', 'error');
}
```

### API Call
```javascript
try {
  const res = await safeFetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const data = await res.json();
} catch (err) {
  // Already logged and notified by safeFetch
}
```

### Validation
```javascript
if (!isValid(input)) {
  logError('Invalid input', ERROR_LEVELS.WARNING);
  showErrorNotification('Invalid', 'Please check your input', 'warning');
  return;
}
```

### Fallback Pattern
```javascript
try {
  return await primarySource();
} catch (err) {
  logError('Primary failed', ERROR_LEVELS.WARNING, err);
  try {
    return await fallbackSource();
  } catch (fallbackErr) {
    logError('Fallback failed', ERROR_LEVELS.ERROR, fallbackErr);
    return cachedData();
  }
}
```

## Error Levels

| Level | When to Use | Example |
|-------|------------|---------|
| INFO | Informational | User action logged |
| WARNING | Recoverable issues | Retry, fallback available |
| ERROR | Error conditions | Operation failed but app ok |
| CRITICAL | Critical failures | App functionality broken |

## Notification Types

| Type | Color | Use |
|------|-------|-----|
| error | Red | Operations failed |
| warning | Orange | Caution, retrying |
| info | Blue | Information |
| success | Green | Success |

## Debug Commands (Console)

```javascript
// View error statistics
getErrorStats()

// Export full error log
exportErrorLog()

// Get formatted log
getErrorLogFormatted()

// Clear error history
clearErrorLog()
```

## Files

| File | Purpose |
|------|---------|
| errorHandler.js | Main module |
| index.html | Script loading |
| main.js | Initialization |
| socket.js | Socket.IO errors |
| auth.js | API error handling |

## Do's & Don'ts

### ✅ DO:
```javascript
logError(msg, level, error, context)
showErrorNotification(title, desc, type, ms)
await safeFetch(url, opts)
setupSocketErrorHandlers(socket)
```

### ❌ DON'T:
```javascript
alert('Error')                    // Use notification
throw Error('silent')             // Log it
await fetch(url)                  // Use safeFetch
console.error without logging     // Use logError
```

## Initialization Checklist

- [x] errorHandler.js loads first
- [x] initGlobalErrorHandling() called
- [x] setupSocketErrorHandlers() in socket.js
- [x] safeFetch used for APIs
- [x] Error logging on failures
- [x] User notifications shown

## Common Scenarios

### Login Failed
```javascript
showErrorNotification(
  'Login Failed',
  'Invalid credentials. Please try again.',
  'warning',
  3000
);
```

### Connection Lost
```javascript
logError('Connection lost', ERROR_LEVELS.WARNING);
showErrorNotification(
  'Connection Lost',
  'Reconnecting...',
  'warning'
);
```

### Server Error
```javascript
logError('Server error', ERROR_LEVELS.ERROR, error, { status: 500 });
showErrorNotification(
  'Server Error',
  'Please try again later.',
  'error'
);
```

### Network Timeout
```javascript
logError('Request timeout', ERROR_LEVELS.WARNING, error);
showErrorNotification(
  'Request Timeout',
  'Check your connection and try again.',
  'warning',
  3000
);
```

## Performance

- Memory: ~50KB
- Per-error overhead: ~1ms
- Log size limit: 100 entries
- DOM overhead: 1 container (reused)

## Browser Support

✅ All modern browsers (Chrome, Firefox, Safari, Edge)

---

**For detailed documentation, see:**
- ERROR_HANDLING_GUIDE.md
- ERROR_HANDLING_EXAMPLES.md
