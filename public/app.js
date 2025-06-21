// app.js - Main controller that ties everything together
class ChallengeApp {
    constructor() {
        // State
        this.currentUser = null;
        this.currentScreen = 'login';
        this.challenges = [];
        this.userChallenges = [];
        this.activeChallenge = null;
        this.dailyProgress = {};
        this.userStats = { totalPoints: 0, rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
        this.showCreateChallenge = false;
        this.newChallenge = { name: '', duration: 7, goals: [''] };
        this.leaderboard = [];
        this.showLeaderboard = false;
        
        // Initialize managers
        this.authManager = new AuthManager(this);
        this.challengeManager = new ChallengeManager(this);
        this.progressManager = new ProgressManager(this);
        this.renderer = new Renderer(this);
        this.eventHandler = new EventHandler(this);
        
        this.init();
    }
    
    init() {
        this.render();
    }
    
    render() {
        this.renderer.render();
    }
    
    // Leaderboard methods (keep these here for now)
    async loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            return await response.json();
        } catch (err) {
            console.error('Load leaderboard error:', err);
            return [];
        }
    }
    
    async loadUserStats(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/stats`);
            return await response.json();
        } catch (err) {
            console.error('Load user stats error:', err);
            return { rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
        }
    }
    
    // Modal methods
    showCreateChallengeModal() {
        this.showCreateChallenge = true;
        this.renderer.renderModal();
    }
    
    hideCreateChallengeModal() {
        this.showCreateChallenge = false;
        this.newChallenge = { name: '', duration: 7, goals: [''] };
        const modal = document.getElementById('challengeModal');
        if (modal) {
            modal.remove();
        }
    }
    
    // Challenge goal methods
    addGoal() {
        this.newChallenge.goals.push('');
        this.renderer.updateModalGoals();
    }
    
    removeGoal(index) {
        if (this.newChallenge.goals.length > 1) {
            this.newChallenge.goals.splice(index, 1);
            this.renderer.updateModalGoals();
        }
    }
    
    updateGoal(index, value) {
        this.newChallenge.goals[index] = value;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChallengeApp();
});
