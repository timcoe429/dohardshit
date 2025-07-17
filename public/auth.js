// auth.js - Handle all authentication
class AuthManager {
    constructor(app) {
        this.app = app;
    }
    
    // Save login data to localStorage
    saveLoginData(user) {
        try {
            localStorage.setItem('challengeApp_user', JSON.stringify({
                id: user.id,
                name: user.name,
                total_points: user.total_points,
                savedAt: new Date().toISOString()
            }));
        } catch (err) {
            console.error('Failed to save login data:', err);
        }
    }
    
    // Check for saved login on app start
    async checkSavedLogin() {
        try {
            const savedData = localStorage.getItem('challengeApp_user');
            if (!savedData) return false;
            
            const userData = JSON.parse(savedData);
            
            // Optional: Check if login is too old (30 days)
            const savedDate = new Date(userData.savedAt);
            const daysSinceSave = (new Date() - savedDate) / (1000 * 60 * 60 * 24);
            if (daysSinceSave > 30) {
                this.clearLoginData();
                return false;
            }
            
            // Auto-login with saved data
            await this.handleLogin(userData.name, true);
            
            // Check if login actually succeeded
            if (!this.app.currentUser) {
                console.log('Auto-login failed, clearing saved data');
                this.clearLoginData();
                return false;
            }
            
            return true;
        } catch (err) {
            console.error('Failed to restore login:', err);
            this.clearLoginData();
            return false;
        }
    }
    
    // Clear saved login data
    clearLoginData() {
        try {
            localStorage.removeItem('challengeApp_user');
        } catch (err) {
            console.error('Failed to clear login data:', err);
        }
    }
    
    async createUser(name, password = '') {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                return { error: result.error || 'Login failed' };
            }
            
            return result;
        } catch (err) {
            console.error('Create user error:', err);
            return { error: 'Connection error. Please try again.' };
        }
    }
    
    async handleLogin(name, isAutoLogin = false) {
        // Get password from input if not auto-login
        const password = isAutoLogin ? '' : (document.getElementById('passwordInput')?.value || '');
        
        // Always clear any existing user data first to prevent conflicts
        this.forceLogout();
        
        const user = await this.createUser(name, password);
        if (user && !user.error) {
            this.app.currentUser = user;
            this.app.userStats.totalPoints = user.total_points;
            this.app.currentScreen = 'dashboard';
            
            // Save login data for persistence (only if not auto-login)
            if (!isAutoLogin) {
                this.saveLoginData(user);
            }
            
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
                    
                    // Check if active challenge is complete and archive it
                    if (this.app.challengeManager.isChallengeComplete()) {
                        await this.app.challengeManager.archiveCompletedChallenge();
                        // Reload challenges after archiving
                        this.app.challenges = await this.app.challengeManager.loadChallenges(user.id);
                        this.app.activeChallenge = this.app.challenges.length > 0 ? this.app.challenges[0] : null;
                    }
                    
                    if (this.app.activeChallenge) {
                        await this.app.progressManager.initTodayProgress();
                    }
                }
                
                // Load past challenges
                this.app.pastChallenges = await this.app.challengeManager.loadPastChallenges(user.id);
            } catch (err) {
                console.error('Error loading user data:', err);
                this.app.challenges = [];
            }
            // Initialize chat
            // if (!window.chatManager) {
            //     window.chatManager = new ChatManager(this.app.currentUser.id, this.app.currentUser.name);
            // }

            // Check and apply theme
            await this.app.updateTheme();
            
            // Debug badge system
            console.log('Checking badges for user:', user.id);
            
            // Initialize StatsService and sync all data
            setTimeout(async () => {
                try {
                    // Initialize StatsService with fresh data
                    if (this.app.statsService) {
                        this.app.statsService.lastUpdate = 0; // Force fresh sync
                        await this.app.statsService.syncAllStats();
                        console.log('✅ StatsService initialized with fresh data (forced refresh)');
                    }
                    
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
                            
                            // Sync stats after badge changes
                            if (this.app.statsService) {
                                await this.app.statsService.onBadgeEarned();
                            }
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
        } else {
            // Handle login error
            if (user && user.error) {
                this.showLoginError(user.error);
            } else {
                this.showLoginError('Login failed. Please try again.');
            }
        }
    }
    
    showLoginError(message) {
        // Remove any existing error message
        const existingError = document.getElementById('loginError');
        if (existingError) {
            existingError.remove();
        }
        
        // Create and show error message
        const errorDiv = document.createElement('div');
        errorDiv.id = 'loginError';
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center';
        errorDiv.textContent = message;
        
        // Insert before the login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.parentNode.insertBefore(errorDiv, loginBtn);
        }
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    forceLogout() {
        // Clear ALL user data without rendering - used for clean switching
        this.clearLoginData();
        
        this.app.currentUser = null;
        this.app.challenges = [];
        this.app.activeChallenge = null;
        this.app.dailyProgress = {};
        this.app.userStats = { 
            totalPoints: 0, 
            rank: 0, 
            total_challenges: 0, 
            total_completed_goals: 0, 
            current_streak: 0 
        };
        this.app.leaderboard = [];
        this.app.pastChallenges = [];
        this.app.currentGhosts = [];
        
        // Reset stats service
        if (this.app.statsService) {
            this.app.statsService.reset();
        }
    }

    handleLogout() {
        // Clear saved login data when logging out
        this.forceLogout();
        this.app.currentScreen = 'login';
        this.app.render();
    }
    
    // Debug method - can be called from console: window.app.authManager.forceFullReset()
    forceFullReset() {
        console.log('🔄 FORCE RESET: Clearing ALL app data...');
        
        // Clear localStorage completely
        try {
            localStorage.removeItem('challengeApp_user');
            // Clear any other cached data that might exist
            for (let key in localStorage) {
                if (key.startsWith('challengeApp_') || key.startsWith('dohardshit_')) {
                    localStorage.removeItem(key);
                }
            }
            console.log('✅ LocalStorage cleared');
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
        }
        
        // Clear all app state
        this.forceLogout();
        
        // Force reload the page
        console.log('🔄 Reloading page...');
        window.location.reload();
    }
}
