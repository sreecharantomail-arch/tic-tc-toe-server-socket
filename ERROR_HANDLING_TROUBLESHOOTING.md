# Error Handling System - Troubleshooting Guide

## Common Issues & Solutions

---

## Issue 1: Errors Not Being Caught

### Symptoms
- JavaScript errors appear in console
- No notification shown
- App might crash

### Possible Causes

**1. errorHandler.js Not Loading**
```html
<!-- ❌ WRONG - Using defer -->
<script defer src="js/errorHandler.js"></script>

<!-- ✅ CORRECT - No defer -->
<script src="js/errorHandler.js"></script>
```

**Solution:** Ensure errorHandler.js loads FIRST without `defer` attribute.

**2. initGlobalErrorHandling() Not Called**
```javascript
// ❌ WRONG - Missing initialization
function _bootApp() {
  loadGameData();
  // ... rest of code
}

// ✅ CORRECT
function _bootApp() {
  initGlobalErrorHandling(); // Call first!
  loadGameData();
  // ... rest of code
}
```

**Solution:** Call `initGlobalErrorHandling()` in `_bootApp()` function.

**3. Try-Catch Silencing Errors**
```javascript
// ❌ WRONG - Silent failure
try {
  operation();
} catch (err) {
  // Silent - no logging!
}

// ✅ CORRECT
try {
  operation();
} catch (err) {
  logError('Operation failed', ERROR_LEVELS.ERROR, err);
  throw err; // Re-throw if needed
}
```

**Solution:** Log errors in catch blocks.

### Diagnostic Steps

1. **Check console for initialization message:**
   ```
   [errorHandler] Global error handling initialized
   ```

2. **Verify errorHandler.js loaded:**
   - Open DevTools → Network tab
   - Look for `errorHandler.js` with status 200

3. **Test error catching:**
   ```javascript
   // In console
   throw new Error('Test error');
   ```
   - Should see notification
   - Should see console log with `[ERROR]` prefix

---

## Issue 2: Notifications Not Displaying

### Symptoms
- Error occurs but no notification appears
- Errors logged in console
- App continues normally

### Possible Causes

**1. Notification Container Not Created**
```javascript
// Check if container exists
document.getElementById('error-notification-container')

// If null, container creation failed
```

**Solution:** Check browser console for errors during initialization.

**2. Z-index Conflicts**
```css
/* ❌ Something blocking notifications */
.modal {
  z-index: 10000; /* Higher than 9999 */
}

/* ✅ Error notification z-index is 9999 */
```

**Solution:** Ensure no elements have z-index > 9999.

**3. Notification Styles Not Applied**
```javascript
// Check if styles loaded
document.getElementById('error-notif-styles')

// If null, styles didn't inject
```

**Solution:** Verify errorHandler.js has correct style injection code.

### Diagnostic Steps

1. **Check notification container:**
   ```javascript
   document.getElementById('error-notification-container')
   ```

2. **Check notification count:**
   ```javascript
   document.querySelectorAll('.error-notification').length
   ```

3. **Inspect notification element:**
   ```javascript
   const notifs = document.querySelectorAll('.error-notification');
   notifs[0].style.display // Should not be 'none'
   ```

---

## Issue 3: Socket.IO Errors Not Tracked

### Symptoms
- Socket disconnects silently
- No error logged
- No notification shown

### Possible Causes

**1. setupSocketErrorHandlers() Not Called**
```javascript
// ❌ WRONG
function initSocket() {
  socket = io({...});
  socket.on('connect', () => {...});
  // Missing: setupSocketErrorHandlers(socket);
}

// ✅ CORRECT
function initSocket() {
  socket = io({...});
  socket.on('connect', () => {...});
  setupSocketErrorHandlers(socket); // Add this!
}
```

**Solution:** Call `setupSocketErrorHandlers(socket)` at end of `initSocket()`.

**2. Custom Handlers Interfere**
```javascript
// ❌ WRONG - Overrides setup
socket.on('connect_error', () => {
  // Doesn't log or notify
});

// ✅ CORRECT - Works with setup
// (Setup handles these, add custom logic after)
socket.on('connect_error', (error) => {
  // setupSocketErrorHandlers already ran
  // Add custom handling here if needed
});
```

**Solution:** Let setupSocketErrorHandlers handle basic errors, add custom logic after.

