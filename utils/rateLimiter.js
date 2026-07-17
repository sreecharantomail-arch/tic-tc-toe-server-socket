const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { createClient } = require("redis");

// Rate limiter configuration
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = "Too many requests from this IP, please try again later.",
    statusCode = 429,
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = (req) => req.ip,
    skip = () => false,
  } = options;

  // Try to use Redis store if available
  let store;
  if (process.env.REDIS_URL) {
    try {
      const redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.connect().catch(() => {});
      store = new RedisStore({ sendCommand: (...args) => redisClient.sendCommand(args) });
    } catch {
      // Fall back to memory store
    }
  }

  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    statusCode,
    standardHeaders,
    legacyHeaders,
    keyGenerator,
    skip,
    store,
  });
};

// Pre-configured limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for auth endpoints
  message: "Too many authentication attempts, please try again later.",
});

const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Too many API requests, please slow down.",
});

const socketLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 socket events per minute
  message: "Too many socket events, please slow down.",
  keyGenerator: (req) => req.ip,
});

module.exports = {
  createRateLimiter,
  authLimiter,
  apiLimiter,
  socketLimiter,
};