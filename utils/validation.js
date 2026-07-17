/**
 * Input validation and sanitization utilities
 */

// Player name validation
const PLAYER_NAME_MIN = 2;
const PLAYER_NAME_MAX = 16;
const PLAYER_NAME_REGEX = /^[a-zA-Z0-9_\-🎮🤖🔥⭐🐉🥷👽👑💎👻🦊🦈⚡🧊💀]+$/;

// Room code validation
const ROOM_CODE_REGEX = /^[A-Z2-9]{6}$/;

// Chat message validation
const CHAT_MAX_LENGTH = 200;

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/**
 * Validate and sanitize player name
 * @param {string} name - Raw player name
 * @returns {string} Sanitized name
 * @throws {Error} If name is invalid
 */
function validatePlayerName(name) {
  if (!name || typeof name !== "string") {
    throw new Error("Player name is required");
  }

  const sanitized = name.trim().slice(0, PLAYER_NAME_MAX);

  if (sanitized.length < PLAYER_NAME_MIN) {
    throw new Error(`Name must be at least ${PLAYER_NAME_MIN} characters`);
  }

  if (sanitized.length > PLAYER_NAME_MAX) {
    throw new Error(`Name must be at most ${PLAYER_NAME_MAX} characters`);
  }

  // Allow alphanumeric, underscore, hyphen, and common emojis
  if (!PLAYER_NAME_REGEX.test(sanitized)) {
    throw new Error("Name contains invalid characters");
  }

  // Check for reserved names
  const reserved = ["admin", "system", "bot", "ai", "server", "moderator", "owner", "nexaclash"];
  if (reserved.includes(sanitized.toLowerCase())) {
    throw new Error("This name is reserved");
  }

  return sanitized;
}

/**
 * Validate room code format
 * @param {string} code - Room code
 * @returns {string} Uppercase room code
 * @throws {Error} If code is invalid
 */
function validateRoomCode(code) {
  if (!code || typeof code !== "string") {
    throw new Error("Room code is required");
  }

  const sanitized = code.trim().toUpperCase();

  if (!ROOM_CODE_REGEX.test(sanitized)) {
    throw new Error("Invalid room code format. Must be 6 characters (A-Z, 2-9).");
  }

  return sanitized;
}

/**
 * Validate and sanitize chat message
 * @param {string} text - Raw message text
 * @returns {string} Sanitized message
 * @throws {Error} If message is invalid
 */
function validateChatMessage(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Message is required");
  }

  const sanitized = text.trim().slice(0, CHAT_MAX_LENGTH);

  if (sanitized.length === 0) {
    throw new Error("Message cannot be empty");
  }

  // Basic XSS prevention - strip script tags and event handlers
  const dangerous = /<script|javascript:|on\w+\s*=/gi;
  if (dangerous.test(sanitized)) {
    throw new Error("Invalid message content");
  }

  return sanitized;
}

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {string} Lowercase email
 * @throws {Error} If email is invalid
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    throw new Error("Email is required");
  }

  const sanitized = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(sanitized)) {
    throw new Error("Invalid email format");
  }

  if (sanitized.length > 254) {
    throw new Error("Email too long");
  }

  return sanitized;
}

/**
 * Validate password strength
 * @param {string} password - Password
 * @returns {string} Password (no sanitization, just validation)
 * @throws {Error} If password is weak
 */
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password is required");
  }

  if (password.length < PASSWORD_MIN) {
    throw new Error(`Password must be at least ${PASSWORD_MIN} characters`);
  }

  if (password.length > PASSWORD_MAX) {
    throw new Error(`Password must be at most ${PASSWORD_MAX} characters`);
  }

  // Check for at least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must contain both letters and numbers");
  }

  return password;
}

/**
 * Validate avatar ID
 * @param {string} avatarId - Avatar identifier
 * @param {string[]} validAvatars - List of valid avatar IDs
 * @returns {string} Validated avatar ID
 * @throws {Error} If avatar is invalid
 */
function validateAvatarId(avatarId, validAvatars) {
  if (!avatarId || typeof avatarId !== "string") {
    return "gamer"; // default
  }

  const sanitized = avatarId.trim().toLowerCase();

  if (!validAvatars.includes(sanitized)) {
    throw new Error("Invalid avatar selection");
  }

  return sanitized;
}

/**
 * Validate theme ID
 * @param {string} themeId - Theme identifier
 * @param {string[]} validThemes - List of valid theme IDs
 * @returns {string} Validated theme ID
 * @throws {Error} If theme is invalid
 */
function validateThemeId(themeId, validThemes) {
  if (!themeId || typeof themeId !== "string") {
    return "dark"; // default
  }

  const sanitized = themeId.trim().toLowerCase();

  if (!validThemes.includes(sanitized)) {
    throw new Error("Invalid theme selection");
  }

  return sanitized;
}

/**
 * Sanitize generic string input
 * @param {string} input - Raw input
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 100) {
  if (!input || typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {{page: number, limit: number}} Validated pagination
 */
function validatePagination(page = 1, limit = 20) {
  const p = Math.max(1, Math.floor(Number(page)) || 1);
  const l = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
  return { page: p, limit: l };
}

module.exports = {
  validatePlayerName,
  validateRoomCode,
  validateChatMessage,
  validateEmail,
  validatePassword,
  validateAvatarId,
  validateThemeId,
  sanitizeString,
  validatePagination,
  // Constants for external use
  PLAYER_NAME_MIN,
  PLAYER_NAME_MAX,
  CHAT_MAX_LENGTH,
  PASSWORD_MIN,
  PASSWORD_MAX,
};