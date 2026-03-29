const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

async function migrate() {
    try {
        console.log('Adding uuid column to forms table...');
        await pool.query('ALTER TABLE forms ADD COLUMN uuid VARCHAR(36) UNIQUE AFTER id');
        console.log('Successfully added uuid column');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('uuid column already exists.');
        } else {
            console.error('Failed to add uuid column:', e);
            process.exit(1);
        }
    }

    try {
        console.log('Backfilling existing forms with UUIDs...');
        const [rows] = await pool.query('SELECT id FROM forms WHERE uuid IS NULL');
        for (const row of rows) {
            await pool.query('UPDATE forms SET uuid = ? WHERE id = ?', [uuidv4(), row.id]);
        }
        console.log(`Backfilled ${rows.length} forms with UUIDs.`);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
