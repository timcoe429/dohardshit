// events.js - Handle all event attachments
class EventHandler {
    constructor(app) {
        this.app = app;
    }
    
    attachLoginEvents() {
        const nameInput = document.getElementById('nameInput');
        const loginBtn = document.getElementById('loginBtn');
        
        const handleLogin = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.app.authManager.handleLogin(name);
            }
        };
        
        loginBtn.addEventListener('click', handleLogin);
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    attachDashboardEvents() {
        const logoutBtn = document.getElementById('logoutBtn');
        const goalItems = document.querySelectorAll('.goal-item');
        const newChallengeBtn = document.getElementById('newChallengeBtn');
        const leaderboardBtn = document.getElementById('leaderboardBtn');
        
        logoutBtn.addEventListener('click', () => {
            this.app.authManager.handleLogout();
        });
        
        goalItems.forEach(item => {
            item.addEventListener('click', () => {
                const goalIndex = parseInt(item.getAttribute('data-goal-index'));
                this.app.progressManager.toggleGoal(goalIndex);
            });
        });
        
        if (newChallengeBtn) {
            newChallengeBtn.addEventListener('click', () => {
                this.app.showCreateChallengeModal();
            });
        }
        
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => {
                this.app.showLeaderboardModal();
            });
        }
    }
    
    attachModalEvents() {
        const modal = document.getElementById('challengeModal');
        const cancelBtn = document.getElementById('cancelChallengeBtn');
        const createBtn = document.getElementById('createChallengeBtn');
        const nameInput = document.getElementById('challengeName');
        const durationInput = document.getElementById('challengeDuration');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.app.hideCreateChallengeModal();
            });
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.app.challengeManager.createChallenge();
            });
        }
        
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.app.newChallenge.name = e.target.value;
            });
        }
        
        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                this.app.newChallenge.duration = parseInt(e.target.value) || 7;
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.app.hideCreateChallengeModal();
                }
            });
        }
        
        this.attachModalGoalEvents();
    }
    
    attachModalGoalEvents() {
        const addGoalBtn = document.getElementById('addGoalBtn');
        
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => {
                this.app.addGoal();
            });
        }
        
        document.querySelectorAll('.goal-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-goal-index'));
                this.app.updateGoal(index, e.target.value);
            });
        });
        
        document.querySelectorAll('.remove-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-goal-index'));
                this.app.removeGoal(index);
            });
        });
    }
}
