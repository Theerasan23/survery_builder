const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all form topics
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM form_topics ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching form topics:', error);
        res.status(500).json({ error: 'Failed to fetch form topics' });
    }
});

// GET single form topic
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM form_topics WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Form topic not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching form topic:', error);
        res.status(500).json({ error: 'Failed to fetch form topic' });
    }
});

// POST to create new form topic
router.post('/', async (req, res) => {
    const { title, description, aspects } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO form_topics (title, description, aspects) VALUES (?, ?, ?)',
            [title, description || null, JSON.stringify(aspects || [])]
        );
        res.status(201).json({ message: 'Form topic created successfully', id: result.insertId });
    } catch (error) {
        console.error('Error creating form topic:', error);
        res.status(500).json({ error: 'Failed to create form topic' });
    }
});

// PUT to update a form topic
router.put('/:id', async (req, res) => {
    const { title, description, aspects } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE form_topics SET title = ?, description = ?, aspects = ? WHERE id = ?',
            [title, description || null, JSON.stringify(aspects || []), req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Form topic not found' });
        res.json({ message: 'Form topic updated successfully' });
    } catch (error) {
        console.error('Error updating form topic:', error);
        res.status(500).json({ error: 'Failed to update form topic' });
    }
});

// DELETE a form topic
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM form_topics WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Form topic not found' });
        res.json({ message: 'Form topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting form topic:', error);
        res.status(500).json({ error: 'Failed to delete form topic. It might be in use by existing forms.' });
    }
});

module.exports = router;
