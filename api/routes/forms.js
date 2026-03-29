const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

// GET all forms
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                f.*,
                ft.title as topic_name,
                (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) as response_count,
                (SELECT AVG(a.answer_numeric)
                 FROM answers a
                 JOIN responses r ON a.response_id = r.id
                 JOIN questions q ON a.question_id = q.id
                 WHERE r.form_id = f.id AND q.type IN ('rating', 'rating_grid') AND a.answer_numeric IS NOT NULL
                ) as average_score
            FROM forms f
            LEFT JOIN form_topics ft ON f.topic_id = ft.id
            ORDER BY f.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching forms:', error);
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// GET dashboard summary stats — must be BEFORE /:idOrUuid to avoid conflict
router.get('/dashboard-stats', async (req, res) => {
    const { from, to } = req.query;

    let dateCondition = '';
    const dateParams = [];
    if (from) { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') >= ?"; dateParams.push(from + ' 00:00:00'); }
    if (to)   { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') <= ?"; dateParams.push(to   + ' 23:59:59'); }

    try {
        const [[{ total_responses }]] = await pool.query(
            `SELECT COUNT(*) as total_responses FROM responses r WHERE r.personnel_form_id IS NULL${dateCondition}`,
            [...dateParams]
        );
        const [[{ active_forms }]] = await pool.query(`SELECT COUNT(*) as active_forms FROM forms WHERE is_active = 1`);
        const [[{ total_forms }]]  = await pool.query(`SELECT COUNT(*) as total_forms FROM forms`);

        const [[{ avg_score }]] = await pool.query(`
            SELECT AVG(a.answer_numeric) as avg_score
            FROM answers a
            JOIN responses r ON a.response_id = r.id
            JOIN questions q ON a.question_id = q.id
            WHERE q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL
              AND r.personnel_form_id IS NULL
            ${dateCondition.replace(/r\./g, 'r.')}
        `, [...dateParams]);

        const [[{ total_suggestions }]] = await pool.query(`
            SELECT COUNT(DISTINCT CONCAT(a.response_id,'-',a.question_id)) as total_suggestions
            FROM answers a
            JOIN responses r ON a.response_id = r.id
            JOIN questions q ON a.question_id = q.id
            WHERE q.is_suggestion = 1
              AND a.answer_text IS NOT NULL AND a.answer_text != ''
              AND r.personnel_form_id IS NULL
            ${dateCondition.replace(/r\./g, 'r.')}
        `, [...dateParams]);

        const [formStats] = await pool.query(`
            SELECT
                f.id, f.title, f.is_active, f.uuid,
                ft.title as topic_name,
                COUNT(DISTINCT r.id) as response_count,
                AVG(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE NULL END) as avg_score
            FROM forms f
            LEFT JOIN form_topics ft ON f.topic_id = ft.id
            LEFT JOIN responses r ON r.form_id = f.id ${dateCondition.replace(/r\./g, 'r.')}
            LEFT JOIN answers a ON a.response_id = r.id
            LEFT JOIN questions q ON a.question_id = q.id AND q.form_id = f.id
            GROUP BY f.id, f.title, f.is_active, f.uuid, ft.title
            ORDER BY response_count DESC, f.created_at DESC
        `, [...dateParams]);

        const trendFrom = from || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const trendTo   = to   || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
        const [trend] = await pool.query(`
            SELECT DATE(CONVERT_TZ(r.submitted_at,'+00:00','+07:00')) as day, COUNT(*) as count
            FROM responses r
            WHERE r.personnel_form_id IS NULL
              AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') >= ?
              AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') <= ?
            GROUP BY day ORDER BY day ASC
        `, [trendFrom + ' 00:00:00', trendTo + ' 23:59:59']);

        // Suggestion details: only choice_suggestion OR free-text typed into อื่นๆ option
        // (exclude plain text/input types, and exclude single_choice where answer_text == the option label)
        // Suggestion details — only from questions explicitly marked is_suggestion=1
        const [suggestionRows] = await pool.query(`
            SELECT
                f.id   AS form_id,
                f.title AS form_title,
                q.id   AS question_id,
                q.text AS question_text,
                GROUP_CONCAT(DISTINCT o.text ORDER BY o.order_index SEPARATOR ' / ') AS option_text,
                GROUP_CONCAT(
                    CASE WHEN a.answer_text IS NOT NULL AND a.answer_text != ''
                    THEN a.answer_text ELSE NULL END
                    ORDER BY a.id SEPARATOR ' | '
                ) AS answer_text,
                DATE_FORMAT(CONVERT_TZ(r.submitted_at,'+00:00','+07:00'), '%Y-%m-%d %H:%i') AS submitted_at
            FROM answers a
            JOIN responses r  ON a.response_id  = r.id
            JOIN questions q  ON a.question_id  = q.id
            JOIN forms f      ON r.form_id       = f.id
            LEFT JOIN options o ON a.option_id  = o.id
            WHERE q.is_suggestion = 1
              AND a.answer_text IS NOT NULL AND a.answer_text != ''
            ${dateCondition}
            GROUP BY f.id, f.title, q.id, q.text, r.id, r.submitted_at
            ORDER BY r.submitted_at DESC
            LIMIT 300
        `, [...dateParams]);

        // Total score & total answers for rating questions
        const [[{ total_score, total_answers }]] = await pool.query(`
            SELECT
                COALESCE(SUM(a.answer_numeric), 0) as total_score,
                COUNT(a.answer_numeric) as total_answers
            FROM answers a
            JOIN responses r ON a.response_id = r.id
            JOIN questions q ON a.question_id = q.id
            WHERE q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL
              AND r.personnel_form_id IS NULL
            ${dateCondition}
        `, [...dateParams]);

        // Total questions across all forms
        const [[{ total_questions }]] = await pool.query(`SELECT COUNT(*) as total_questions FROM questions WHERE form_id IS NOT NULL`);

        // Overall rating percentage
        const overall_rating_pct = total_answers > 0 ? (Number(total_score) / (Number(total_answers) * 5)) * 100 : null;

        // Topic summaries
        const [topicStats] = await pool.query(`
            SELECT
                ft.id AS topic_id,
                ft.title AS topic_name,
                ft.description AS topic_description,
                COUNT(DISTINCT f.id) AS form_count,
                COUNT(DISTINCT r.id) AS total_responses,
                AVG(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE NULL END) AS avg_score
            FROM form_topics ft
            LEFT JOIN forms f ON f.topic_id = ft.id
            LEFT JOIN responses r ON r.form_id = f.id AND r.personnel_form_id IS NULL ${dateCondition}
            LEFT JOIN answers a ON a.response_id = r.id
            LEFT JOIN questions q ON a.question_id = q.id AND q.form_id = f.id
            GROUP BY ft.id, ft.title, ft.description
            ORDER BY total_responses DESC
        `, [...dateParams]);

        res.json({
            total_responses, active_forms, total_forms,
            avg_score: avg_score ? Number(avg_score) : null,
            total_suggestions,
            total_score: Number(total_score),
            total_questions: Number(total_questions),
            overall_rating_pct: overall_rating_pct ? Number(overall_rating_pct.toFixed(1)) : null,
            forms: formStats, trend, suggestions: suggestionRows,
            topics: topicStats.map(t => ({
                ...t,
                total_responses: Number(t.total_responses),
                form_count: Number(t.form_count),
                avg_score: t.avg_score ? Number(t.avg_score) : null,
            })),
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET topic analytics — aggregated stats for forms within a topic
router.get('/topic-analytics/:topicId', async (req, res) => {
    const { topicId } = req.params;
    const { from, to, formIds } = req.query;

    let dateCondition = '';
    const dateParams = [];
    if (from) { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') >= ?"; dateParams.push(from + ' 00:00:00'); }
    if (to)   { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') <= ?"; dateParams.push(to   + ' 23:59:59'); }

    // Parse formIds filter
    let formIdFilter = '';
    let formIdParams = [];
    if (formIds) {
        const ids = formIds.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
        if (ids.length > 0) {
            formIdFilter = ` AND f.id IN (${ids.map(() => '?').join(',')})`;
            formIdParams = ids;
        }
    }

    try {
        // Topic info
        const [[topic]] = await pool.query(`SELECT id, title, description FROM form_topics WHERE id = ?`, [topicId]);
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        // All forms in this topic
        const [availableForms] = await pool.query(
            `SELECT id, title, is_active FROM forms WHERE topic_id = ? ORDER BY created_at DESC`, [topicId]
        );

        // Aggregated summary across selected forms
        const [[summary]] = await pool.query(`
            SELECT
                COUNT(DISTINCT r.id) as total_responses,
                COUNT(DISTINCT q.id) as total_questions,
                COALESCE(SUM(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE 0 END), 0) as total_score,
                AVG(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE NULL END) as avg_score,
                COUNT(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN 1 ELSE NULL END) as rating_answers
            FROM forms f
            LEFT JOIN responses r ON r.form_id = f.id AND r.personnel_form_id IS NULL ${dateCondition}
            LEFT JOIN answers a ON a.response_id = r.id
            LEFT JOIN questions q ON a.question_id = q.id AND q.form_id = f.id
            WHERE f.topic_id = ? ${formIdFilter}
        `, [...dateParams, topicId, ...formIdParams]);

        const rating_pct = summary.rating_answers > 0
            ? (Number(summary.total_score) / (Number(summary.rating_answers) * 5)) * 100
            : null;

        // Per-form breakdown
        const [formBreakdown] = await pool.query(`
            SELECT
                f.id as form_id, f.title as form_title,
                COUNT(DISTINCT r.id) as response_count,
                COUNT(DISTINCT q2.id) as total_questions,
                COALESCE(SUM(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE 0 END), 0) as total_score,
                AVG(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE NULL END) as avg_score,
                COUNT(CASE WHEN q.type IN ('rating','rating_grid') AND a.answer_numeric IS NOT NULL THEN 1 ELSE NULL END) as rating_answers
            FROM forms f
            LEFT JOIN responses r ON r.form_id = f.id AND r.personnel_form_id IS NULL ${dateCondition}
            LEFT JOIN answers a ON a.response_id = r.id
            LEFT JOIN questions q ON a.question_id = q.id AND q.form_id = f.id
            LEFT JOIN questions q2 ON q2.form_id = f.id
            WHERE f.topic_id = ? ${formIdFilter}
            GROUP BY f.id, f.title
            ORDER BY response_count DESC
        `, [...dateParams, topicId, ...formIdParams]);

        // Suggestions from selected forms
        const [suggestions] = await pool.query(`
            SELECT
                f.id AS form_id, f.title AS form_title,
                q.id AS question_id, q.text AS question_text,
                GROUP_CONCAT(DISTINCT o.text ORDER BY o.order_index SEPARATOR ' / ') AS option_text,
                GROUP_CONCAT(
                    CASE WHEN a.answer_text IS NOT NULL AND a.answer_text != ''
                    THEN a.answer_text ELSE NULL END
                    ORDER BY a.id SEPARATOR ' | '
                ) AS answer_text,
                DATE_FORMAT(CONVERT_TZ(r.submitted_at,'+00:00','+07:00'), '%Y-%m-%d %H:%i') AS submitted_at
            FROM answers a
            JOIN responses r ON a.response_id = r.id
            JOIN questions q ON a.question_id = q.id
            JOIN forms f ON r.form_id = f.id
            LEFT JOIN options o ON a.option_id = o.id
            WHERE q.is_suggestion = 1
              AND a.answer_text IS NOT NULL AND a.answer_text != ''
              AND f.topic_id = ? ${formIdFilter}
              AND r.personnel_form_id IS NULL
              ${dateCondition}
            GROUP BY f.id, f.title, q.id, q.text, r.id, r.submitted_at
            ORDER BY r.submitted_at DESC
            LIMIT 500
        `, [topicId, ...formIdParams, ...dateParams]);

        res.json({
            topic,
            available_forms: availableForms,
            summary: {
                total_responses: Number(summary.total_responses),
                total_questions: Number(summary.total_questions),
                total_score: Number(summary.total_score),
                avg_score: summary.avg_score ? Number(summary.avg_score) : null,
                overall_rating_pct: rating_pct ? Number(rating_pct.toFixed(1)) : null,
            },
            forms: formBreakdown.map(f => ({
                ...f,
                response_count: Number(f.response_count),
                total_questions: Number(f.total_questions),
                total_score: Number(f.total_score),
                avg_score: f.avg_score ? Number(f.avg_score) : null,
                rating_pct: f.rating_answers > 0 ? Number(((Number(f.total_score) / (Number(f.rating_answers) * 5)) * 100).toFixed(1)) : null,
            })),
            suggestions,
        });
    } catch (error) {
        console.error('Error fetching topic analytics:', error);
        res.status(500).json({ error: 'Failed to fetch topic analytics' });
    }
});

// GET a single form with its full structure (supports ID or UUID)
router.get('/:idOrUuid', async (req, res) => {
    const idOrUuid = req.params.idOrUuid;
    try {
        const [forms] = await pool.query('SELECT * FROM forms WHERE uuid = ? OR id = ?', [idOrUuid, idOrUuid]);
        if (forms.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }
        const form = forms[0];

        const [sections] = await pool.query('SELECT * FROM sections WHERE form_id = ? ORDER BY order_index ASC', [form.id]);
        const [questions] = await pool.query('SELECT * FROM questions WHERE form_id = ? ORDER BY order_index ASC', [form.id]);

        // Get all options for questions in this form
        const questionIds = questions.map(q => q.id);
        let options = [];
        if (questionIds.length > 0) {
            const [opts] = await pool.query('SELECT * FROM options WHERE question_id IN (?) ORDER BY order_index ASC', [questionIds]);
            options = opts;
        }

        // Structure the data
        const structuredQuestions = questions.map(q => ({
            ...q,
            options: options.filter(o => o.question_id === q.id)
        }));

        // Attach questions to their respective sections, and separate ones without a section
        form.sections = sections.map(s => ({
            ...s,
            questions: structuredQuestions.filter(q => q.section_id === s.id)
        }));
        form.unsectioned_questions = structuredQuestions.filter(q => !q.section_id);

        res.json(form);
    } catch (error) {
        console.error('Error fetching form details:', error);
        res.status(500).json({ error: 'Failed to fetch form details' });
    }
});

// POST to create a newly structured form
router.post('/', async (req, res) => {
    const { topic_id, title, description, organization, is_active, sections, u_create } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Insert Form
        const uuid = uuidv4();
        const [result] = await connection.query(
            'INSERT INTO forms (topic_id, title, description, organization, is_active, u_create, uuid) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [topic_id || null, title, description || null, organization || null, is_active !== undefined ? is_active : true, u_create || null, uuid]
        );
        const formId = result.insertId;

        // 2. Insert Sections and Questions
        if (sections && Array.isArray(sections)) {
            for (let sIndex = 0; sIndex < sections.length; sIndex++) {
                const section = sections[sIndex];

                let sectionId = null;
                const [sectionResult] = await connection.execute(
                    'INSERT INTO sections (form_id, title, description, order_index) VALUES (?, ?, ?, ?)',
                    [formId, section.title || '', section.description || null, sIndex]
                );
                sectionId = sectionResult.insertId;

                // Insert Questions for this section
                if (section.questions && Array.isArray(section.questions)) {
                    for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
                        const question = section.questions[qIndex];

                        const [qResult] = await connection.execute(
                            'INSERT INTO questions (section_id, form_id, text, type, is_required, order_index, image_url, score, is_suggestion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [sectionId, formId, question.text, question.type, question.is_required !== false, qIndex, question.image_url || null, question.score != null ? parseFloat(question.score) : null, question.is_suggestion ? 1 : 0]
                        );
                        const questionId = qResult.insertId;

                        // Insert Options
                        if (['multiple_choice', 'single_choice', 'dropdown', 'rating_grid', 'quiz', 'choice_suggestion'].includes(question.type) && question.options && Array.isArray(question.options)) {
                            for (let oIndex = 0; oIndex < question.options.length; oIndex++) {
                                const opt = question.options[oIndex];
                                const optScore = (typeof opt === 'object' && opt.score != null) ? parseFloat(opt.score) : null;
                                await connection.execute(
                                    'INSERT INTO options (question_id, text, order_index, score) VALUES (?, ?, ?, ?)',
                                    [questionId, opt.text || opt, oIndex, optScore]
                                );
                            }
                        }
                    }
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Form created successfully', formId, uuid });
    } catch (error) {
        await connection.rollback();
        console.error('Transaction Error when creating form:', error);
        res.status(500).json({ error: 'Failed to create form' });
    } finally {
        connection.release();
    }
});

// POST to submit user responses
router.post('/:id/responses', async (req, res) => {
    const formId = req.params.id;
    const { respondent_id, answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Answers must be a valid array' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Check if formId is a UUID or an integer ID and get the actual integer ID
        const [forms] = await connection.query('SELECT id FROM forms WHERE uuid = ? OR id = ?', [formId, formId]);
        if (forms.length === 0) {
             throw new Error('Form not found');
        }
        const actualFormId = forms[0].id;

        // If respondent_id is a device UUID, look up the device's current personnel_id
        let personnelId = null;
        if (respondent_id) {
            const [deviceRows] = await connection.query(
                'SELECT personnel_id FROM devices WHERE id = ?',
                [respondent_id]
            );
            if (deviceRows.length > 0 && deviceRows[0].personnel_id) {
                personnelId = deviceRows[0].personnel_id;
            }
        }

        // Insert response record
        const [responseResult] = await connection.execute(
            'INSERT INTO responses (form_id, respondent_id, personnel_id) VALUES (?, ?, ?)',
            [actualFormId, respondent_id || null, personnelId]
        );
        const responseId = responseResult.insertId;

        // Validate and Insert answers
        for (const ans of answers) {
            if (!ans.question_id) continue;

            // No strict numeric bounds — rating (1-5) is validated client-side;
            // choice options may carry arbitrary scores stored in answer_numeric.

            await connection.execute(
                'INSERT INTO answers (response_id, question_id, option_id, answer_text, answer_numeric) VALUES (?, ?, ?, ?, ?)',
                [responseId, ans.question_id, ans.option_id || null, ans.answer_text || null, ans.answer_numeric !== undefined ? ans.answer_numeric : null]
            );
        }

        await connection.commit();

        // Emit real-time event
        if (req.io) {
            req.io.emit('new_response', {
                formId: formId,
                responseId: responseId,
                timestamp: new Date().toISOString()
            });
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

// GET analytics (Mean scores for Radar Chart)
router.get('/:id/analytics', async (req, res) => {
    const formId = req.params.id;
    try {
        // Query to get total number of unique responses
        const [responseCountResult] = await pool.query(
            'SELECT COUNT(*) as count FROM responses WHERE form_id = ?',
            [formId]
        );
        const total_responses = responseCountResult[0].count;

        // Query to calculate average numeric answers grouped by section
        const [results] = await pool.query(`
            SELECT 
                s.id AS section_id,
                s.title AS section_title,
                AVG(a.answer_numeric) AS mean_score
            FROM sections s
            JOIN questions q ON q.section_id = s.id
            JOIN answers a ON a.question_id = q.id
            JOIN responses r ON r.id = a.response_id
            WHERE r.form_id = ? AND q.type IN ('rating', 'rating_grid') AND a.answer_numeric IS NOT NULL
            GROUP BY s.id, s.title
            ORDER BY s.order_index ASC
        `, [formId]);

        res.json({ total_responses, domains: results });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// GET question-level analytics (supports ?from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get('/:id/questions-analytics', async (req, res) => {
    const formId = req.params.id;
    const { from, to } = req.query;

    let dateCondition = '';
    const dateParams = [];
    if (from) { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') >= ?"; dateParams.push(from + ' 00:00:00'); }
    if (to)   { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') <= ?"; dateParams.push(to   + ' 23:59:59'); }

    try {
        const [[{ total_responses }]] = await pool.query(
            `SELECT COUNT(*) as total_responses FROM responses r WHERE r.form_id = ?${dateCondition}`,
            [formId, ...dateParams]
        );

        // Main question stats with date filter
        const [questions] = await pool.query(`
            SELECT
                q.id AS question_id,
                q.text AS question_text,
                q.type AS question_type,
                q.is_suggestion,
                COUNT(a.id) AS total_answers,
                SUM(a.answer_numeric) AS total_score,
                AVG(a.answer_numeric) AS average_score
            FROM questions q
            LEFT JOIN answers a ON a.question_id = q.id
                AND a.response_id IN (
                    SELECT id FROM responses r WHERE r.form_id = ?${dateCondition}
                )
            WHERE q.form_id = ?
            GROUP BY q.id, q.text, q.type, q.is_suggestion, q.order_index
            ORDER BY q.order_index ASC
        `, [formId, ...dateParams, formId]);

        // Rating distribution (1-5) for rating-type questions
        const [ratingDist] = await pool.query(`
            SELECT a.question_id, a.answer_numeric AS score, COUNT(*) AS count
            FROM answers a
            WHERE a.question_id IN (
                SELECT id FROM questions WHERE form_id = ? AND type = 'rating'
            )
            AND a.answer_numeric IS NOT NULL
            AND a.response_id IN (
                SELECT id FROM responses r WHERE r.form_id = ?${dateCondition}
            )
            GROUP BY a.question_id, a.answer_numeric
            ORDER BY a.question_id, a.answer_numeric
        `, [formId, formId, ...dateParams]);

        const distByQ = {};
        for (const row of ratingDist) {
            if (!distByQ[row.question_id]) distByQ[row.question_id] = {};
            distByQ[row.question_id][row.score] = Number(row.count);
        }

        // Suggestions: questions marked is_suggestion=1 that have answer_text
        const [suggRows] = await pool.query(`
            SELECT
                a.question_id,
                a.response_id,
                q.type AS question_type,
                r.submitted_at,
                GROUP_CONCAT(
                    CASE WHEN o.text IS NOT NULL THEN o.text ELSE NULL END
                    ORDER BY o.order_index SEPARATOR '||'
                ) AS selected_options,
                GROUP_CONCAT(
                    CASE WHEN a.answer_text IS NOT NULL AND a.answer_text != '' THEN
                        CONCAT(IFNULL(o.text,''), ':::', a.answer_text)
                    ELSE NULL END
                    ORDER BY o.order_index SEPARATOR '||'
                ) AS option_texts,
                MAX(a.answer_text) AS plain_text
            FROM answers a
            JOIN responses r ON a.response_id = r.id
            LEFT JOIN options o ON a.option_id = o.id
            JOIN questions q ON a.question_id = q.id
            WHERE r.form_id = ?
                AND q.is_suggestion = 1
                AND (
                    a.answer_text IS NOT NULL AND a.answer_text != ''
                    OR o.id IS NOT NULL
                )
                ${dateCondition.replace(/r\./g, 'r.')}
            GROUP BY a.question_id, a.response_id, q.type, r.submitted_at
            ORDER BY r.submitted_at DESC
        `, [formId, ...dateParams]);

        // Group suggestions by question_id — one entry per response
        const suggByQ = {};
        for (const row of suggRows) {
            if (!suggByQ[row.question_id]) suggByQ[row.question_id] = [];
            const selectedOptions = row.selected_options
                ? row.selected_options.split('||').filter(Boolean)
                : [];
            // option_texts: pairs like "OptionLabel:::FreeText"
            const optionTexts = row.option_texts
                ? row.option_texts.split('||').filter(Boolean).map(item => {
                    const sep = item.indexOf(':::');
                    return { option: item.slice(0, sep), text: item.slice(sep + 3) };
                  })
                : [];
            // For plain text types (short_text, long_text etc.) with no option, wrap plain_text
            const displayTexts = optionTexts.length > 0
                ? optionTexts
                : (row.plain_text ? [{ option: '', text: row.plain_text }] : []);
            if (displayTexts.length === 0) continue; // skip if no free text typed
            suggByQ[row.question_id].push({
                response_id: row.response_id,
                question_type: row.question_type,
                selected_options: selectedOptions,
                option_texts: displayTexts,
                submitted_at: row.submitted_at
            });
        }

        // Attach suggestions to questions
        const questionsWithSugg = questions.map(q => ({
            ...q,
            suggestions: suggByQ[q.question_id] || [],
            rating_distribution: q.question_type === 'rating' ? (distByQ[q.question_id] || {}) : undefined
        }));

        res.json({ total_responses, questions: questionsWithSugg });
    } catch (error) {
        console.error('Error fetching question analytics:', error);
        res.status(500).json({ error: 'Failed to fetch question analytics' });
    }
});

// GET individual responses with full answer details
router.get('/:id/responses-detail', async (req, res) => {
    const idOrUuid = req.params.id;
    try {
        // Resolve form ID (support both integer ID and UUID)
        const [forms] = await pool.query('SELECT id FROM forms WHERE uuid = ? OR id = ?', [idOrUuid, idOrUuid]);
        if (forms.length === 0) return res.status(404).json({ error: 'Form not found' });
        const formId = forms[0].id;

        // Get form structure: sections + questions + options
        const [sections] = await pool.query(
            'SELECT id, title, order_index FROM sections WHERE form_id = ? ORDER BY order_index ASC',
            [formId]
        );
        const [questions] = await pool.query(
            'SELECT id, section_id, text, type, is_required, order_index, image_url, score, is_suggestion FROM questions WHERE form_id = ? ORDER BY order_index ASC',
            [formId]
        );
        const qIds = questions.map(q => q.id);
        let optionsMap = {};
        if (qIds.length > 0) {
            const [opts] = await pool.query(
                'SELECT id, question_id, text, order_index, score FROM options WHERE question_id IN (?) ORDER BY order_index ASC',
                [qIds]
            );
            opts.forEach(o => {
                if (!optionsMap[o.question_id]) optionsMap[o.question_id] = [];
                optionsMap[o.question_id].push(o);
            });
        }
        const questionsWithOptions = questions.map(q => ({
            ...q,
            options: optionsMap[q.id] || []
        }));

        // Get all responses ordered newest first
        const [responses] = await pool.query(
            'SELECT id, submitted_at FROM responses WHERE form_id = ? ORDER BY submitted_at DESC',
            [formId]
        );

        // Get all answers for those responses in one query
        const responseIds = responses.map(r => r.id);
        let answersMap = {};
        if (responseIds.length > 0) {
            const [answers] = await pool.query(`
                SELECT a.id, a.response_id, a.question_id, a.option_id,
                       a.answer_text, a.answer_numeric, o.text AS option_text
                FROM answers a
                LEFT JOIN options o ON a.option_id = o.id
                WHERE a.response_id IN (?)
            `, [responseIds]);
            answers.forEach(a => {
                if (!answersMap[a.response_id]) answersMap[a.response_id] = [];
                answersMap[a.response_id].push(a);
            });
        }

        const responsesDetail = responses.map(r => ({
            id: r.id,
            submitted_at: r.submitted_at,
            answers: answersMap[r.id] || []
        }));

        res.json({
            total: responses.length,
            sections,
            questions: questionsWithOptions,
            responses: responsesDetail
        });
    } catch (error) {
        console.error('Error fetching responses detail:', error);
        res.status(500).json({ error: 'Failed to fetch responses detail' });
    }
});

// GET raw data for export
router.get('/:id/export', async (req, res) => {
    const formId = req.params.id;
    try {
        const [details] = await pool.query(`
            SELECT 
                r.id AS response_id,
                r.respondent_id,
                r.submitted_at,
                q.text AS question_text,
                q.type AS question_type,
                a.answer_text,
                a.answer_numeric,
                o.text AS selected_option
            FROM responses r
            JOIN answers a ON a.response_id = r.id
            JOIN questions q ON a.question_id = q.id
            LEFT JOIN options o ON a.option_id = o.id
            WHERE r.form_id = ?
            ORDER BY r.submitted_at DESC, q.order_index ASC
        `, [formId]);

        // Structure it so each response is a row with questions as columns
        const formattedData = {};
        const questionHeaders = new Set();

        details.forEach(row => {
            if (!formattedData[row.response_id]) {
                formattedData[row.response_id] = {
                    Response_ID: row.response_id,
                    Respondent: row.respondent_id || 'Anonymous',
                    Submitted_At: row.submitted_at
                };
            }

            const header = row.question_text;
            questionHeaders.add(header);

            let value = '';
            if (row.question_type === 'rating') value = row.answer_numeric;
            else if (['multiple_choice', 'single_choice', 'dropdown'].includes(row.question_type)) value = row.selected_option;
            else value = row.answer_text;

            if (formattedData[row.response_id][header]) {
                formattedData[row.response_id][header] += `, ${value}`;
            } else {
                formattedData[row.response_id][header] = value;
            }
        });

        res.json(Object.values(formattedData));
    } catch (error) {
        console.error('Error fetching export data:', error);
        res.status(500).json({ error: 'Failed to fetch export data' });
    }
});

// POST to duplicate a form (copies structure without responses)
router.post('/:id/duplicate', async (req, res) => {
    const sourceId = req.params.id;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get source form
        const [[source]] = await connection.query('SELECT * FROM forms WHERE id = ?', [sourceId]);
        if (!source) return res.status(404).json({ error: 'Form not found' });

        // 2. Create new form (copy)
        const newUuid = uuidv4();
        const [formResult] = await connection.query(
            'INSERT INTO forms (topic_id, title, description, is_active, u_create, uuid) VALUES (?, ?, ?, ?, ?, ?)',
            [source.topic_id, `${source.title} (Copy)`, source.description, false, source.u_create, newUuid]
        );
        const newFormId = formResult.insertId;

        // 3. Get source sections
        const [sections] = await connection.query(
            'SELECT * FROM sections WHERE form_id = ? ORDER BY order_index ASC', [sourceId]
        );

        // Map old section_id -> new section_id
        const sectionIdMap = {};
        for (const sec of sections) {
            const [secResult] = await connection.query(
                'INSERT INTO sections (form_id, title, description, order_index) VALUES (?, ?, ?, ?)',
                [newFormId, sec.title, sec.description, sec.order_index]
            );
            sectionIdMap[sec.id] = secResult.insertId;
        }

        // 4. Get source questions
        const [questions] = await connection.query(
            'SELECT * FROM questions WHERE form_id = ? ORDER BY order_index ASC', [sourceId]
        );

        for (const q of questions) {
            const newSectionId = q.section_id ? sectionIdMap[q.section_id] : null;
            const [qResult] = await connection.query(
                'INSERT INTO questions (section_id, form_id, text, type, is_required, order_index, image_url, score, is_suggestion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [newSectionId, newFormId, q.text, q.type, q.is_required, q.order_index, q.image_url, q.score ?? null, q.is_suggestion ?? 0]
            );
            const newQId = qResult.insertId;

            // 5. Copy options
            const [options] = await connection.query(
                'SELECT * FROM options WHERE question_id = ? ORDER BY order_index ASC', [q.id]
            );
            for (const opt of options) {
                await connection.query(
                    'INSERT INTO options (question_id, text, order_index, score) VALUES (?, ?, ?, ?)',
                    [newQId, opt.text, opt.order_index, opt.score ?? null]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Form duplicated', formId: newFormId, uuid: newUuid });
    } catch (error) {
        await connection.rollback();
        console.error('Error duplicating form:', error);
        res.status(500).json({ error: 'Failed to duplicate form' });
    } finally {
        connection.release();
    }
});

// PUT to update an existing form entirely
router.put('/:id', async (req, res) => {
    const formId = req.params.id;
    const { topic_id, title, description, organization, is_active, sections } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Update Form
        await connection.query(
            'UPDATE forms SET topic_id = ?, title = ?, description = ?, organization = ?, is_active = ? WHERE id = ?',
            [topic_id || null, title, description || null, organization || null, is_active !== undefined ? is_active : true, formId]
        );

        // A quick and safe approach for complex nested structures is to delete children and recreate
        // This avoids complex differential updates manually. 
        // We will delete previously attached sections (which cascades down if DB schema has CASCADE, 
        // but let's do explicit deletion just to be safe if CASCADE isn't set.)

        // Find existing question IDs to delete their options/answers safely
        const [existingQs] = await connection.query('SELECT id FROM questions WHERE form_id = ?', [formId]);
        if (existingQs.length > 0) {
            const qIdsArr = existingQs.map(q => q.id);
            // Clear answers
            await connection.query('DELETE FROM answers WHERE question_id IN (?)', [qIdsArr]);
            // Clear options
            await connection.query('DELETE FROM options WHERE question_id IN (?)', [qIdsArr]);
        }

        // Clear Responses associated with form (optional based on logic, but required if replacing structure)
        await connection.query('DELETE FROM responses WHERE form_id = ?', [formId]);
        // Clear Questions
        await connection.query('DELETE FROM questions WHERE form_id = ?', [formId]);
        // Clear Sections
        await connection.query('DELETE FROM sections WHERE form_id = ?', [formId]);

        // 2. Insert Sections and Questions (Recreate)
        if (sections && Array.isArray(sections)) {
            for (let sIndex = 0; sIndex < sections.length; sIndex++) {
                const section = sections[sIndex];

                let sectionId = null;
                const [sectionResult] = await connection.execute(
                    'INSERT INTO sections (form_id, title, description, order_index) VALUES (?, ?, ?, ?)',
                    [formId, section.title || '', section.description || null, sIndex]
                );
                sectionId = sectionResult.insertId;

                if (section.questions && Array.isArray(section.questions)) {
                    for (let qIndex = 0; qIndex < section.questions.length; qIndex++) {
                        const question = section.questions[qIndex];

                        const [qResult] = await connection.execute(
                            'INSERT INTO questions (section_id, form_id, text, type, is_required, order_index, image_url, score, is_suggestion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [sectionId, formId, question.text, question.type, question.is_required !== false, qIndex, question.image_url || null, question.score != null ? parseFloat(question.score) : null, question.is_suggestion ? 1 : 0]
                        );
                        const questionId = qResult.insertId;

                        if (['multiple_choice', 'single_choice', 'dropdown', 'rating_grid', 'quiz', 'choice_suggestion'].includes(question.type) && question.options && Array.isArray(question.options)) {
                            for (let oIndex = 0; oIndex < question.options.length; oIndex++) {
                                const opt = question.options[oIndex];
                                const optScore = (typeof opt === 'object' && opt.score != null) ? parseFloat(opt.score) : null;
                                await connection.execute(
                                    'INSERT INTO options (question_id, text, order_index, score) VALUES (?, ?, ?, ?)',
                                    [questionId, opt.text || opt, oIndex, optScore]
                                );
                            }
                        }
                    }
                }
            }
        }

        await connection.commit();
        res.status(200).json({ message: 'Form updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Transaction Error when updating form:', error);
        res.status(500).json({ error: 'Failed to update form' });
    } finally {
        connection.release();
    }
});

// PATCH toggle is_active
router.patch('/:id/toggle-active', async (req, res) => {
    const formId = req.params.id;
    try {
        const [rows] = await pool.query('SELECT is_active FROM forms WHERE id = ?', [formId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Form not found' });
        const newStatus = !rows[0].is_active;
        await pool.query('UPDATE forms SET is_active = ? WHERE id = ?', [newStatus, formId]);
        res.json({ id: formId, is_active: newStatus });
    } catch (error) {
        console.error('Error toggling form status:', error);
        res.status(500).json({ error: 'Failed to toggle form status' });
    }
});

// DELETE a form
router.delete('/:id', async (req, res) => {
    const formId = req.params.id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Find existing question IDs to delete their options/answers safely
        const [existingQs] = await connection.query('SELECT id FROM questions WHERE form_id = ?', [formId]);
        if (existingQs.length > 0) {
            const qIdsArr = existingQs.map(q => q.id);
            await connection.query('DELETE FROM answers WHERE question_id IN (?)', [qIdsArr]);
            await connection.query('DELETE FROM options WHERE question_id IN (?)', [qIdsArr]);
        }

        await connection.query('DELETE FROM responses WHERE form_id = ?', [formId]);
        await connection.query('DELETE FROM questions WHERE form_id = ?', [formId]);
        await connection.query('DELETE FROM sections WHERE form_id = ?', [formId]);

        const [result] = await connection.query('DELETE FROM forms WHERE id = ?', [formId]);

        if (result.affectedRows === 0) {
            throw new Error('Form not found');
        }

        await connection.commit();
        res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting form:', error);
        res.status(500).json({ error: 'Failed to delete form' });
    } finally {
        connection.release();
    }
});

// GET satisfaction report with date range filter
router.get('/:id/report', async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;
    try {
        const [forms] = await pool.query('SELECT * FROM forms WHERE uuid = ? OR id = ?', [id, id]);
        if (!forms.length) return res.status(404).json({ error: 'Form not found' });
        const form = forms[0];

        let dateCondition = '';
        const dateParams = [];
        if (from) { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') >= ?"; dateParams.push(from + ' 00:00:00'); }
        if (to)   { dateCondition += " AND CONVERT_TZ(r.submitted_at,'+00:00','+07:00') <= ?"; dateParams.push(to   + ' 23:59:59'); }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) as total FROM responses r WHERE r.form_id = ?${dateCondition}`,
            [form.id, ...dateParams]
        );

        const [rows] = await pool.query(`
            SELECT
                q.id as question_id,
                q.text as question_text,
                q.type as question_type,
                q.order_index,
                o.id as option_id,
                o.text as option_text,
                o.order_index as option_order,
                COUNT(a.id) as answer_count,
                AVG(CASE WHEN a.answer_numeric IS NOT NULL THEN a.answer_numeric ELSE NULL END) as avg_score,
                SUM(CASE WHEN a.answer_numeric = 1 THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN a.answer_numeric = 0 THEN 1 ELSE 0 END) as suggestion_count,
                GROUP_CONCAT(CASE WHEN a.answer_text IS NOT NULL AND a.answer_text != '' THEN a.answer_text ELSE NULL END SEPARATOR '||') as suggestion_texts
            FROM responses r
            JOIN answers a ON a.response_id = r.id
            JOIN questions q ON a.question_id = q.id
            LEFT JOIN options o ON a.option_id = o.id
            WHERE r.form_id = ?${dateCondition}
            GROUP BY q.id, q.text, q.type, q.order_index, o.id, o.text, o.order_index
            ORDER BY q.order_index ASC, o.order_index ASC
        `, [form.id, ...dateParams]);

        res.json({ form_title: form.title, total_responses: total, questions: rows });
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

module.exports = router;
