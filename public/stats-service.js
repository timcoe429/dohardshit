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
        
        // Cache for optimizing frequent updates
        this.lastUpdate = 0;
        this.updateThrottle = 1000; // 1 second
    }

    // ==========================================
    // CORE SYNC METHODS
    // ==========================================

    async syncAllStats() {
        try {
            console.log('🔄 Syncing all stats from server...');
            
            // Get fresh user data
            const userResponse = await fetch(`/api/users/${this.app.currentUser.id}`);
            if (!userResponse.ok) throw new Error('Failed to fetch user data');
            const userData = await userResponse.json();
            
            // Get user stats
            const statsResponse = await fetch(`/api/users/${this.app.currentUser.id}/stats`);
            if (!statsResponse.ok) throw new Error('Failed to fetch user stats');
            const statsData = await statsResponse.json();
            
            // Get current badge
            const badgeResponse = await fetch(`/api/users/${this.app.currentUser.id}/current-theme`);
            const badgeData = badgeResponse.ok ? await badgeResponse.json() : null;
            
            // Update our single source of truth
            this.stats.totalPoints = userData.total_points || 0;
            this.stats.dailyPoints = this.calculateDailyPoints();
            this.stats.challengeDays = this.calculateChallengeDays();
            this.stats.challengeProgress = this.calculateChallengeProgress();
            this.stats.todayCompletion = this.calculateTodayCompletion();
            this.stats.currentBadge = badgeData;
            this.stats.currentStreak = statsData.current_streak || 0;
            this.stats.rank = statsData.rank || 0;
            this.stats.totalChallenges = statsData.total_challenges || 0;
            this.stats.completedGoals = statsData.total_completed_goals || 0;
            
            // Update the currentUser object to maintain compatibility
            this.app.currentUser.total_points = this.stats.totalPoints;
            this.app.currentUser.badge_title = badgeData ? badgeData.name : 'Lil Bitch';
            this.app.currentUser.current_streak = this.stats.currentStreak;
            
            // Update userStats object to maintain compatibility
            this.app.userStats = {
                totalPoints: this.stats.totalPoints,
                rank: this.stats.rank,
                total_challenges: this.stats.totalChallenges,
                total_completed_goals: this.stats.completedGoals,
                current_streak: this.stats.currentStreak
            };
            
            console.log('✅ Stats synced:', this.stats);
            
            // Update all UI elements
            this.updateAllUI();
            
            this.lastUpdate = Date.now();
            
        } catch (err) {
            console.error('❌ Failed to sync stats:', err);
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
        
        const isComplete = this.app.challengeManager?.isChallengeComplete() || false;
        if (isComplete) return 0;
        
        const currentDay = this.app.challengeManager?.getCurrentChallengeDay() || 1;
        console.log('🗓️ Challenge Days Debug:', {
            hasActiveChallenge: !!this.app.activeChallenge,
            isComplete,
            currentDay,
            challengeName: this.app.activeChallenge?.name,
            createdAt: this.app.activeChallenge?.created_at
        });
        
        // Ensure we never show Day 0 - minimum should be Day 1
        return Math.max(currentDay, 1);
    }

    calculateChallengeProgress() {
        if (!this.app.activeChallenge) return 0;
        
        // Calculate progress based on current day vs total duration
        const currentDay = this.calculateChallengeDays();
        const totalDays = this.app.activeChallenge.duration;
        const progress = Math.round((currentDay / totalDays) * 100);
        
        console.log('📊 Challenge Progress Calculation:', {
            currentDay,
            totalDays,
            progress: `${progress}%`,
            challengeName: this.app.activeChallenge.name
        });
        
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
        // Ensure we never return 0 for an active challenge
        const challengeDays = Math.max(this.stats.challengeDays, 1);
        console.log('📊 StatsService getChallengeDays:', {
            rawStats: this.stats.challengeDays,
            finalValue: challengeDays,
            hasActiveChallenge: !!this.app.activeChallenge
        });
        return challengeDays;
    }

    getChallengeProgress() {
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
} 