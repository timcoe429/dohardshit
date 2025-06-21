const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        goals TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        date DATE NOT NULL,
        goal_index INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, challenge_id, date, goal_index)
      )
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// API Routes

// Get or create user
app.post('/api/users', async (req, res) => {
  try {
    const { name } = req.body;
    
    // Try to find existing user
    let result = await pool.query('SELECT * FROM users WHERE name = $1', [name]);
    
    if (result.rows.length === 0) {
      // Create new user
      result = await pool.query(
        'INSERT INTO users (name) VALUES ($1) RETURNING *',
        [name]
      );
    }
    
    const user = result.rows[0];
    res.json(user);
  } catch (err) {
    console.error('User creation error:', err);
    res.status(500).json({ error: 'Failed to create/get user' });
  }
});

// Get user's challenges
app.get('/api/users/:userId/challenges', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM challenges WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get challenges error:', err);
    res.status(500).json({ error: 'Failed to get challenges' });
  }
});

// Create new challenge
app.post('/api/challenges', async (req, res) => {
  try {
    const { user_id, name, duration, goals } = req.body;
    const result = await pool.query(
      'INSERT INTO challenges (user_id, name, duration, goals) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, name, duration, goals]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// Get daily progress
app.get('/api/progress/:userId/:challengeId/:date', async (req, res) => {
  try {
    const { userId, challengeId, date } = req.params;
    const result = await pool.query(
      'SELECT goal_index, completed FROM daily_progress WHERE user_id = $1 AND challenge_id = $2 AND date = $3',
      [userId, challengeId, date]
    );
    
    const progress = {};
    result.rows.forEach(row => {
      progress[row.goal_index] = row.completed;
    });
    
    res.json(progress);
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Update daily progress
app.post('/api/progress', async (req, res) => {
  try {
    const { user_id, challenge_id, date, goal_index, completed } = req.body;
    
    await pool.query(
      `INSERT INTO daily_progress (user_id, challenge_id, date, goal_index, completed) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (user_id, challenge_id, date, goal_index) 
       DO UPDATE SET completed = $5`,
      [user_id, challenge_id, date, goal_index, completed]
    );
    
    // Update user's total points
    const pointChange = completed ? 1 : -1;
    await pool.query(
      'UPDATE users SET total_points = GREATEST(0, total_points + $1) WHERE id = $2',
      [pointChange, user_id]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running with database!' });
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} with database connection`);
  });
});
