const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/db/.env' });

const pool = require('./db');

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE questions
            ADD COLUMN quiz_label_style VARCHAR(10) DEFAULT 'abc'
        `);
        console.log('Added quiz_label_style column to questions table');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Column quiz_label_style already exists, skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
