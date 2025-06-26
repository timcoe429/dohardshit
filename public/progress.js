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
        });
    }

    // Helper method to get EST/EDT date
    getESTDate() {
        // Create a date in Eastern Time
        const easternTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
        const etDate = new Date(easternTime);
        
        // Format as YYYY-MM-DD
        const year = etDate.getFullYear();
        const month = String(etDate.getMonth() + 1).padStart(2, '0');
        const day = String(etDate.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
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
        
        console.log(`Toggling goal ${goalIndex}: ${currentState} -> ${newState}`);
        
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
            
            // Update user points based on the change
            if (newState) {
                this.app.currentUser.total_points++;
            } else {
                this.app.currentUser.total_points = Math.max(0, this.app.currentUser.total_points - 1);
            }
            
            // Update the stats display
            this.app.renderer.updateStats();
            
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
                    }
                } catch (err) {
                    console.error('Badge check error:', err);
                }
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
}
