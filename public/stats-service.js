// stats-service.js - Centralized source of truth for all user statistics
class StatsService {
    constructor(app) {
        this.app = app;
        
        // Single source of truth for all stats
        this.stats = {
            totalPoints: 0,
            dailyPoints: 0,
            challengeDays: 0,
            challengeProgress: 0,
            todayCompletion: 0,
            currentBadge: null,
            currentStreak: 0,
            rank: 0,
            totalChallenges: 0,
            completedGoals: 0
        };
        console.log('📊 STATS OBJECT INITIALIZED:', this.stats);
        
        // Cache for optimizing frequent updates
        this.lastUpdate = 0;
        this.updateThrottle = 1000; // 1 second
    }

    // ==========================================
    // CORE SYNC METHODS
    // ==========================================

    async syncAllStats() {
        // Add throttling to prevent excessive API calls
        const now = Date.now();
        if (now - this.lastUpdate < this.updateThrottle) {
            console.log('⏳ Stats sync throttled');
            return;
        }
        this.lastUpdate = now;
        
        // PROGRESS BAR DEBUG - Starting sync
        
        try {
            // First sync the active challenge
            await this.syncActiveChallenge();
            
            // Then sync points and other stats that depend on having the challenge loaded
            await Promise.all([
                this.syncPoints(),
                this.syncBadges(),
                this.syncRank()
            ]);
            
            this.updateAllUI();
            // PROGRESS BAR DEBUG - Sync complete
            console.log('✅ SYNC COMPLETE');
        } catch (error) {
            console.error('Stats sync error:', error);
        }
    }

    async quickSync() {
        // Only sync if enough time has passed (throttling)
        if (Date.now() - this.lastUpdate < this.updateThrottle) {
            this.updateAllUI();
            return;
        }
        
        await this.syncAllStats();
    }

    async syncActiveChallenge() {
        try {
            if (!this.app.currentUser) return;
            
            // If we already have an active challenge loaded, just recalculate stats
            if (this.app.activeChallenge) {
                console.log('📋 Using existing active challenge:', this.app.activeChallenge.name);
                
                // Calculate and store the stats
                this.stats.challengeDays = this.calculateChallengeDays();
                this.stats.challengeProgress = this.calculateChallengeProgress();
                this.stats.dailyPoints = this.calculateDailyPoints();
                this.stats.todayCompletion = this.calculateTodayCompletion();
                
                // PROGRESS BAR DEBUG - Stats stored (existing challenge)
                console.log('📊 STATS STORED:', { days: this.stats.challengeDays, progress: this.stats.challengeProgress });
                return;
            }
            
            // No active challenge loaded yet, try to find one
            const challenges = await this.app.challengeManager.loadChallenges(this.app.currentUser.id);
            
            // Find the active challenge (not completed)
            const activeChallenge = challenges.find(c => {
                const createdAt = new Date(c.created_at);
                const now = new Date();
                const daysPassed = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
                return daysPassed < c.duration;
            });
            
            if (activeChallenge) {
                this.app.activeChallenge = activeChallenge;
                console.log('📋 Active challenge loaded:', activeChallenge.name);
                
                // Initialize today's progress for the active challenge
                await this.app.progressManager.initTodayProgress();
                
                // Calculate and store the stats
                this.stats.challengeDays = this.calculateChallengeDays();
                this.stats.challengeProgress = this.calculateChallengeProgress();
                this.stats.dailyPoints = this.calculateDailyPoints();
                this.stats.todayCompletion = this.calculateTodayCompletion();
                
                // PROGRESS BAR DEBUG - Stats stored (loaded challenge)
                console.log('📊 STATS STORED:', { days: this.stats.challengeDays, progress: this.stats.challengeProgress });
            } else {
                this.app.activeChallenge = null;
                this.stats.challengeDays = 0;
                this.stats.challengeProgress = 0;
                console.log('⚠️ No active challenge found');
            }
        } catch (error) {
            console.error('Failed to sync active challenge:', error);
        }
    }

