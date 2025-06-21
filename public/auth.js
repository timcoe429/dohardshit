// auth.js - Handle all authentication
class AuthManager {
    constructor(app) {
        this.app = app;
    }
    
    async createUser(name) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            return await response.json();
        } catch (err) {
            console.error('Create user error:', err);
            return null;
        }
    }

    async handleLogin(name) {
        const user = await this.createUser(name);
        if (user) {
            this.app.currentUser = user;
            this.app.userStats.totalPoints = user.total_points;
            this.app.currentScreen = 'dashboard';
            
            // Load user's data
            try {
                const [challengesData, statsData, leaderboardData] = await Promise.all([
                    this.app.challengeManager.loadChallenges(user.id),
                    this.app.loadUserStats(user.id),
                    this.app.loadLeaderboard()
                ]);
                
                this.app.challenges = Array.isArray(challengesData) ? challengesData : [];
                this.app.userStats = { ...this.app.userStats, ...statsData };
                this.app.leaderboard = leaderboardData;
                
                if (this.app.challenges.length > 0) {
                    this.app.activeChallenge = this.app.challenges[0];
                    await this.app.progressManager.initTodayProgress();
                }
            } catch (err) {
                console.error('Error loading user data:', err);
                this.app.challenges = [];
            }
            
            this.app.render();
        }
    }
    
    handleLogout() {
        this.app.currentUser = null;
        this.app.challenges = [];
        this.app.activeChallenge = null;
        this.app.dailyProgress = {};
        this.app.userStats = { totalPoints: 0 };
        this.app.currentScreen = 'login';
        this.app.render();
    }
}
