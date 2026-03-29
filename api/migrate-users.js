const bcrypt = require('bcrypt');
const pool = require('./db');

async function migrate() {
    try {
        console.log('Creating users table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                position VARCHAR(100),
                role ENUM('admin', 'staff') DEFAULT 'staff',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // Check if admin user exists
        const [rows] = await pool.query('SELECT id FROM users WHERE username = "admin"');

        if (rows.length === 0) {
            console.log('Seeding initial admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(`
                INSERT INTO users (username, password_hash, first_name, last_name, position, role) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['admin', hashedPassword, 'System', 'Administrator', 'IT Director', 'admin']);
            console.log('Admin user created (username: admin, password: admin123)');
        } else {
            console.log('Admin user already exists.');
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