    // ==========================================
    // CALCULATION METHODS
    // ==========================================

    calculateDailyPoints() {
        if (!this.app.dailyProgress || !this.app.activeChallenge) return 0;
        
        const today = new Date().toISOString().split('T')[0];
        const todayProgress = this.app.dailyProgress[today] || {};
        return Object.values(todayProgress).filter(Boolean).length;
    }

    calculateChallengeDays() {
        if (!this.app.activeChallenge) return 0;
        
        const createdAt = new Date(this.app.activeChallenge.created_at);
        const now = new Date();
        
        // Simplified calculation - just use local timezone
        // Set both to midnight for fair day comparison
        const createdDay = new Date(createdAt);
        createdDay.setHours(0, 0, 0, 0);
        
        const currentDay = new Date(now);
        currentDay.setHours(0, 0, 0, 0);
        
        // Calculate difference in days
        const timeDiff = currentDay.getTime() - createdDay.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
        
        // Ensure minimum day 1, maximum duration
        const finalDay = Math.max(1, Math.min(dayDiff, this.app.activeChallenge.duration));
        
        // PROGRESS BAR DEBUG - Day calculation
        console.log('📅 DAY CALC:', { challengeName: this.app.activeChallenge.name, dayDiff, finalDay });
        
        return finalDay;
    }

    calculateChallengeProgress() {
        if (!this.app.activeChallenge) return 0;
        
        // Calculate progress based on current day vs total duration
        const currentDay = this.calculateChallengeDays();
        const totalDays = this.app.activeChallenge.duration;
        const progress = Math.round((currentDay / totalDays) * 100);
        
        // PROGRESS BAR DEBUG - Progress calculation  
        console.log('📊 PROGRESS CALC:', { currentDay, totalDays, progress });
        
        return Math.min(progress, 100); // Cap at 100%
    }

    calculateTodayCompletion() {
        if (!this.app.activeChallenge) return 0;
        const dailyPoints = this.calculateDailyPoints();
        const totalGoals = this.app.activeChallenge.goals.length;
        return Math.round((dailyPoints / totalGoals) * 100);
    }

    // ==========================================
    // GETTER METHODS (Single Source of Truth)
    // ==========================================

    getTotalPoints() {
        return this.stats.totalPoints;
    }

    getDailyPoints() {
        return this.stats.dailyPoints;
    }

    getChallengeDays() {
        console.log('📊 GETTER DEBUG - getChallengeDays():', this.stats.challengeDays);
        return this.stats.challengeDays;
    }

    getChallengeProgress() {
        console.log('📊 GETTER DEBUG - getChallengeProgress():', this.stats.challengeProgress);
        return this.stats.challengeProgress;
    }

    getTodayCompletion() {
        return this.stats.todayCompletion;
    }

    getCurrentBadge() {
        return this.stats.currentBadge;
    }

    getCurrentStreak() {
        return this.stats.currentStreak;
    }

    getRank() {
        return this.stats.rank;
    }

    getTotalChallenges() {
        return this.stats.totalChallenges;
    }

    getCompletedGoals() {
        return this.stats.completedGoals;
    }

    getBadgeInfo() {
        const badge = this.getCurrentBadge();
        if (badge) {
            return {
                name: badge.name,
                icon: badge.icon,
                title: badge.name
            };
        }
        
        return {
            name: 'Lil Bitch',
            icon: '🍆',
            title: 'Lil Bitch'
        };
    }

    // ==========================================
    // UI UPDATE METHODS
    // ==========================================

    updateAllUI() {
        this.updateHeaderPoints();
        this.updateDashboardCards();
        this.updateBadgeDisplays();
        this.updateLeaderboards();
        this.updatePersonalStatsTab();
    }

    updateHeaderPoints() {
        // Update header total points
        const headerElements = document.querySelectorAll('.text-black');
        headerElements.forEach(el => {
            if (el.textContent.includes('points')) {
                el.textContent = `${this.getTotalPoints()} points`;
            }
        });
    }

