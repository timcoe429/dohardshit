// stats.js - Personal statistics dashboard
class StatsManager {
    constructor(app) {
        this.app = app;
        this.showStats = false;
        this.weeklyData = [];
        this.allTimeData = [];
    }

    async showModal() {
        this.showStats = true;
        // Load weekly stats data
        await this.loadWeeklyStats();
        this.renderModal();
    }

    hideModal() {
        this.showStats = false;
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.remove();
        }
    }

    async loadWeeklyStats() {
        try {
            const response = await fetch(`/api/users/${this.app.currentUser.id}/weekly-stats`);
            const data = await response.json();
            this.weeklyData = data.weekly || [];
            this.allTimeData = data.allTime || [];
        } catch (err) {
            console.error('Load weekly stats error:', err);
            this.weeklyData = [];
            this.allTimeData = [];
        }
    }

    renderModal() {
        const existingModal = document.getElementById('statsModal');
        if (existingModal) existingModal.remove();
        
        // Prepare data for the line graph
        const last16Weeks = this.getLast16WeeksData();
        const chartData = last16Weeks.map(week => week.points).join(',');
        const maxPoints = Math.max(...last16Weeks.map(w => w.points), 10);
        
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="statsModal">
                <div class="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style="animation: slideInFromBottom 0.3s ease-out;">
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
                    
                    <!-- Line Graph -->
                    <div class="bg-gray-50 rounded-lg p-6 mb-8">
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">Last 16 Weeks</h4>
                        <div class="relative h-64">
                            ${this.renderLineGraph(last16Weeks, maxPoints)}
                        </div>
                    </div>
                    
                    <!-- Weekly Table -->
                    <div class="bg-gray-50 rounded-lg p-6">
                        <h4 class="text-lg font-semibold text-gray-800 mb-4">All Time Weekly Performance</h4>
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="text-left text-gray-600 text-sm">
                                        <th class="pb-3">Week</th>
                                        <th class="pb-3">Points</th>
                                        <th class="pb-3">Goals Completed</th>
                                        <th class="pb-3">Completion Rate</th>
                                    </tr>
                                </thead>
                                <tbody class="text-gray-700">
                                    ${this.allTimeData.map((week, index) => `
                                        <tr class="border-t border-gray-200 ${index === 0 ? 'bg-blue-50 font-semibold' : ''}">
                                            <td class="py-3">${this.formatWeekDate(week.week_start)}</td>
                                            <td class="py-3">${week.points}</td>
                                            <td class="py-3">${week.goals_completed}</td>
                                            <td class="py-3">${week.completion_rate}%</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachEvents();
    }
    
    renderLineGraph(data, maxPoints) {
        const width = 100;
        const height = 100;
        const padding = 10;
        
        // Create SVG points for the line
        const points = data.map((week, index) => {
            const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
            const y = height - ((week.points / maxPoints) * (height - 2 * padding) + padding);
            return `${x},${y}`;
        }).join(' ');
        
        return `
            <svg viewBox="0 0 ${width} ${height}" class="w-full h-full">
                <!-- Grid lines -->
                ${[0, 25, 50, 75, 100].map(y => `
                    <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" 
                          stroke="#e5e7eb" stroke-width="0.5" />
                `).join('')}
                
                <!-- Line graph -->
                <polyline points="${points}" 
                          fill="none" 
                          stroke="#3b82f6" 
                          stroke-width="2" />
                
                <!-- Points -->
                ${data.map((week, index) => {
                    const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
                    const y = height - ((week.points / maxPoints) * (height - 2 * padding) + padding);
                    return `
                        <circle cx="${x}" cy="${y}" r="3" fill="#3b82f6" />
                        <title>${this.formatWeekDate(week.week_start)}: ${week.points} points</title>
                    `;
                }).join('')}
                
                <!-- Y-axis labels -->
                <text x="2" y="${padding}" class="text-xs fill-gray-600">${maxPoints}</text>
                <text x="2" y="${height - padding}" class="text-xs fill-gray-600">0</text>
            </svg>
        `;
    }
    
    getLast16WeeksData() {
        // Get data for last 16 weeks
        return this.weeklyData.slice(0, 16);
    }
    
    formatWeekDate(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
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
