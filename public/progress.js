// progress.js - Handle progress tracking
class ProgressManager {
    constructor(app) {
        this.app = app;
    }

    async loadDailyProgress(userId, challengeId, date) {
        try {
            const response = await fetch(`/api/progress/${userId}/${challengeId}/${date}`);
            const data = await response.json();
            
            // Convert array to object keyed by goal index
            const progress = {};
            if (Array.isArray(data)) {
                data.forEach(item => {
                    progress[item.goal_index] = item.completed;
                });
            } else {
                // If data is already an object, use it directly
                Object.assign(progress, data);
            }
            
            return progress;
        } catch (err) {
            console.error('Load progress error:', err);
            return {};
        }
    }

    async updateProgress(userId, challengeId, date, goalIndex, completed) {
        try {
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    challenge_id: challengeId,
                    date,
                    goal_index: goalIndex,
                    completed
                })
            });
            return await response.json();
        } catch (err) {
            console.error('Update progress error:', err);
            return null;
        }
    }

    async initTodayProgress() {
        if (!this.app.activeChallenge || !this.app.currentUser) return;
        
        const today = this.getESTDate();
        const progress = await this.loadDailyProgress(
            this.app.currentUser.id, 
            this.app.activeChallenge.id, 
            today
        );
        
        console.log('=== DEBUG: initTodayProgress ===');
        console.log('Active challenge goals:', this.app.activeChallenge.goals);
        console.log('Progress from database:', progress);
        console.log('Today:', today);
        
        if (!this.app.dailyProgress[today]) {
            this.app.dailyProgress[today] = {};
        }
        
        // Initialize all goals as uncompleted first
        this.app.activeChallenge.goals.forEach((goal, index) => {
            this.app.dailyProgress[today][index] = false;
        });
        
        // Then update with actual progress from database
        Object.keys(progress).forEach(goalIndex => {
            this.app.dailyProgress[today][goalIndex] = progress[goalIndex];
            console.log(`Setting goal ${goalIndex} to ${progress[goalIndex]}`);
        });
        
        console.log('Final dailyProgress for today:', this.app.dailyProgress[today]);
    }

    // Helper method to get local date (matching challenge day calculation)
    getESTDate() {
        // Use local timezone to match challenge day calculation
        const now = new Date();
        
        // Format as YYYY-MM-DD in local timezone
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        const dateStr = `${year}-${month}-${day}`;
        console.log('📅 Progress date (local):', dateStr);
        return dateStr;
    }
    
    getTodayProgress() {
        const today = this.getESTDate();
        return this.app.dailyProgress[today] || {};
    }
    
    getTodayPoints() {
        const todayProgress = this.getTodayProgress();
        return Object.values(todayProgress).filter(Boolean).length;
    }
    
    getCompletionPercentage() {
        if (!this.app.activeChallenge) return 0;
        const todayProgress = this.getTodayProgress();
        const completed = Object.values(todayProgress).filter(Boolean).length;
        return Math.round((completed / this.app.activeChallenge.goals.length) * 100);
    }
    
    async toggleGoal(goalIndex) {
        const today = this.getESTDate();
        
        // Initialize today's progress if it doesn't exist
        if (!this.app.dailyProgress[today]) {
            this.app.dailyProgress[today] = {};
        }
        
        // Get current state and toggle it
        const currentState = this.app.dailyProgress[today][goalIndex] || false;
        const newState = !currentState;
        
        console.log(`=== TOGGLE DEBUG ===`);
        console.log(`Goal ${goalIndex}: ${currentState} -> ${newState}`);
        console.log(`Goal text: ${this.app.activeChallenge.goals[goalIndex]}`);
        console.log(`Current dailyProgress:`, this.app.dailyProgress[today]);
        
        // Update local state
        this.app.dailyProgress[today][goalIndex] = newState;
        
        // Update UI immediately
        this.app.renderer.updateGoalItem(goalIndex);
        
        // Save to database
        try {
            await this.updateProgress(
                this.app.currentUser.id,
                this.app.activeChallenge.id,
                today,
                goalIndex,
                newState
            );
            
            // Use the centralized StatsService to sync everything
            if (this.app.statsService) {
                await this.app.statsService.onTaskCompleted();
            } else {
                // Fallback to old method if StatsService not available
            try {
                const userResponse = await fetch(`/api/users/${this.app.currentUser.id}`);
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    this.app.currentUser.total_points = userData.total_points;
                    console.log(`Synced total_points from server: ${userData.total_points}`);
                    
                    // Update all point displays everywhere
                    this.updateAllPointDisplays();
                    
                    // Also refresh leaderboard to ensure consistency
                    await this.app.leaderboardManager.loadLeaderboard();
                }
            } catch (err) {
                console.error('Failed to sync user points:', err);
                // Fallback to local calculation
                if (newState) {
                    this.app.currentUser.total_points++;
                } else {
                    this.app.currentUser.total_points = Math.max(0, this.app.currentUser.total_points - 1);
                }
                this.updateAllPointDisplays();
                }
            }
            
            // Check for new badges only when completing a goal
            if (newState && this.app.currentUser) {
                try {
                    const badgeResponse = await fetch(`/api/users/${this.app.currentUser.id}/check-badges`, {
                        method: 'POST'
                    });
                    const { newBadges } = await badgeResponse.json();
                    
                    if (newBadges && newBadges.length > 0) {
                        // Show badge notification
                        this.showBadgeNotification(newBadges[0]);
                        // Update theme
                        this.app.updateTheme();
                        // Update badge progress display
                        this.app.renderer.renderNextBadgeProgress();
                        
                        // Notify StatsService about badge change
                        if (this.app.statsService) {
                            await this.app.statsService.onBadgeEarned();
                        }
                    }
                } catch (err) {
                    console.error('Badge check error:', err);
                }
            }
            
            // Check if challenge is now complete
            await this.app.challengeManager.checkAndHandleCompletion();
            
            // Update ghost leaderboard if slide-out is open
            if (this.app.currentGhosts) {
                await this.app.updateGhostLeaderboard();
            }
        } catch (err) {
            console.error('Failed to update progress:', err);
            // Revert local state on error
            this.app.dailyProgress[today][goalIndex] = currentState;
            this.app.renderer.updateGoalItem(goalIndex);
        }
    }
    
    showBadgeNotification(badge) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full shadow-2xl z-50 animate-in slide-in-from-top-4';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-3xl">${badge.icon}</span>
                <div>
                    <p class="font-bold text-lg">Badge Earned!</p>
                    <p class="text-sm">${badge.name} - ${badge.description}</p>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Also announce in chat if available
        if (window.chatManager) {
            fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: this.app.currentUser.id, 
                    message: `🎉 Just earned the ${badge.icon} ${badge.name} badge!`,
                    message_type: 'bot'
                })
            });
        }
    }
    
    updateAllPointDisplays() {
        const totalPoints = this.app.currentUser.total_points;
        const todayPoints = this.getTodayPoints();
        const completion = this.getCompletionPercentage();
        
        console.log(`Updating all displays - Total: ${totalPoints}, Today: ${todayPoints}`);
        
        // Update header points (multiple possible selectors)
        const headerSelectors = [
            '.text-black:contains("points")',
            'header .text-black',
            '.points-display',
            '.total-points'
        ];
        
        // Update total points in header - try multiple selectors
        const allTextElements = document.querySelectorAll('.text-black');
        allTextElements.forEach(el => {
            if (el.textContent.includes('points')) {
                el.textContent = `${totalPoints} points`;
            }
        });
        
        // Update today's points - try multiple selectors
        const todaySelectors = [
            '.grid .text-2xl.text-black',
            '.today-points',
            '[data-stat="today-points"]'
        ];
        
        todaySelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = todayPoints;
            }
        });
        
        // Update completion percentage
        const completionElement = document.querySelector('.text-2xl.text-green-600');
        if (completionElement) {
            completionElement.textContent = `${completion}%`;
        }
        
        // Update any other point displays
        const pointElements = document.querySelectorAll('[data-points]');
        pointElements.forEach(el => {
            el.textContent = totalPoints;
        });
        
        // Trigger a re-render of the stats area
        this.app.renderer.updateStats();
    }
}
