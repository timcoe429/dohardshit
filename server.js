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
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// === SIMPLIFIED CHALLENGE SCHEMA ===
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
        name VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        invite_code VARCHAR(10) UNIQUE,
        is_public BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenge_participants (
        id SERIAL PRIMARY KEY,
        challenge_id INTEGER REFERENCES challenges(id),
        user_id INTEGER REFERENCES users(id),
        goals TEXT[] NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challenge_id, user_id)
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

    // Create a default public challenge
    await pool.query(`
      INSERT INTO challenges (name, duration, start_date, end_date, invite_code, created_by)
      SELECT 
        'January 2025 Challenge',
        30,
        '2025-01-01',
        '2025-01-30',
        'JAN2025',
        1
      WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE invite_code = 'JAN2025')
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
// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.total_points,
        COUNT(DISTINCT c.id) as total_challenges,
        COUNT(CASE WHEN dp.completed = true THEN 1 END) as total_completed_goals,
        MAX(c.created_at) as last_active
      FROM users u
      LEFT JOIN challenges c ON u.id = c.user_id
      LEFT JOIN daily_progress dp ON u.id = dp.user_id
      GROUP BY u.id, u.name, u.total_points
      ORDER BY u.total_points DESC, u.name ASC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get user stats for profile
app.get('/api/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's rank
    const rankResult = await pool.query(`
      WITH user_ranks AS (
        SELECT id, total_points, 
               ROW_NUMBER() OVER (ORDER BY total_points DESC, name ASC) as rank
        FROM users
      )
      SELECT rank FROM user_ranks WHERE id = $1
    `, [userId]);
    
    // Get user's challenge count
    const challengeResult = await pool.query(
      'SELECT COUNT(*) as challenge_count FROM challenges WHERE user_id = $1',
      [userId]
    );
    
    // Get user's total completed goals
    const goalsResult = await pool.query(
      'SELECT COUNT(*) as completed_goals FROM daily_progress WHERE user_id = $1 AND completed = true',
      [userId]
    );
    
    // Get current streak (consecutive days with at least one goal completed)
    const streakResult = await pool.query(`
      WITH daily_activity AS (
        SELECT 
          date,
          CASE WHEN COUNT(CASE WHEN completed = true THEN 1 END) > 0 THEN 1 ELSE 0 END as has_activity
        FROM daily_progress 
        WHERE user_id = $1 
        GROUP BY date
        ORDER BY date DESC
      ),
      streak_calc AS (
        SELECT 
          date,
          has_activity,
          ROW_NUMBER() OVER (ORDER BY date DESC) - 
          ROW_NUMBER() OVER (PARTITION BY has_activity ORDER BY date DESC) as grp
        FROM daily_activity
      )
      SELECT COUNT(*) as current_streak
      FROM streak_calc
      WHERE has_activity = 1 AND grp = 0
    `, [userId]);
    
    res.json({
      rank: rankResult.rows[0]?.rank || 0,
      total_challenges: parseInt(challengeResult.rows[0]?.challenge_count || 0),
      total_completed_goals: parseInt(goalsResult.rows[0]?.completed_goals || 0),
      current_streak: parseInt(streakResult.rows[0]?.current_streak || 0)
    });
  } catch (err) {
    console.error('Get user stats error:', err);
    res.status(500).json({ error: 'Failed to get user stats' });
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
