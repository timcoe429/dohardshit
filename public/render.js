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
        } else if (this.app.currentScreen === 'dashboard') {
            app.innerHTML = this.renderDashboard();
            this.app.eventHandler.attachDashboardEvents();
        }
    }

    renderLogin() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md transform transition-all hover:scale-105">
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">Daily Challenge</h1>
                    <p class="text-gray-600 mb-6">Track your goals, build habits</p>
                    
                    <input 
                        type="text" 
                        id="nameInput" 
                        placeholder="Enter your name"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    />
                    
                    <button 
                        id="loginBtn"
                        class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                    >
                        Start Challenge
                    </button>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        const todayPoints = this.app.progressManager.getTodayPoints();
        const completion = this.app.progressManager.getCompletionPercentage();
        const challengeDay = this.app.challengeManager.getCurrentChallengeDay();
        const challengeProgress = this.app.challengeManager.getChallengeProgress();
        
        const challengeDaysText = challengeDay > 0 ? 
            `${challengeDay}` : 
            (this.app.activeChallenge ? 'Starting today' : 'No active challenge');
        
        return `
            <div class="min-h-screen bg-gray-50">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                ${this.app.currentUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 class="text-xl font-bold text-gray-800">Daily Challenge</h1>
                                <p class="text-sm text-gray-600">Welcome back, ${this.app.currentUser.name}!</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="text-right">
                                <p class="text-2xl font-bold text-blue-600">${this.app.currentUser.total_points} points</p>
                                <p class="text-xs text-gray-500">Total earned</p>
                            </div>
                            <div class="flex space-x-2">
                                <button
                                    id="statsBtn"
                                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors stats-btn"
                                    title="View Stats"
                                >
                                    📊
                                </button>
                                <button
                                    id="leaderboardBtn"
                                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="View Leaderboard"
                                >
                                    🏆
                                </button>
                                <button
                                    id="userMgmtBtn"
                                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Manage Users"
                                >
                                    👥
                                </button>
                                <button
                                    id="logoutBtn"
                                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Logout"
                                >
                                    🚪
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="max-w-4xl mx-auto px-4 py-8">
                    ${this.app.activeChallenge ? `
                        <!-- Stats Cards with Current Badge -->
                        <div class="grid grid-cols-4 gap-4 mb-6">
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 mb-1">Today's Points</p>
                                        <p class="text-2xl font-bold text-blue-600">${todayPoints}</p>
                                    </div>
                                    <span class="text-2xl">🏅</span>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 mb-1">Completed Today</p>
                                        <p class="text-2xl font-bold text-green-600">${completion}%</p>
                                    </div>
                                    <span class="text-2xl">📊</span>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 mb-1">Challenge Days</p>
                                        <p class="text-2xl font-bold text-purple-600">${challengeDaysText}</p>
                                    </div>
                                    <span class="text-2xl">🎯</span>
                                </div>
                            </div>
                            
                            <div id="current-badge-card" class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <!-- Badge will be inserted here -->
                            </div>
                        </div>

                        <!-- Next Badge Progress (compact) -->
                        <div id="next-badge-progress"></div>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                            <div class="p-6 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h2 class="text-xl font-bold text-gray-800">${this.app.activeChallenge.name}</h2>
                                        <p class="text-sm text-gray-600 mt-1">Day ${challengeDay} of ${this.app.activeChallenge.duration} • ${challengeProgress}% complete</p>
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        Complete your daily goals to earn points
                                    </div>
                                </div>
                                
                                <!-- Progress Bar -->
                                <div class="mt-4 w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" 
                                         style="width: ${challengeProgress}%">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="p-6 space-y-3" id="goalsList">
                                ${this.app.activeChallenge.goals.map((goal, index) => 
                                    this.renderGoalItem(goal, index)
                                ).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <h2 class="text-2xl font-bold text-gray-800 mb-4">No Active Challenge</h2>
                            <p class="text-gray-600 mb-6">Create a new challenge to start tracking your goals!</p>
                        </div>
                    `}
                    
                    <button
                        id="newChallengeBtn"
                        class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                    >
                        ${this.app.activeChallenge ? 'Create New Challenge' : 'Create Your First Challenge'}
                    </button>
                </main>
            </div>
        `;
    }

    renderGoalItem(goal, index) {
        const isCompleted = this.app.progressManager.getTodayProgress()[index] || false;
        
        return `
            <div 
                class="flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 goal-item ${
                    isCompleted 
                        ? 'bg-green-50 border-green-500 hover:bg-green-100' 
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                }"
                data-goal-index="${index}"
            >
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 ${
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
    }

updateGoalItem(goalIndex) {
    const goalElement = document.querySelector(`[data-goal-index="${goalIndex}"]`);
    if (!goalElement) return;
    
    const goal = this.app.activeChallenge.goals[goalIndex];
    goalElement.outerHTML = this.renderGoalItem(goal, goalIndex);
    
    // Get the new element after replacing HTML
    const newElement = document.querySelector(`[data-goal-index="${goalIndex}"]`);
    
    // Reattach event listener for the new element
    newElement.addEventListener('click', () => {
        console.log(`Reattaching click handler for goal ${goalIndex}`);
        this.app.progressManager.toggleGoal(goalIndex);
    });
    
    // Add click animation
    setTimeout(() => {
        newElement.classList.add('scale-95');
        setTimeout(() => newElement.classList.remove('scale-95'), 100);
    }, 10);
}
    
    renderCreateChallengeModal() {
        const modalHTML = `
            <div id="createChallengeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">Create New Challenge</h2>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Challenge Name</label>
                            <input 
                                type="text" 
                                id="challengeName"
                                value="${this.app.newChallenge.name}"
                                placeholder="e.g., 30-Day Fitness Challenge"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                            <input 
                                type="number" 
                                id="challengeDuration"
                                value="${this.app.newChallenge.duration}"
                                min="1" 
                                max="365"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Daily Goals</label>
                            <div id="goalsList" class="space-y-2">
                                <!-- Goals will be rendered here -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3 mt-6">
                        <button 
                            onclick="window.app.challengeManager.createChallenge()"
                            class="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                            Create Challenge
                        </button>
                        <button 
                            onclick="window.app.hideCreateChallengeModal()"
                            class="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Render goals after modal is in DOM
        this.updateModalGoals();
        
        // Attach event listeners
        document.getElementById('challengeName').addEventListener('input', (e) => {
            this.app.newChallenge.name = e.target.value;
        });
        
        document.getElementById('challengeDuration').addEventListener('input', (e) => {
            this.app.newChallenge.duration = parseInt(e.target.value) || 7;
        });
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
    
    async renderNextBadgeProgress() {
        const container = document.getElementById('next-badge-progress');
        const badgeCard = document.getElementById('current-badge-card');
        
        if (!container && !badgeCard) return;
        
        try {
            // Get current badge
            const themeResponse = await fetch(`/api/users/${this.app.currentUser.id}/current-theme`);
            const currentBadge = themeResponse.ok ? await themeResponse.json() : null;
            
            // Get next badge info
            const nextBadge = await this.app.getNextBadge();
            
            // Render current badge in the 4th stats card
            if (badgeCard) {
                if (currentBadge) {
                    badgeCard.innerHTML = `
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">Current Badge</p>
                                <p class="text-lg font-bold text-gray-800">${currentBadge.name}</p>
                            </div>
                            <span class="text-2xl">${currentBadge.icon}</span>
                        </div>
                    `;
                } else {
                    badgeCard.innerHTML = `
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600 mb-1">Current Badge</p>
                                <p class="text-lg font-bold text-gray-400">None yet</p>
                            </div>
                            <span class="text-2xl opacity-30">🏆</span>
                        </div>
                    `;
                }
            }
            
            // Render next badge progress (compact)
            if (container && nextBadge) {
                container.innerHTML = `
                    <div class="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <span class="text-xl opacity-50">${nextBadge.icon}</span>
                                <div>
                                    <p class="text-sm font-medium text-gray-800">Next: ${nextBadge.name} - ${nextBadge.daysRemaining} days to go</p>
                                    <div class="flex items-center space-x-2 mt-1">
                                        <div class="w-32 bg-gray-200 rounded-full h-2">
                                            <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                                                 style="width: ${nextBadge.progress}%">
                                            </div>
                                        </div>
                                        <span class="text-xs text-gray-500">${nextBadge.currentStreak}/${nextBadge.days} days</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (container) {
                container.innerHTML = '';
            }
        } catch (err) {
            console.error('Error rendering badge progress:', err);
            if (container) container.innerHTML = '';
            if (badgeCard) badgeCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm text-gray-600 mb-1">Current Badge</p>
                        <p class="text-lg font-bold text-gray-400">Loading...</p>
                    </div>
                    <span class="text-2xl opacity-30">🏆</span>
                </div>
            `;
        }
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
    
    renderUserManagementModal() {
        const modalHTML = `
            <div id="userMgmtModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-gray-800">Manage Users</h2>
                        <button onclick="window.app.hideUserManagement()" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                    </div>
                    
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${this.app.leaderboard.map(user => `
                            <div class="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                                <div>
                                    <p class="font-semibold text-gray-800">${user.name}</p>
                                    <p class="text-sm text-gray-500">${user.total_points} points</p>
                                </div>
                                ${user.id !== this.app.currentUser.id ? `
                                    <button 
                                        onclick="window.app.deleteUser(${user.id})"
                                        class="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                ` : '<span class="text-xs text-gray-400">You</span>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}
