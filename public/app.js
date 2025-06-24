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
       this.newChallenge = { name: '', duration: 7, goals: [''] };
       this.leaderboard = [];
       this.showLeaderboard = false;
       this.showUserMgmt = false;
       
       // Initialize managers
       this.authManager = new AuthManager(this);
       this.challengeManager = new ChallengeManager(this);
       this.progressManager = new ProgressManager(this);
       this.renderer = new Renderer(this);
       this.eventHandler = new EventHandler(this);
       this.leaderboardManager = new LeaderboardManager(this);
       this.statsManager = new StatsManager(this);
       
       this.init();
       
       // Make app globally accessible
       window.app = this;
   }
   
   init() {
       this.render();
   }
   
   render() {
       this.renderer.render();
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
   
   // Modal methods
   showCreateChallengeModal() {
       this.showCreateChallenge = true;
       this.renderer.renderModal();
   }
   
   hideCreateChallengeModal() {
       this.showCreateChallenge = false;
       this.newChallenge = { name: '', duration: 7, goals: [''] };
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
   
   hideStatsModal() {
       this.statsManager.hideModal();
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
   
   async toggleGoal(goalIndex) {
       await this.progressManager.toggleGoal(goalIndex);
       // Refresh user stats in background to get updated rank
       this.loadUserStats().catch(err => console.error('Failed to refresh stats:', err));
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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
   new ChallengeApp();
});
