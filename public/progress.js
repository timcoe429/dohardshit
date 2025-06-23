// progress.js - Handle all progress tracking
class ProgressManager {
    constructor(app) {
        this.app = app;
    }
    
   // Helper method to get EST/EDT date
// Helper method to get EST/EDT date
getESTDate() {
    // Get the current date in Eastern Time directly
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    const dateString = `${year}-${month}-${day}`;
    

    
    return dateString;
}
    
    async loadDailyProgress(userId, challengeId, date) {
        try {
            const response = await fetch(`/api/progress/${userId}/${challengeId}/${date}`);
            return await response.json();
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
        this.app.dailyProgress[today] = progress;
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
        if (!this.app.currentUser || !this.app.activeChallenge) return;
        
        const today = this.getESTDate();
        const todayProgress = this.getTodayProgress() || {};
        const wasCompleted = todayProgress[goalIndex] || false;
        const newCompleted = !wasCompleted;
        
        // Update locally first for smooth UI
        if (!this.app.dailyProgress[today]) {
            this.app.dailyProgress[today] = {};
        }
        
        this.app.dailyProgress[today][goalIndex] = newCompleted;
        
        // Update UI immediately
        this.app.renderer.updateGoalItem(goalIndex);
        
        // Save to database
        await this.updateProgress(
            this.app.currentUser.id,
            this.app.activeChallenge.id,
            today,
            goalIndex,
            newCompleted
        );
        
        // Update user stats - but let the server handle the actual point calculation
        if (newCompleted) {
            this.app.currentUser.total_points++;
        } else {
            this.app.currentUser.total_points = Math.max(0, this.app.currentUser.total_points - 1);
        }
        
        this.app.renderer.updateStats();
    }
}
