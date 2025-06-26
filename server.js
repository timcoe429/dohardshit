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
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        total_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create challenges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        start_date DATE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        invite_code VARCHAR(20) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create challenge_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS challenge_participants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        goals TEXT[],
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, challenge_id)
      )
    `);

    // Create daily_progress table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        date DATE NOT NULL,
        goal_index INTEGER NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, challenge_id, date, goal_index)
      )
    `);

    // Create daily_progress_summary table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_progress_summary (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        date DATE NOT NULL,
        points INTEGER DEFAULT 0,
        completion_percentage INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, challenge_id, date)
      )
    `);

    // NEW: Create chat tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES chat_messages(id),
        user_id INTEGER REFERENCES users(id),
        reaction VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id)
      )
    `);
    // Create badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(10),
        category VARCHAR(50),
        requirement_type VARCHAR(50),
        requirement_value INTEGER,
        theme_class VARCHAR(50),
        points_reward INTEGER DEFAULT 0,
        rarity VARCHAR(20) DEFAULT 'common',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        badge_id INTEGER REFERENCES badges(id),
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        challenge_id INTEGER REFERENCES challenges(id),
        UNIQUE(user_id, badge_id)
      )
    `);

    // Check if badges exist
    const badgeCheck = await pool.query('SELECT COUNT(*) FROM badges');
    if (badgeCheck.rows[0].count == 0) {
      await pool.query(`
        INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, theme_class, rarity) VALUES
        ('On Fire', '3 day streak', '🔥', 'streak', 'streak_days', 3, 'theme-fire', 'common'),
        ('Lightning', '7 day streak', '⚡', 'streak', 'streak_days', 7, 'theme-lightning', 'uncommon'),
        ('Diamond Hands', '30 day streak', '💎', 'streak', 'streak_days', 30, 'theme-diamond', 'rare'),
        ('Legendary', '100 day streak', '👑', 'streak', 'streak_days', 100, 'theme-legendary', 'legendary')
      `);
    }

    // Create indices for performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id)');

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
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

// BADGE ENDPOINTS

// 1. Simplified check badges endpoint
app.post('/api/users/:userId/check-badges', async (req, res) => {
  try {
    const { userId } = req.params;
    const newBadges = [];
    
    console.log(`Checking badges for user ${userId}`);
    
    // Get the last 30 days of progress for this user
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Get all days where user completed at least one goal
    const progressDays = await pool.query(`
      SELECT DISTINCT date::text as date
      FROM daily_progress_v2
      WHERE user_id = $1 
        AND completed = true
        AND date >= $2
      ORDER BY date DESC
    `, [userId, thirtyDaysAgoStr]);
    
    console.log(`Found ${progressDays.rows.length} days with progress`);
    
    // Calculate streak manually
    let currentStreak = 0;
    const today = new Date();
    
    // Check each day backwards from today
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasProgress = progressDays.rows.some(row => row.date === dateStr);
      
      if (hasProgress) {
        currentStreak++;
      } else if (i > 0) { // Don't break streak if today has no progress yet
        break;
      }
    }
    
    console.log(`Current streak: ${currentStreak} days`);
    
    // Get user's existing badges
    const existingBadges = await pool.query(
      'SELECT badge_id FROM user_badges WHERE user_id = $1',
      [userId]
    );
    const existingBadgeIds = existingBadges.rows.map(row => row.badge_id);
    
    // Get all streak badges
    const allBadges = await pool.query(
      "SELECT * FROM badges WHERE requirement_type = 'streak_days' ORDER BY requirement_value ASC"
    );
    
    // Check which badges user should have
    for (const badge of allBadges.rows) {
      if (currentStreak >= badge.requirement_value && !existingBadgeIds.includes(badge.id)) {
        // Award this badge
        await pool.query(
          'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, badge.id]
        );
        newBadges.push(badge);
        console.log(`Awarded ${badge.name} badge to user ${userId}`);
      }
    }
    
    res.json({ newBadges, currentStreak });
  } catch (err) {
    console.error('Check badges error details:', err);
    res.status(500).json({ error: 'Failed to check badges', details: err.message });
  }
});

// 2. Simplified debug endpoint
app.get('/api/users/:userId/streak-debug', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all progress for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const progressData = await pool.query(`
      SELECT date::text as date, COUNT(*) as goals_completed
      FROM daily_progress_v2
      WHERE user_id = $1 
        AND completed = true
        AND date >= $2
      GROUP BY date
      ORDER BY date DESC
    `, [userId, thirtyDaysAgoStr]);
    
    // Get current badges
    const badges = await pool.query(`
      SELECT b.name, b.icon, b.requirement_value
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
    `, [userId]);
    
    // Calculate simple streak
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasProgress = progressData.rows.some(row => row.date === dateStr);
      
      if (hasProgress) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    res.json({
      currentStreak: streak,
      progressDays: progressData.rows,
      currentBadges: badges.rows,
      debug: {
        totalProgressDays: progressData.rows.length,
        userId: userId,
        today: new Date().toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('Streak debug error:', err);
    res.status(500).json({ error: 'Failed to get streak debug info', details: err.message });
  }
});

// 3. Also make sure your current-theme endpoint is correct
app.get('/api/users/:userId/current-theme', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's highest streak badge
    const result = await pool.query(`
      SELECT b.* 
      FROM user_badges ub
      JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1 AND b.category = 'streak'
      ORDER BY b.requirement_value DESC
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Get theme error:', err);
    res.status(500).json({ error: 'Failed to get theme' });
  }
});

