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
            
            miniLeaderboard.innerHTML = topFive.map((user, index) => `
                <div class="flex justify-between items-center py-1 ${(user.username === this.app.currentUser?.username || user.name === this.app.currentUser?.username) ? 'bg-blue-50 rounded px-2' : ''}">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold ${index === 0 ? 'text-yellow-600' : 'text-gray-500'}">
                            #${index + 1}
                        </span>
                        <span class="text-sm">${user.username || user.name || 'Unknown User'}</span>
                    </div>
                    <span class="text-sm font-bold">${user.total_points || 0}</span>
                </div>
            `).join('');
            
            // Show current user's rank if not in top 5
            const currentUserRank = leaderboard.findIndex(u => 
                u.username === this.app.currentUser?.username || 
                u.name === this.app.currentUser?.username
            );
            
            if (currentUserRank >= 5) {
                const currentUser = leaderboard[currentUserRank];
                miniLeaderboard.innerHTML += `
                    <div class="border-t pt-2 mt-2">
                        <div class="flex justify-between items-center py-1 bg-blue-50 rounded px-2">
                            <div class="flex items-center space-x-2">
                                <span class="text-xs font-bold text-gray-500">#${currentUserRank + 1}</span>
                                <span class="text-sm">${currentUser.username || currentUser.name || 'You'}</span>
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
