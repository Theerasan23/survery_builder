const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all personnel with their assigned devices
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*,
                GROUP_CONCAT(DISTINCT d.id   ORDER BY d.name SEPARATOR ',') AS device_ids,
                GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ',') AS device_names
            FROM personnel p
            LEFT JOIN device_personnel dp ON dp.personnel_id = p.id
            LEFT JOIN devices d ON d.id = dp.device_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        // Parse device_ids into array
        const result = rows.map(p => ({
            ...p,
            device_ids:   p.device_ids   ? p.device_ids.split(',')   : [],
            device_names: p.device_names ? p.device_names.split(',') : [],
            // Keep backward compat: first device
            device_id:   p.device_ids   ? p.device_ids.split(',')[0]   : null,
            device_name: p.device_names ? p.device_names.split(',')[0] : null,
        }));
        res.json(result);
    } catch (error) {
        console.error('Error fetching personnel:', error);
        res.status(500).json({ error: 'Failed to fetch personnel' });
    }
});

// GET personnel report with avg scores per date range
router.get('/report', async (req, res) => {
    const { from, to } = req.query;
    try {
        const params = [from || null, from || null, to || null, to || null];
        const [rows] = await pool.query(`
            SELECT
                p.id, p.first_name, p.last_name, p.position, p.department,
                GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ', ') AS device_name,
                COUNT(DISTINCT r.id) AS response_count,
                ROUND(AVG(a.answer_numeric), 2) AS avg_score
            FROM personnel p
            LEFT JOIN device_personnel dp ON dp.personnel_id = p.id
            LEFT JOIN devices d ON d.id = dp.device_id
            LEFT JOIN responses r ON r.personnel_id = p.id
                AND (? IS NULL OR DATE(r.submitted_at) >= ?)
                AND (? IS NULL OR DATE(r.submitted_at) <= ?)
            LEFT JOIN answers a ON a.response_id = r.id
            LEFT JOIN questions q ON a.question_id = q.id AND q.type = 'rating'
            GROUP BY p.id, p.first_name, p.last_name, p.position, p.department
            ORDER BY avg_score DESC
        `, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching personnel report:', error);
        res.status(500).json({ error: 'Failed to fetch personnel report' });
    }
});

// GET report by job type
router.get('/report/by-job', async (req, res) => {
    const { from, to } = req.query;
    try {
        let dateWhere = '';
        const dateParams = [];
        if (from) { dateWhere += ' AND DATE(r.submitted_at) >= ?'; dateParams.push(from); }
        if (to)   { dateWhere += ' AND DATE(r.submitted_at) <= ?'; dateParams.push(to); }

        const [rows] = await pool.query(`
            SELECT
                jt.id,
                jt.name,
                jt.description,
                COUNT(DISTINCT r.personnel_id) AS personnel_count,
                COUNT(DISTINCT r.id) AS response_count,
                ROUND(AVG(a.answer_numeric), 2) AS avg_score
            FROM job_types jt
            LEFT JOIN responses r ON r.job_id = jt.id${dateWhere}
            LEFT JOIN answers a ON a.response_id = r.id
                AND a.answer_numeric IS NOT NULL
            LEFT JOIN questions q ON a.question_id = q.id AND q.type IN ('rating','rating_grid')
            GROUP BY jt.id, jt.name, jt.description
            ORDER BY response_count DESC, jt.name ASC
        `, dateParams);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching personnel report by job:', error);
        res.status(500).json({ error: 'Failed to fetch report by job' });
    }
});

// GET personnel for a specific job type
router.get('/report/by-job/:jobId', async (req, res) => {
    const { from, to } = req.query;
    try {
        let dateWhere = '';
        const params = [req.params.jobId];
        if (from) { dateWhere += ' AND DATE(r.submitted_at) >= ?'; params.push(from); }
        if (to)   { dateWhere += ' AND DATE(r.submitted_at) <= ?'; params.push(to); }

        const [rows] = await pool.query(`
            SELECT
                p.id, p.first_name, p.last_name, p.position, p.department, p.photo_url,
                COUNT(DISTINCT r.id) AS response_count,
                ROUND(AVG(a.answer_numeric), 2) AS avg_score
            FROM personnel p
            JOIN responses r ON r.personnel_id = p.id AND r.job_id = ?${dateWhere}
            LEFT JOIN answers a ON a.response_id = r.id
            LEFT JOIN questions q ON a.question_id = q.id AND q.type IN ('rating','rating_grid')
            GROUP BY p.id, p.first_name, p.last_name, p.position, p.department, p.photo_url
            ORDER BY avg_score DESC
        `, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching personnel by job:', error);
        res.status(500).json({ error: 'Failed to fetch personnel by job' });
    }
});

// GET all responses for a specific personnel (with form name + answers)
router.get('/:id/responses', async (req, res) => {
    const personnelId = req.params.id;
    const { from, to } = req.query;
    try {
        let dateWhere = '';
        const params = [personnelId];
        if (from) { dateWhere += ' AND DATE(r.submitted_at) >= ?'; params.push(from); }
        if (to)   { dateWhere += ' AND DATE(r.submitted_at) <= ?'; params.push(to); }

        const [responses] = await pool.query(`
            SELECT r.id, r.submitted_at,
                COALESCE(f.title, pf.title) AS form_title,
                jt.name AS job_name
            FROM responses r
            LEFT JOIN forms f ON f.id = r.form_id
            LEFT JOIN personnel_forms pf ON pf.id = r.personnel_form_id
            LEFT JOIN job_types jt ON jt.id = r.job_id
            WHERE r.personnel_id = ?${dateWhere}
            ORDER BY r.submitted_at DESC
        `, params);

        if (responses.length === 0) return res.json([]);

        const responseIds = responses.map(r => r.id);
        const [answers] = await pool.query(`
            SELECT
                a.response_id,
                q.text  AS question_text,
                q.type  AS question_type,
                q.order_index,
                a.answer_numeric,
                a.answer_text,
                o.text  AS option_text
            FROM answers a
            JOIN questions q ON q.id = a.question_id
            LEFT JOIN options o ON o.id = a.option_id
            WHERE a.response_id IN (?)
            ORDER BY q.order_index ASC
        `, [responseIds]);

        const answersByResponse = {};
        answers.forEach(a => {
            if (!answersByResponse[a.response_id]) answersByResponse[a.response_id] = [];
            answersByResponse[a.response_id].push(a);
        });

        const result = responses.map(r => ({
            id: r.id,
            submitted_at: r.submitted_at,
            form_title: r.form_title,
            answers: answersByResponse[r.id] || []
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching personnel responses:', error);
        res.status(500).json({ error: 'Failed to fetch personnel responses' });
    }
});

// GET single personnel
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.*,
                GROUP_CONCAT(DISTINCT d.id   ORDER BY d.name SEPARATOR ',') AS device_ids,
                GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ',') AS device_names
            FROM personnel p
            LEFT JOIN device_personnel dp ON dp.personnel_id = p.id
            LEFT JOIN devices d ON d.id = dp.device_id
            WHERE p.id = ?
            GROUP BY p.id
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Personnel not found' });
        const p = rows[0];
        res.json({
            ...p,
            device_ids:   p.device_ids   ? p.device_ids.split(',')   : [],
            device_names: p.device_names ? p.device_names.split(',') : [],
            device_id:   p.device_ids   ? p.device_ids.split(',')[0]   : null,
            device_name: p.device_names ? p.device_names.split(',')[0] : null,
        });
    } catch (error) {
        console.error('Error fetching personnel:', error);
        res.status(500).json({ error: 'Failed to fetch personnel' });
    }
});

// Helper: sync device_personnel for a personnel
async function syncDevices(connection, personnelId, deviceIds) {
    await connection.query('DELETE FROM device_personnel WHERE personnel_id = ?', [personnelId]);
    if (deviceIds && deviceIds.length > 0) {
        const values = deviceIds.map(did => [did, personnelId]);
        await connection.query('INSERT IGNORE INTO device_personnel (device_id, personnel_id) VALUES ?', [values]);
    }
}

// POST create personnel
router.post('/', async (req, res) => {
    const { first_name, last_name, position, department, photo_url, device_ids } = req.body;
    if (!first_name || !last_name) {
        return res.status(400).json({ error: 'first_name and last_name are required' });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            'INSERT INTO personnel (first_name, last_name, position, department, photo_url) VALUES (?, ?, ?, ?, ?)',
            [first_name, last_name, position || null, department || null, photo_url || null]
        );
        const newId = result.insertId;
        await syncDevices(connection, newId, device_ids || []);
        await connection.commit();
        res.status(201).json({ id: newId, message: 'Personnel created' });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating personnel:', error);
        res.status(500).json({ error: 'Failed to create personnel' });
    } finally {
        connection.release();
    }
});

// PUT update personnel
router.put('/:id', async (req, res) => {
    const { first_name, last_name, position, department, photo_url, device_ids } = req.body;
    const personnelId = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.query(
            'UPDATE personnel SET first_name = ?, last_name = ?, position = ?, department = ?, photo_url = ? WHERE id = ?',
            [first_name, last_name, position || null, department || null, photo_url || null, personnelId]
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Personnel not found' });
        }
        await syncDevices(connection, personnelId, device_ids || []);
        await connection.commit();
        res.json({ message: 'Personnel updated' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating personnel:', error);
        res.status(500).json({ error: 'Failed to update personnel' });
    } finally {
        connection.release();
    }
});

// DELETE personnel
router.delete('/:id', async (req, res) => {
    try {
        // device_personnel will cascade delete due to FK
        // Also clear devices.personnel_id if set to this person
        await pool.query('UPDATE devices SET personnel_id = NULL WHERE personnel_id = ?', [req.params.id]);
        const [result] = await pool.query('DELETE FROM personnel WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Personnel not found' });
        res.json({ message: 'Personnel deleted' });
    } catch (error) {
        console.error('Error deleting personnel:', error);
        res.status(500).json({ error: 'Failed to delete personnel' });
    }
});

module.exports = router;
