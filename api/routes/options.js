const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all option sets
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM option_sets ORDER BY created_at DESC');
        
        // Parse JSON options
        const formattedRows = rows.map(row => ({
            ...row,
            options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options
        }));
        
        res.json(formattedRows);
    } catch (error) {
        console.error('Error fetching option sets:', error);
        res.status(500).json({ error: 'Failed to fetch option sets' });
    }
});

// GET single option set
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM option_sets WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Option set not found' });
        
        const set = rows[0];
        set.options = typeof set.options === 'string' ? JSON.parse(set.options) : set.options;
        res.json(set);
    } catch (error) {
        console.error('Error fetching option set:', error);
        res.status(500).json({ error: 'Failed to fetch option set' });
    }
});

// POST to create new option set
router.post('/', async (req, res) => {
    const { name, options } = req.body;
    if (!name || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Name and a valid array of options are required' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO option_sets (name, options) VALUES (?, ?)',
            [name, JSON.stringify(options)]
        );
        res.status(201).json({ message: 'Option set created successfully', id: result.insertId });
    } catch (error) {
        console.error('Error creating option set:', error);
        res.status(500).json({ error: 'Failed to create option set' });
    }
});

// PUT to update an option set
router.put('/:id', async (req, res) => {
    const { name, options } = req.body;
    if (!name || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Name and a valid array of options are required' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE option_sets SET name = ?, options = ? WHERE id = ?',
            [name, JSON.stringify(options), req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Option set not found' });
        res.json({ message: 'Option set updated successfully' });
    } catch (error) {
        console.error('Error updating option set:', error);
        res.status(500).json({ error: 'Failed to update option set' });
    }
});

// DELETE an option set
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM option_sets WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Option set not found' });
        res.json({ message: 'Option set deleted successfully' });
    } catch (error) {
        console.error('Error deleting option set:', error);
        res.status(500).json({ error: 'Failed to delete option set' });
    }
});

module.exports = router;
