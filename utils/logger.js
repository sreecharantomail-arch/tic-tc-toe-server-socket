const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: logFormat,
  defaultMeta: { service: "nexaclash" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "rejections.log") }),
  ],
});

/**
 * Log error with context
 * @param {Error} err - Error object
 * @param {Object} context - Additional context
 */
function logError(err, context = {}) {
  logger.error({
    message: err.message,
    stack: err.stack,
    ...context,
  });
}

/**
 * Log socket event for debugging
 * @param {string} event - Event name
 * @param {Object} data - Event data
 * @param {string} socketId - Socket ID
 */
function logSocketEvent(event, data, socketId) {
  logger.debug({ event, socketId, ...data }, "Socket event");
}

module.exports = {
  logger,
  logError,
  logSocketEvent,
};