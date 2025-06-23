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
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        goals TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_progress_v2 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        date VARCHAR(10) NOT NULL,
        goal_index INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, challenge_id, date, goal_index)
      )
    `);

    console.log('Database tables initialized');
        const tzResult = await pool.query('SHOW timezone');
    console.log('Database timezone:', tzResult.rows[0].TimeZone);
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
      'SELECT goal_index, completed FROM daily_progress_v2 WHERE user_id = $1 AND challenge_id = $2 AND date = $3',
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
    
    // DEBUG LOGGING
    console.log('=== PROGRESS UPDATE DEBUG ===');
    console.log('Received date from frontend:', date);
    console.log('All parameters:', { user_id, challenge_id, date, goal_index, completed });
    
    // Check if this goal was already completed before updating
    const existingResult = await pool.query(
      'SELECT completed FROM daily_progress_v2 WHERE user_id = $1 AND challenge_id = $2 AND date = $3 AND goal_index = $4',
      [user_id, challenge_id, date, goal_index]
    );
    
    const wasAlreadyCompleted = existingResult.rows.length > 0 ? existingResult.rows[0].completed : false;
    
    // Insert or update the progress
    await pool.query(
      `INSERT INTO daily_progress_v2 (user_id, challenge_id, date, goal_index, completed) 
   VALUES ($1, $2, $3, $4, $5) 
   ON CONFLICT (user_id, challenge_id, date, goal_index) 
   DO UPDATE SET completed = $5`,
  [user_id, challenge_id, date, goal_index, completed]
    );
    
    // Only update total points if the completion status actually changed
    if (completed !== wasAlreadyCompleted) {
      const pointChange = completed ? 1 : -1;
      await pool.query(
        'UPDATE users SET total_points = GREATEST(0, total_points + $1) WHERE id = $2',
        [pointChange, user_id]
      );
    }
    
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
      LEFT JOIN daily_progress_v2 dp ON u.id = dp.user_id
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
      'SELECT COUNT(*) as completed_goals FROM daily_progress_v2 WHERE user_id = $1 AND completed = true',
      [userId]
    );
    
    // Get current streak (consecutive days with at least one goal completed)
    const streakResult = await pool.query(`
      WITH daily_activity AS (
        SELECT 
          date,
          CASE WHEN COUNT(CASE WHEN completed = true THEN 1 END) > 0 THEN 1 ELSE 0 END as has_activity
        FROM daily_progress_v2 
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

// Get user's weekly stats
app.get('/api/users/:userId/weekly-stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get weekly aggregated data for last 16 weeks
    const weeklyResult = await pool.query(`
      WITH weekly_stats AS (
        SELECT 
          DATE_TRUNC('week', dp.date) as week_start,
          COUNT(CASE WHEN dp.completed = true THEN 1 END) as points,
          COUNT(DISTINCT dp.date) as active_days,
          COUNT(CASE WHEN dp.completed = true THEN 1 END) as goals_completed,
          COUNT(*) as total_goals,
          ROUND((COUNT(CASE WHEN dp.completed = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 0) as completion_rate
        FROM daily_progress_v2 dp
        WHERE dp.user_id = $1
          AND dp.date >= CURRENT_DATE - INTERVAL '16 weeks'
        GROUP BY DATE_TRUNC('week', dp.date)
        ORDER BY week_start DESC
      )
      SELECT * FROM weekly_stats
    `, [userId]);
    
    // Get all-time weekly data
    const allTimeResult = await pool.query(`
      WITH weekly_stats AS (
        SELECT 
          DATE_TRUNC('week', dp.date) as week_start,
          COUNT(CASE WHEN dp.completed = true THEN 1 END) as points,
          COUNT(DISTINCT dp.date) as active_days,
          COUNT(CASE WHEN dp.completed = true THEN 1 END) as goals_completed,
          COUNT(*) as total_goals,
          ROUND((COUNT(CASE WHEN dp.completed = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 0) as completion_rate
        FROM daily_progress_v2 dp
        WHERE dp.user_id = $1
        GROUP BY DATE_TRUNC('week', dp.date)
        ORDER BY week_start DESC
      )
      SELECT * FROM weekly_stats
    `, [userId]);
    
    res.json({
      weekly: weeklyResult.rows,
      allTime: allTimeResult.rows
    });
  } catch (err) {
    console.error('Get weekly stats error:', err);
    res.status(500).json({ error: 'Failed to get weekly stats' });
  }
});