**3. Error Listener Not Active**
```javascript
// Check if handlers registered
console.log(socket.listeners('connect_error'))

// Should show array with 1+ handlers
```

**Solution:** Verify setupSocketErrorHandlers() was called successfully.

### Diagnostic Steps

1. **Check socket connection:**
   ```javascript
   socket.connected // Should be true
   ```

2. **Check error listeners:**
   ```javascript
   socket.listeners('connect_error').length > 0
   socket.listeners('disconnect').length > 0
   socket.listeners('error').length > 0
   ```

3. **Test disconnect:**
   ```javascript
   socket.disconnect();
   // Should see notification and log
   ```

---

## Issue 4: API Errors Not Handled

### Symptoms
- API fails silently
- No notification shown
- Console shows unhandled error

### Possible Causes

**1. Using fetch Instead of safeFetch**
```javascript
// ❌ WRONG - Not using wrapper
const res = await fetch('/api/data');

// ✅ CORRECT - Using wrapper
const res = await safeFetch('/api/data');
```

**Solution:** Replace all `fetch` calls with `safeFetch`.

**2. Missing Error Handling in Catch**
```javascript
// ❌ WRONG - Error not handled
try {
  const res = await safeFetch('/api/data');
} catch (err) {
  // Missing error logging/notification
}

// ✅ CORRECT
try {
  const res = await safeFetch('/api/data');
} catch (err) {
  logError('API call failed', ERROR_LEVELS.ERROR, err);
  // safeFetch already showed notification
}
```

**Solution:** Add error logging in catch blocks.

**3. Response Not Checked**
```javascript
// ❌ WRONG - Not checking response
const res = await safeFetch('/api/data');
const data = await res.json(); // Might fail if HTTP error

// ✅ CORRECT - safeFetch checks status
// If HTTP error, exception thrown before response.json()
```

**Solution:** safeFetch validates status; your code just needs catch block.

### Diagnostic Steps

1. **Check safeFetch exists:**
   ```javascript
   typeof safeFetch === 'function' // Should be true
   ```

2. **Test API error:**
   ```javascript
   safeFetch('/api/nonexistent')
     .then(r => r.json())
     .catch(err => console.log('Caught:', err));
   // Should see notification and error log
   ```

3. **Check error log:**
   ```javascript
   exportErrorLog();
   ```

---

## Issue 5: Memory Leaks or Performance Issues

### Symptoms
- Page slows down over time
- Too many error notifications
- Browser memory usage grows

### Possible Causes

**1. Error Log Growing Too Large**
```javascript
// Check log size
_errorLog.length

// Should be limited to 100
// If larger, something's wrong
```

**Solution:** Log is auto-limited to 100. If larger, clear it:
```javascript
clearErrorLog()
```

**2. Too Many Notifications**
```javascript
// Check notification count
document.querySelectorAll('.error-notification').length

// Should be reasonable (< 20)
```

**Solution:** Auto-dismiss reduces notifications:
```javascript
showErrorNotification(title, desc, type, 3000); // 3 second auto-dismiss
```

**3. Event Listeners Accumulating**
```javascript
// Check handler count
window.addEventListener count is limited (5-10 max)

// Should not grow over time
```

**Solution:** Handlers attach once on init. Should not cause leaks.

### Diagnostic Steps

1. **Check error log size:**
   ```javascript
   getErrorStats()
   // Check 'total' should be ≤ 100
   ```

2. **Check DOM notifications:**
   ```javascript
   document.querySelectorAll('.error-notification').length
   ```

3. **Monitor memory:**
   - Chrome: DevTools → Memory → Heap snapshots
   - Should be stable after initial load

---

## Issue 6: Specific Error Not Logging

### Symptoms
- Expected error doesn't appear in log
- Other errors work fine
- Can't find error in exportErrorLog()

### Possible Causes

**1. Silent Catch Block**
```javascript
// ❌ WRONG - Error silently caught
try {
  operation();
} catch (err) {
  // Empty catch
}

// ✅ CORRECT
try {
  operation();
} catch (err) {
  logError('Operation failed', ERROR_LEVELS.ERROR, err);
  throw err; // Optional: re-throw
}
```

**Solution:** Always log errors in catch blocks.

**2. Condition Not Met**
```javascript
// Error only if condition true
if (error_condition) {
  throw new Error('Error condition met');
}

// Check if condition is actually true
```

