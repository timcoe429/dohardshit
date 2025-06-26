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
            // Initialize chat
            if (!window.chatManager) {
                window.chatManager = new ChatManager(this.app.currentUser.id, this.app.currentUser.name);
            }

            // Check and apply theme
            await this.app.updateTheme();
            
            // Debug badge system
            console.log('Checking badges for user:', user.id);
            
            // Add a small delay to ensure everything is loaded
            setTimeout(async () => {
                try {
                    // First, check the debug endpoint
                    const debugResponse = await fetch(`/api/users/${user.id}/streak-debug`);
                    if (debugResponse.ok) {
                        const debugData = await debugResponse.json();
                        console.log('Streak Debug Info:', debugData);
                    }
                    
                    // Then check badges
                    const badgeResponse = await fetch(`/api/users/${user.id}/check-badges`, {
                        method: 'POST'
                    });
                    
                    if (badgeResponse.ok) {
                        const badgeData = await badgeResponse.json();
                        console.log('Badge Check Result:', badgeData);
                        
                        if (badgeData.newBadges && badgeData.newBadges.length > 0) {
                            console.log('New badges awarded!', badgeData.newBadges);
                            // Show notification for each new badge
                            badgeData.newBadges.forEach(badge => {
                                this.app.progressManager.showBadgeNotification(badge);
                            });
                        }
                        
                        // Update theme based on badges
                        await this.app.updateTheme();
                        
                        // Force render the badge progress tracker
                        setTimeout(() => {
                            this.app.renderer.renderNextBadgeProgress();
                        }, 500);
                    } else {
                        console.error('Badge check failed:', badgeResponse.status);
                    }
                } catch (err) {
                    console.error('Badge system error:', err);
                }
            }, 1000);
            
            this.app.render();
            setTimeout(() => {
                this.app.renderer.renderNextBadgeProgress();
            }, 100);
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