    updateDashboardCards() {
        // Update Today's Points card
        const todayPointsElement = document.querySelector('.grid .text-2xl.text-black');
        if (todayPointsElement) {
            todayPointsElement.textContent = this.getDailyPoints();
        }

        // Update Completion % card
        const completionElement = document.querySelector('.text-2xl.text-green-600');
        if (completionElement) {
            completionElement.textContent = `${this.getTodayCompletion()}%`;
        }

        // Update Challenge Days card
        const challengeDaysElements = document.querySelectorAll('.text-2xl.text-red-600');
        challengeDaysElements.forEach(el => {
            if (el.textContent.match(/^\d+/)) {
                const challengeDaysText = this.getChallengeDays() || 'No active challenge';
                el.textContent = challengeDaysText;
            }
        });
        
        // PROGRESS BAR FIX: Update the progress bar text and width
        if (this.app.activeChallenge) {
            const challengeDay = this.getChallengeDays();
            const challengeProgress = this.getChallengeProgress();
            const duration = this.app.activeChallenge.duration;
            
            // Update progress bar text
            const progressText = document.querySelector('.text-sm.text-gray-600');
            if (progressText && progressText.textContent.includes('Day')) {
                progressText.textContent = `Day ${challengeDay} of ${duration} • ${challengeProgress}% complete`;
            }
            
            // Update progress bar width
            const progressBar = document.querySelector('.bg-black.h-2.rounded-full');
            if (progressBar) {
                progressBar.style.width = `${challengeProgress}%`;
            }
            
            console.log('📊 PROGRESS BAR UPDATED:', { challengeDay, challengeProgress, duration });
        }
    }

