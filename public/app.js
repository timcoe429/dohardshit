// Daily Challenge App - Database Version
class ChallengeApp {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'login';
        this.challenges = [];
        this.userChallenges = [];
        this.activeChallenge = null;
        this.dailyProgress = {};
        this.userStats = { totalPoints: 0 };
        this.showCreateChallenge = false;
        this.newChallenge = { name: '', duration: 7, goals: [''] };
        // === CONSTRUCTOR ADDITIONS ===
this.leaderboard = [];
this.userStats = { totalPoints: 0, rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
this.showLeaderboard = false;
// === END CONSTRUCTOR ADDITIONS ===
        this.init();
    }
    
    init() {
        this.render();
    }

    // API calls
    async createUser(name) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            return await response.json();
        } catch (err) {
            console.error('Create user error:', err);
            return null;
        }
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

    async loadDailyProgress(userId, challengeId, date) {
        try {
            const response = await fetch(`/api/progress/${userId}/${challengeId}/${date}`);
            return await response.json();
        } catch (err) {
            console.error('Load progress error:', err);
            return {};
        }
    }
// === LEADERBOARD API METHODS ===
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
// === END LEADERBOARD API METHODS ===
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
        if (!this.activeChallenge || !this.currentUser) return;
        
        const today = new Date().toISOString().split('T')[0];
        const progress = await this.loadDailyProgress(this.currentUser.id, this.activeChallenge.id, today);
        this.dailyProgress[today] = progress;
    }
    
    getTodayProgress() {
        const today = new Date().toISOString().split('T')[0];
        return this.dailyProgress[today] || {};
    }
    
    getTodayPoints() {
        const todayProgress = this.getTodayProgress();
        return Object.values(todayProgress).filter(Boolean).length;
    }
    
    getCompletionPercentage() {
        if (!this.activeChallenge) return 0;
        const todayProgress = this.getTodayProgress();
        const completed = Object.values(todayProgress).filter(Boolean).length;
        return Math.round((completed / this.activeChallenge.goals.length) * 100);
    }
    getCurrentChallengeDay() {
    if (!this.activeChallenge) return 1;
    
    const startDate = new Date(this.activeChallenge.created_at);
    const today = new Date();
    const timeDiff = today.getTime() - startDate.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1; // +1 because day 1 is the start date
    
    // Don't go beyond the challenge duration
    return Math.min(dayDiff, this.activeChallenge.duration);
}

getChallengeProgress() {
    if (!this.activeChallenge) return 0;
    
    const currentDay = this.getCurrentChallengeDay();
    return Math.round((currentDay / this.activeChallenge.duration) * 100);
}

