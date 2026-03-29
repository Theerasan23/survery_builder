const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// GET all users
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, first_name, last_name, position, role, is_active, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET single user
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, first_name, last_name, position, role, is_active FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});


// POST to create a new user
router.post('/', async (req, res) => {
    const { username, password, first_name, last_name, position, role } = req.body;
    try {
        // Check if username exists
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO users (username, password_hash, first_name, last_name, position, role) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, first_name, last_name, position, role]
        );
        res.status(201).json({ id: result.insertId, message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT to update user details (including status and optional password)
router.put('/:id', async (req, res) => {
    const fields = ['username', 'first_name', 'last_name', 'position', 'role', 'is_active'];

    const updates = [];
    const queryParams = [];

    fields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = ?`);
            queryParams.push(req.body[field]);
        }
    });

    if (req.body.password && req.body.password.trim() !== '') {
        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            updates.push('password_hash = ?');
            queryParams.push(hashedPassword);
        } catch (err) {
            console.error('Password hashing error:', err);
            return res.status(500).json({ error: 'Internal server error during update' });
        }
    }

    if (updates.length === 0) {
        return res.json({ success: true, message: 'No changes provided' });
    }

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    queryParams.push(req.params.id);

    try {
        const [result] = await pool.query(updateQuery, queryParams);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});


// Simple in-memory rate limiter for login
const loginAttempts = new Map();
const LOGIN_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }; // 5 attempts per 15 minutes

function checkRateLimit(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record || now - record.firstAttempt > LOGIN_RATE_LIMIT.windowMs) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return true;
    }
    if (record.count >= LOGIN_RATE_LIMIT.maxAttempts) {
        return false;
    }
    record.count++;
    return true;
}

// Clean up expired entries every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of loginAttempts) {
        if (now - record.firstAttempt > LOGIN_RATE_LIMIT.windowMs) {
            loginAttempts.delete(ip);
        }
    }
}, 30 * 60 * 1000);

// POST to authenticate a user (used by NextAuth)
router.post('/login', async (req, res) => {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';

    if (!username || !password) {
        return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'เข้าสู่ระบบล้มเหลวหลายครั้ง กรุณาลองใหม่ภายหลัง' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        res.json({
            id: user.id.toString(),
            name: `${user.first_name} ${user.last_name}`,
            username: user.username,
            role: user.role,
            position: user.position
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
    }
});

module.exports = router;