    updateBadgeDisplays() {
        const badgeInfo = this.getBadgeInfo();
        
        // Update current badge card on dashboard
        const badgeCard = document.getElementById('current-badge-card');
        if (badgeCard) {
            badgeCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Current Badge</p>
                        <p class="text-lg font-bold text-gray-800">${badgeInfo.name}</p>
                    </div>
                    <span class="text-2xl">${badgeInfo.icon}</span>
                </div>
            `;
        }

        // Update badge in personal stats tab - use more specific selectors
        const personalStatsTabBadge = document.querySelector('#statsTab .bg-white .text-2xl');
        if (personalStatsTabBadge) {
            personalStatsTabBadge.textContent = badgeInfo.icon;
        }
        
        // Update badge name in personal stats tab
        const personalStatsTabBadgeName = document.querySelector('#statsTab .bg-white .font-medium');
        if (personalStatsTabBadgeName) {
            personalStatsTabBadgeName.textContent = badgeInfo.name;
        }
    }

    updateLeaderboards() {
        // Refresh ghost leaderboard if open
        if (this.app.currentGhosts && document.getElementById('ghostLeaderboard')) {
            this.app.updateGhostLeaderboard();
        }

        // Refresh main leaderboard if needed
        if (this.app.loadLeaderboard) {
            this.app.loadLeaderboard();
        }
    }

    updatePersonalStatsTab() {
        // Update total points in personal stats
        const personalStatsPoints = document.querySelector('#statsTab .bg-gray-50 .text-2xl.text-black');
        if (personalStatsPoints) {
            personalStatsPoints.textContent = this.getTotalPoints();
        }
        
        // Update current streak in personal stats tab
        const personalStatsStreak = document.querySelector('#statsTab .text-xs.text-gray-500');
        if (personalStatsStreak && personalStatsStreak.textContent.includes('Current streak:')) {
            personalStatsStreak.textContent = `Current streak: ${this.getCurrentStreak()} days`;
        }
    }

    // Force refresh the personal stats tab content
    forceRefreshPersonalStatsTab() {
        const statsTab = document.getElementById('statsTab');
        if (statsTab && !statsTab.classList.contains('hidden')) {
            // Personal stats tab is currently visible, update it
            this.updateBadgeDisplays();
            this.updatePersonalStatsTab();
        }
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    async onTaskCompleted() {
        console.log('📊 Task completed - syncing stats...');
        await this.syncAllStats();
    }

    async onBadgeEarned() {
        console.log('🏆 Badge earned - syncing stats...');
        await this.syncAllStats();
        
        // Force a complete UI refresh after badge changes
        setTimeout(() => {
            this.forceRefreshPersonalStatsTab();
            this.updateAllUI();
        }, 100);
    }

    async onChallengeChanged() {
        console.log('🎯 Challenge changed - syncing stats...');
        await this.syncAllStats();
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    getAllStats() {
        return { ...this.stats };
    }

    isDataFresh() {
        return Date.now() - this.lastUpdate < this.updateThrottle;
    }

    forceRefresh() {
        this.lastUpdate = 0;
        return this.syncAllStats();
    }

    // Debug method - accessible from console
    debugStats() {
        console.log('📊 Current Stats:', this.stats);
        console.log('📊 Badge Info:', this.getBadgeInfo());
        console.log('📊 Is Data Fresh:', this.isDataFresh());
        console.log('📊 Last Update:', new Date(this.lastUpdate));
        return this.stats;
    }

    // Manual sync method for console debugging  
    async debugSync() {
        console.log('🔄 Manual sync triggered...');
        await this.syncAllStats();
        this.updateAllUI();
        this.forceRefreshPersonalStatsTab();
        console.log('✅ Manual sync complete');
        return this.debugStats();
    }

    async syncPoints() {
        try {
            const userResponse = await fetch(`/api/users/${this.app.currentUser.id}`);
            if (!userResponse.ok) throw new Error('Failed to fetch user data');
            const userData = await userResponse.json();
            
            this.stats.totalPoints = userData.total_points || 0;
            this.stats.dailyPoints = this.calculateDailyPoints();
            this.stats.todayCompletion = this.calculateTodayCompletion();
            
            // Update the currentUser object to maintain compatibility
            this.app.currentUser.total_points = this.stats.totalPoints;
            
            console.log('💰 Points synced:', {
                total: this.stats.totalPoints,
                daily: this.stats.dailyPoints
            });
        } catch (error) {
            console.error('Failed to sync points:', error);
        }
    }
    
    async syncBadges() {
        try {
            const badgeResponse = await fetch(`/api/users/${this.app.currentUser.id}/current-theme`);
            const badgeData = badgeResponse.ok ? await badgeResponse.json() : null;
            
            this.stats.currentBadge = badgeData;
            
            // Update the currentUser object to maintain compatibility
            this.app.currentUser.badge_title = badgeData ? badgeData.name : 'Lil Bitch';
            
            console.log('🏅 Badge synced:', badgeData?.name || 'None');
        } catch (error) {
            console.error('Failed to sync badges:', error);
        }
    }
    
    async syncRank() {
        try {
            const statsResponse = await fetch(`/api/users/${this.app.currentUser.id}/stats`);
            if (!statsResponse.ok) throw new Error('Failed to fetch user stats');
            const statsData = await statsResponse.json();
            
            this.stats.currentStreak = statsData.current_streak || 0;
            this.stats.rank = statsData.rank || 0;
            this.stats.totalChallenges = statsData.total_challenges || 0;
            this.stats.completedGoals = statsData.total_completed_goals || 0;
            
            // Update the currentUser object to maintain compatibility
            this.app.currentUser.current_streak = this.stats.currentStreak;
            
            // Update userStats object to maintain compatibility
            this.app.userStats = {
                totalPoints: this.stats.totalPoints,
                rank: this.stats.rank,
                total_challenges: this.stats.totalChallenges,
                total_completed_goals: this.stats.completedGoals,
                current_streak: this.stats.currentStreak
            };
            
            console.log('📊 Rank/Stats synced:', {
                rank: this.stats.rank,
                streak: this.stats.currentStreak
            });
        } catch (error) {
            console.error('Failed to sync rank:', error);
        }
    }

    // ==========================================
    // CALCULATION METHODS (Server Data Processing)
    // ==========================================
} 