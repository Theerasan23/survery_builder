const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/settings/organization
router.get('/organization', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM organization_settings WHERE id = 1');
        if (rows.length === 0) {
            return res.json({ id: 1, system_name: 'ssj formbuilder', org_name: '', logo_url: null });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /settings/organization error:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings/organization
router.put('/organization', async (req, res) => {
    const { system_name, org_name, logo_url, phone, line_id } = req.body;
    try {
        await pool.query(
            `UPDATE organization_settings SET system_name = ?, org_name = ?, logo_url = ?, phone = ?, line_id = ? WHERE id = 1`,
            [system_name ?? 'ssj formbuilder', org_name ?? '', logo_url ?? null, phone ?? null, line_id ?? null]
        );
        const [rows] = await pool.query('SELECT * FROM organization_settings WHERE id = 1');
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /settings/organization error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
