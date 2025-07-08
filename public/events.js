// events.js - Handle all event attachments
class EventHandler {
    constructor(app) {
        this.app = app;
        this.goalDelegationAdded = false;
    }
    
    attachLoginEvents() {
        const nameInput = document.getElementById('nameInput');
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        
        const handleLogin = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.app.authManager.handleLogin(name);
            }
        };
        
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
        
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        }
    }
    
    attachDashboardEvents() {
        const logoutBtn = document.getElementById('logoutBtn');
        const goalItems = document.querySelectorAll('.goal-item');
        const leaderboardBtn = document.getElementById('leaderboardBtn');
        const userMgmtBtn = document.getElementById('userMgmtBtn');
        const statsBtn = document.getElementById('statsBtn');
        
        // Slide-out Dashboard Events
        const slideOutMenuBtn = document.getElementById('slideOutMenuBtn');
        const closeDashboardBtn = document.getElementById('closeDashboardBtn');
        const dashboardOverlay = document.getElementById('dashboardOverlay');
        const slideOutDashboard = document.getElementById('slideOutDashboard');
        
        if (slideOutMenuBtn) {
            slideOutMenuBtn.addEventListener('click', () => {
                this.openSlideDashboard();
            });
        }
        
        if (closeDashboardBtn) {
            closeDashboardBtn.addEventListener('click', () => {
                this.closeSlideDashboard();
            });
        }
        
        if (dashboardOverlay) {
            dashboardOverlay.addEventListener('click', () => {
                this.closeSlideDashboard();
            });
        }
        
        // Dashboard Tab Events
        const dashboardTabs = document.querySelectorAll('.dashboard-tab');
        dashboardTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchDashboardTab(tab.getAttribute('data-tab'));
            });
        });
        
        // Dashboard Action Events
        const addGhostBtn = document.getElementById('addGhostBtn');
        const addPrevSelfBtn = document.getElementById('addPrevSelfBtn');
        
        if (addGhostBtn) {
            addGhostBtn.addEventListener('click', () => {
                this.app.showAddGhostModal();
            });
        }
        
        if (addPrevSelfBtn) {
            addPrevSelfBtn.addEventListener('click', () => {
                this.app.addPreviousSelfGhost();
            });
        }
        
        // Settings tab actions
        const manageUsersBtn = document.getElementById('manageUsersBtn');
        if (manageUsersBtn) {
            manageUsersBtn.addEventListener('click', () => {
                this.app.showUserManagement();
                this.closeSlideDashboard();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.app.authManager.handleLogout();
            });
        }

        // Use event delegation for goal clicks to handle dynamically updated elements
        // Only add this listener once to prevent multiple handlers
        if (!this.goalDelegationAdded) {
            document.addEventListener('click', (e) => {
                const goalElement = e.target.closest('[data-goal-index]');
                if (goalElement && goalElement.closest('#goalsList')) {
                    const goalIndex = parseInt(goalElement.getAttribute('data-goal-index'));
                    console.log(`Goal ${goalIndex} clicked`);
                    this.app.progressManager.toggleGoal(goalIndex);
                }
            });
            this.goalDelegationAdded = true;
        }

        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => {
                this.app.showLeaderboardModal();
            });
        }

        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.app.showStatsModal();
            });
        }

        if (userMgmtBtn) {
            userMgmtBtn.addEventListener('click', () => {
                this.app.showUserManagement();
            });
        }
    }
    
    openSlideDashboard() {
        const slideOutDashboard = document.getElementById('slideOutDashboard');
        const dashboardOverlay = document.getElementById('dashboardOverlay');
        
        if (slideOutDashboard && dashboardOverlay) {
            dashboardOverlay.classList.remove('hidden');
            slideOutDashboard.style.transform = 'translateX(0)';
            
            // Load ghost challengers for current challenge
            if (this.app.activeChallenge) {
                this.app.loadGhostChallengers();
            }
        }
    }
    
    closeSlideDashboard() {
        const slideOutDashboard = document.getElementById('slideOutDashboard');
        const dashboardOverlay = document.getElementById('dashboardOverlay');
        
        if (slideOutDashboard && dashboardOverlay) {
            slideOutDashboard.style.transform = 'translateX(100%)';
            setTimeout(() => {
                dashboardOverlay.classList.add('hidden');
            }, 300);
        }
    }
    
    switchDashboardTab(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.classList.remove('active', 'text-black', 'border-black');
            tab.classList.add('text-gray-500');
        });
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Activate selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}Tab`);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active', 'text-black', 'border-black');
            selectedTab.classList.remove('text-gray-500');
            selectedContent.classList.remove('hidden');
            
            // Load specific tab content
            if (tabName === 'stats') {
                this.loadMiniLeaderboard();
                this.loadDetailedStats();
                
                // Force refresh personal stats to ensure latest data
                if (this.app.statsService) {
                    this.app.statsService.forceRefreshPersonalStatsTab();
                }
            }
        }
    }
    
    async loadMiniLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const leaderboard = await response.json();
            
            const miniLeaderboard = document.getElementById('miniLeaderboard');
            if (!miniLeaderboard) return;
            
            const topFive = leaderboard.slice(0, 5);
            
            // Helper function to get border color based on badge
            const getBadgeBorderClass = (themeClass) => {
                if (themeClass?.includes('legend')) return 'border-yellow-500 bg-yellow-50';
                if (themeClass?.includes('savage')) return 'border-gray-800 bg-gray-100';
                if (themeClass?.includes('warrior')) return 'border-blue-500 bg-blue-50';
                if (themeClass?.includes('beast')) return 'border-orange-500 bg-orange-50';
                return 'border-purple-500 bg-purple-50'; // Lil Bitch
            };
            
            miniLeaderboard.innerHTML = topFive.map((user, index) => {
                const isCurrentUser = (user.name === this.app.currentUser?.username || user.name === this.app.currentUser?.name);
                const borderClass = getBadgeBorderClass(user.theme_class);
                
                return `
                    <div class="flex justify-between items-center py-2 px-2 rounded border-2 ${borderClass} ${isCurrentUser ? 'ring-2 ring-black' : ''}">
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-bold ${index === 0 ? 'text-yellow-600' : 'text-gray-600'}">
                                #${index + 1}
                            </span>
                            <span class="text-lg">${user.badge_icon || '🍆'}</span>
                            <span class="text-sm font-medium">${user.name || 'Unknown User'}</span>
                        </div>
                        <span class="text-sm font-bold">${user.total_points || 0}</span>
                    </div>
                `;
            }).join('');
            
            // Show current user's rank if not in top 5
            const currentUserRank = leaderboard.findIndex(u => 
                u.name === this.app.currentUser?.username || 
                u.name === this.app.currentUser?.name
            );
            
            if (currentUserRank >= 5) {
                const currentUser = leaderboard[currentUserRank];
                const borderClass = getBadgeBorderClass(currentUser.theme_class);
                
                miniLeaderboard.innerHTML += `
                    <div class="border-t-2 border-gray-300 pt-2 mt-2">
                        <div class="flex justify-between items-center py-2 px-2 rounded border-2 ${borderClass} ring-2 ring-black">
                            <div class="flex items-center space-x-2">
                                <span class="text-xs font-bold text-gray-600">#${currentUserRank + 1}</span>
                                <span class="text-lg">${currentUser.badge_icon || '🍆'}</span>
                                <span class="text-sm font-medium">${currentUser.name || 'You'}</span>
                            </div>
                            <span class="text-sm font-bold">${currentUser.total_points || 0}</span>
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Failed to load mini leaderboard:', error);
            const miniLeaderboard = document.getElementById('miniLeaderboard');
            if (miniLeaderboard) {
                miniLeaderboard.innerHTML = '<p class="text-gray-500 text-sm">Unable to load rankings</p>';
            }
        }
    }
    
    async loadDetailedStats() {
        try {
            // Load weekly activity data
            await this.loadWeeklyActivity();
            
            // Load monthly calendar
            await this.loadMonthlyCalendar();
        } catch (error) {
            console.error('Failed to load detailed stats:', error);
        }
    }
    
    async loadWeeklyActivity() {
        try {
            const weeklyChart = document.getElementById('weeklyActivityChart');
            if (!weeklyChart) return;
            
            // Get last 7 days of data
            const days = [];
            const today = new Date();
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                // Try to get progress for this day
                const response = await fetch(`/api/progress/${this.app.currentUser.id}/${this.app.activeChallenge?.id || 0}/${dateStr}`);
                const progress = response.ok ? await response.json() : {};
                
                const completedCount = Object.values(progress).filter(Boolean).length;
                const totalGoals = this.app.activeChallenge?.goals?.length || 0;
                
                days.push({
                    day: dayNames[date.getDay()],
                    date: date.getDate(),
                    completed: completedCount,
                    total: totalGoals,
                    percentage: totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0,
                    isToday: i === 0
                });
            }
            
            // Render the improved chart
            const maxHeight = 120;
            weeklyChart.innerHTML = `
                <div class="flex items-end justify-between h-32 px-2">
                    ${days.map((day, index) => {
                        const height = day.total > 0 ? (day.completed / day.total) * maxHeight : 0;
                        const isToday = index === 6;
                        let barClass = '';
                        
                        if (day.percentage === 100) {
                            barClass = 'bg-gradient-to-t from-green-600 to-green-400';
                        } else if (day.percentage > 0) {
                            barClass = 'bg-gradient-to-t from-blue-600 to-blue-400';
                        } else {
                            barClass = 'bg-gray-200';
                        }
                        
                        return `
                            <div class="flex-1 flex flex-col items-center mx-1">
                                <div class="w-full flex flex-col items-center">
                                    <span class="text-xs font-medium mb-1 ${day.percentage === 100 ? 'text-green-600' : 'text-gray-600'}">
                                        ${day.completed}/${day.total}
                                    </span>
                                    <div class="w-10 ${barClass} rounded-t-lg transition-all duration-500 relative" 
                                         style="height: ${height}px">
                                        ${day.percentage === 100 ? '<span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-lg">✅</span>' : ''}
                                    </div>
                                </div>
                                <div class="mt-2 text-center">
                                    <p class="text-xs font-medium ${isToday ? 'text-black' : 'text-gray-600'}">${day.day}</p>
                                    <p class="text-xs text-gray-400">${day.date}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="mt-3 pt-3 border-t border-gray-200">
                    <div class="flex justify-between items-center">
                        <p class="text-sm text-gray-600">
                            <span class="font-medium">${days.filter(d => d.percentage === 100).length}</span> perfect days
                        </p>
                        <p class="text-sm text-gray-600">
                            <span class="font-medium">${days.reduce((sum, d) => sum + d.completed, 0)}</span> tasks completed
                        </p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to load weekly activity:', error);
            const weeklyChart = document.getElementById('weeklyActivityChart');
            if (weeklyChart) {
                weeklyChart.innerHTML = '<p class="text-gray-500 text-sm text-center">Unable to load activity data</p>';
            }
        }
    }
    
    async loadMonthlyCalendar() {
        try {
            const calendar = document.getElementById('monthlyCalendar');
            if (!calendar) return;
            
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Days of week headers
            const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
            let calendarHTML = dayHeaders.map(day => 
                `<div class="text-center font-bold text-gray-600">${day}</div>`
            ).join('');
            
            // Empty cells for days before month starts
            for (let i = 0; i < firstDay; i++) {
                calendarHTML += '<div></div>';
            }
            
            // Days of the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = date.toISOString().split('T')[0];
                const isToday = day === today.getDate();
                const isFuture = date > today;
                
                if (!isFuture && this.app.activeChallenge) {
                    // Get progress for this day
                    const response = await fetch(`/api/progress/${this.app.currentUser.id}/${this.app.activeChallenge.id}/${dateStr}`);
                    const progress = response.ok ? await response.json() : {};
                    const completedCount = Object.values(progress).filter(Boolean).length;
                    const totalGoals = this.app.activeChallenge.goals.length;
                    const percentage = Math.round((completedCount / totalGoals) * 100);
                    
                    const bgColor = percentage === 100 ? 'bg-green-500 text-white' :
                                  percentage > 0 ? 'bg-blue-200' : 'bg-gray-100';
                    
                    calendarHTML += `
                        <div class="aspect-square flex items-center justify-center rounded ${bgColor} ${isToday ? 'ring-2 ring-black' : ''}"
                             title="${completedCount}/${totalGoals} tasks (${percentage}%)">
                            ${day}
                        </div>
                    `;
                } else {
                    // No data or future date
                    calendarHTML += `
                        <div class="aspect-square flex items-center justify-center rounded ${isFuture ? 'text-gray-300' : 'bg-gray-50'} ${isToday ? 'ring-2 ring-black' : ''}">
                            ${day}
                        </div>
                    `;
                }
            }
            
            calendar.innerHTML = calendarHTML;
        } catch (error) {
            console.error('Failed to load monthly calendar:', error);
            const calendar = document.getElementById('monthlyCalendar');
            if (calendar) {
                calendar.innerHTML = '<p class="text-gray-500 text-sm text-center col-span-7">Unable to load calendar</p>';
            }
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
