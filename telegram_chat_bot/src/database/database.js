const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../db/chat_bot.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Function to initialize database and create tables
function initializeDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        chat_id INTEGER UNIQUE NOT NULL,
        onboarding_complete BOOLEAN DEFAULT FALSE,
        gender TEXT,
        age INTEGER,
        latitude REAL,
        longitude REAL,
        interested_in TEXT,
        status TEXT DEFAULT 'idle',
        partner_id INTEGER,
        reputation INTEGER DEFAULT 5,
        warnings INTEGER DEFAULT 0,
        banned_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table created or already exists.');
        db.run('CREATE INDEX IF NOT EXISTS idx_user_status ON users (status);', idxErr => {
          if (idxErr) console.error('Error creating index idx_user_status:', idxErr.message);
        });
        db.run('CREATE INDEX IF NOT EXISTS idx_user_partner_id ON users (partner_id);', idxErr => {
          if (idxErr) console.error('Error creating index idx_user_partner_id:', idxErr.message);
        });
      }
    });

    // Create sessions table
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_id INTEGER NOT NULL,
        user2_id INTEGER NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        FOREIGN KEY (user1_id) REFERENCES users(id),
        FOREIGN KEY (user2_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating sessions table:', err.message);
      } else {
        console.log('Sessions table created or already exists.');
      }
    });

    // Create reports table
    db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        reported_id INTEGER NOT NULL,
        reason TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id),
        FOREIGN KEY (reported_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating reports table:', err.message);
      } else {
        console.log('Reports table created or already exists.');
      }
    });

    // Add triggers for updated_at in users table
    db.run(`
      CREATE TRIGGER IF NOT EXISTS update_users_updated_at
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `, (err) => {
      if (err) {
        console.error('Error creating trigger for users updated_at:', err.message);
      } else {
        console.log('Trigger for users updated_at created or already exists.');
      }
    });
  });
}

module.exports = { db, initializeDatabase };

// console.log('src/database/database.js updated with reports table.'); // Optional: keep for confirmation
// node src/database/database.js // Re-running can be done once after all schema changes if preferred