// === SHARED CHALLENGE API ENDPOINTS ===

// Get available challenges to join
app.get('/api/challenges/available', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        u.name as creator_name,
        COUNT(cp.user_id) as participant_count
      FROM challenges c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id
      WHERE c.is_public = true AND c.end_date >= CURRENT_DATE
      GROUP BY c.id, u.name
      ORDER BY c.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get available challenges error:', err);
    res.status(500).json({ error: 'Failed to get available challenges' });
  }
});

// Join a challenge
app.post('/api/challenges/:challengeId/join', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { user_id, goals } = req.body;
    
    // Check if user already joined this challenge
    const existing = await pool.query(
      'SELECT id FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2',
      [challengeId, user_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already joined this challenge' });
    }
    
    // Join the challenge
    const result = await pool.query(
      'INSERT INTO challenge_participants (challenge_id, user_id, goals) VALUES ($1, $2, $3) RETURNING *',
      [challengeId, user_id, goals]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Join challenge error:', err);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

// Create new challenge
app.post('/api/challenges/create', async (req, res) => {
  try {
    const { name, duration, start_date, created_by, goals } = req.body;
    
    // Calculate end date
    const startDate = new Date(start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);
    
    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create challenge
    const challengeResult = await pool.query(
      'INSERT INTO challenges (name, duration, start_date, end_date, invite_code, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, duration, start_date, endDate.toISOString().split('T')[0], inviteCode, created_by]
    );
    
    const challenge = challengeResult.rows[0];
    
    // Auto-join creator to their own challenge
    await pool.query(
      'INSERT INTO challenge_participants (challenge_id, user_id, goals) VALUES ($1, $2, $3)',
      [challenge.id, created_by, goals]
    );
    
    res.json(challenge);
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// Get user's current challenges
app.get('/api/users/:userId/current-challenges', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT 
        c.*,
        cp.goals,
        cp.joined_at,
        u.name as creator_name
      FROM challenges c
      JOIN challenge_participants cp ON c.id = cp.challenge_id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE cp.user_id = $1 AND c.end_date >= CURRENT_DATE
      ORDER BY c.start_date DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get user challenges error:', err);
    res.status(500).json({ error: 'Failed to get user challenges' });
  }
});

// Get challenge leaderboard
app.get('/api/challenges/:challengeId/leaderboard', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(CASE WHEN dp.completed = true THEN 1 END) as total_points,
        COUNT(DISTINCT dp.date) as active_days
      FROM challenge_participants cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN daily_progress_v2 dp ON u.id = dp.user_id AND dp.challenge_id = $1
      WHERE cp.challenge_id = $1
      GROUP BY u.id, u.name
      ORDER BY total_points DESC, active_days DESC, u.name ASC
    `, [challengeId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get challenge leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get challenge leaderboard' });
  }
});

// Get challenge by invite code
app.get('/api/challenges/code/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const result = await pool.query(`
      SELECT 
        c.*,
        u.name as creator_name,
        COUNT(cp.user_id) as participant_count
      FROM challenges c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id
      WHERE c.invite_code = $1
      GROUP BY c.id, u.name
    `, [inviteCode.toUpperCase()]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get challenge by code error:', err);
    res.status(500).json({ error: 'Failed to get challenge' });
  }
});
// === END SHARED CHALLENGE API ENDPOINTS ===

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running with database!' });
});

// Delete user endpoint
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete user's progress
    await pool.query('DELETE FROM daily_progress_v2 WHERE user_id = $1', [userId]);
    
    // Delete user's challenges (using user_id, not created_by)
    await pool.query('DELETE FROM challenges WHERE user_id = $1', [userId]);
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
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
