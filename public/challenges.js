// challenges.js - Handle challenge creation and management
class ChallengeManager {
    constructor(app) {
        this.app = app;
    }
    
    async loadChallenges(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/challenges`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Load challenges error:', err);
            return [];
        }
    }
    
    async createChallengeAPI(challengeData) {
        try {
            const response = await fetch('/api/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(challengeData)
            });
            return await response.json();
        } catch (err) {
            console.error('Create challenge error:', err);
            return null;
        }
    }
    
    async createChallenge() {
        const name = this.app.newChallenge.name.trim();
        const validGoals = this.app.newChallenge.goals.filter(g => g.trim());
        
        if (name && validGoals.length > 0 && this.app.currentUser) {
            const challengeData = {
                user_id: this.app.currentUser.id,
                name: name,
                duration: this.app.newChallenge.duration,
                goals: validGoals
            };
            
            try {
                const challenge = await this.createChallengeAPI(challengeData);
                
                if (challenge) {
                    if (!Array.isArray(this.app.challenges)) {
                        this.app.challenges = [];
                    }
                    
                    this.app.challenges.push(challenge);
                    this.app.activeChallenge = challenge;
                    this.app.hideCreateChallengeModal();
                    await this.app.progressManager.initTodayProgress();
                    
                    // Notify StatsService about new challenge
                    if (this.app.statsService) {
                        await this.app.statsService.onChallengeChanged();
                    }
                    
                    this.app.render();
                }
            } catch (err) {
                console.error('Error creating challenge:', err);
                alert('Failed to create challenge. Please try again.');
            }
        }
    }
    
    getCurrentChallengeDay() {
        // Use StatsService as the single source of truth
        if (this.app.statsService) {
            return this.app.statsService.getChallengeDays();
        }
        // Fallback if StatsService not available (shouldn't happen)
        return 1;
    }
    
    getChallengeProgress() {
        // Use StatsService as the single source of truth
        if (this.app.statsService) {
            return this.app.statsService.getChallengeProgress();
        }
        // Fallback if StatsService not available (shouldn't happen)
        return 0;
    }
    
    getChallengeStatus() {
        const currentDay = this.getCurrentChallengeDay();
        const duration = this.app.activeChallenge?.duration || 0;
        
        if (currentDay >= duration) {
            return { status: 'completed', message: 'Challenge Complete! 🎉' };
        } else if (currentDay > duration * 0.8) {
            return { status: 'almost-done', message: 'Almost there!' };
        } else if (currentDay > duration * 0.5) {
            return { status: 'halfway', message: 'Halfway through!' };
        } else {
            return { status: 'early', message: 'Keep going!' };
        }
    }
    
    // Check if current challenge is completed
    isChallengeComplete() {
        if (!this.app.activeChallenge) return false;
        const currentDay = this.getCurrentChallengeDay();
        return currentDay >= this.app.activeChallenge.duration;
    }
    
    // Archive completed challenge and reset points
    async archiveCompletedChallenge() {
        if (!this.app.activeChallenge || !this.isChallengeComplete()) return;
        
        try {
            // Calculate challenge statistics
            const stats = await this.calculateChallengeStats();
            
            // Archive the challenge
            await fetch(`/api/users/${this.app.currentUser.id}/archive-challenge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: this.app.activeChallenge.id,
                    challengeName: this.app.activeChallenge.name,
                    duration: this.app.activeChallenge.duration,
                    totalGoals: this.app.activeChallenge.goals.length,
                    pointsEarned: stats.pointsEarned,
                    pointsPossible: stats.pointsPossible,
                    completionPercentage: stats.completionPercentage,
                    startedAt: this.app.activeChallenge.created_at
                })
            });
            
            // Clear active challenge and reset user points
            this.app.activeChallenge = null;
            this.app.currentUser.total_points = 0;
            this.app.userStats.totalPoints = 0;
            
            // Notify StatsService about challenge completion
            if (this.app.statsService) {
                await this.app.statsService.onChallengeChanged();
            }
            
            console.log('Challenge archived successfully');
            
        } catch (err) {
            console.error('Error archiving challenge:', err);
        }
    }
    
    // Calculate challenge statistics
    async calculateChallengeStats() {
        if (!this.app.activeChallenge) return { pointsEarned: 0, pointsPossible: 0, completionPercentage: 0 };
        
        try {
            const challenge = this.app.activeChallenge;
            const startDate = new Date(challenge.created_at);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + challenge.duration - 1);
            
            let totalPointsEarned = 0;
            let totalPointsPossible = challenge.duration * challenge.goals.length;
            
            // Get progress for each day of the challenge
            for (let day = 0; day < challenge.duration; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + day);
                const dateStr = date.toISOString().split('T')[0];
                
                try {
                    const response = await fetch(`/api/progress/${this.app.currentUser.id}/${challenge.id}/${dateStr}`);
                    if (response.ok) {
                        const progress = await response.json();
                        const completed = Object.values(progress).filter(Boolean).length;
                        totalPointsEarned += completed;
                    }
                } catch (err) {
                    console.error(`Error getting progress for ${dateStr}:`, err);
                }
            }
            
            const completionPercentage = totalPointsPossible > 0 ? 
                Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0;
            
            return {
                pointsEarned: totalPointsEarned,
                pointsPossible: totalPointsPossible,
                completionPercentage: completionPercentage
            };
            
        } catch (err) {
            console.error('Error calculating challenge stats:', err);
            return { pointsEarned: 0, pointsPossible: 0, completionPercentage: 0 };
        }
    }
    
    // Load past challenges
    async loadPastChallenges(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/past-challenges`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Load past challenges error:', err);
            return [];
        }
    }
    
    // Check and handle challenge completion (call this after goals are updated)
    async checkAndHandleCompletion() {
        if (this.isChallengeComplete()) {
            await this.archiveCompletedChallenge();
            // Reload the UI
            this.app.render();
        }
    }
}
