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
        password VARCHAR(255) DEFAULT '',
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
        status VARCHAR(20) DEFAULT 'active',
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

    // Create daily_progress_v2 table (the main progress tracking table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_progress_v2 (
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

    // Create past_challenges table to track completed challenges
    await pool.query(`
      CREATE TABLE IF NOT EXISTS past_challenges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_name VARCHAR(255) NOT NULL,
        duration INTEGER NOT NULL,
        total_goals INTEGER NOT NULL,
        points_earned INTEGER DEFAULT 0,
        points_possible INTEGER DEFAULT 0,
        completion_percentage DECIMAL(5,2) DEFAULT 0,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ghost_challengers table for personal AI competitors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ghost_challengers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES challenges(id),
        ghost_name VARCHAR(100) NOT NULL,
        difficulty_level VARCHAR(20) DEFAULT 'moderate',
        points_per_day_min INTEGER DEFAULT 3,
        points_per_day_max INTEGER DEFAULT 7,
        current_points INTEGER DEFAULT 0,
        current_day INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        ghost_type VARCHAR(20) DEFAULT 'ai',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ghost_daily_progress table to track ghost performance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ghost_daily_progress (
        id SERIAL PRIMARY KEY,
        ghost_id INTEGER REFERENCES ghost_challengers(id),
        date DATE NOT NULL,
        points_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ghost_id, date)
      )
    `);

    // Check if badges exist
    const badgeCheck = await pool.query('SELECT COUNT(*) FROM badges');
    if (badgeCheck.rows[0].count == 0) {
      await pool.query(`
  INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, theme_class, rarity) VALUES
  ('BEAST MODE', '3 day streak - You showed up', '🔥', 'streak', 'streak_days', 3, 'theme-beast', 'common'),
  ('WARRIOR', '7 day streak - Now we''re talking', '⚡', 'streak', 'streak_days', 7, 'theme-warrior', 'uncommon'),
  ('SAVAGE', '30 day streak - Absolute animal', '💀', 'streak', 'streak_days', 30, 'theme-savage', 'rare'),
  ('LEGEND', '100 day streak - Fucking unstoppable', '👑', 'streak', 'streak_days', 100, 'theme-legend', 'legendary')
`);
    }

    // Create indices for performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id)');

    console.log('Database initialized successfully');
    
    // Migration: Add password column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT ''
      `);
      console.log('Password column migration completed');
    } catch (err) {
      console.error('Migration error:', err);
    }
    
    // Migration: Add status column to challenges if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE challenges ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      `);
      console.log('Challenges status column migration completed');
    } catch (err) {
      console.error('Challenges migration error:', err);
    }
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}
// API Routes

// Get or create user
app.post('/api/users', async (req, res) => {
  try {
    const { name, password = '' } = req.body;
    
    // Normalize name to lowercase for case-insensitive lookup
    const normalizedName = name.trim().toLowerCase();
    
    // Try to find existing user (case-insensitive)
    let result = await pool.query('SELECT * FROM users WHERE LOWER(name) = $1', [normalizedName]);
    
    if (result.rows.length === 0) {
      // Create new user with original casing for display
      result = await pool.query(
        'INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *',
        [name.trim(), password]
      );
    } else {
      // Existing user - check password if provided
      const existingUser = result.rows[0];
      
      // If user has a password set, verify it
      if (existingUser.password && existingUser.password !== '') {
        if (password !== existingUser.password) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      } else if (password) {
        // User didn't have password before, but providing one now - set it
        await pool.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [password, existingUser.id]
        );
        // Get updated user
        result = await pool.query('SELECT * FROM users WHERE id = $1', [existingUser.id]);
      }
    }
    
    const user = result.rows[0];
    res.json(user);
  } catch (err) {
    console.error('User creation error:', err);
    if (err.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create/get user' });
    }
  }
});

