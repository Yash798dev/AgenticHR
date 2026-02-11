const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        message: 'Too many requests, please try again later.',
        retryAfter: 15
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 attempts per 15 min (dev friendly)
    message: {
        message: 'Too many login attempts, please try again later.',
        retryAfter: 15
    }
});

const agentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 agent calls per minute
    message: {
        message: 'Agent rate limit exceeded. Please wait before running more agents.',
        retryAfter: 1
    }
});

module.exports = { apiLimiter, authLimiter, agentLimiter };