**Solution:** Add console.log to verify code path:
```javascript
console.log('About to throw error');
throw new Error('Test');
```

**3. Wrong Error Level Filter**
```javascript
// You might be filtering by level
getErrorStats()

// Check byLevel - your error might be INFO level
// while you're looking for ERROR level
```

**Solution:** Use `exportErrorLog()` to see all errors regardless of level.

### Diagnostic Steps

1. **Export full log:**
   ```javascript
   exportErrorLog()
   ```

2. **Search for specific error:**
   ```javascript
   const log = getErrorLogFormatted();
   console.log(log);
   // Search in output
   ```

3. **Verify error logging:**
   ```javascript
   // Add test log
   logError('Test error', ERROR_LEVELS.ERROR, null, { test: true });
   exportErrorLog(); // Should see it
   ```

---

## Issue 7: Wrong Notification Message

### Symptoms
- Notification shows wrong error message
- Misleading or generic message
- User confusion

### Possible Causes

**1. Generic safeFetch Messages**
```javascript
// ❌ WRONG - Let safeFetch show generic message
try {
  const res = await safeFetch('/api/data');
} catch (err) {
  // safeFetch showed "Network Error"
}

// ✅ CORRECT - Custom message
try {
  const res = await safeFetch('/api/data');
  // ... process data
} catch (err) {
  showErrorNotification(
    'Data Load Failed',
    'Could not load your data. Please try again.',
    'error'
  );
  logError('Data load failed', ERROR_LEVELS.ERROR, err);
}
```

**Solution:** Catch safeFetch errors and show custom message if needed.

**2. Unclear Error Messages**
```javascript
// ❌ WRONG - Too technical
showErrorNotification('TypeError: Cannot read property', err.message, 'error');

// ✅ CORRECT - User-friendly
showErrorNotification(
  'Invalid Data',
  'The server returned invalid data. Please refresh the page.',
  'error'
);
```

**Solution:** Write user-friendly messages, not technical ones.

### Diagnostic Steps

1. **Check what message shows:**
   ```javascript
   // Trigger error and note message
   ```

2. **Check error notification call:**
   - Search code for `showErrorNotification`
   - Find matching error type
   - Verify message is clear

---

## Quick Diagnostic Checklist

```javascript
// Run these in browser console to diagnose

// 1. Check initialization
typeof initGlobalErrorHandling // Should be 'function'

// 2. Check error logging
typeof logError // Should be 'function'

// 3. Check notifications
typeof showErrorNotification // Should be 'function'

// 4. Check safe fetch
typeof safeFetch // Should be 'function'

// 5. Check socket handlers
typeof setupSocketErrorHandlers // Should be 'function'

// 6. Check error log
getErrorStats() // Should return object

// 7. Test error catching
throw new Error('Test error')

// 8. View error log
exportErrorLog()
```

---

## Still Having Issues?

### Debug Steps

1. **Clear and reload:**
   ```javascript
   clearErrorLog()
   location.reload()
   ```

2. **Check browser console for initialization:**
   - Look for: `[errorHandler] Global error handling initialized`
   - Look for: `[errorHandler] Socket.IO error handlers installed`

3. **Check script loading:**
   - DevTools → Network → look for errorHandler.js status 200

4. **Check for conflicts:**
   - Open DevTools → Console
   - Check for any errors on page load
   - Look for conflicts with other error handlers

5. **Review recent changes:**
   - Verify errorHandler.js in right place
   - Verify initGlobalErrorHandling() called
   - Verify socket setup code

### Getting Help

Provide these details:
1. Browser and version
2. Error message from console
3. Steps to reproduce
4. Screenshots of notification (if any)
5. Output of `getErrorStats()`

---

## Common Solutions Summary

| Issue | Solution |
|-------|----------|
| Errors not caught | Check errorHandler.js loading first |
| No notifications | Verify initGlobalErrorHandling() called |
| Socket errors missing | Call setupSocketErrorHandlers(socket) |
| API errors not handled | Use safeFetch instead of fetch |
| Too many notifications | Add duration to auto-dismiss |
| Memory issues | Check error log size, clear if needed |
| Wrong messages | Add custom error notifications |

---

Good luck debugging! The error handling system is designed to be robust and self-contained.
