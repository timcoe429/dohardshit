// progress.js - Handle all progress tracking
class ProgressManager {
    constructor(app) {
        this.app = app;
    }
    
    // Helper method to get EST date
    getESTDate() {
        const now = new Date();
        const estOffset = -5; // EST is UTC-5 (use -4 for EDT during daylight saving)
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const estTime = new Date(utc + (3600000 * estOffset));
        return estTime.toISOString().split('T')[0];
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
            // Ensure date is in EST format
            const estDate = date.includes('T') ? date.split('T')[0] : date;
            
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    challenge_id: challengeId,
                    date: estDate,
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
        
        // Update user stats
        if (newCompleted) {
            this.app.currentUser.total_points++;
        } else {
            this.app.currentUser.total_points = Math.max(0, this.app.currentUser.total_points - 1);
        }
        
        this.app.renderer.updateStats();
    }
}
