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

---

## Error Levels

| Level | When to Use | Example |
|-------|------------|---------|
| INFO | Informational | User action logged |
| WARNING | Recoverable issues | Retry, fallback available |
| ERROR | Error conditions | Operation failed but app ok |
| CRITICAL | Critical failures | App functionality broken |

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
