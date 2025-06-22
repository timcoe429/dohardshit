// render.js - Handle all rendering
class Renderer {
    constructor(app) {
        this.app = app;
    }
    
    render() {
        const app = document.getElementById('app');
        
        if (this.app.currentScreen === 'login') {
            app.innerHTML = this.renderLogin();
            this.app.eventHandler.attachLoginEvents();
        } else {
            app.innerHTML = this.renderDashboard();
            this.app.eventHandler.attachDashboardEvents();
        }
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
        if (!this.app.activeChallenge) {
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
                                    <p class="text-sm text-gray-600">Welcome, ${this.app.currentUser.name}!</p>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-4">
                                <div class="text-right">
                                    <p class="text-sm font-semibold text-blue-600">${this.app.currentUser.total_points} points</p>
                                    <p class="text-xs text-gray-500">Rank #${this.app.userStats.rank || '?'}</p>
                                </div>
                                <button id="userMgmtBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Manage Users">
                                    <span>👥</span>
                                </button>
                                <button id="leaderboardBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Leaderboard">
                                    <span>🏅</span>
                                </button>
                                <button id="logoutBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Logout">
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
        
        const todayPoints = this.app.progressManager.getTodayPoints();
        const completion = this.app.progressManager.getCompletionPercentage();
        
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
                                <p class="text-sm text-gray-600">Welcome back, ${this.app.currentUser.name}!</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-4">
                            <div class="text-right">
                                <p class="text-sm font-semibold text-blue-600">${this.app.currentUser.total_points} points</p>
                                <p class="text-xs text-gray-500">Total earned</p>
                            </div>
                            <button id="userMgmtBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Manage Users">
                                <span>👥</span>
                            </button>
                            <button id="leaderboardBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Leaderboard">
                                <span>🏅</span>
                            </button>
                            <button id="logoutBtn" class="p-2 text-gray-600 hover:text-gray-800 transition-colors" title="Logout">
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
                                        <p class="text-2xl font-bold text-purple-600">${this.app.activeChallenge.duration}</p>
                                        <p class="text-sm text-gray-600">Challenge Days</p>
                                    </div>
                                    <span class="text-2xl">🎯</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-3 mb-2">
                                            <h2 class="text-xl font-bold text-gray-800">${this.app.activeChallenge.name}</h2>
                                            <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                Day ${this.app.challengeManager.getCurrentChallengeDay()} of ${this.app.activeChallenge.duration}
                                            </span>
                                        </div>
                                        <p class="text-sm text-gray-600 mb-3">Complete your daily goals to earn points</p>
                                        
                                        <!-- Progress Bar -->
                                        <div class="progress-bar-container bg-gray-200 rounded-full h-2 mb-1" style="width: 90%; max-width: 400px;">
                                            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" 
                                                 style="width: ${this.app.challengeManager.getChallengeProgress()}%"></div>
                                        </div>
                                        <p class="text-xs text-gray-500">${this.app.challengeManager.getChallengeProgress()}% complete</p>
                                    </div>
                                    <button id="newChallengeBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg transition-all duration-200">
                                        🚀 New Challenge
                                    </button>
                                </div>
                            </div>

                            <div class="p-6">
                                <div class="space-y-3">
                                    ${this.app.activeChallenge.goals.map((goal, index) => {
                                        const isCompleted = this.app.progressManager.getTodayProgress()[index] || false;
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
                                value="${this.app.newChallenge.name}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter challenge name"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                            <input 
                                type="number" 
                                id="challengeDuration"
                                value="${this.app.newChallenge.duration}"
                                min="1"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Daily Goals</label>
                            <div class="space-y-2" id="goalsList">
                                ${this.app.newChallenge.goals.map((goal, index) => `
                                    <div class="flex items-center space-x-2">
                                        <input 
                                            type="text" 
                                            value="${goal}"
                                            data-goal-index="${index}"
                                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 goal-input"
                                            placeholder="Goal ${index + 1}"
                                        />
                                        ${this.app.newChallenge.goals.length > 1 ? `
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
        this.app.eventHandler.attachModalEvents();
    }
    
    updateGoalItem(goalIndex) {
        const goalElement = document.querySelector(`[data-goal-index="${goalIndex}"]`);
        if (!goalElement) return;
        
        const isCompleted = this.app.progressManager.getTodayProgress()[goalIndex] || false;
        const goal = this.app.activeChallenge.goals[goalIndex];
        
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
        const todayPoints = this.app.progressManager.getTodayPoints();
        const completion = this.app.progressManager.getCompletionPercentage();
        
        // Update points in header
        const headerPoints = document.querySelector('.text-blue-600');
        if (headerPoints) headerPoints.textContent = `${this.app.currentUser.total_points} points`;
        
        // Update today's points card
        const todayPointsElement = document.querySelector('.grid .text-2xl.text-blue-600');
        if (todayPointsElement) todayPointsElement.textContent = todayPoints;
        
        // Update completion percentage
        const completionElement = document.querySelector('.text-2xl.text-green-600');
        if (completionElement) completionElement.textContent = `${completion}%`;
    }
    
    updateModalGoals() {
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = `
                ${this.app.newChallenge.goals.map((goal, index) => `
                    <div class="flex items-center space-x-2">
                        <input 
                            type="text" 
                            value="${goal}"
                            data-goal-index="${index}"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 goal-input"
                            placeholder="Goal ${index + 1}"
                        />
                        ${this.app.newChallenge.goals.length > 1 ? `
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
            this.app.eventHandler.attachModalGoalEvents();
        }
    }
}