// Get user data
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT id, name, total_points, created_at FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user's challenges
app.get('/api/users/:userId/challenges', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM challenges WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC',
      [userId, 'active']
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
      let pointChange = 0;
      
      // Get user's current rank (need this for both completing and uncompleting)
      const rankResult = await pool.query(`
        WITH user_ranks AS (
          SELECT id, total_points, 
                 DENSE_RANK() OVER (ORDER BY total_points DESC) as rank
          FROM users
        )
        SELECT rank FROM user_ranks WHERE id = $1
      `, [user_id]);
      
      const userRank = rankResult.rows[0]?.rank || 1;
      
      // Calculate boost multiplier if user is NOT in first place
      let totalMultiplier = 1;
      if (userRank > 1) {
        // Get user's current badge
        const badgeResult = await pool.query(`
          SELECT b.name 
          FROM user_badges ub
          JOIN badges b ON b.id = ub.badge_id
          WHERE ub.user_id = $1 AND b.category = 'streak'
          ORDER BY b.requirement_value DESC
          LIMIT 1
        `, [user_id]);
        
        const badgeName = badgeResult.rows[0]?.name || 'Lil Bitch';
        
        // Calculate total multiplier based on badge
        switch(badgeName) {
          case 'Lil Bitch':
            totalMultiplier = 2; // 2x total (1 base + 1 bonus)
            break;
          case 'BEAST MODE':
            totalMultiplier = 1.5; // 1.5x total
            break;
          case 'WARRIOR':
            totalMultiplier = 1.33; // 1.33x total
            break;
          case 'SAVAGE':
            totalMultiplier = 1.25; // 1.25x total
            break;
          case 'LEGEND':
            totalMultiplier = 1; // No bonus for legends
            break;
        }
        
        console.log(`User ${user_id} (rank #${userRank}, badge: ${badgeName}) has ${totalMultiplier}x multiplier`);
      }
      
      // Apply the same multiplier for both checking and unchecking
      if (completed) {
        pointChange = totalMultiplier;
        console.log(`User ${user_id} earned ${pointChange} points (${totalMultiplier}x multiplier)`);
      } else {
        pointChange = -totalMultiplier;
        console.log(`User ${user_id} lost ${pointChange} points (${totalMultiplier}x multiplier)`);
      }
      
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
        MAX(c.created_at) as last_active,
        COALESCE(b.name, 'Lil Bitch') as badge_name,
        COALESCE(b.icon, '🍆') as badge_icon,
        COALESCE(b.theme_class, 'theme-lilbitch') as theme_class
      FROM users u
      LEFT JOIN challenges c ON u.id = c.user_id
      LEFT JOIN daily_progress_v2 dp ON u.id = dp.user_id
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      LEFT JOIN badges b ON ub.badge_id = b.id AND b.category = 'streak'
      WHERE b.id IS NULL OR b.requirement_value = (
        SELECT MAX(b2.requirement_value)
        FROM user_badges ub2
        JOIN badges b2 ON ub2.badge_id = b2.id
        WHERE ub2.user_id = u.id AND b2.category = 'streak'
      )
      GROUP BY u.id, u.name, u.total_points, b.name, b.icon, b.theme_class
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
// 1. BRUTAL check badges endpoint
app.post('/api/users/:userId/check-badges', async (req, res) => {
  try {
    const { userId } = req.params;
    const newBadges = [];
    const lostBadges = [];
    
    console.log(`Checking badges for user ${userId}`);
    
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if user has completed ANY goals today
    const todayProgress = await pool.query(`
      SELECT COUNT(*) as completed_count
      FROM daily_progress_v2
      WHERE user_id = $1 
        AND date = $2
        AND completed = true
    `, [userId, todayStr]);
    
    const hasProgressToday = todayProgress.rows[0].completed_count > 0;
    
    // Get all days where user completed at least one goal (last 100 days)
    const progressDays = await pool.query(`
      SELECT DISTINCT date::text as date
      FROM daily_progress_v2
      WHERE user_id = $1 
        AND completed = true
        AND date::date >= CURRENT_DATE - INTERVAL '100 days'
      ORDER BY date DESC
    `, [userId]);
    
    console.log(`Found ${progressDays.rows.length} days with progress`);
    
    // Calculate current streak
    let currentStreak = 0;
    
    // Check each day backwards from yesterday (not today)
    for (let i = 1; i <= 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasProgress = progressDays.rows.some(row => row.date === dateStr);
      
      if (hasProgress) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }
    
    // If user has progress today, add 1 to streak
    if (hasProgressToday) {
      currentStreak++;
    }
    
    console.log(`Current streak: ${currentStreak} days`);
    
    // Get user's existing badges
    const existingBadges = await pool.query(
      'SELECT badge_id, b.name as badge_name FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = $1',
      [userId]
    );
    const existingBadgeIds = existingBadges.rows.map(row => row.badge_id);
    
    // Get all streak badges
    const allBadges = await pool.query(
      "SELECT * FROM badges WHERE requirement_type = 'streak_days' ORDER BY requirement_value ASC"
    );
    
    // BRUTAL PART: Remove badges user no longer deserves
    for (const badge of allBadges.rows) {
      const hasBadge = existingBadgeIds.includes(badge.id);
      const deservesBadge = currentStreak >= badge.requirement_value;
      
      if (hasBadge && !deservesBadge) {
        // LOSE THE BADGE - YOU DON'T DESERVE IT ANYMORE
        await pool.query(
          'DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2',
          [userId, badge.id]
        );
        lostBadges.push(badge);
        console.log(`REMOVED ${badge.name} badge from user ${userId} - streak broken!`);
      } else if (!hasBadge && deservesBadge) {
        // Award new badge
        await pool.query(
          'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, badge.id]
        );
        newBadges.push(badge);
        console.log(`Awarded ${badge.name} badge to user ${userId}`);
      }
    }
    
    res.json({ newBadges, lostBadges, currentStreak });
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
    
    // Calculate simple streak - count consecutive days from today/yesterday backwards
    let streak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dates = progressData.rows.map(r => r.date);
    
    // Check if user has progress today
    const hasProgressToday = dates.includes(todayStr);
    
    // Start from yesterday (or today if they have progress today)
    let checkDate = new Date(today);
    if (!hasProgressToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Count backwards while we have consecutive days
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
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
        today: todayStr,
        hasProgressToday: hasProgressToday
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
    
    // Get user's highest streak badge (if they still have any)
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
      // User has no badges - they need to earn them
      res.json(null);
    }
  } catch (err) {
    console.error('Get theme error:', err);
    res.status(500).json({ error: 'Failed to get theme' });
  }
});
// ONE-TIME BADGE SYSTEM BRUTAL FIX
app.post('/api/badges/brutal-fix', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Update all badge names to be more aggressive
    await client.query(`
      UPDATE badges SET 
        name = CASE 
          WHEN requirement_value = 3 THEN 'BEAST MODE'
          WHEN requirement_value = 7 THEN 'WARRIOR'
          WHEN requirement_value = 30 THEN 'SAVAGE'
          WHEN requirement_value = 100 THEN 'LEGEND'
          ELSE name
        END,
        description = CASE
          WHEN requirement_value = 3 THEN '3 day streak - You showed up'
          WHEN requirement_value = 7 THEN '7 day streak - Now we''re talking'
          WHEN requirement_value = 30 THEN '30 day streak - Absolute animal'
          WHEN requirement_value = 100 THEN '100 day streak - Fucking unstoppable'
          ELSE description
        END,
        theme_class = CASE
          WHEN requirement_value = 3 THEN 'theme-beast'
          WHEN requirement_value = 7 THEN 'theme-warrior'
          WHEN requirement_value = 30 THEN 'theme-savage'
          WHEN requirement_value = 100 THEN 'theme-legend'
          ELSE theme_class
        END
      WHERE requirement_type = 'streak_days'
    `);
    
    // Step 2: Get all users and check their ACTUAL streaks
    const users = await client.query('SELECT id, name FROM users');
    
    let fixedUsers = [];
    
    for (const user of users.rows) {
      // Calculate user's current streak
      const today = new Date();
      const progressDays = await client.query(`
        SELECT DISTINCT date::text as date
        FROM daily_progress_v2
        WHERE user_id = $1 
          AND completed = true
          AND date >= CURRENT_DATE - INTERVAL '100 days'
        ORDER BY date DESC
      `, [user.id]);
      
      let currentStreak = 0;
      
      // Check streak backwards from yesterday
      for (let i = 1; i <= 100; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        if (progressDays.rows.some(row => row.date === dateStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
      
      // Check today
      const todayStr = today.toISOString().split('T')[0];
      const todayProgress = await client.query(`
        SELECT COUNT(*) as completed_count
        FROM daily_progress_v2
        WHERE user_id = $1 AND date = $2 AND completed = true
      `, [user.id, todayStr]);
      
      if (todayProgress.rows[0].completed_count > 0) {
        currentStreak++;
      }
      
      // Step 3: Remove ALL badges this user doesn't deserve
      const badges = await client.query(`
        SELECT b.id, b.requirement_value, b.name 
        FROM user_badges ub 
        JOIN badges b ON b.id = ub.badge_id 
        WHERE ub.user_id = $1 AND b.requirement_type = 'streak_days'
      `, [user.id]);
      
      let removedBadges = [];
      
      for (const badge of badges.rows) {
        if (currentStreak < badge.requirement_value) {
          // DELETE THE BADGE - THEY DON'T DESERVE IT
          await client.query(
            'DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2',
            [user.id, badge.id]
          );
          removedBadges.push(badge.name);
        }
      }
      
      fixedUsers.push({
        user: user.name,
        currentStreak,
        removedBadges
      });
    }
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Badge system brutally fixed!',
      details: fixedUsers
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Brutal fix error:', err);
    res.status(500).json({ error: 'Failed to fix badges', details: err.message });
  } finally {
    client.release();
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
               DENSE_RANK() OVER (ORDER BY total_points DESC) as rank
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
    
    // Get current streak - simpler approach
    const progressData = await pool.query(`
      SELECT DISTINCT date::text as date
      FROM daily_progress_v2
      WHERE user_id = $1 AND completed = true
      ORDER BY date DESC
      LIMIT 100
    `, [userId]);
    
    // Calculate streak by counting consecutive days from today/yesterday
    let currentStreak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dates = progressData.rows.map(r => r.date);
    
    // Check if user has progress today
    const hasProgressToday = dates.includes(todayStr);
    
    // Start from yesterday (or today if they have progress today)
    let checkDate = new Date(today);
    if (!hasProgressToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Count backwards while we have consecutive days
    while (currentStreak < 100) { // Safety limit
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    res.json({
      rank: rankResult.rows[0]?.rank || 0,
      total_challenges: parseInt(challengeResult.rows[0]?.challenge_count || 0),
      total_completed_goals: parseInt(goalsResult.rows[0]?.completed_goals || 0),
      current_streak: currentStreak
    });
  } catch (err) {
    console.error('Get user stats error:', err);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// Add this new endpoint after the /api/users/:userId/stats endpoint
// Get detailed performance metrics
app.get('/api/users/:userId/performance-metrics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get total days with any progress
    const daysActiveResult = await pool.query(`
      SELECT COUNT(DISTINCT date) as days_active
      FROM daily_progress_v2
      WHERE user_id = $1 AND completed = true
    `, [userId]);
    
    // Get perfect days (all goals completed)
    const perfectDaysResult = await pool.query(`
      WITH daily_totals AS (
        SELECT 
          dp.date,
          COUNT(CASE WHEN dp.completed THEN 1 END) as completed_count,
          COUNT(DISTINCT cg.goal_index) as total_goals
        FROM daily_progress_v2 dp
        JOIN challenges c ON dp.challenge_id = c.id
        JOIN challenge_goals cg ON c.id = cg.challenge_id
        WHERE dp.user_id = $1
        GROUP BY dp.date, c.id
      )
      SELECT COUNT(*) as perfect_days
      FROM daily_totals
      WHERE completed_count = total_goals AND total_goals > 0
    `, [userId]);
    
    // Get average completion rate
    const completionRateResult = await pool.query(`
      WITH challenge_stats AS (
        SELECT 
          c.id,
          COUNT(CASE WHEN dp.completed THEN 1 END)::float as completed,
          COUNT(dp.*)::float as total
        FROM challenges c
        JOIN daily_progress_v2 dp ON c.id = dp.challenge_id
        WHERE c.user_id = $1
        GROUP BY c.id
      )
      SELECT 
        COALESCE(AVG(CASE WHEN total > 0 THEN (completed / total * 100) ELSE 0 END), 0) as avg_completion_rate
      FROM challenge_stats
    `, [userId]);
    
    // Get total points and calculate average per day
    const userResult = await pool.query(
      'SELECT total_points FROM users WHERE id = $1',
      [userId]
    );
    
    const daysActive = parseInt(daysActiveResult.rows[0].days_active) || 1;
    const totalPoints = userResult.rows[0]?.total_points || 0;
    const avgPointsPerDay = Math.round(totalPoints / daysActive);
    
    // Get longest streak (this is complex, so simplified version)
    const streakResult = await pool.query(`
      SELECT current_streak FROM users WHERE id = $1
    `, [userId]);
    
    res.json({
      totalDaysActive: daysActive,
      perfectDays: parseInt(perfectDaysResult.rows[0].perfect_days) || 0,
      avgCompletionRate: Math.round(completionRateResult.rows[0].avg_completion_rate) || 0,
      avgPointsPerDay: avgPointsPerDay,
      longestStreak: streakResult.rows[0]?.current_streak || 0,
      totalPoints: totalPoints
    });
    
  } catch (err) {
    console.error('Get performance metrics error:', err);
    res.status(500).json({ error: 'Failed to get performance metrics' });
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
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    
    console.log(`Deleting user ${userId} and all related data...`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Delete in order to avoid foreign key constraints
    console.log('1. Deleting ghost daily progress...');
    const ghostResult = await client.query(`
      DELETE FROM ghost_daily_progress 
      WHERE ghost_id IN (SELECT id FROM ghost_challengers WHERE user_id = $1)
    `, [userId]);
    console.log(`   Deleted ${ghostResult.rowCount} ghost daily progress records`);
    
    console.log('2. Deleting ghost challengers...');
    const ghostChallengersResult = await client.query('DELETE FROM ghost_challengers WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${ghostChallengersResult.rowCount} ghost challengers`);
    
    console.log('3. Deleting message reactions...');
    const reactionsResult = await client.query('DELETE FROM message_reactions WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${reactionsResult.rowCount} message reactions`);
    
    console.log('4. Deleting chat messages...');
    const messagesResult = await client.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${messagesResult.rowCount} chat messages`);
    
    console.log('5. Deleting daily progress records...');
    const dailyProgressV2Result = await client.query('DELETE FROM daily_progress_v2 WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${dailyProgressV2Result.rowCount} daily_progress_v2 records`);
    
    const dailyProgressResult = await client.query('DELETE FROM daily_progress WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${dailyProgressResult.rowCount} daily_progress records`);
    
    const dailySummaryResult = await client.query('DELETE FROM daily_progress_summary WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${dailySummaryResult.rowCount} daily progress summary records`);
    
    console.log('6. Deleting challenge participations...');
    const participationsResult = await client.query('DELETE FROM challenge_participants WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${participationsResult.rowCount} challenge participations`);
    
    console.log('7. Deleting user badges...');
    const badgesResult = await client.query('DELETE FROM user_badges WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${badgesResult.rowCount} user badges`);
    
    console.log('8. Deleting past challenges...');
    const pastChallengesResult = await client.query('DELETE FROM past_challenges WHERE user_id = $1', [userId]);
    console.log(`   Deleted ${pastChallengesResult.rowCount} past challenges`);
    
    console.log('9. Deleting challenges created by user...');
    const challengesResult = await client.query('DELETE FROM challenges WHERE created_by = $1', [userId]);
    console.log(`   Deleted ${challengesResult.rowCount} created challenges`);
    
    console.log('10. Deleting user...');
    const userResult = await client.query('DELETE FROM users WHERE id = $1 RETURNING name', [userId]);
    console.log(`   Deleted user: ${userResult.rows.length > 0 ? userResult.rows[0].name : 'none found'}`);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`Successfully deleted user ${userResult.rows[0].name} (ID: ${userId})`);
    res.json({ success: true, deletedUser: userResult.rows[0].name });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to delete user', details: error.message, step: error.step || 'unknown' });
  } finally {
    client.release();
  }
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Archive completed challenge
app.post('/api/users/:userId/archive-challenge', async (req, res) => {
  try {
    const { userId } = req.params;
    const { challengeId, challengeName, duration, totalGoals, pointsEarned, pointsPossible, completionPercentage, startedAt } = req.body;
    
    // Check if this challenge is already archived
    const existingArchive = await pool.query(
      'SELECT id FROM past_challenges WHERE user_id = $1 AND challenge_name = $2 AND started_at = $3',
      [userId, challengeName, startedAt]
    );
    
    if (existingArchive.rows.length > 0) {
      // Already archived, don't create duplicate
      return res.json({ success: true, message: 'Challenge already archived' });
    }
    
    // Archive the challenge
    await pool.query(`
      INSERT INTO past_challenges (user_id, challenge_name, duration, total_goals, points_earned, points_possible, completion_percentage, started_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, challengeName, duration, totalGoals, pointsEarned, pointsPossible, completionPercentage, startedAt]);
    
    // Mark the challenge as completed in the challenges table
    await pool.query('UPDATE challenges SET status = $1 WHERE id = $2', ['completed', challengeId]);
    
    // Reset user's total points to 0 for fresh start
    await pool.query('UPDATE users SET total_points = 0 WHERE id = $1', [userId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Archive challenge error:', err);
    res.status(500).json({ error: 'Failed to archive challenge' });
  }
});

// Get user's past challenges
app.get('/api/users/:userId/past-challenges', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT * FROM past_challenges 
      WHERE user_id = $1 
      ORDER BY completed_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get past challenges error:', err);
    res.status(500).json({ error: 'Failed to get past challenges' });
  }
});

// === GHOST CHALLENGERS API ENDPOINTS ===

// Get user's ghost challengers for current challenge
app.get('/api/users/:userId/challenges/:challengeId/ghosts', async (req, res) => {
  try {
    const { userId, challengeId } = req.params;
    
    const result = await pool.query(`
      SELECT gc.*, gdp.date, gdp.points_earned as daily_points
      FROM ghost_challengers gc
      LEFT JOIN ghost_daily_progress gdp ON gc.id = gdp.ghost_id AND gdp.date = CURRENT_DATE
      WHERE gc.user_id = $1 AND gc.challenge_id = $2 AND gc.is_active = true
      ORDER BY gc.current_points DESC
    `, [userId, challengeId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get ghost challengers error:', err);
    res.status(500).json({ error: 'Failed to get ghost challengers' });
  }
});

// Add new ghost challenger
app.post('/api/users/:userId/challenges/:challengeId/ghosts', async (req, res) => {
  try {
    const { userId, challengeId } = req.params;
    const { ghostName, difficultyLevel, ghostType = 'ai' } = req.body;
    
    // Get challenge details to calculate realistic point ranges
    const challengeResult = await pool.query('SELECT created_at, duration, goals FROM challenges WHERE id = $1', [challengeId]);
    if (challengeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    const challenge = challengeResult.rows[0];
    const maxPointsPerDay = challenge.goals.length;
    
    // Set point ranges based on challenge goals and difficulty percentage
    const difficultySettings = {
      casual: { 
        minPercent: 0.4, 
        maxPercent: 0.6 
      },
      moderate: { 
        minPercent: 0.6, 
        maxPercent: 0.8 
      },
      aggressive: { 
        minPercent: 0.8, 
        maxPercent: 0.95 
      },
      psycho: { 
        minPercent: 1.0, 
        maxPercent: 1.0 
      }
    };
    
    const settings = difficultySettings[difficultyLevel] || difficultySettings.moderate;
    const pointsMin = Math.max(1, Math.floor(maxPointsPerDay * settings.minPercent));
    const pointsMax = Math.min(maxPointsPerDay, Math.ceil(maxPointsPerDay * settings.maxPercent));
    
    const startDate = new Date(challenge.created_at);
    const today = new Date();
    const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.min(daysDiff, challenge.duration);
    
    // Calculate points the ghost should have by now
    let totalPoints = 0;
    for (let day = 1; day < currentDay; day++) {
      const dailyPoints = Math.floor(Math.random() * (pointsMax - pointsMin + 1)) + pointsMin;
      totalPoints += dailyPoints;
    }
    
    const result = await pool.query(`
      INSERT INTO ghost_challengers (
        user_id, challenge_id, ghost_name, difficulty_level, 
        points_per_day_min, points_per_day_max, current_points, current_day, ghost_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [userId, challengeId, ghostName, difficultyLevel, pointsMin, pointsMax, totalPoints, currentDay, ghostType]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Add ghost challenger error:', err);
    res.status(500).json({ error: 'Failed to add ghost challenger' });
  }
});

// Remove ghost challenger
app.delete('/api/users/:userId/ghosts/:ghostId', async (req, res) => {
  try {
    const { userId, ghostId } = req.params;
    
    await pool.query(
      'UPDATE ghost_challengers SET is_active = false WHERE id = $1 AND user_id = $2',
      [ghostId, userId]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove ghost challenger error:', err);
    res.status(500).json({ error: 'Failed to remove ghost challenger' });
  }
});

// Update ghost challenger daily progress (called automatically)
app.post('/api/ghosts/:ghostId/daily-progress', async (req, res) => {
  try {
    const { ghostId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    // Get ghost details
    const ghostResult = await pool.query('SELECT * FROM ghost_challengers WHERE id = $1', [ghostId]);
    if (ghostResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ghost not found' });
    }
    
    const ghost = ghostResult.rows[0];
    
    // Check if already has progress for today
    const existingProgress = await pool.query(
      'SELECT id FROM ghost_daily_progress WHERE ghost_id = $1 AND date = $2',
      [ghostId, today]
    );
    
    if (existingProgress.rows.length > 0) {
      return res.json({ message: 'Progress already recorded for today' });
    }
    
    // Generate random points for today
    const pointsEarned = Math.floor(
      Math.random() * (ghost.points_per_day_max - ghost.points_per_day_min + 1)
    ) + ghost.points_per_day_min;
    
    // Record daily progress
    await pool.query(
      'INSERT INTO ghost_daily_progress (ghost_id, date, points_earned) VALUES ($1, $2, $3)',
      [ghostId, today, pointsEarned]
    );
    
    // Update ghost total points
    await pool.query(
      'UPDATE ghost_challengers SET current_points = current_points + $1, current_day = current_day + 1 WHERE id = $2',
      [pointsEarned, ghostId]
    );
    
    res.json({ success: true, pointsEarned });
  } catch (err) {
    console.error('Update ghost progress error:', err);
    res.status(500).json({ error: 'Failed to update ghost progress' });
  }
});

// Update all active ghosts for a user (catch-up mechanism)
app.post('/api/users/:userId/ghosts/update-all', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all active ghosts for user with their challenge info
    const ghostsResult = await pool.query(`
      SELECT gc.*, c.goals, c.created_at as challenge_start, c.duration 
      FROM ghost_challengers gc 
      JOIN challenges c ON gc.challenge_id = c.id 
      WHERE gc.user_id = $1 AND gc.is_active = true AND c.status = $2
    `, [userId, 'active']);
    
    const updatedGhosts = [];
    
    for (const ghost of ghostsResult.rows) {
      const maxPointsPerDay = ghost.goals.length;
      const startDate = new Date(ghost.challenge_start);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + ghost.duration - 1);
      const today = new Date();
      
      // Get all dates the ghost should have progress for
      const currentDate = new Date(Math.max(startDate, new Date(ghost.created_at)));
      
      let totalPointsAdded = 0;
      let daysUpdated = 0;
      
      while (currentDate <= Math.min(today, endDate)) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if progress exists for this date
        const existingProgress = await pool.query(
          'SELECT id FROM ghost_daily_progress WHERE ghost_id = $1 AND date = $2',
          [ghost.id, dateStr]
        );
        
        if (existingProgress.rows.length === 0) {
          // Generate points for this day using stored min/max
          const pointsEarned = Math.floor(
            Math.random() * (ghost.points_per_day_max - ghost.points_per_day_min + 1)
          ) + ghost.points_per_day_min;
          
          // Record daily progress
          await pool.query(
            'INSERT INTO ghost_daily_progress (ghost_id, date, points_earned) VALUES ($1, $2, $3)',
            [ghost.id, dateStr, pointsEarned]
          );
          
          totalPointsAdded += pointsEarned;
          daysUpdated++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Update ghost total points
      if (totalPointsAdded > 0) {
        await pool.query(
          'UPDATE ghost_challengers SET current_points = current_points + $1 WHERE id = $2',
          [totalPointsAdded, ghost.id]
        );
        
        updatedGhosts.push({
          id: ghost.id,
          name: ghost.ghost_name,
          pointsAdded: totalPointsAdded,
          daysUpdated
        });
      }
    }
    
    res.json({ success: true, updatedGhosts });
  } catch (err) {
    console.error('Update all ghosts error:', err);
    res.status(500).json({ error: 'Failed to update ghosts' });
  }
});

// Initialize database and start server
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} with database connection`);
  });
});
