const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all job types
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM job_types ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching job types:', error);
        res.status(500).json({ error: 'Failed to fetch job types' });
    }
});

// POST create job type
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
        const [result] = await pool.query(
            'INSERT INTO job_types (name, description) VALUES (?, ?)',
            [name, description || null]
        );
        res.status(201).json({ id: result.insertId, name, description });
    } catch (error) {
        console.error('Error creating job type:', error);
        res.status(500).json({ error: 'Failed to create job type' });
    }
});

// PUT update job type
router.put('/:id', async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
        await pool.query(
            'UPDATE job_types SET name = ?, description = ? WHERE id = ?',
            [name, description || null, req.params.id]
        );
        res.json({ id: req.params.id, name, description });
    } catch (error) {
        console.error('Error updating job type:', error);
        res.status(500).json({ error: 'Failed to update job type' });
    }
});

// DELETE job type
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM job_types WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Error deleting job type:', error);
        res.status(500).json({ error: 'Failed to delete job type' });
    }
});

module.exports = router;
