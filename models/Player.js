const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({

    nexaId: {
        type: String,
        unique: true,
        index: true,
    },

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },

    password: {
        type: String,
        required: true,
        select: false, // Never return password by default
    },

    avatar: {
        type: String,
        default: "gamer",
    },

    activeTheme: {
        type: String,
        default: "dark",
    },

    ownedThemes: {
        type: [String],
        default: ["dark"],
    },

    ownedAvatars: {
        type: [String],
        default: ["gamer", "robot"],
    },

    coins: {
        type: Number,
        default: 0,
        min: 0,
    },

    xp: {
        type: Number,
        default: 0,
        min: 0,
    },

    level: {
        type: Number,
        default: 1,
        min: 1,
    },

    wins: {
        type: Number,
        default: 0,
        min: 0,
    },

    losses: {
        type: Number,
        default: 0,
        min: 0,
    },

    draws: {
        type: Number,
        default: 0,
        min: 0,
    },

    currentStreak: {
        type: Number,
        default: 0,
        min: 0,
    },

    bestStreak: {
        type: Number,
        default: 0,
        min: 0,
    },

    beatHardAi: {
        type: Boolean,
        default: false,
    },

    lastDailyDate: {
        type: String,
    },

    dailyStreak: {
        type: Number,
        default: 0,
        min: 0,
    },

    totalDailyClaims: {
        type: Number,
        default: 0,
        min: 0,
    },

    lastLogin: {
        type: Date,
    },

    settings: {
        sfx: { type: Boolean, default: true },
        music: { type: Boolean, default: false },
        confetti: { type: Boolean, default: true },
        soundTheme: { type: String, default: "classic" },
    },

    unlockedAchievements: {
        type: [String],
        default: [],
    },

}, {
    timestamps: true,
    // Hide sensitive fields when converting to JSON
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.__v;
            return ret;
        },
    },
});

// Compound indexes for leaderboards
playerSchema.index({ wins: -1, xp: -1 });
playerSchema.index({ xp: -1, wins: -1 });
playerSchema.index({ level: -1, xp: -1 });

module.exports = mongoose.model("Player", playerSchema);