const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to the database file within the 'db' directory
const dbPath = path.resolve(__dirname, '../../db/chat_bot.sqlite');

// Initialize the database connection
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
        id INTEGER PRIMARY KEY,                         -- Telegram User ID
        chat_id INTEGER UNIQUE NOT NULL,                -- Telegram Chat ID
        onboarding_complete BOOLEAN DEFAULT FALSE,
        gender TEXT,
        age INTEGER,
        latitude REAL,
        longitude REAL,
        interested_in TEXT,                             -- 'Male', 'Female', 'Both'
        status TEXT DEFAULT 'idle',                     -- 'idle', 'waiting', 'in_chat'
        partner_id INTEGER,                             -- Telegram User ID of the matched partner
        reputation INTEGER DEFAULT 5,                   -- User's reputation score
        warnings INTEGER DEFAULT 0,                     -- Number of warnings received
        banned_until DATETIME,                          -- Timestamp until which the user is banned
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table created or already exists.');
        // Create indexes for frequently queried columns
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

// Export the database connection and initialization function (optional, based on usage)
module.exports = { db, initializeDatabase };

// Log to confirm file creation
console.log('src/database/database.js created successfully.');

// Attempt to run the script to create the database and tables
// node src/database/database.js // This line will be executed by the next bash command
