const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// Ensure last_opened_at column exists (compatible with MySQL 5.7+)
(async () => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'last_opened_at'`
        );
        if (rows[0].cnt === 0) {
            await pool.query(`ALTER TABLE devices ADD COLUMN last_opened_at DATETIME NULL`);
        }
    } catch (e) {
        console.error('Could not add last_opened_at column:', e.message);
    }
})();

// Ensure personnel_id column exists in responses table
(async () => {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'responses' AND COLUMN_NAME = 'personnel_id'`
        );
        if (rows[0].cnt === 0) {
            await pool.query(`ALTER TABLE responses ADD COLUMN personnel_id INT NULL`);
            console.log('Added personnel_id column to responses table');
        }
    } catch (e) {
        console.error('Could not add personnel_id column to responses:', e.message);
    }
})();

// GET all devices (with assigned personnel list + currently active personnel)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*,
                f.title  AS form_title,
                f.uuid   AS form_uuid,
                pf.title AS personnel_form_title,
                pf.uuid  AS personnel_form_uuid,
                CONCAT(pa.first_name, ' ', pa.last_name) AS personnel_name,
                pa.position   AS personnel_position,
                pa.department AS personnel_department,
                jt.name  AS job_name
            FROM devices d
            LEFT JOIN forms           f  ON f.id  = d.form_id
            LEFT JOIN personnel_forms pf ON pf.id = d.personnel_form_id
            LEFT JOIN personnel       pa ON pa.id = d.personnel_id
            LEFT JOIN job_types       jt ON jt.id = d.job_id
            ORDER BY d.created_at DESC
        `);

        // Attach full list of assigned personnel per device
        if (rows.length === 0) return res.json([]);
        const deviceIds = rows.map(d => d.id);
        const [dpRows] = await pool.query(`
            SELECT dp.device_id, dp.personnel_id,
                   CONCAT(p.first_name,' ',p.last_name) AS name,
                   p.position
            FROM device_personnel dp
            JOIN personnel p ON p.id = dp.personnel_id
            WHERE dp.device_id IN (?)
            ORDER BY p.first_name
        `, [deviceIds]);

        const personnelByDevice = {};
        dpRows.forEach(r => {
            if (!personnelByDevice[r.device_id]) personnelByDevice[r.device_id] = [];
            personnelByDevice[r.device_id].push({ id: r.personnel_id, name: r.name, position: r.position });
        });

        const result = rows.map(d => ({
            ...d,
            assigned_personnel: personnelByDevice[d.id] || []
        }));
        res.json(result);
    } catch (error) {
        console.error('Error fetching devices:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// GET single device by UUID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*,
                f.title  AS form_title,
                f.uuid   AS form_uuid,
                pf.title AS personnel_form_title,
                pf.uuid  AS personnel_form_uuid,
                CONCAT(p.first_name, ' ', p.last_name) AS personnel_name,
                p.first_name, p.last_name,
                p.position   AS personnel_position,
                p.department AS personnel_department,
                p.photo_url  AS personnel_photo_url,
                jt.name      AS job_name
            FROM devices d
            LEFT JOIN forms           f  ON f.id  = d.form_id
            LEFT JOIN personnel_forms pf ON pf.id = d.personnel_form_id
            LEFT JOIN personnel       p  ON p.id  = d.personnel_id
            LEFT JOIN job_types       jt ON jt.id = d.job_id
            WHERE d.id = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Device not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching device:', error);
        res.status(500).json({ error: 'Failed to fetch device' });
    }
});

// POST create device
router.post('/', async (req, res) => {
    const { name, form_id, personnel_form_id } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO devices (id, name, form_id, personnel_form_id, status) VALUES (?, ?, ?, ?, ?)',
            [id, name, form_id || null, personnel_form_id || null, 'closed']
        );
        res.status(201).json({ id, message: 'Device created' });
    } catch (error) {
        console.error('Error creating device:', error);
        res.status(500).json({ error: 'Failed to create device' });
    }
});

// PUT update device (name, form_id, personnel_form_id, personnel_id)
router.put('/:id', async (req, res) => {
    const { name, form_id, personnel_form_id, personnel_id } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE devices SET name = ?, form_id = ?, personnel_form_id = ?, personnel_id = ? WHERE id = ?',
            [name, form_id || null, personnel_form_id || null, personnel_id || null, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Device not found' });
        res.json({ message: 'Device updated' });
    } catch (error) {
        console.error('Error updating device:', error);
        res.status(500).json({ error: 'Failed to update device' });
    }
});

// PATCH update device status + assign personnel + assign job
router.patch('/:id/status', async (req, res) => {
    const { status, personnel_id, job_id } = req.body;
    if (!['open', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'status must be open or closed' });
    }
    try {
        let query = 'UPDATE devices SET status = ?';
        const params = [status];
        if (personnel_id !== undefined) {
            query += ', personnel_id = ?';
            params.push(personnel_id || null);
        }
        if (job_id !== undefined) {
            query += ', job_id = ?';
            params.push(job_id || null);
        }
        query += ' WHERE id = ?';
        params.push(req.params.id);

        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Device not found' });

        // Emit realtime event
        if (req.io) {
            req.io.emit('device_status_changed', {
                device_id: req.params.id,
                status,
                personnel_id: personnel_id || null,
                job_id: job_id || null
            });
        }

        res.json({ message: 'Device status updated', status, device_id: req.params.id });
    } catch (error) {
        console.error('Error updating device status:', error);
        res.status(500).json({ error: 'Failed to update device status' });
    }
});

// PATCH record that the form link was opened
router.patch('/:id/ping', async (req, res) => {
    try {
        await pool.query(
            'UPDATE devices SET last_opened_at = NOW() WHERE id = ?',
            [req.params.id]
        );
        if (req.io) {
            req.io.emit('device_link_opened', { device_id: req.params.id, opened_at: new Date().toISOString() });
        }
        res.json({ message: 'pinged' });
    } catch (error) {
        console.error('Error pinging device:', error);
        res.status(500).json({ error: 'Failed to ping device' });
    }
});

// DELETE device
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM devices WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Device not found' });
        res.json({ message: 'Device deleted' });
    } catch (error) {
        console.error('Error deleting device:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

module.exports = router;
