// stats.js - Personal statistics dashboard
class StatsManager {
    constructor(app) {
        this.app = app;
        this.showStats = false;
    }

async loadDailyProgress() {
    try {
        // Get last 7 days of data
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
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
        // Simple bar chart showing last 7 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();
        
        // Generate some demo data for now
        // Get real data - for now just show zeros since we need to fetch from database
const data = [0, 0, 0, 0, 0, 0, 0];
        const maxValue = Math.max(...data, 5);
        
        let barsHTML = '';
        for (let i = 0; i < 7; i++) {
            const value = data[i];
            const height = (value / maxValue) * 100;
            const isToday = i === today;
            const barColor = isToday ? 'bg-green-500' : 'bg-gray-300';
            
            barsHTML += `
                <div class="flex-1 flex flex-col items-center">
                    <div class="w-full h-32 flex items-end justify-center mb-2">
                        <div class="w-8 ${barColor} rounded-t transition-all duration-300" 
                             style="height: ${height}%">
                        </div>
                    </div>
                    <div class="text-xs text-gray-600 ${isToday ? 'font-bold' : ''}">${days[i]}</div>
                    <div class="text-xs text-gray-500 mt-1">${value}</div>
                </div>
            `;
        }
        
        return `
            <div class="flex items-end space-x-2 h-full">
                ${barsHTML}
            </div>
        `;
    }
    
    attachEvents() {
        const modal = document.getElementById('statsModal');
        const closeBtn = document.getElementById('closeStatsBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }
    }
}
