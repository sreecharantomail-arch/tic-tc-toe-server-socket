const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
    {
        roomCode: {
            type: String,
            required: true,
            index: true,
        },
        mode: {
            type: String,
            enum: ['room', 'quick', 'ai', '2p'],
            required: true,
            index: true,
        },
        hostName: {
            type: String,
            required: true,
        },
        guestName: {
            type: String,
            required: true,
        },
        hostAvatar: {
            type: String,
            default: 'gamer',
        },
        guestAvatar: {
            type: String,
            default: 'robot',
        },
        winner: {
            type: String,
            required: true, // hostName, guestName, or "draw"
        },
        endReason: {
            type: String,
            enum: ['win', 'draw', 'forfeit', 'timeout'],
            required: true,
        },
        board: {
            type: [String],
            default: [],
        },
        scores: {
            X: { type: Number, default: 0 },
            O: { type: Number, default: 0 },
            D: { type: Number, default: 0 },
        },
        duration: {
            type: Number, // milliseconds
            default: 0,
        },
        playedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
matchSchema.index({ hostName: 1, playedAt: -1 });
matchSchema.index({ guestName: 1, playedAt: -1 });
matchSchema.index({ mode: 1, playedAt: -1 });
matchSchema.index({ winner: 1, playedAt: -1 });

// Static methods
matchSchema.statics.getPlayerHistory = async function (playerName, options = {}) {
    const { limit = 50, skip = 0, mode } = options;
    const query = {
        $or: [{ hostName: playerName }, { guestName: playerName }],
    };
    if (mode) {
        query.mode = mode;
    }

    return this.find(query).sort({ playedAt: -1 }).skip(skip).limit(limit).lean();
};

matchSchema.statics.getPlayerStats = async function (playerName) {
    const matches = await this.find({
        $or: [{ hostName: playerName }, { guestName: playerName }],
    }).lean();

    let wins = 0,
        losses = 0,
        draws = 0,
        games = 0;
    let totalDuration = 0;

    for (const m of matches) {
        games++;
        totalDuration += m.duration || 0;
        if (m.winner === 'draw') {
            draws++;
        } else if (m.winner === playerName) {
            wins++;
        } else {
            losses++;
        }
    }

    return {
        games,
        wins,
        losses,
        draws,
        winRate: games > 0 ? ((wins / games) * 100).toFixed(1) : 0,
        avgDuration: games > 0 ? Math.round(totalDuration / games) : 0,
    };
};

matchSchema.statics.getLeaderboard = async function (options = {}) {
    const { limit = 100, mode, sortBy = 'wins' } = options;

    const match = mode ? { mode } : {};
    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: '$winner',
                wins: { $sum: { $cond: [{ $ne: ['$_id', 'draw'] }, 1, 0] } },
                games: { $sum: 1 },
            },
        },
        { $match: { _id: { $nin: ['draw', null] } } },
        { $sort: { [sortBy]: -1 } },
        { $limit: limit },
        {
            $project: {
                name: '$_id',
                wins: 1,
                games: 1,
                _id: 0,
            },
        },
    ];

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Match', matchSchema);