// === CHAT ENDPOINTS ===

// Get chat messages
app.get('/api/chat/messages', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cm.id,
        cm.message,
        cm.message_type,
        cm.created_at,
        u.name as user_name,
        COALESCE(
          json_agg(
            json_build_object(
              'reaction', mr.reaction,
              'user_name', ru.name
            ) ORDER BY mr.created_at
          ) FILTER (WHERE mr.reaction IS NOT NULL), 
          '[]'
        ) as reactions
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      LEFT JOIN message_reactions mr ON cm.id = mr.message_id
      LEFT JOIN users ru ON mr.user_id = ru.id
      GROUP BY cm.id, cm.message, cm.message_type, cm.created_at, u.name
      ORDER BY cm.created_at DESC
      LIMIT 50
    `);
    
    res.json(result.rows.reverse());
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send chat message
app.post('/api/chat/messages', async (req, res) => {
  try {
    const { user_id, message } = req.body;
    
    const result = await pool.query(
      'INSERT INTO chat_messages (user_id, message) VALUES ($1, $2) RETURNING *',
      [user_id, message]
    );
    
    // Check for slash commands
    if (message.startsWith('/')) {
      await handleSlashCommand(message, user_id);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Add reaction
app.post('/api/chat/reactions', async (req, res) => {
  try {
    const { message_id, user_id, reaction } = req.body;
    
    await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, reaction) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (message_id, user_id) 
       DO UPDATE SET reaction = $3`,
      [message_id, user_id, reaction]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Add reaction error:', err);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Helper function for slash commands
async function handleSlashCommand(message, userId) {
  const command = message.split(' ')[0].toLowerCase();
  const target = message.split(' ')[1];
  
  let botMessage = '';
  
  switch(command) {
    case '/excuse':
      const excuses = [
        "My protein powder exploded",
        "I'm allergic to exercise today",
        "My gym clothes are in the wash... all of them",
        "I pulled a muscle reaching for the remote",
        "My dog ate my running shoes",
        "I'm saving my energy for tomorrow",
        "The gym was too crowded (I checked from my couch)"
      ];
      botMessage = `🤖 ${excuses[Math.floor(Math.random() * excuses.length)]}`;
      break;
      
    case '/roast':
      if (target) {
        const roasts = [
          `${target} works out so rarely, their gym membership card has cobwebs`,
          `${target}'s idea of cardio is walking to the fridge`,
          `${target} has a six-pack... in the fridge`,
          `I've seen ${target} break a sweat opening a bag of chips`
        ];
        botMessage = `🔥 ${roasts[Math.floor(Math.random() * roasts.length)]}`;
      }
      break;
      
    case '/motivate':
      const quotes = [
        "💪 GET UP YOU MAGNIFICENT BASTARD!",
        "🦁 Lions don't lose sleep over the opinions of sheep. GET MOVING!",
        "⚡ Your future self is watching you right now. Don't disappoint them!",
        "🔥 Comfort is the enemy of progress. EMBRACE THE SUCK!"
      ];
      botMessage = quotes[Math.floor(Math.random() * quotes.length)];
      break;
  }
  
  if (botMessage) {
    await pool.query(
      'INSERT INTO chat_messages (user_id, message, message_type) VALUES ($1, $2, $3)',
      [userId, botMessage, 'bot']
    );
  }
}

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
  SELECT 
    dp.date as week_start,
    COUNT(CASE WHEN dp.completed = true THEN 1 END) as points,
    COUNT(DISTINCT dp.date) as active_days,
    COUNT(CASE WHEN dp.completed = true THEN 1 END) as goals_completed,
    COUNT(*) as total_goals,
    ROUND((COUNT(CASE WHEN dp.completed = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 0) as completion_rate
  FROM daily_progress_v2 dp
  WHERE dp.user_id = $1
  GROUP BY dp.date
  ORDER BY dp.date DESC
`, [userId]);
    
    // Get all-time weekly data
    const allTimeResult = await pool.query(`
      WITH weekly_stats AS (
        SELECT
          SUBSTRING(dp.date, 1, 8) || '01' AS week_start,
          COUNT(CASE WHEN dp.completed = true THEN 1 END) AS points,
          COUNT(DISTINCT dp.date) AS active_days,
          COUNT(CASE WHEN dp.completed = true THEN 1 END) AS goals_completed,
          COUNT(*) AS total_goals,
          ROUND((COUNT(CASE WHEN dp.completed = true THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 0) AS completion_rate
        FROM daily_progress_v2 dp
        WHERE dp.user_id = $1
        GROUP BY SUBSTRING(dp.date, 1, 8) || '01'
      )
      SELECT * FROM weekly_stats
      ORDER BY week_start DESC
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
