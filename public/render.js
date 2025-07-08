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
            <div class="min-h-screen bg-white flex items-center justify-center p-4">
                <div class="w-full max-w-md">
                    <!-- Logo/Title -->
                    <div class="text-center mb-12">
                        <h1 class="text-6xl font-black text-black mb-2">
                            DO<span class="text-red-600">HARD</span>SHIT
                        </h1>
                        <p class="text-xl text-gray-800 font-bold">.TODAY</p>
                        <div class="w-24 h-1 bg-red-600 mx-auto mt-4"></div>
                    </div>
                    
                    <!-- Main Card -->
                    <div class="bg-white border-4 border-black p-8">
                        <p class="text-lg text-gray-700 font-bold text-center mb-8">
                            NO EXCUSES. NO BULLSHIT.<br/>
                            <span class="text-red-600">GET SHIT DONE.</span>
                        </p>
                        
                        <input 
                            type="text" 
                            id="nameInput" 
                            placeholder="YOUR NAME"
                            class="w-full px-4 py-4 border-3 border-black text-lg font-bold placeholder-gray-500 focus:outline-none focus:border-red-600 mb-4 uppercase"
                            style="border-width: 3px;"
                        />
                        
                        <input 
                            type="password" 
                            id="passwordInput" 
                            placeholder="PASSWORD"
                            class="w-full px-4 py-4 border-3 border-black text-lg font-bold placeholder-gray-500 focus:outline-none focus:border-red-600 mb-6"
                            style="border-width: 3px;"
                        />
                        
                        <button 
                            id="loginBtn"
                            class="w-full bg-black hover:bg-red-600 text-white py-4 text-xl font-black tracking-wider transition-all duration-200 transform hover:scale-105"
                        >
                            START CRUSHING IT
                        </button>
                        
                        <div class="mt-8 pt-6 border-t-2 border-gray-200">
                            <div class="flex justify-between text-sm font-bold text-gray-600">
                                <span>💀 NO COMFORT ZONE</span>
                                <span>🔥 DAILY GRIND</span>
                                <span>⚡ PURE FOCUS</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Bottom Text -->
                    <p class="text-center mt-8 text-gray-600 font-bold">
                        STOP BEING SOFT. START TODAY.
                    </p>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        // Use StatsService for single source of truth, fallback to old methods
        const todayPoints = this.app.statsService ? 
            this.app.statsService.getDailyPoints() : 
            this.app.progressManager.getTodayPoints();
        
        const completion = this.app.statsService ? 
            this.app.statsService.getTodayCompletion() : 
            this.app.progressManager.getCompletionPercentage();
        
        const challengeDay = this.app.statsService ? 
            this.app.statsService.getChallengeDays() : 
            this.app.challengeManager.getCurrentChallengeDay();
        
        const challengeProgress = this.app.statsService ? 
            this.app.statsService.getChallengeProgress() : 
            this.app.challengeManager.getChallengeProgress();
        
        // PROGRESS BAR DEBUG - Final render values
        console.log('📊 RENDERING DASHBOARD:', { challengeDay, challengeProgress, challengeName: this.app.activeChallenge?.name });
        
        const isComplete = this.app.challengeManager.isChallengeComplete();
        
        const challengeDaysText = this.app.activeChallenge ? 
            (isComplete ? 'Complete!' : `${challengeDay}`) : 
            'No active challenge';
        
        return `
            <div class="min-h-screen bg-gray-50">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">
                                ${this.app.currentUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 class="text-xl font-black text-gray-800">DO<span class="text-red-600">HARD</span>SHIT</h1>
                                <p class="text-sm text-gray-600">${MotivationUtils.getDailyQuote()}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="text-right">
                                <p class="text-2xl font-bold text-black">${this.app.currentUser.total_points} points</p>
                                <p class="text-xs text-gray-500">Total earned</p>
                            </div>
                            <!-- Slide-out Menu Trigger -->
                            <button
                                id="slideOutMenuBtn"
                                class="p-3 hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-200 hover:border-black"
                                title="Dashboard Menu"
                            >
                                <span class="text-lg">⚔️</span>
                            </button>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="max-w-4xl mx-auto px-4 py-8">
                    ${this.app.activeChallenge && !isComplete ? `
                        <!-- Stats Cards with Current Badge -->
                        <div class="grid grid-cols-4 gap-4 mb-6">
                            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm text-gray-600 mb-1">Today's Points</p>
                                        <p class="text-2xl font-bold text-black">${todayPoints}</p>
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
                                        <p class="text-2xl font-bold text-red-600">${challengeDaysText}</p>
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
                                    <div class="bg-black h-2 rounded-full transition-all duration-300" 
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
                        <!-- No Active Challenge -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-8 text-center">
                            <div class="text-6xl mb-4">🎯</div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-2">No Active Challenge</h2>
                            <p class="text-gray-600 mb-6">Ready to push your limits? Create a new challenge and start crushing your goals.</p>
                            <button
                                onclick="window.app.showTemplateSelector()"
                                class="bg-black hover:bg-red-600 text-white px-8 py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
                            >
                                CREATE NEW CHALLENGE
                            </button>
                        </div>
                    `}
                    
                    ${this.renderPastChallengesTable()}
                    
                    ${!this.app.activeChallenge || isComplete ? `
                        <!-- Create New Challenge Button -->
                        <div class="mt-6">
                            <button
                                onclick="window.app.showTemplateSelector()"
                                class="w-full bg-black hover:bg-red-600 text-white py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
                            >
                                CREATE NEW CHALLENGE
                            </button>
                        </div>
                    ` : ''}
                </main>
            </div>
            
            <!-- Slide-out Dashboard -->
            <div id="slideOutDashboard" class="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform translate-x-full transition-transform duration-300 z-50 border-l-4 border-black">
                <div class="h-full flex flex-col">
                    <!-- Dashboard Header -->
                    <div class="p-6 border-b-2 border-gray-200 bg-black">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-xl font-bold text-white">⚔️ Battle Dashboard</h2>
                                <p class="text-sm text-gray-300">Manage your competition</p>
                            </div>
                            <button id="closeDashboardBtn" class="text-white hover:text-gray-300 text-2xl">✕</button>
                        </div>
                    </div>
                    
                    <!-- Dashboard Content -->
                    <div class="flex-1 overflow-y-auto">
                        ${this.renderDashboardTabs()}
                    </div>
                </div>
            </div>
            
            <!-- Dashboard Overlay -->
            <div id="dashboardOverlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden"></div>
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
        
        // Event listener is handled by event delegation in events.js - no need to reattach
        
        // Add click animation
        setTimeout(() => {
            newElement.classList.add('scale-95');
            setTimeout(() => newElement.classList.remove('scale-95'), 100);
        }, 10);
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
    
    updateStats() {
        // Use StatsService if available, otherwise fallback to old methods
        if (this.app.statsService) {
            this.app.statsService.updateAllUI();
        } else {
            // Fallback to old method
        const todayPoints = this.app.progressManager.getTodayPoints();
        const completion = this.app.progressManager.getCompletionPercentage();
        
        // Update points in header
        const headerPoints = document.querySelector('.text-black');
        if (headerPoints) headerPoints.textContent = `${this.app.currentUser.total_points} points`;
        
        // Update today's points card
        const todayPointsElement = document.querySelector('.grid .text-2xl.text-black');
        if (todayPointsElement) todayPointsElement.textContent = todayPoints;
        
        // Update completion percentage
        const completionElement = document.querySelector('.text-2xl.text-green-600');
        if (completionElement) completionElement.textContent = `${completion}%`;
        }
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
                                <p class="text-lg font-bold text-purple-600">Lil Bitch</p>
                            </div>
                            <span class="text-2xl">🍆</span>
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
                                            <div class="bg-black h-2 rounded-full transition-all duration-500" 
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

    renderPastChallengesTable() {
        if (!this.app.pastChallenges || this.app.pastChallenges.length === 0) {
            return '';
        }
        
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-bold text-gray-800">Past Challenges</h3>
                    <p class="text-sm text-gray-600 mt-1">Your challenge history and performance</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Challenge</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${this.app.pastChallenges.map(challenge => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="font-medium text-gray-900">${challenge.challenge_name}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${challenge.total_goals}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${challenge.duration} days
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span class="font-medium text-green-600">${challenge.points_earned}</span> / ${challenge.points_possible}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                <div class="bg-green-600 h-2 rounded-full" style="width: ${challenge.completion_percentage}%"></div>
                                            </div>
                                            <span class="text-sm font-medium text-gray-900">${Math.round(challenge.completion_percentage)}%</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(challenge.completed_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderDashboardTabs() {
        return `
            <div class="p-4">
                <!-- Tab Navigation -->
                <div class="flex border-b-2 border-gray-200 mb-4">
                    <button class="dashboard-tab active px-4 py-2 font-bold text-black border-b-2 border-black" data-tab="ghosts">
                        👻 Ghost Challengers
                    </button>
                    <button class="dashboard-tab px-4 py-2 font-bold text-gray-500 hover:text-black" data-tab="stats">
                        📊 Personal Stats
                    </button>
                    <button class="dashboard-tab px-4 py-2 font-bold text-gray-500 hover:text-black" data-tab="settings">
                        ⚙️ Settings
                    </button>
                </div>
                
                <!-- Tab Content -->
                <div id="ghostsTab" class="tab-content">
                    ${this.renderGhostChallengersTab()}
                </div>
                
                <div id="statsTab" class="tab-content hidden">
                    ${this.renderPersonalStatsTab()}
                </div>
                
                <div id="settingsTab" class="tab-content hidden">
                    ${this.renderSettingsTab()}
                </div>
            </div>
        `;
    }
    
    renderGhostChallengersTab() {
        if (!this.app.activeChallenge) {
            return `
                <div class="text-center py-8">
                    <div class="text-6xl mb-4">🎯</div>
                    <h3 class="text-lg font-bold text-gray-700 mb-2">No Active Challenge</h3>
                    <p class="text-gray-500">Start a challenge to add ghost competitors!</p>
                </div>
            `;
        }
        
        return `
            <div class="space-y-4">
                <!-- Add Ghost Button -->
                <button 
                    id="addGhostBtn" 
                    class="w-full bg-black hover:bg-red-600 text-white py-3 rounded-lg font-bold transition-all transform hover:scale-105"
                >
                    ➕ Add Ghost Challenger
                </button>
                
                <!-- Previous Self Option -->
                <button 
                    id="addPrevSelfBtn" 
                    class="w-full bg-gray-700 hover:bg-gray-900 text-white py-3 rounded-lg font-bold transition-all"
                >
                    🔄 Challenge Your Past Self
                </button>
                
                <!-- Current Ghosts -->
                <div id="currentGhosts">
                    <h4 class="font-bold text-gray-700 mb-2">Active Ghosts:</h4>
                    <div id="ghostsList" class="space-y-2">
                        <!-- Ghost challengers will be loaded here -->
                        <p class="text-gray-500 text-sm">No ghost challengers yet. Add one to start competing!</p>
                    </div>
                </div>
                
                <!-- Ghost Leaderboard -->
                <div class="mt-6">
                    <h4 class="font-bold text-gray-700 mb-2">Competition Board:</h4>
                    <div id="ghostLeaderboard" class="space-y-2">
                        <!-- Combined leaderboard will show here -->
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPersonalStatsTab() {
        const currentStreak = this.app.statsService ? this.app.statsService.getCurrentStreak() : 0;
        const totalPoints = this.app.statsService ? this.app.statsService.getTotalPoints() : this.app.currentUser.total_points;
        const badgeInfo = this.app.statsService ? this.app.statsService.getBadgeInfo() : { 
            name: this.app.currentUser.badge_title || 'Lil Bitch',
            icon: this.getBadgeIcon(this.app.currentUser.badge_title)
        };
        
        return `
            <div class="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pb-4">
                <!-- Streak & Points Overview -->
                <div class="grid grid-cols-3 gap-2">
                    <div class="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold">${currentStreak}</p>
                        <p class="text-xs">Day Streak</p>
                    </div>
                    <div class="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold">${totalPoints}</p>
                        <p class="text-xs">Total Points</p>
                    </div>
                    <div class="bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-lg p-3 text-center">
                        <p class="text-3xl font-bold">${this.app.pastChallenges?.length || 0}</p>
                        <p class="text-xs">Challenges</p>
                    </div>
                </div>
                
                <!-- Current Badge Status -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-bold text-gray-700">Badge Progress</h4>
                        <span class="text-2xl">${badgeInfo.icon}</span>
                    </div>
                    <div class="mb-2">
                        <p class="font-medium text-lg">${badgeInfo.name}</p>
                        <p class="text-xs text-gray-500">${currentStreak} consecutive days</p>
                    </div>
                    ${this.renderBadgeProgressBars(currentStreak)}
                </div>
                
                <!-- 7-Day Activity Chart -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <h4 class="font-bold text-gray-700 mb-3">Last 7 Days Activity</h4>
                    <div id="weeklyActivityChart" class="h-32">
                        <p class="text-gray-500 text-sm text-center">Loading activity data...</p>
                    </div>
                </div>
                
                <!-- Monthly Calendar View -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <h4 class="font-bold text-gray-700 mb-3">This Month's Progress</h4>
                    <div id="monthlyCalendar" class="grid grid-cols-7 gap-1 text-xs">
                        <p class="text-gray-500 text-sm text-center col-span-7">Loading calendar...</p>
                    </div>
                </div>
                
                <!-- Detailed Stats -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <h4 class="font-bold text-gray-700 mb-3">Performance Metrics</h4>
                    <div id="performanceMetrics" class="space-y-2">
                        <p class="text-gray-500 text-sm">Loading metrics...</p>
                    </div>
                </div>
                
                <!-- Global Rankings -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <h4 class="font-bold text-gray-700 mb-3">🏆 Global Rankings</h4>
                    <div id="miniLeaderboard" class="space-y-2">
                        <p class="text-gray-500 text-sm">Loading rankings...</p>
                    </div>
                </div>
                
                <!-- Recent Challenges -->
                <div class="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <h4 class="font-bold text-gray-700 mb-3">📊 Challenge History</h4>
                    <div id="recentChallenges" class="space-y-2">
                        ${this.renderRecentChallenges()}
                    </div>
                </div>
                
                <!-- View Detailed Stats Button -->
                <button 
                    id="viewDetailedStatsBtn"
                    class="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-bold transition-all"
                >
                    📈 View All-Time Stats
                </button>
            </div>
        `;
    }
    
    renderBadgeProgressBars(currentStreak) {
        const milestones = [
            { days: 3, name: 'BEAST MODE', icon: '🔥' },
            { days: 7, name: 'WARRIOR', icon: '⚡' },
            { days: 30, name: 'SAVAGE', icon: '💀' },
            { days: 100, name: 'LEGEND', icon: '👑' }
        ];
        
        return milestones.map(milestone => {
            const progress = Math.min((currentStreak / milestone.days) * 100, 100);
            const isAchieved = currentStreak >= milestone.days;
            
            return `
                <div class="mb-2">
                    <div class="flex items-center justify-between mb-1">
                        <div class="flex items-center space-x-1">
                            <span class="${isAchieved ? '' : 'opacity-50'}">${milestone.icon}</span>
                            <span class="text-xs ${isAchieved ? 'font-bold' : 'text-gray-500'}">${milestone.name}</span>
                        </div>
                        <span class="text-xs text-gray-500">${currentStreak}/${milestone.days} days</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="${isAchieved ? 'bg-green-500' : 'bg-blue-500'} h-2 rounded-full transition-all duration-500" 
                             style="width: ${progress}%">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getBadgeIcon(badgeTitle) {
        if (!badgeTitle) return '🍆';
        if (badgeTitle.includes('LEGEND')) return '👑';
        if (badgeTitle.includes('SAVAGE')) return '💀';
        if (badgeTitle.includes('WARRIOR')) return '⚡';
        if (badgeTitle.includes('BEAST')) return '🔥';
        return '🍆';
    }
    
    renderRecentChallenges() {
        if (!this.app.pastChallenges || this.app.pastChallenges.length === 0) {
            return '<p class="text-gray-500 text-sm">No completed challenges yet</p>';
        }
        
        const recentThree = this.app.pastChallenges.slice(0, 3);
        return recentThree.map(challenge => `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                    <p class="text-sm font-medium">${challenge.challenge_name}</p>
                    <p class="text-xs text-gray-500">${challenge.completion_percentage}% complete</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold">${challenge.points_earned}</p>
                    <p class="text-xs text-gray-500">pts</p>
                </div>
            </div>
        `).join('');
    }
    
    renderSettingsTab() {
        return `
            <div class="space-y-4">
                <div class="text-center">
                    <h3 class="text-lg font-bold text-gray-700 mb-4">Account Settings</h3>
                </div>
                
                <button 
                    id="manageUsersBtn" 
                    class="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-bold transition-colors"
                >
                    👥 Manage Users
                </button>
                
                <button 
                    id="logoutBtn" 
                    class="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition-colors"
                >
                    🚪 Logout
                </button>
                
                <div class="mt-8 pt-4 border-t border-gray-200">
                    <p class="text-xs text-gray-500 text-center">
                        DoHardShit v2.0<br/>
                        Built for warriors who refuse to quit
                    </p>
                </div>
            </div>
        `;
    }
}
