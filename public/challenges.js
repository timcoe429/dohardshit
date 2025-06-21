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
                    this.app.render();
                }
            } catch (err) {
                console.error('Error creating challenge:', err);
                alert('Failed to create challenge. Please try again.');
            }
        }
    }
    
    getCurrentChallengeDay() {
        if (!this.app.activeChallenge) return 1;
        
        const startDate = new Date(this.app.activeChallenge.created_at);
        const today = new Date();
        const timeDiff = today.getTime() - startDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
        
        return Math.min(dayDiff, this.app.activeChallenge.duration);
    }
    
    getChallengeProgress() {
        if (!this.app.activeChallenge) return 0;
        
        const currentDay = this.getCurrentChallengeDay();
        return Math.round((currentDay / this.app.activeChallenge.duration) * 100);
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
}
