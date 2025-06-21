// app.js - Main controller (now only ~200 lines!)
class ChallengeApp {
    constructor() {
        // State
        this.currentUser = null;
        this.currentScreen = 'login';
        this.challenges = [];
        this.userChallenges = [];
        this.activeChallenge = null;
        this.dailyProgress = {};
        this.userStats = { 
            totalPoints: 0, 
            rank: 0, 
            total_challenges: 0, 
            total_completed_goals: 0, 
            current_streak: 0 
        };
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
        this.leaderboardManager = new LeaderboardManager(this);
        
        this.init();
    }
    
    init() {
        this.render();
    }
    
    render() {
        this.renderer.render();
    }
    
    // API calls
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
    
    // Goal management
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
    
    // Leaderboard methods
    showLeaderboardModal() {
        this.leaderboardManager.showModal();
    }

    hideLeaderboardModal() {
        this.leaderboardManager.hideModal();
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChallengeApp();
});
