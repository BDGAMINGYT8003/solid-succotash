const { db } = require('../database/database');

// Function to find a user by ID or create a new one
const findOrCreateUser = (id, chatId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error finding user:', err.message);
        return reject(err);
      }
      if (row) {
        // User found, potentially update chat_id if it changed (though unlikely for same user ID)
        if (row.chat_id !== chatId) {
          db.run('UPDATE users SET chat_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [chatId, id], updateErr => {
            if (updateErr) {
              console.error('Error updating chat_id for user:', id, updateErr.message);
              // Resolve with original row even if chat_id update fails for now
              resolve(row);
            } else {
              row.chat_id = chatId; // Reflect update in the returned object
              resolve(row);
            }
          });
        } else {
          resolve(row);
        }
      } else {
        // User not found, create new user
        const defaultStatus = 'idle';
        const defaultOnboardingComplete = false;
        db.run(
          'INSERT INTO users (id, chat_id, status, onboarding_complete) VALUES (?, ?, ?, ?)',
          [id, chatId, defaultStatus, defaultOnboardingComplete],
          function (insertErr) { // Use function keyword to get this.lastID
            if (insertErr) {
              console.error('Error creating user:', insertErr.message);
              return reject(insertErr);
            }
            // Retrieve the newly created user to return it
            db.get('SELECT * FROM users WHERE id = ?', [id], (getErr, newUser) => {
              if (getErr) {
                console.error('Error retrieving newly created user:', getErr.message);
                return reject(getErr);
              }
              resolve(newUser);
            });
          }
        );
      }
    });
  });
};

// Function to get a user by ID
const getUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error getting user by ID:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
};

// Function to update user details
// Example: updateUser(userId, { gender: 'Male', age: 30 })
const updateUser = (id, updates) => {
  return new Promise((resolve, reject) => {
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return resolve(true); // No updates needed
    }

    const setClauses = fields.map(field => `${field} = ?`).join(', ');
    // Ensure updated_at is also set
    const sql = `UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, [...values, id], function(err) {
      if (err) {
        console.error('Error updating user:', id, err.message);
        return reject(err);
      }
      if (this.changes === 0) {
        // Optional: could indicate user not found, but findOrCreateUser should handle creation
        console.warn('Update user: No rows affected for ID:', id);
      }
      resolve(true);
    });
  });
};


// Function to get users by status
const getUsersByStatus = (status) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users WHERE status = ?', [status], (err, rows) => {
      if (err) {
        console.error(`Error getting users with status ${status}:`, err.message);
        return reject(err);
      }
      resolve(rows);
    });
  });
};

// Function to get a user's chat_id by their user_id
// Useful for sending messages when only user_id (partner_id) is known
const getChatIdByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT chat_id FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) {
        console.error(`Error getting chat_id for user ${userId}:`, err.message);
        return reject(err);
      }
      if (row) {
        resolve(row.chat_id);
      } else {
        resolve(null); // User not found or no chat_id
      }
    });
  });
};

module.exports = {
  findOrCreateUser,
  getUserById,
  updateUser,
  getUsersByStatus, // Added
  getChatIdByUserId // Added
};
// console.log('src/services/userService.js created successfully.'); // Keep original or remove if noisy
