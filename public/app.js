// === MAIN APPLICATION CLASS ===
class ChallengeApp {
    constructor() {
        // === CORE DATA ===
        this.currentUser = null;
        this.currentScreen = 'login';
        this.challenges = [];
        this.activeChallenge = null;
        this.dailyProgress = {};
        this.userStats = { totalPoints: 0, rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
        this.leaderboard = [];
        
        // === SHARED CHALLENGE PROPERTIES ===
        this.availableChallenges = [];
        this.selectedChallenge = null;
        this.showJoinChallenge = false;
        // === END SHARED CHALLENGE PROPERTIES ===
        
        // === MANAGERS ===
        this.modalManager = new ModalManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
        
        this.init();
    }
    
    init() {
        this.render();
    }
// Move the render method here
    render() {
        const app = document.getElementById('app');
        
        if (this.currentScreen === 'login') {
            app.innerHTML = this.renderLogin();
            this.attachLoginEvents();
        } else {
            app.innerHTML = this.renderDashboard();
            this.attachDashboardEvents();
        }
    }
    // === PROGRESS METHODS ===
    async initTodayProgress() {
        if (!this.selectedChallenge || !this.currentUser) return;
        
        const today = new Date().toISOString().split('T')[0];
        const progress = await ChallengeAPI.loadDailyProgress(this.currentUser.id, this.selectedChallenge.id, today);
        this.dailyProgress[today] = progress;
    }
    
    getTodayProgress() {
        return ChallengeUtils.getTodayProgress(this.dailyProgress);
    }
    
    getTodayPoints() {
        return ChallengeUtils.getTodayPoints(this.dailyProgress);
    }
    
    getCompletionPercentage() {
        return ChallengeUtils.getCompletionPercentage(this.selectedChallenge, this.dailyProgress);
    }

    getCurrentChallengeDay() {
        return ChallengeUtils.getCurrentChallengeDay(this.selectedChallenge);
    }

    getChallengeProgress() {
        return ChallengeUtils.getChallengeProgress(this.selectedChallenge);
    }
    
    // === GOAL INTERACTION ===
    async toggleGoal(goalIndex) {
        if (!this.currentUser || !this.selectedChallenge) return;
        
        const today = new Date().toISOString().split('T')[0];
        const wasCompleted = this.getTodayProgress()[goalIndex] || false;
        const newCompleted = !wasCompleted;
        
        // Update locally first for smooth UI
        if (!this.dailyProgress[today]) this.dailyProgress[today] = {};
        this.dailyProgress[today][goalIndex] = newCompleted;
        
        // Update UI immediately
        this.updateGoalItem(goalIndex);
        
        // Save to database
        await ChallengeAPI.updateProgress(
            this.currentUser.id,
            this.selectedChallenge.id,
            today,
            goalIndex,
            newCompleted
        );
        
        // Update user stats
        if (newCompleted) {
            this.currentUser.total_points++;
        } else {
            this.currentUser.total_points = Math.max(0, this.currentUser.total_points - 1);
        }
        
        this.updateStats();
    }
    
    updateGoalItem(goalIndex) {
        const goalElement = document.querySelector(`[data-goal-index="${goalIndex}"]`);
        if (!goalElement) return;
        
        const isCompleted = this.getTodayProgress()[goalIndex] || false;
        const goal = this.selectedChallenge.goals[goalIndex];
        
        goalElement.className = `flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 goal-item ${
            isCompleted 
                ? 'bg-green-50 border-green-500' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }`;
        
        goalElement.innerHTML = `
            <div class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                isCompleted 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300 bg-white'
            }">
                ${isCompleted ? '<span class="text-white text-sm font-bold">✓</span>' : ''}
            </div>
            <div class="ml-4 flex-1">
                <p class="font-medium ${isCompleted ? 'text-green-800' : 'text-gray-800'}">${goal}</p>
            </div>
            ${isCompleted ? '<div class="text-green-600 font-semibold text-sm">+1 point</div>' : ''}
        `;
    }
    
    updateStats() {
        const todayPoints = this.getTodayPoints();
        const completion = this.getCompletionPercentage();
        
        // Update points in header
        const headerPoints = document.querySelector('.text-blue-600');
        if (headerPoints) headerPoints.textContent = `${this.currentUser.total_points} points`;
        
        // Update today's points card
        const todayPointsElement = document.querySelector('.grid .text-2xl.text-blue-600');
        if (todayPointsElement) todayPointsElement.textContent = todayPoints;
        
        // Update completion percentage
        const completionElement = document.querySelector('.text-2xl.text-green-600');
        if (completionElement) completionElement.textContent = `${completion}%`;
    }
    
    // === SHARED CHALLENGE METHODS ===
    showJoinChallengeModal() {
        this.showJoinChallenge = true;
        this.renderModal();
    }

    hideJoinChallengeModal() {
        this.showJoinChallenge = false;
        const modal = document.getElementById('joinChallengeModal');
        if (modal) {
            modal.remove();
        }
    }

    async joinChallenge(challengeId) {
        if (!this.currentUser) return;
        
        const joinResult = await ChallengeAPI.joinChallenge(
            challengeId, 
            this.currentUser.id,
            this.newChallenge.goals
        );
        
        if (joinResult) {
            this.challenges.push(joinResult);
            this.selectedChallenge = joinResult;
            this.hideJoinChallengeModal();
            await this.initTodayProgress();
            this.render();
        }
    }

    async createNewChallenge() {
        const name = this.newChallenge.name.trim();
        const validGoals = this.newChallenge.goals.filter(g => g.trim());
        
        if (name && validGoals.length > 0 && this.currentUser) {
            const challengeData = {
                name: name,
                duration: this.newChallenge.duration,
                start_date: new Date().toISOString().split('T')[0],
                created_by: this.currentUser.id, 
                goals: validGoals
            };
            
            try {
                const challenge = await ChallengeAPI.createSharedChallenge(challengeData);
                
                if (challenge) {
                    this.challenges.push(challenge);
                    this.selectedChallenge = challenge;
                    this.hideCreateChallengeModal();
                    await this.initTodayProgress();
                    this.render();
                }
            } catch (err) {
                console.error('Error creating challenge:', err);
                alert('Failed to create challenge. Please try again.');
            }
        }
    }
    // === END SHARED CHALLENGE METHODS ===
// === USER MANAGEMENT ===
    async handleLogin(name) {
        const user = await ChallengeAPI.createUser(name);
        if (user) {
            this.currentUser = user;
            this.currentScreen = 'dashboard';
            
            // Load user's data
            try {
                const [challengesData, statsData, leaderboardData, availableData] = await Promise.all([
                    ChallengeAPI.getUserCurrentChallenges(user.id),
                    ChallengeAPI.loadUserStats(user.id),
                    ChallengeAPI.loadLeaderboard(),
                    ChallengeAPI.getAvailableChallenges()
                ]);
                
                this.challenges = challengesData;
                this.userStats = { ...this.userStats, ...statsData };
                this.leaderboard = leaderboardData;
                this.availableChallenges = availableData;
                
                if (this.challenges.length > 0) {
                    this.selectedChallenge = this.challenges[0];
                    await this.initTodayProgress();
                }
            } catch (err) {
                console.error('Error loading user data:', err);
            }
            
            this.render();
        }
    }
    
    handleLogout() {
        this.currentUser = null;
        this.challenges = [];
        this.selectedChallenge = null;
        this.dailyProgress = {};
        this.userStats = { totalPoints: 0, rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
        this.leaderboard = [];
        this.availableChallenges = [];
        this.currentScreen = 'login';
        this.render();
    }
    
    // === RENDERING ===
    renderLogin() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-in slide-in-from-bottom-4">
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="text-white text-2xl">🏆</span>
                        </div>
                        <h1 class="text-2xl font-bold text-gray-800 mb-2">Daily Challenge</h1>
                        <p class="text-gray-600">Start your journey to better habits</p>
                        <p class="text-sm text-green-600 mt-2">💾 Now with persistent storage!</p>
                    </div>
                    
                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Enter your name to get started
                            </label>
                            <input 
                                type="text" 
                                id="nameInput"
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Your name"
                            />
                        </div>
                        
                        <button 
                            id="loginBtn"
                            class="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                        >
                            Start Challenge
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderAvailableChallenges() {
        if (this.availableChallenges.length === 0) {
            return '<p class="text-center text-gray-500">No available challenges at the moment.</p>';
        }
        
        return `
            <div class="space-y-4">
                ${this.availableChallenges.map(challenge => `
                    <div class="bg-white rounded-lg shadow p-4">
                        <div class="flex justify-between items-center mb-2">
                            <h3 class="text-xl font-bold">${challenge.name}</h3>
                            <span class="text-sm text-gray-500">${challenge.participant_count} participants</span>
                        </div>
                        <p class="text-gray-600 mb-4">
                            Created by ${challenge.creator_name} &bull; 
                            ${challenge.duration} days &bull;
                            Starts ${ChallengeUtils.formatDate(challenge.start_date)}  
                        </p>
                        <button 
                            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            data-challenge-id="${challenge.id}"
                        >
                            Join Challenge
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderEmptyState() {
        return `
            <div class="text-center py-12">
                <div class="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span class="text-white text-3xl">🎯</span>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-3">Ready to Start Your First Challenge?</h2>
                <p class="text-gray-600 mb-6 max-w-md mx-auto">Create a custom challenge with your own goals and start building better habits today!</p>
                <button id="newChallengeBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl transition-all duration-200">
                    🚀 Create Your First Challenge
                </button>
            </div>
        `;
    }
    
    renderDashboard() {
        if (!this.selectedChallenge) {
            return `
                <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                    <!-- Header -->
                    <header class="bg-white shadow-sm border-b border-gray-200">
                        <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                    <span class="text-white">🏆</span>
                                </div>
                                <div>
                                    <h1 class="text-lg font-bold text-gray-800">Daily Challenge</h1>
                                    <p class="text-sm text-gray-600">Welcome, ${this.currentUser.name}!</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-4">
                                <div class="text-right">
                                    <p class="text-sm font-semibold text-blue-600">${this.currentUser.total_points} points</p>
                                    <p class="text-xs text-gray-500">Rank #${this.userStats.rank || '?'}</p>
                                </div>
                                <button id="leaderboardBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Leaderboard">
                                    <span>🏆</span>
                                </button>
                                <button id="logoutBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                                    <span>🚪</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    <!-- Main Content -->
                    <main class="max-w-4xl mx-auto py-6 md:py-12">
                        <!-- Empty State -->
                        <div class="bg-white shadow rounded-lg mb-8">
                            ${this.renderEmptyState()}
                        </div>
                        
                        <!-- Available Challenges -->
                        <div class="bg-white shadow rounded-lg">
                            <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
                                <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                                    Available Challenges
                                </h2>
                            </div>
                            <div class="p-6">
                                ${this.renderAvailableChallenges()}
                            </div>
                        </div>
                    </main>
                    
                    <!-- Modals -->
                    ${this.renderJoinChallengeModal()}
                    ${this.leaderboardManager.renderModal()}
                    ${this.modalManager.renderCreateChallengeModal()}
                </div>
            `;
        }
        
        const todayPoints = this.getTodayPoints();
        const completion = this.getCompletionPercentage();
        
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <span class="text-white">🏆</span>
                            </div>
                            <div>
                                <h1 class="text-lg font-bold text-gray-800">Daily Challenge</h1>
                                <p class="text-sm text-gray-600">Welcome back, ${this.currentUser.name}!</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <div class="text-right">
                                <p class="text-sm font-semibold text-blue-600">${this.currentUser.total_points} points</p>
                                <p class="text-xs text-gray-500">Rank #${this.userStats.rank || '?'}</p>
                            </div>
                            <button id="leaderboardBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Leaderboard">
                                <span>🏆</span>
                            </button>
                            <button id="logoutBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                                <span>🚪</span>
                            </button>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="max-w-4xl mx-auto p-4 pt-8">
                    <div class="animate-in slide-in-from-right-4">
                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-2xl font-bold text-blue-600">${todayPoints}</p>
                                        <p class="text-sm text-gray-600">Today's Points</p>
                                    </div>
                                    <span class="text-2xl">🏆</span>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-2xl font-bold text-green-600">${completion}%</p>
                                        <p class="text-sm text-gray-600">Completed Today</p>
                                    </div>
                                    <span class="text-2xl">📅</span>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-2xl font-bold text-purple-600">${this.selectedChallenge.duration}</p>
                                        <p class="text-sm text-gray-600">Challenge Days</p>
                                    </div>
                                    <span class="text-2xl">👥</span>
                                </div>
                            </div>
                        </div>

                        <!-- Challenge Section -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <h2 class="text-xl font-bold text-gray-800">${this.selectedChallenge.name}</h2>
                                            <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                Day ${this.getCurrentChallengeDay()} of ${this.selectedChallenge.duration}
                                            </span>
                                        </div>
                                        <p class="text-sm text-gray-600 mb-3">Complete your daily goals to earn points</p>
                                        
                                        <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                                            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                                                 style="width: ${this.getChallengeProgress()}%"></div>
                                        </div>
                                        <p class="text-xs text-gray-500">${this.getChallengeProgress()}% complete</p>
                                    </div>
                                    <button id="newChallengeBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg transition-all duration-200 ml-4">
                                        🚀 New Challenge
                                    </button>
                                </div>
                            </div>

<!-- Goals Checklist -->
                            <div class="p-6">
                                <div class="space-y-3">
                                    ${this.selectedChallenge.goals.map((goal, index) => {
                                        const isCompleted = this.getTodayProgress()[index] || false;
                                        return `
                                            <div 
                                                class="flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 goal-item ${
                                                    isCompleted 
                                                        ? 'bg-green-50 border-green-500' 
                                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                }"
                                                data-goal-index="${index}"
                                            >
                                                <div class="w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                                    isCompleted 
                                                        ? 'bg-green-500 border-green-500' 
                                                        : 'border-gray-300 bg-white'
                                                }">
                                                    ${isCompleted ? '<span class="text-white text-sm font-bold">✓</span>' : ''}
                                                </div>
                                                <div class="ml-4 flex-1">
                                                    <p class="font-medium ${isCompleted ? 'text-green-800' : 'text-gray-800'}">${goal}</p>
                                                </div>
                                                ${isCompleted ? '<div class="text-green-600 font-semibold text-sm">+1 point</div>' : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                
                <!-- Modals -->
                ${this.renderJoinChallengeModal()}
                ${this.leaderboardManager.renderModal()}
                ${this.modalManager.renderCreateChallengeModal()}
            </div>
        `;
    }
    
    renderJoinChallengeModal() {
        if (!this.showJoinChallenge) return '';
        
        return `
            <div id="joinChallengeModal" class="modal">
                <div class="modal-content">
                    <h2 class="text-2xl mb-4">Join Challenge</h2>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-bold mb-2">Your Goals:</label>
                        <div id="joinGoalsList">
                            ${this.newChallenge.goals.map((goal, index) => `
                                <div class="mb-2 flex items-center">
                                    <input 
                                        type="text"
                                        class="border rounded w-full py-2 px-3 mr-2" 
                                        placeholder="Goal ${index + 1}"
                                        data-goal-index="${index}"
                                        value="${goal}"
                                    >
                                    <button 
                                        class="text-red-500 hover:text-red-700 text-xl"
                                        data-remove-index="${index}"
                                    >
                                        &times;
                                    </button>
                                </div>
                            `).join('')}
                            <button id="addJoinGoalBtn" class="text-blue-500 hover:text-blue-700">
                                + Add a goal
                            </button>
                        </div>
                    </div>
                    
                    <div class="text-right">
                        <button id="cancelJoinBtn" class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
                            Cancel
                        </button>
                        <button id="confirmJoinBtn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Join Challenge
                        </button>  
                    </div>
                </div>
            </div>
        `;
    }
    
    // === EVENT HANDLERS ===
    attachLoginEvents() {
        const nameInput = document.getElementById('nameInput');
        const loginBtn = document.getElementById('loginBtn');
        
        const handleLogin = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.handleLogin(name);
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
            this.handleLogout();
        });
        
        goalItems.forEach(item => {
            item.addEventListener('click', () => {
                const goalIndex = parseInt(item.getAttribute('data-goal-index'));
                this.toggleGoal(goalIndex);
            });
        });
        
        if (newChallengeBtn) {
            newChallengeBtn.addEventListener('click', () => {
                this.modalManager.showCreateChallengeModal();
            });
        }
        
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => {
                this.leaderboardManager.showModal();
            });
        }
        
        // Join challenge
        document.querySelectorAll('[data-challenge-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const challengeId = parseInt(btn.getAttribute('data-challenge-id'));
                this.showJoinChallengeModal(challengeId);
            });  
        });
    }

    attachJoinChallengeEvents() {
        const modal = document.getElementById('joinChallengeModal');
        const cancelBtn = document.getElementById('cancelJoinBtn');
        const confirmBtn = document.getElementById('confirmJoinBtn');
        const addGoalBtn = document.getElementById('addJoinGoalBtn');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideJoinChallengeModal();
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.joinChallenge(this.selectedChallenge.id);
            });
        }
        
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => {
                this.addGoal();
            });
        }
        
        document.querySelectorAll('[data-goal-index]').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-goal-index'));
                this.updateGoal(index, e.target.value);
            });
        });
        
        document.querySelectorAll('[data-remove-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-remove-index'));
                this.removeGoal(index);
            });
        });
    }
}

// === INITIALIZE APP ===
document.addEventListener('DOMContentLoaded', () => {
    new ChallengeApp();
});
