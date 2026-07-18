const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Player = require('../models/Player');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_secure_secret_in_production';
const JWT_EXPIRES_IN = '7d';

function signToken(player) {
    return jwt.sign(
        {
            id: player._id,
            username: player.username,
            email: player.email,
            nexaId: player.nexaId,
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN,
        }
    );
}

/*
=========================================
REGISTER
POST /api/auth/register
=========================================
*/

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const normalizedUsername = typeof username === 'string' ? username.trim() : '';
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedUsername || !normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.',
            });
        }

        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database unavailable. Please try again later.',
            });
        }

        const usernameExists = await Player.findOne({
            username: normalizedUsername,
        });

        if (usernameExists) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists.',
            });
        }

        const emailExists = await Player.findOne({
            email: normalizedEmail,
        });

        if (emailExists) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const totalPlayers = await Player.countDocuments();

        const nexaId = `NC${100001 + totalPlayers}`;

        const player = new Player({
            nexaId,
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword,
        });

        await player.save();
        const token = signToken(player);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            token,
            user: {
                username: player.username,
                email: player.email,
                avatar: player.avatar,
                activeTheme: player.activeTheme,
                coins: player.coins,
                xp: player.xp,
                level: player.level,
            },
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,

            message: 'Server Error.',
        });
    }
});

/*
=========================================
LOGIN
POST /api/auth/login
=========================================
*/

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.',
            });
        }

        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database unavailable. Please try again later.',
            });
        }

        // Password has select:false in the schema — must opt in explicitly,
        // otherwise player.password is undefined and bcrypt.compare throws.
        const player = await Player.findOne({ email: normalizedEmail }).select('+password');

        console.log("Request body:", req.body);
        console.log("Email received:", email);
        console.log("Password received:", password);

        console.log("PLAYER =", player);

        if (!player) {
            return res.status(400).json({
            success: false,
            message: "Invalid email or password."
        });
    }

    console.log("Stored hash:", player.password);
    console.log("Hash type:", typeof player.password);

    const validPassword = await bcrypt.compare(password, player.password);

        if (!validPassword) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password.',
            });
        }

        const token = signToken(player);

        res.json({
            success: true,
            token,
            user: {
                username: player.username,
                email: player.email,
                avatar: player.avatar,
                activeTheme: player.activeTheme,
                coins: player.coins,
                xp: player.xp,
                level: player.level,
            },
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false,
            message: 'Server Error.',
        });
    }
});

module.exports = router;
