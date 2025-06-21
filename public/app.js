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
        
        // === MANAGERS ===
        this.modalManager = new ModalManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
        
        this.init();
    }
    
    init() {
        this.render();
    }

    // === PROGRESS METHODS ===
    async initTodayProgress() {
        if (!this.activeChallenge || !this.currentUser) return;
        
        const today = new Date().toISOString().split('T')[0];
        const progress = await ChallengeAPI.loadDailyProgress(this.currentUser.id, this.activeChallenge.id, today);
        this.dailyProgress[today] = progress;
    }
    
    getTodayProgress() {
        return ChallengeUtils.getTodayProgress(this.dailyProgress);
    }
    
    getTodayPoints() {
        return ChallengeUtils.getTodayPoints(this.dailyProgress);
    }
    
    getCompletionPercentage() {
        return ChallengeUtils.getCompletionPercentage(this.activeChallenge, this.dailyProgress);
    }

    getCurrentChallengeDay() {
        return ChallengeUtils.getCurrentChallengeDay(this.activeChallenge);
    }

    getChallengeProgress() {
        return ChallengeUtils.getChallengeProgress(this.activeChallenge);
    }
    
    // === GOAL INTERACTION ===
    async toggleGoal(goalIndex) {
        if (!this.currentUser || !this.activeChallenge) return;
        
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
            this.activeChallenge.id,
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
        const goal = this.activeChallenge.goals[goalIndex];
        
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
    
    // === USER MANAGEMENT ===
    async handleLogin(name) {
        const user = await ChallengeAPI.createUser(name);
        if (user) {
            this.currentUser = user;
            this.userStats.totalPoints = user.total_points;
            this.currentScreen = 'dashboard';
            
            // Load user's data
            try {
                const [challengesData, statsData, leaderboardData] = await Promise.all([
                    ChallengeAPI.loadChallenges(user.id),
                    ChallengeAPI.loadUserStats(user.id),
                    ChallengeAPI.loadLeaderboard()
                ]);
                
                this.challenges = Array.isArray(challengesData) ? challengesData : [];
                this.userStats = { ...this.userStats, ...statsData };
                this.leaderboard = leaderboardData;
                
                if (this.challenges.length > 0) {
                    this.activeChallenge = this.challenges[0];
                    await this.initTodayProgress();
                }
            } catch (err) {
                console.error('Error loading user data:', err);
                this.challenges = [];
            }
            
            this.render();
        }
    }
    
    handleLogout() {
        this.currentUser = null;
        this.challenges = [];
        this.activeChallenge = null;
        this.dailyProgress = {};
        this.userStats = { totalPoints: 0, rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
        this.leaderboard = [];
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
        if (!this.activeChallenge) {
            return `
                <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

                    <main class="max-w-4xl mx-auto p-4">
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-right-4">
                            ${this.renderEmptyState()}
                        </div>
                    </main>
                </div>
            `;
        }
        
        const todayPoints = this.getTodayPoints();
        const completion = this.getCompletionPercentage();
        
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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

                <main class="max-w-4xl mx-auto p-4 pt-8">
                    <div class="animate-in slide-in-from-right-4">
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
                                        <p class="text-2xl font-bold text-purple-600">${this.activeChallenge.duration}</p>
                                        <p class="text-sm text-gray-600">Challenge Days</p>
                                    </div>
                                    <span class="text-2xl">👥</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <h2 class="text-xl font-bold text-gray-800">${this.activeChallenge.name}</h2>
                                            <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                Day ${this.getCurrentChallengeDay()} of ${this.activeChallenge.duration}
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

                            <div class="p-6">
                                <div class="space-y-3">
                                    ${this.activeChallenge.goals.map((goal, index) => {
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
            </div>
        `;
    }
    
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
    }
}

// === INITIALIZE APP ===
document.addEventListener('DOMContentLoaded', () => {
    new ChallengeApp();
});