getChallengeStatus() {
    const currentDay = this.getCurrentChallengeDay();
    const duration = this.activeChallenge?.duration || 0;
    
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
    async toggleGoal(goalIndex) {
        if (!this.currentUser || !this.activeChallenge) return;
        
        const today = new Date().toISOString().split('T')[0];
        const wasCompleted = this.getTodayProgress()[goalIndex] || false;
        const newCompleted = !wasCompleted;
    }
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
        
        // Update locally first for smooth UI
        if (!this.dailyProgress[today]), this.dailyProgress[today] = {};
        this.dailyProgress[today][goalIndex] = newCompleted;
        
        // Update UI immediately
        this.updateGoalItem(goalIndex);
        
        // Save to database
        await this.updateProgress(
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
    
    showCreateChallengeModal() {
        this.showCreateChallenge = true;
        this.renderModal();
    }
    
    hideCreateChallengeModal() {
        this.showCreateChallenge = false;
        this.newChallenge = { name: '', duration: 7, goals: [''] };
        const modal = document.getElementById('challengeModal');
        if (modal) {
            modal.remove();
        }
    }
    
async createChallenge() {
    const name = this.newChallenge.name.trim();
    const validGoals = this.newChallenge.goals.filter(g => g.trim());
    
    if (name && validGoals.length > 0 && this.currentUser) {
        const challengeData = {
            user_id: this.currentUser.id,
            name: name,
            duration: this.newChallenge.duration,
            goals: validGoals
        };
        
        try {
            const challenge = await this.createChallengeAPI(challengeData);
            
            if (challenge) {
                // Ensure challenges is always an array
                if (!Array.isArray(this.challenges)) {
                    this.challenges = [];
                }
                
                this.challenges.push(challenge);
                this.activeChallenge = challenge;
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
    
    addGoal() {
        this.newChallenge.goals.push('');
        this.updateModalGoals();
    }
    
    removeGoal(index) {
        if (this.newChallenge.goals.length > 1) {
            this.newChallenge.goals.splice(index, 1);
            this.updateModalGoals();
        }
    }
    
    updateGoal(index, value) {
        this.newChallenge.goals[index] = value;
    }
    
    updateModalGoals() {
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = `
                ${this.newChallenge.goals.map((goal, index) => `
                    <div class="flex items-center space-x-2">
                        <input 
                            type="text" 
                            value="${goal}"
                            data-goal-index="${index}"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 goal-input"
                            placeholder="Goal ${index + 1}"
                        />
                        ${this.newChallenge.goals.length > 1 ? `
                            <button class="p-2 text-red-500 hover:text-red-700 remove-goal" data-goal-index="${index}">
                                <span>🗑️</span>
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
                <button id="addGoalBtn" class="flex items-center space-x-2 text-blue-500 hover:text-blue-700 text-sm">
                    <span>➕</span>
                    <span>Add Goal</span>
                </button>
            `;
            this.attachModalGoalEvents();
        }
    }
    
async handleLogin(name) {
    const user = await this.createUser(name);
    if (user) {
        this.currentUser = user;
        this.userStats.totalPoints = user.total_points;
        this.currentScreen = 'dashboard';
        
        // Load user's data
        try {
            const [challengesData, statsData, leaderboardData] = await Promise.all([
                this.loadChallenges(user.id),
                this.loadUserStats(user.id),
                this.loadLeaderboard()
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
        this.userStats = { totalPoints: 0 };
        this.currentScreen = 'login';
        this.render();
    }
    
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
    
    renderModal() {
        const existingModal = document.getElementById('challengeModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in" id="challengeModal">
                <div class="bg-white rounded-xl p-6 w-full max-w-md slide-in-from-bottom-4" style="animation: slideInFromBottom 0.3s ease-out;">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">Create New Challenge</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Challenge Name</label>
                            <input 
                                type="text" 
                                id="challengeName"
                                value="${this.newChallenge.name}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter challenge name"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                            <input 
                                type="number" 
                                id="challengeDuration"
                                value="${this.newChallenge.duration}"
                                min="1"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Daily Goals</label>
                            <div class="space-y-2" id="goalsList">
                                ${this.newChallenge.goals.map((goal, index) => `
                                    <div class="flex items-center space-x-2">
                                        <input 
                                            type="text" 
                                            value="${goal}"
                                            data-goal-index="${index}"
                                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 goal-input"
                                            placeholder="Goal ${index + 1}"
                                        />
                                        ${this.newChallenge.goals.length > 1 ? `
                                            <button class="p-2 text-red-500 hover:text-red-700 remove-goal" data-goal-index="${index}">
                                                <span>🗑️</span>
                                            </button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                                <button id="addGoalBtn" class="flex items-center space-x-2 text-blue-500 hover:text-blue-700 text-sm">
                                    <span>➕</span>
                                    <span>Add Goal</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3 mt-6">
                        <button id="cancelChallengeBtn" class="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button id="createChallengeBtn" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            Create Challenge
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachModalEvents();
    }
    // === LEADERBOARD RENDER METHOD ===
renderLeaderboard() {
    if (!this.showLeaderboard) return '';
    
    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="leaderboardModal">
            <div class="bg-white rounded-xl p-6 w-full max-w-md" style="animation: slideInFromBottom 0.3s ease-out;">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-gray-800">🏆 Leaderboard</h3>
                    <button id="closeLeaderboardBtn" class="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                
                <div class="space-y-3 max-h-96 overflow-y-auto">
                    ${this.leaderboard.map((user, index) => `
                        <div class="flex items-center justify-between p-3 rounded-lg ${
                            user.id === this.currentUser.id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                        }">
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                    index === 1 ? 'bg-gray-300 text-gray-700' :
                                    index === 2 ? 'bg-amber-600 text-amber-100' :
                                    'bg-gray-200 text-gray-600'
                                }">
                                    ${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                                </div>
                                <div>
                                    <p class="font-semibold text-gray-800">${user.name}</p>
                                    <p class="text-xs text-gray-500">${user.total_challenges} challenges</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-blue-600">${user.total_points}</p>
                                <p class="text-xs text-gray-500">points</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}
// === END LEADERBOARD RENDER METHOD ===
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
                                <p class="text-xs text-gray-500">Rank #${this.userStats.rank || '?'}</p>
                                    <span>🚪</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    <main class="max-w-4xl mx-auto p-4">
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-right-4">
                            ${this.renderEmptyState()}
                        </div>
                        ${this.renderLeaderboard()}
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
                                <p class="text-xs text-gray-500">Total earned</p>
                            </div>
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
            
            <!-- Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                     style="width: ${this.getChallengeProgress()}%"></div>
            </div>
            <p class="text-xs text-gray-500">${this.getChallengeProgress()}% complete</p>
        </div>
                                    <button id="newChallengeBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg transition-all duration-200">
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
            this.showCreateChallengeModal();
        });
    }
    
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            this.showLeaderboardModal();
        });
    }
    
    this.attachLeaderboardEvents();
}
    
    attachModalEvents() {
        const modal = document.getElementById('challengeModal');
        const cancelBtn = document.getElementById('cancelChallengeBtn');
        const createBtn = document.getElementById('createChallengeBtn');
        const nameInput = document.getElementById('challengeName');
        const durationInput = document.getElementById('challengeDuration');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideCreateChallengeModal();
            });
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createChallenge();
            });
        }
        
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.newChallenge.name = e.target.value;
            });
        }
        
        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                this.newChallenge.duration = parseInt(e.target.value) || 7;
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCreateChallengeModal();
                }
            });
        }
        
        this.attachModalGoalEvents();
    }
    
    attachModalGoalEvents() {
        const addGoalBtn = document.getElementById('addGoalBtn');
        
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => {
                this.addGoal();
            });
        }
        
        document.querySelectorAll('.goal-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-goal-index'));
                this.updateGoal(index, e.target.value);
            });
        });
        
        document.querySelectorAll('.remove-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-goal-index'));
                this.removeGoal(index);
            });
        });
    }
}
// === LEADERBOARD EVENT METHODS ===
showLeaderboardModal() {
    this.showLeaderboard = true;
    this.renderLeaderboardModal();
}

hideLeaderboardModal() {
    this.showLeaderboard = false;
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.remove();
    }
}

renderLeaderboardModal() {
    const existingModal = document.getElementById('leaderboardModal');
    if (existingModal) existingModal.remove();
    
    const modalHTML = this.renderLeaderboard();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.attachLeaderboardEvents();
}

attachLeaderboardEvents() {
    if (!this.showLeaderboard) return;
    
    const modal = document.getElementById('leaderboardModal');
    const closeBtn = document.getElementById('closeLeaderboardBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            this.hideLeaderboardModal();
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideLeaderboardModal();
            }
        });
    }
}
// === END LEADERBOARD EVENT METHODS ===
// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChallengeApp();
});
