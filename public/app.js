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
       this.newChallenge = { name: '', duration: 7, goals: [''], startDate: '' };
       this.leaderboard = [];
       this.showLeaderboard = false;
       this.showUserMgmt = false;
       this.pastChallenges = [];
       this.currentGhosts = [];
       
       // Initialize managers
       this.statsService = new StatsService(this); // Initialize first - other managers depend on it
       this.authManager = new AuthManager(this);
       this.challengeManager = new ChallengeManager(this);
       this.progressManager = new ProgressManager(this);
       this.renderer = new Renderer(this);
       this.eventHandler = new EventHandler(this);
       this.leaderboardManager = new LeaderboardManager(this);
       this.statsManager = new StatsManager(this);
       this.templateSelector = new TemplateSelector(this);

       this.init().catch(console.error);
       
       // Make app globally accessible
       window.app = this;
       // Make statsService globally accessible for debugging
       window.stats = this.statsService;
       
       // Setup service worker update detection
       this.setupServiceWorkerUpdates();
   }

       async init() {
        // Check for saved login first
        const hasAutoLoggedIn = await this.authManager.checkSavedLogin();
        
        // Only render login screen if no saved login OR if auto-login failed
        if (!hasAutoLoggedIn || !this.currentUser) {
            this.render();
        } else {
            // Load initial data
            await this.loadUserData();
            
            // IMPORTANT: Load challenges first (stats service needs them)
            const challenges = await this.challengeManager.loadChallenges(this.currentUser.id);
            this.challenges = challenges;
            
            // Find and set active challenge (if any)
            const activeChallenge = challenges.find(c => {
                const startDate = new Date(c.start_date);
                const now = new Date();
                
                // For today's date, compare just the date part (ignore time)
                const todayStr = now.toISOString().split('T')[0];
                const startDateStr = startDate.toISOString().split('T')[0];
                
                let daysPassed;
                if (startDateStr === todayStr) {
                    // If start date is today, challenge is active immediately
                    daysPassed = 0;
                } else {
                    // For future/past dates, use midnight-to-midnight calculation
                    const startMidnight = new Date(startDate);
                    startMidnight.setHours(0, 0, 0, 0);
                    const nowMidnight = new Date(now);
                    nowMidnight.setHours(0, 0, 0, 0);
                    daysPassed = Math.floor((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24));
                }
                
                // Challenge is active if:
                // 1. Start date has passed (daysPassed >= 0)
                // 2. Challenge hasn't exceeded its duration
                // 3. Status is active (not completed)
                return daysPassed >= 0 && daysPassed < c.duration && c.status === 'active';
            });
            this.activeChallenge = activeChallenge;
            
            if (this.currentUser?.id) {
                this.pastChallenges = await this.challengeManager.loadPastChallenges(this.currentUser.id);
            }
            
            // Initialize today's progress if there's an active challenge
            if (this.activeChallenge) {
                await this.progressManager.initTodayProgress();
            }
            
            // Update ghost challengers (catch-up mechanism)
            if (this.currentUser) {
                await this.updateAllGhosts();
            }

            // CRITICAL: Force fresh stats sync BEFORE rendering
            if (this.statsService) {
                console.log('🔄 Forcing stats sync on page refresh...');
                this.statsService.lastUpdate = 0; // Force fresh sync
                await this.statsService.syncAllStats();
                console.log('✅ Stats synced, now rendering dashboard');
            }

            // Load leaderboard data for boost calculation
            await this.loadLeaderboard();

            // Only render AFTER stats are synced
            this.render(); // This will update the DOM with correct data
            this.eventHandler.attachDashboardEvents();
        }
    }
   
   render() {
       this.renderer.render();
   }
   
   // PWA detection methods
   isStandalone() {
       // Check if app is running as installed PWA
       return window.matchMedia('(display-mode: standalone)').matches || 
              window.navigator.standalone || 
              document.referrer.includes('android-app://');
   }
   
   isMobile() {
       return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
   }
   
   shouldShowInstallBanner() {
       // Show banner only on mobile browsers, not in PWA mode
       return this.isMobile() && !this.isStandalone() && this.currentScreen === 'dashboard';
   }
   
   // API calls
   async loadLeaderboard() {
       try {
           const response = await fetch('/api/leaderboard');
           this.leaderboard = await response.json();
           return this.leaderboard;
       } catch (err) {
           console.error('Load leaderboard error:', err);
           return [];
       }
   }

   async loadUserData() {
       try {
           if (!this.currentUser) return;
           const response = await fetch(`/api/users/${this.currentUser.id}`);
           if (response.ok) {
               const userData = await response.json();
               // Update current user data with server data
               this.currentUser.total_points = userData.total_points;
               console.log(`Loaded user data - total_points: ${userData.total_points}`);
           }
       } catch (err) {
           console.error('Load user data error:', err);
       }
   }

   async loadUserStats() {
       try {
           if (!this.currentUser) return;
           const response = await fetch(`/api/users/${this.currentUser.id}/stats`);
           this.userStats = await response.json();
           return this.userStats;
       } catch (err) {
           console.error('Load user stats error:', err);
           return { rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
       }
   }
   
   // Modal methods - Updated to show template selector first
   showTemplateSelector() {
       this.templateSelector.show();
   }
   
   showCreateChallengeModal() {
       this.showCreateChallenge = true;
       const existingModal = document.getElementById('challengeModal');
       if (existingModal) existingModal.remove();
       
       this.renderer.renderModal();
       this.eventHandler.attachModalEvents();
   }
   
   hideCreateChallengeModal() {
       this.showCreateChallenge = false;
       this.newChallenge = { name: '', duration: 7, goals: [''], startDate: '' };
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
   async showLeaderboardModal() {
       // Refresh leaderboard data before showing
       await this.loadLeaderboard();
       await this.loadUserStats();
       this.leaderboardManager.showModal();
   }

   hideLeaderboardModal() {
       this.leaderboardManager.hideModal();
   }
   
   // Stats methods
   async showStatsModal() {
       // Refresh user stats before showing
       await this.loadUserStats();
       this.statsManager.showModal();
   }

   // End challenge modal
   showEndChallengeModal() {
       if (!this.activeChallenge) return;
       
       const modalHTML = `
           <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="endChallengeModal">
               <div class="bg-white rounded-xl p-6 w-full max-w-md" style="animation: slideInFromBottom 0.3s ease-out;">
                   <div class="flex items-center justify-between mb-4">
                       <h3 class="text-lg font-bold text-gray-800">End Challenge</h3>
                       <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                   </div>
                   
                   <div class="mb-6">
                       <p class="text-gray-600 mb-2">Are you sure you want to end "<strong>${this.activeChallenge.name}</strong>"?</p>
                       <p class="text-sm text-gray-500">This will archive the challenge and reset your points. This action cannot be undone.</p>
                   </div>
                   
                   <div class="flex space-x-3">
                       <button 
                           onclick="this.closest('.fixed').remove()" 
                           class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                       >
                           Cancel
                       </button>
                       <button 
                           onclick="window.app.endChallenge()" 
                           class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold"
                       >
                           End Challenge
                       </button>
                   </div>
               </div>
           </div>
       `;
       
       document.body.insertAdjacentHTML('beforeend', modalHTML);
   }

   async endChallenge() {
       if (!this.activeChallenge) return;
       
       try {
           const challengeId = this.activeChallenge.id;
           
           // Archive the current challenge
           await this.challengeManager.archiveChallenge(this.activeChallenge);
           
           // Mark challenge as completed in database
           await fetch(`/api/challenges/${challengeId}/complete`, {
               method: 'POST'
           });
           
           // Remove the ended challenge from challenges array
           this.challenges = this.challenges.filter(c => c.id !== challengeId);
           
           // Clear the active challenge
           this.activeChallenge = null;
           
           // Reset points and reload user data
           await this.loadUserData();
           
           // Reload past challenges to show the newly archived one
           if (this.currentUser?.id) {
               this.pastChallenges = await this.challengeManager.loadPastChallenges(this.currentUser.id);
           }
           
           // Close modal and re-render
           const modal = document.getElementById('endChallengeModal');
           if (modal) modal.remove();
           
           this.render();
           
           // Show success message
           this.showNotification('Challenge ended and archived successfully!', 'success');
           
       } catch (error) {
           console.error('Error ending challenge:', error);
           this.showNotification('Failed to end challenge. Please try again.', 'error');
       }
   }

   async deleteScheduledChallenge(challengeId) {
       try {
           const response = await fetch(`/api/challenges/${challengeId}`, {
               method: 'DELETE'
           });
           
           if (response.ok) {
               // Remove from local challenges array
               this.challenges = this.challenges.filter(c => c.id !== challengeId);
               
               // Re-render to update UI
               this.render();
               
               this.showNotification('Scheduled challenge deleted successfully!', 'success');
           } else {
               throw new Error('Failed to delete challenge');
           }
       } catch (error) {
           console.error('Error deleting scheduled challenge:', error);
           this.showNotification('Failed to delete scheduled challenge. Please try again.', 'error');
       }
   }
   
   hideStatsModal() {
       this.statsManager.hideModal();
   }
   
   // Theme management
   async updateTheme() {
       if (!this.currentUser) return;
       
       try {
           const response = await fetch(`/api/users/${this.currentUser.id}/current-theme`);
           const badge = await response.json();
           
           // Remove all theme classes
           document.body.classList.remove('theme-fire', 'theme-lightning', 'theme-diamond', 'theme-legendary');
           
           // Apply new theme if user has a badge
           if (badge && badge.theme_class) {
               document.body.classList.add(badge.theme_class);
           }
       } catch (err) {
           console.error('Update theme error:', err);
       }
   }
   
   async getNextBadge() {
       if (!this.currentUser) return null;
       
       try {
           // Get current streak from the server
           const response = await fetch(`/api/users/${this.currentUser.id}/check-badges`, {
               method: 'POST'
           });
           const { currentStreak } = await response.json();
           
           // Define badge milestones
           const milestones = [
               { days: 3, name: 'BEAST MODE', icon: '🔥' },
               { days: 7, name: 'WARRIOR', icon: '⚡' },
               { days: 30, name: 'SAVAGE', icon: '💀' },
               { days: 100, name: 'LEGEND', icon: '👑' }
           ];
           
           // Find next badge
           for (const milestone of milestones) {
               if (currentStreak < milestone.days) {
                   return {
                       ...milestone,
                       currentStreak,
                       daysRemaining: milestone.days - currentStreak,
                       progress: Math.round((currentStreak / milestone.days) * 100)
                   };
               }
           }
           
           return null; // Has all badges
       } catch (err) {
           console.error('Get next badge error:', err);
           return null;
       }
   }
   
   // User Management Methods
   async showUserManagement() {
       // Refresh leaderboard data before showing
       await this.loadLeaderboard();
       this.showUserMgmt = true;
       this.renderUserManagementModal();
   }
   
   hideUserManagement() {
       this.showUserMgmt = false;
       const modal = document.getElementById('userMgmtModal');
       if (modal) {
           modal.remove();
       }
   }
   
   async deleteUser(userId) {
       if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) {
           return;
       }
       
       try {
           const response = await fetch(`/api/users/${userId}`, {
               method: 'DELETE'
           });
           
           if (response.ok) {
               // Reload leaderboard
               this.leaderboard = await this.loadLeaderboard();
               this.hideUserManagement();
               this.showUserManagement(); // Re-render
           }
       } catch (err) {
           console.error('Delete user error:', err);
           alert('Failed to delete user');
       }
   }
   
   // Add this method to app.js after the deleteUser method (around line 200)
   // This will let you manually check badges from the console
   checkBadgesManually() {
       if (!this.currentUser) {
           console.log('No user logged in');
           return;
       }
       
       fetch(`/api/users/${this.currentUser.id}/check-badges`, {
           method: 'POST'
       })
       .then(res => res.json())
       .then(data => {
           console.log('Manual badge check:', data);
           if (data.newBadges && data.newBadges.length > 0) {
               data.newBadges.forEach(badge => {
                   this.progressManager.showBadgeNotification(badge);
               });
               this.updateTheme();
               this.renderer.renderNextBadgeProgress();
           }
       })
       .catch(err => console.error('Manual badge check error:', err));
   }
   
   renderUserManagementModal() {
       const existingModal = document.getElementById('userMgmtModal');
       if (existingModal) existingModal.remove();
       
       const modalHTML = `
           <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="userMgmtModal">
               <div class="bg-white rounded-xl p-6 w-full max-w-md" style="animation: slideInFromBottom 0.3s ease-out;">
                   <div class="flex items-center justify-between mb-4">
                       <h3 class="text-lg font-bold text-gray-800">👥 Manage Users</h3>
                       <button id="closeUserMgmtBtn" class="text-gray-400 hover:text-gray-600">✕</button>
                   </div>
                   
                   <div class="space-y-3 max-h-96 overflow-y-auto">
                       ${this.leaderboard.map(user => `
                           <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                               <div>
                                   <p class="font-semibold text-gray-800">${user.name}</p>
                                   <p class="text-xs text-gray-500">${user.total_points} points</p>
                               </div>
                               <button 
                                   onclick="window.app.deleteUser(${user.id})"
                                   class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                   ${user.id === this.currentUser.id ? 'disabled' : ''}
                               >
                                   ${user.id === this.currentUser.id ? 'You' : 'Delete'}
                               </button>
                           </div>
                       `).join('')}
                   </div>
               </div>
           </div>
       `;
       
       document.body.insertAdjacentHTML('beforeend', modalHTML);
       
       // Attach events
       const modal = document.getElementById('userMgmtModal');
       const closeBtn = document.getElementById('closeUserMgmtBtn');
       
       if (closeBtn) {
           closeBtn.addEventListener('click', () => this.hideUserManagement());
       }
       
       if (modal) {
           modal.addEventListener('click', (e) => {
               if (e.target === modal) this.hideUserManagement();
           });
       }
   }

   // === GHOST CHALLENGER METHODS ===
   
   async loadGhostChallengers() {
       if (!this.activeChallenge) return;
       
       try {
           const response = await fetch(`/api/users/${this.currentUser.id}/challenges/${this.activeChallenge.id}/ghosts`);
           const ghosts = await response.json();
           
           this.currentGhosts = ghosts;
           this.updateGhostsList();
           await this.updateGhostLeaderboard();
       } catch (error) {
           console.error('Failed to load ghost challengers:', error);
       }
   }
   
   updateGhostsList() {
       const ghostsList = document.getElementById('ghostsList');
       if (!ghostsList) return;
       
       if (!this.currentGhosts || this.currentGhosts.length === 0) {
           ghostsList.innerHTML = '<p class="text-gray-500 text-sm">No ghost challengers yet. Add one to start competing!</p>';
           return;
       }
       
       ghostsList.innerHTML = this.currentGhosts.map(ghost => `
           <div class="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
               <div class="flex items-center space-x-3">
                   <div class="text-lg">👻</div>
                   <div>
                       <p class="font-medium text-black">${ghost.ghost_name}</p>
                       <p class="text-xs text-gray-500">
                           ${ghost.difficulty_level.charAt(0).toUpperCase() + ghost.difficulty_level.slice(1)} • 
                           ${ghost.current_points} points • 
                           Day ${ghost.current_day}
                       </p>
                   </div>
               </div>
               <button 
                   onclick="app.removeGhost(${ghost.id})" 
                   class="text-red-500 hover:text-red-700 text-sm"
                   title="Remove Ghost"
               >
                   ✕
               </button>
           </div>
       `).join('');
   }
   
   async updateGhostLeaderboard() {
       const ghostLeaderboard = document.getElementById('ghostLeaderboard');
       if (!ghostLeaderboard) return;
       
       // Combine real user and ghosts for this user's personal leaderboard
       const combinedUsers = [];
       
       // Add current user with their total points (not just current challenge)
       if (this.activeChallenge && this.currentUser) {
           // Use StatsService for consistent data
           const totalPoints = this.statsService ? this.statsService.getTotalPoints() : this.currentUser.total_points;
           const badgeInfo = this.statsService ? this.statsService.getBadgeInfo() : { name: this.currentUser.badge_title || 'Lil Bitch' };
           
           combinedUsers.push({
               name: this.currentUser.username || this.currentUser.name || 'You',
               points: totalPoints,
               type: 'user',
               badge_title: badgeInfo.name
           });
       }
       
       // Add ghosts
       if (this.currentGhosts) {
           this.currentGhosts.forEach(ghost => {
               combinedUsers.push({
                   name: ghost.ghost_name,
                   points: ghost.current_points,
                   type: 'ghost',
                   difficulty: ghost.difficulty_level,
                   badge_title: this.getBadgeForPoints(ghost.current_points)
               });
           });
       }
       
       // Sort by points
       combinedUsers.sort((a, b) => b.points - a.points);
       
       if (combinedUsers.length === 0) {
           ghostLeaderboard.innerHTML = '<p class="text-gray-500 text-sm">Start a challenge to see your competition!</p>';
           return;
       }
       
       ghostLeaderboard.innerHTML = combinedUsers.map((user, index) => `
           <div class="flex items-center justify-between p-2 bg-white rounded border ${user.type === 'user' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}">
               <div class="flex items-center space-x-3">
                   <span class="text-sm font-bold ${index === 0 ? 'text-yellow-600' : 'text-gray-500'}">
                       #${index + 1}
                   </span>
                   <span class="text-lg">
                       ${user.type === 'user' ? '👤' : '👻'}
                   </span>
                   <div>
                       <p class="text-sm font-medium">${user.name}</p>
                       <p class="text-xs text-gray-500">${user.badge_title}</p>
                   </div>
               </div>
               <span class="text-sm font-bold">${user.points}</span>
           </div>
       `).join('');
   }
   
   getBadgeForPoints(points) {
       if (points >= 100) return '👑 LEGEND';
       if (points >= 30) return '💀 SAVAGE';
       if (points >= 7) return '⚡ WARRIOR';
       if (points >= 3) return '🔥 BEAST MODE';
       return '🍆 Lil Bitch';
   }
   
   showAddGhostModal() {
       if (!this.activeChallenge) return;
       
       const maxPointsPerDay = this.activeChallenge.goals.length;
       
       // Calculate realistic ranges based on challenge goals
       const difficultyRanges = {
           casual: {
               min: Math.max(1, Math.floor(maxPointsPerDay * 0.4)),
               max: Math.ceil(maxPointsPerDay * 0.6),
               description: '40-60% completion'
           },
           moderate: {
               min: Math.max(1, Math.floor(maxPointsPerDay * 0.6)),
               max: Math.ceil(maxPointsPerDay * 0.8),
               description: '60-80% completion'
           },
           aggressive: {
               min: Math.max(1, Math.floor(maxPointsPerDay * 0.8)),
               max: Math.max(1, Math.floor(maxPointsPerDay * 0.95)),
               description: '80-95% completion'
           },
           psycho: {
               min: maxPointsPerDay,
               max: maxPointsPerDay,
               description: '100% completion - PERFECT'
           }
       };
       
       const modalHTML = `
           <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="addGhostModal">
               <div class="bg-white rounded-lg p-6 w-96 max-w-90vw">
                   <div class="flex items-center justify-between mb-4">
                       <h2 class="text-xl font-bold">Add Ghost Challenger</h2>
                       <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-black text-2xl">✕</button>
                   </div>
                   
                   <form id="addGhostForm" class="space-y-4">
                       <div>
                           <label class="block text-sm font-medium text-gray-700 mb-1">Ghost Name</label>
                           <input 
                               type="text" 
                               id="ghostName" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black" 
                               placeholder="Enter challenger name..."
                               required
                           />
                       </div>
                       
                       <div>
                           <label class="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                           <select 
                               id="difficultyLevel" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                           >
                               <option value="casual">🟢 Casual (${difficultyRanges.casual.min}-${difficultyRanges.casual.max} goals/day)</option>
                               <option value="moderate" selected>🟡 Moderate (${difficultyRanges.moderate.min}-${difficultyRanges.moderate.max} goals/day)</option>
                               <option value="aggressive">🟠 Aggressive (${difficultyRanges.aggressive.min}-${difficultyRanges.aggressive.max} goals/day)</option>
                               <option value="psycho">🔴 Psycho (${difficultyRanges.psycho.min}-${difficultyRanges.psycho.max} goals/day)</option>
                           </select>
                       </div>
                       
                       <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                           <p class="text-sm text-blue-800">
                               <strong>Your Challenge:</strong> ${maxPointsPerDay} goals/day max<br/>
                               <strong>🔴 Psycho</strong> = PERFECT - Never misses a single goal<br/>
                               <strong>🟠 Aggressive</strong> = Rarely misses goals<br/>
                               <strong>🟡 Moderate</strong> = Solid consistency<br/>
                               <strong>🟢 Casual</strong> = Good but has off days
                           </p>
                       </div>
                       
                       <div class="flex space-x-3">
                           <button 
                               type="button" 
                               onclick="this.closest('.fixed').remove()" 
                               class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                           >
                               Cancel
                           </button>
                           <button 
                               type="submit" 
                               class="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-red-600 font-bold"
                           >
                               Add Ghost
                           </button>
                       </div>
                   </form>
               </div>
           </div>
       `;
       
       document.body.insertAdjacentHTML('beforeend', modalHTML);
       
       // Handle form submission
       document.getElementById('addGhostForm').addEventListener('submit', async (e) => {
           e.preventDefault();
           
           const ghostName = document.getElementById('ghostName').value;
           const difficultyLevel = document.getElementById('difficultyLevel').value;
           
           await this.addGhostChallenger(ghostName, difficultyLevel);
           document.getElementById('addGhostModal').remove();
       });
   }
   
   async addGhostChallenger(ghostName, difficultyLevel, ghostType = 'ai') {
       if (!this.activeChallenge) return;
       
       try {
           const response = await fetch(`/api/users/${this.currentUser.id}/challenges/${this.activeChallenge.id}/ghosts`, {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                   ghostName,
                   difficultyLevel,
                   ghostType
               })
           });
           
           if (response.ok) {
               await this.loadGhostChallengers();
               this.showNotification(`Ghost challenger "${ghostName}" added!`, 'success');
           } else {
               throw new Error('Failed to add ghost challenger');
           }
       } catch (error) {
           console.error('Failed to add ghost challenger:', error);
           this.showNotification('Failed to add ghost challenger', 'error');
       }
   }
   
   async addPreviousSelfGhost() {
       if (!this.activeChallenge) return;
       
       try {
           // Get user's past challenges for the same challenge type
           const response = await fetch(`/api/users/${this.currentUser.id}/past-challenges`);
           const pastChallenges = await response.json();
           
           // Filter for same challenge name/type
           const matchingChallenges = pastChallenges.filter(pc => 
               pc.challenge_name === this.activeChallenge.name
           );
           
           if (matchingChallenges.length === 0) {
               this.showNotification('No previous attempts found for this challenge type', 'info');
               return;
           }
           
           // Use the most recent completion
           const lastAttempt = matchingChallenges[0];
           const avgPointsPerDay = Math.round(lastAttempt.points_earned / lastAttempt.duration);
           
           // Determine difficulty based on past performance
           let difficulty = 'moderate';
           if (avgPointsPerDay <= 3) difficulty = 'casual';
           else if (avgPointsPerDay <= 6) difficulty = 'moderate';
           else if (avgPointsPerDay <= 9) difficulty = 'aggressive';
           else difficulty = 'psycho';
           
           const ghostName = `Past ${this.currentUser.username}`;
           
           await this.addGhostChallenger(ghostName, difficulty, 'previous_self');
           
       } catch (error) {
           console.error('Failed to add previous self ghost:', error);
           this.showNotification('Failed to add previous self challenger', 'error');
       }
   }
   
   async removeGhost(ghostId) {
       try {
           const response = await fetch(`/api/users/${this.currentUser.id}/ghosts/${ghostId}`, {
               method: 'DELETE'
           });
           
           if (response.ok) {
               await this.loadGhostChallengers();
               this.showNotification('Ghost challenger removed', 'success');
           } else {
               throw new Error('Failed to remove ghost');
           }
       } catch (error) {
           console.error('Failed to remove ghost:', error);
           this.showNotification('Failed to remove ghost challenger', 'error');
       }
   }
   
   showNotification(message, type = 'info') {
       const colors = {
           success: 'bg-green-500',
           error: 'bg-red-500',
           info: 'bg-blue-500'
       };
       
       const notification = document.createElement('div');
       notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg z-50 transform transition-all duration-300 translate-x-full`;
       notification.textContent = message;
       
       document.body.appendChild(notification);
       
       // Slide in
       setTimeout(() => {
           notification.style.transform = 'translateX(0)';
       }, 100);
       
       // Slide out and remove
       setTimeout(() => {
           notification.style.transform = 'translateX(100%)';
           setTimeout(() => {
               if (notification.parentNode) {
                   notification.parentNode.removeChild(notification);
               }
           }, 300);
       }, 3000);
   }

   async updateAllGhosts() {
       try {
           const response = await fetch(`/api/users/${this.currentUser.id}/ghosts/update-all`, {
               method: 'POST'
           });
           
           if (response.ok) {
               const result = await response.json();
               console.log('Ghost updates:', result.updatedGhosts);
               
               // Reload ghost data if any were updated
               if (result.updatedGhosts.length > 0 && this.activeChallenge) {
                   await this.loadGhostChallengers();
               }
           }
       } catch (error) {
           console.error('Failed to update ghosts:', error);
       }
   }
   
   setupServiceWorkerUpdates() {
       if ('serviceWorker' in navigator) {
           navigator.serviceWorker.addEventListener('controllerchange', () => {
               console.log('SW: New service worker activated');
               // Show update notification
               this.showUpdateNotification();
           });
           
           // Check for updates ONLY when user opens/returns to app
           window.addEventListener('focus', () => {
               this.checkForUpdates();
           });
           
           // Also check on page load (when app first opens)
           window.addEventListener('load', () => {
               this.checkForUpdates();
           });
       }
   }
   
   async checkForUpdates() {
       if ('serviceWorker' in navigator) {
           const registration = await navigator.serviceWorker.getRegistration();
           if (registration) {
               registration.update();
           }
       }
   }
   
   showUpdateNotification() {
       const notification = document.createElement('div');
       notification.innerHTML = `
           <div class="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50" style="animation: slideInFromRight 0.3s ease-out;">
               <div class="flex items-center space-x-2">
                   <span class="text-lg">🔄</span>
                   <div>
                       <p class="font-bold">App Updated!</p>
                       <p class="text-sm">Latest changes are now available</p>
                   </div>
                   <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">✕</button>
               </div>
           </div>
       `;
       document.body.appendChild(notification);
       
       // Auto-remove after 5 seconds
       setTimeout(() => {
           if (notification.parentElement) {
               notification.remove();
           }
       }, 5000);
   }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
   new ChallengeApp();
});
