const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// GET all personnel forms (with response count and avg score)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                pf.*,
                (SELECT COUNT(*) FROM responses r WHERE r.personnel_form_id = pf.id) AS response_count,
                (SELECT AVG(a.answer_numeric)
                 FROM answers a
                 JOIN responses r ON a.response_id = r.id
                 JOIN questions q ON a.question_id = q.id
                 WHERE r.personnel_form_id = pf.id AND q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL
                ) AS average_score
            FROM personnel_forms pf
            ORDER BY pf.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching personnel forms:', error);
        res.status(500).json({ error: 'Failed to fetch personnel forms' });
    }
});

// GET single personnel form with full structure (by ID or UUID)
router.get('/:idOrUuid', async (req, res) => {
    const idOrUuid = req.params.idOrUuid;
    try {
        const [forms] = await pool.query(
            'SELECT * FROM personnel_forms WHERE uuid = ? OR id = ?',
            [idOrUuid, idOrUuid]
        );
        if (forms.length === 0) return res.status(404).json({ error: 'Personnel form not found' });
        const form = forms[0];

        const [sections] = await pool.query(
            'SELECT * FROM sections WHERE personnel_form_id = ? ORDER BY order_index ASC',
            [form.id]
        );
        const [questions] = await pool.query(
            'SELECT * FROM questions WHERE personnel_form_id = ? ORDER BY order_index ASC',
            [form.id]
        );

        const questionIds = questions.map(q => q.id);
        let options = [];
        if (questionIds.length > 0) {
            const [opts] = await pool.query(
                'SELECT * FROM options WHERE question_id IN (?) ORDER BY order_index ASC',
                [questionIds]
            );
            options = opts;
        }

        const structuredQuestions = questions.map(q => ({
            ...q,
            options: options.filter(o => o.question_id === q.id)
        }));

        form.sections = sections.map(s => ({
            ...s,
            questions: structuredQuestions.filter(q => q.section_id === s.id)
        }));
        form.unsectioned_questions = structuredQuestions.filter(q => !q.section_id);

        res.json(form);
    } catch (error) {
        console.error('Error fetching personnel form:', error);
        res.status(500).json({ error: 'Failed to fetch personnel form' });
    }
});

// POST create personnel form (blank, for builder)
router.post('/', async (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const uuid = uuidv4();
    try {
        const [result] = await pool.query(
            'INSERT INTO personnel_forms (uuid, title, description) VALUES (?, ?, ?)',
            [uuid, title, description || null]
        );
        res.status(201).json({ id: result.insertId, uuid, title });
    } catch (error) {
        console.error('Error creating personnel form:', error);
        res.status(500).json({ error: 'Failed to create personnel form' });
    }
});

// PUT update personnel form metadata
router.put('/:id', async (req, res) => {
    const { title, description, is_active } = req.body;
    try {
        await pool.query(
            'UPDATE personnel_forms SET title = ?, description = ?, is_active = ? WHERE id = ?',
            [title, description || null, is_active !== undefined ? is_active : 1, req.params.id]
        );
        res.json({ message: 'Updated' });
    } catch (error) {
        console.error('Error updating personnel form:', error);
        res.status(500).json({ error: 'Failed to update personnel form' });
    }
});

// DELETE personnel form
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM personnel_forms WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Error deleting personnel form:', error);
        res.status(500).json({ error: 'Failed to delete personnel form' });
    }
});

// ── Builder endpoints (sections / questions / options) ──────────────────────

// POST add section to personnel form
router.post('/:formId/sections', async (req, res) => {
    const { title, description, order_index } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO sections (personnel_form_id, form_id, title, description, order_index) VALUES (?, NULL, ?, ?, ?)',
            [req.params.formId, title || 'หัวข้อใหม่', description || null, order_index || 0]
        );
        res.status(201).json({ id: result.insertId });
    } catch (error) {
        console.error('Error adding section:', error);
        res.status(500).json({ error: 'Failed to add section' });
    }
});

// PUT update section
router.put('/:formId/sections/:sectionId', async (req, res) => {
    const { title, description, order_index } = req.body;
    try {
        await pool.query(
            'UPDATE sections SET title = ?, description = ?, order_index = ? WHERE id = ? AND personnel_form_id = ?',
            [title, description || null, order_index || 0, req.params.sectionId, req.params.formId]
        );
        res.json({ message: 'Updated' });
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({ error: 'Failed to update section' });
    }
});

// DELETE section
router.delete('/:formId/sections/:sectionId', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM sections WHERE id = ? AND personnel_form_id = ?',
            [req.params.sectionId, req.params.formId]
        );
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Error deleting section:', error);
        res.status(500).json({ error: 'Failed to delete section' });
    }
});

