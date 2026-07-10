const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({

    nexaId: {
        type: String,
        unique: true
    },

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    avatar: {
        type: String,
        default: "default"
    },

    activeTheme: {
        type: String,
        default: "classic"
    },

    ownedThemes: {
        type: [String],
        default: ["classic"]
    },

    ownedAvatars: {
        type: [String],
        default: ["default"]
    },

    coins: {
        type: Number,
        default: 100
    },

    xp: {
        type: Number,
        default: 0
    },

    level: {
        type: Number,
        default: 1
    },

    wins: {
        type: Number,
        default: 0
    },

    losses: {
        type: Number,
        default: 0
    },

    draws: {
        type: Number,
        default: 0
    },

    lastLogin: {
        type: Date
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Player", playerSchema);