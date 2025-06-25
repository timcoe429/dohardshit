// stats.js - Personal statistics dashboard
class StatsManager {
    constructor(app) {
        this.app = app;
        this.showStats = false;
        this.dailyData = [0, 0, 0, 0, 0, 0, 0];
    }

    async showModal() {
        this.showStats = true;
        await this.loadDailyProgress();
        this.renderModal();
    }

    async loadDailyProgress() {
        try {
            // Check if we have an active challenge
            if (!this.app.activeChallenge) {
                this.dailyData = [0, 0, 0, 0, 0, 0, 0];
                return;
            }
            
            // Get last 7 days of data
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                // Format date in Eastern time (same as progress.js)
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;
                
                const response = await fetch(`/api/progress/${this.app.currentUser.id}/${this.app.activeChallenge.id}/${dateStr}`);
                const progress = await response.json();
                
                // Count completed goals for this day
                const completed = Object.values(progress).filter(Boolean).length;
                days.push(completed);
            }
            
            this.dailyData = days;
        } catch (err) {
            console.error('Load daily progress error:', err);
            this.dailyData = [0, 0, 0, 0, 0, 0, 0];
        }
    }

    hideModal() {
        this.showStats = false;
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.remove();
        }
    }

    renderModal() {
        const existingModal = document.getElementById('statsModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="statsModal">
                <div class="bg-white rounded-xl p-6 w-full max-w-2xl" style="animation: slideInFromBottom 0.3s ease-out;">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 class="text-2xl font-bold text-gray-800">📊 My Stats</h3>
                            <p class="text-gray-600">Track your progress over time</p>
                        </div>
                        <button id="closeStatsBtn" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                    </div>
                    
                    <!-- Current Stats Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div class="bg-blue-50 rounded-lg p-4">
                            <p class="text-sm text-blue-600 font-medium">Current Streak</p>
                            <p class="text-3xl font-bold text-blue-700">${this.app.userStats.current_streak || 0} days</p>
                        </div>
                        <div class="bg-green-50 rounded-lg p-4">
                            <p class="text-sm text-green-600 font-medium">Total Points</p>
                            <p class="text-3xl font-bold text-green-700">${this.app.currentUser.total_points}</p>
                        </div>
                        <div class="bg-purple-50 rounded-lg p-4">
                            <p class="text-sm text-purple-600 font-medium">Rank</p>
                            <p class="text-3xl font-bold text-purple-700">#${this.app.userStats.rank || '?'}</p>
                        </div>
                    </div>
                    
                    <!-- Daily Progress Chart -->
                    <div class="bg-gray-50 rounded-lg p-6">
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">Your Daily Progress</h4>
                        <div class="h-48">
                            ${this.renderDailyProgress()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachEvents();
    }
    
    renderDailyProgress() {
        // Get the days for the last 7 days
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Get total goals in the active challenge
        const totalGoals = this.app.activeChallenge?.goals?.length || 1;
        
        // Use real data from loadDailyProgress
        const data = this.dailyData || [0, 0, 0, 0, 0, 0, 0];
        const maxValue = Math.max(...data, totalGoals);
        
        let barsHTML = '';
        for (let i = 0; i < 7; i++) {
            // Calculate the actual date for this index
            const date = new Date();
            date.setDate(date.getDate() - (6 - i)); // 6 days ago to today
            const dayIndex = date.getDay();
            const isToday = i === 6; // Last index is today
            
            const value = data[i];
            const height = value > 0 ? (value / maxValue) * 100 : 0;
            
            // Color coding: green if hit all goals, yellow if partial, gray if none
            let barColor = 'bg-gray-300';
            if (value >= totalGoals) {
                barColor = 'bg-green-500'; // Hit all goals!
            } else if (value > 0) {
                barColor = 'bg-yellow-500'; // Partial completion
            }
            
            // Only show bar if there's data
            const barHTML = value > 0 ? `
                <div class="w-8 ${barColor} rounded-t transition-all duration-300" 
                     style="height: ${height}%">
                </div>
            ` : '';
            
            barsHTML += `
                <div class="flex-1 flex flex-col items-center">
                    <div class="w-full h-32 flex items-end justify-center mb-2">
                        ${barHTML}
                    </div>
                    <div class="text-xs text-gray-600 ${isToday ? 'font-bold' : ''}">
                        ${dayNames[dayIndex]}
                    </div>
                    <div class="text-xs text-gray-400">${value}/${totalGoals}</div>
                </div>
            `;
        }
        
        return `<div class="flex justify-around items-end">${barsHTML}</div>`;
    }

    attachEvents() {
        const closeBtn = document.getElementById('closeStatsBtn');
        const modal = document.getElementById('statsModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }
}
