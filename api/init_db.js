const pool = require('./db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function initializeDB() {
  try {
    const connection = await pool.getConnection();

    console.log('Connected to MySQL. Initializing database schema...');

    // 1. Form Topics Table (must exist before forms due to FK)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS form_topics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        aspects JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created table: form_topics');

    // 2. Forms Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS forms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE,
        topic_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        organization VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        u_create VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES form_topics(id) ON DELETE SET NULL
      )
    `);
    console.log('Created table: forms');

    // 3. Sections Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        form_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
      )
    `);
    console.log('Created table: sections');

    // 4. Questions Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT,
        form_id INT NOT NULL,
        text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT true,
        order_index INT DEFAULT 0,
        image_url VARCHAR(500),
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
      )
    `);
    console.log('Created table: questions');

    // 5. Options Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        text VARCHAR(255) NOT NULL,
        order_index INT DEFAULT 0,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);
    console.log('Created table: options');

    // 6. Option Sets Table (master list)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS option_sets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        options JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created table: option_sets');

    // 7. Responses Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        form_id INT NOT NULL,
        respondent_id VARCHAR(255),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
      )
    `);
    console.log('Created table: responses');

    // 8. Answers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        response_id INT NOT NULL,
        question_id INT NOT NULL,
        option_id INT,
        answer_text TEXT,
        answer_numeric INT,
        FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE
      )
    `);
    console.log('Created table: answers');

    // 9. Users Table
    await connection.query(`
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
      )
    `);
    console.log('Created table: users');

    // Seed default admin user if not exists
    const [existing] = await connection.query('SELECT id FROM users WHERE username = "admin"');
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        'INSERT INTO users (username, password_hash, first_name, last_name, position, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'System', 'Administrator', 'IT Director', 'admin']
      );
      console.log('Seeded admin user (username: admin, password: admin123)');
    }

    // Migrations: add columns if not exist
    try {
      await connection.query('ALTER TABLE forms ADD COLUMN organization VARCHAR(255) AFTER description');
      console.log('Migration: added column organization to forms');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.error('Migration error:', e.message);
    }

    // 10. Personnel Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personnel (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        position VARCHAR(100),
        department VARCHAR(100),
        form_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
    `);
    console.log('Created table: personnel');

    // 11. Devices Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        form_id INT,
        personnel_id INT,
        status ENUM('open', 'closed') DEFAULT 'closed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL,
        FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
    `);
    console.log('Created table: devices');

    // 12. Personnel Forms Table (แบบประเมินบุคลากร — แยกจาก forms)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personnel_forms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
    `);
    console.log('Created table: personnel_forms');

    // 13. Job Types Table (รูปแบบงาน)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS job_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
    `);
    console.log('Created table: job_types');

    // Migrations: add personnel_form_id to sections
    try {
      await connection.query('ALTER TABLE sections ADD COLUMN personnel_form_id INT NULL AFTER form_id');
      await connection.query('ALTER TABLE sections ADD CONSTRAINT fk_sections_personnel_form FOREIGN KEY (personnel_form_id) REFERENCES personnel_forms(id) ON DELETE CASCADE');
      console.log('Migration: added personnel_form_id to sections');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration sections error:', e.message);
    }

    // Migrations: add personnel_form_id to questions
    try {
      await connection.query('ALTER TABLE questions ADD COLUMN personnel_form_id INT NULL AFTER form_id');
      await connection.query('ALTER TABLE questions ADD CONSTRAINT fk_questions_personnel_form FOREIGN KEY (personnel_form_id) REFERENCES personnel_forms(id) ON DELETE CASCADE');
      console.log('Migration: added personnel_form_id to questions');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration questions error:', e.message);
    }

    // Migrations: add personnel_form_id and job_id to devices
    try {
      await connection.query('ALTER TABLE devices ADD COLUMN personnel_form_id INT NULL AFTER form_id');
      await connection.query('ALTER TABLE devices ADD CONSTRAINT fk_devices_personnel_form FOREIGN KEY (personnel_form_id) REFERENCES personnel_forms(id) ON DELETE SET NULL');
      console.log('Migration: added personnel_form_id to devices');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration devices personnel_form_id error:', e.message);
    }

    try {
      await connection.query('ALTER TABLE devices ADD COLUMN job_id INT NULL AFTER personnel_id');
      await connection.query('ALTER TABLE devices ADD CONSTRAINT fk_devices_job FOREIGN KEY (job_id) REFERENCES job_types(id) ON DELETE SET NULL');
      console.log('Migration: added job_id to devices');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration devices job_id error:', e.message);
    }

    // Migrations: add last_opened_at to devices
    try {
      await connection.query('ALTER TABLE devices ADD COLUMN last_opened_at DATETIME NULL');
      console.log('Migration: added last_opened_at to devices');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.error('Migration devices last_opened_at error:', e.message);
    }

    // Migrations: add personnel_id and job_id to responses
    try {
      await connection.query('ALTER TABLE responses ADD COLUMN personnel_id INT NULL');
      await connection.query('ALTER TABLE responses ADD CONSTRAINT fk_responses_personnel FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE SET NULL');
      console.log('Migration: added personnel_id to responses');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration responses personnel_id error:', e.message);
    }

    try {
      await connection.query('ALTER TABLE responses ADD COLUMN job_id INT NULL AFTER personnel_id');
      await connection.query('ALTER TABLE responses ADD CONSTRAINT fk_responses_job FOREIGN KEY (job_id) REFERENCES job_types(id) ON DELETE SET NULL');
      console.log('Migration: added job_id to responses');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration responses job_id error:', e.message);
    }

    try {
      await connection.query('ALTER TABLE responses ADD COLUMN personnel_form_id INT NULL AFTER form_id');
      await connection.query('ALTER TABLE responses ADD CONSTRAINT fk_responses_personnel_form FOREIGN KEY (personnel_form_id) REFERENCES personnel_forms(id) ON DELETE SET NULL');
      console.log('Migration: added personnel_form_id to responses');
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('Duplicate key name') && !e.message.includes('already exists')) console.error('Migration responses personnel_form_id error:', e.message);
    }

    // device_personnel junction table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS device_personnel (
          device_id VARCHAR(36) NOT NULL,
          personnel_id INT NOT NULL,
          PRIMARY KEY (device_id, personnel_id),
          FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
          FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
      `);
      console.log('Created table: device_personnel');
    } catch (e) {
      if (!e.message.includes('already exists')) console.error('Migration device_personnel error:', e.message);
    }

    // photo_url for personnel
    try {
      await connection.query('ALTER TABLE personnel ADD COLUMN photo_url VARCHAR(500) NULL');
      console.log('Migration: added photo_url to personnel');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.error('Migration personnel photo_url error:', e.message);
    }

    console.log('Database initialization completed successfully.');
    connection.release();
    process.exit(0);

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDB();