// POST add question to personnel form
router.post('/:formId/questions', async (req, res) => {
    const { section_id, text, type, is_required, order_index, options } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [qResult] = await connection.execute(
            'INSERT INTO questions (personnel_form_id, form_id, section_id, text, type, is_required, order_index) VALUES (?, NULL, ?, ?, ?, ?, ?)',
            [req.params.formId, section_id || null, text || 'คำถามใหม่', type || 'rating', is_required !== false, order_index || 0]
        );
        const questionId = qResult.insertId;

        if (options && Array.isArray(options) && options.length > 0) {
            for (let i = 0; i < options.length; i++) {
                const opt = options[i];
                await connection.execute(
                    'INSERT INTO options (question_id, text, order_index) VALUES (?, ?, ?)',
                    [questionId, typeof opt === 'object' ? opt.text : opt, i]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ id: questionId });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding question:', error);
        res.status(500).json({ error: 'Failed to add question' });
    } finally {
        connection.release();
    }
});

// PUT update question
router.put('/:formId/questions/:questionId', async (req, res) => {
    const { text, type, is_required, order_index, section_id, options } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(
            'UPDATE questions SET text = ?, type = ?, is_required = ?, order_index = ?, section_id = ? WHERE id = ? AND personnel_form_id = ?',
            [text, type, is_required !== false, order_index || 0, section_id || null, req.params.questionId, req.params.formId]
        );

        if (options !== undefined) {
            await connection.execute('DELETE FROM options WHERE question_id = ?', [req.params.questionId]);
            if (Array.isArray(options)) {
                for (let i = 0; i < options.length; i++) {
                    const opt = options[i];
                    await connection.execute(
                        'INSERT INTO options (question_id, text, order_index) VALUES (?, ?, ?)',
                        [req.params.questionId, typeof opt === 'object' ? opt.text : opt, i]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Updated' });
    } catch (error) {
        await connection.rollback();
        console.error('Error updating question:', error);
        res.status(500).json({ error: 'Failed to update question' });
    } finally {
        connection.release();
    }
});

// DELETE question
router.delete('/:formId/questions/:questionId', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM questions WHERE id = ? AND personnel_form_id = ?',
            [req.params.questionId, req.params.formId]
        );
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

// ── Response Submission ──────────────────────────────────────────────────────

// POST submit response for a personnel form (via device UUID)
router.post('/:uuid/responses', async (req, res) => {
    const { respondent_id, answers } = req.body;
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Answers must be a non-empty array' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Resolve personnel form by UUID or ID
        const [forms] = await connection.query(
            'SELECT id FROM personnel_forms WHERE uuid = ? OR id = ?',
            [req.params.uuid, req.params.uuid]
        );
        if (forms.length === 0) {
            return res.status(404).json({ error: 'Personnel form not found' });
        }
        const personnelFormId = forms[0].id;

        // Validate that all question_ids belong to this form
        const questionIds = answers.map(a => a.question_id).filter(Boolean);
        if (questionIds.length === 0) {
            return res.status(400).json({ error: 'No valid question_id in answers' });
        }
        const [validQs] = await connection.query(
            'SELECT id FROM questions WHERE personnel_form_id = ? AND id IN (?)',
            [personnelFormId, questionIds]
        );
        const validQIds = new Set(validQs.map(q => q.id));

        // Lookup personnel_id and job_id from device
        let personnelId = null;
        let jobId = null;
        if (respondent_id) {
            const [deviceRows] = await connection.query(
                'SELECT personnel_id, job_id FROM devices WHERE id = ?',
                [respondent_id]
            );
            if (deviceRows.length > 0) {
                personnelId = deviceRows[0].personnel_id || null;
                jobId = deviceRows[0].job_id || null;
            }
        }

        // Insert response
        const [responseResult] = await connection.execute(
            'INSERT INTO responses (form_id, personnel_form_id, respondent_id, personnel_id, job_id) VALUES (NULL, ?, ?, ?, ?)',
            [personnelFormId, respondent_id || null, personnelId, jobId]
        );
        const responseId = responseResult.insertId;

        // Insert answers (only for valid questions)
        for (const ans of answers) {
            if (!ans.question_id || !validQIds.has(ans.question_id)) continue;
            const answerText = ans.answer_text ? String(ans.answer_text).slice(0, 5000) : null;
            const answerNumeric = (ans.answer_numeric !== undefined && ans.answer_numeric !== null)
                ? Number(ans.answer_numeric) : null;
            const optionId = ans.option_id ? parseInt(ans.option_id) : null;

            await connection.execute(
                'INSERT INTO answers (response_id, question_id, option_id, answer_text, answer_numeric) VALUES (?, ?, ?, ?, ?)',
                [responseId, ans.question_id, optionId, answerText, answerNumeric]
            );
        }

        await connection.commit();

        if (req.io) {
            req.io.emit('new_response', { formId: req.params.uuid, responseId, timestamp: new Date().toISOString() });
        }

        res.status(201).json({ message: 'Response submitted successfully', responseId });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting response:', error);
        res.status(400).json({ error: error.message || 'Failed to submit response' });
    } finally {
        connection.release();
    }
});

module.exports = router;
