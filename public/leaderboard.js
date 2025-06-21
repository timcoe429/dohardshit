// === LEADERBOARD FUNCTIONALITY ===
class LeaderboardManager {
    constructor(app) {
        this.app = app;
        this.showLeaderboard = false;
    }

    async showModal() {
        this.showLeaderboard = true;
        this.renderModal();
    }

    hideModal() {
        this.showLeaderboard = false;
        const modal = document.getElementById('leaderboardModal');
        if (modal) {
            modal.remove();
        }
    }

    renderModal() {
        const existingModal = document.getElementById('leaderboardModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = this.renderLeaderboard();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachEvents();
    }

    renderLeaderboard() {
        if (!this.showLeaderboard) return '';
        
        return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="leaderboardModal">
                <div class="bg-white rounded-xl p-6 w-full max-w-md" style="animation: slideInFromBottom 0.3s ease-out;">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-gray-800">🏆 Leaderboard</h3>
                        <button id="closeLeaderboardBtn" class="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    
                    <div class="space-y-3 max-h-96 overflow-y-auto">
                        ${this.app.leaderboard.map((user, index) => `
                            <div class="flex items-center justify-between p-3 rounded-lg ${
                                user.id === this.app.currentUser.id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                            }">
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                        index === 1 ? 'bg-gray-300 text-gray-700' :
                                        index === 2 ? 'bg-amber-600 text-amber-100' :
                                        'bg-gray-200 text-gray-600'
                                    }">
                                        ${index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-800">${user.name}</p>
                                        <p class="text-xs text-gray-500">${user.total_challenges} challenges</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="font-bold text-blue-600">${user.total_points}</p>
                                    <p class="text-xs text-gray-500">points</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${this.app.userStats.rank > 10 ? `
                        <div class="mt-4 pt-4 border-t border-gray-200">
                            <div class="flex items-center justify-between p-3 rounded-lg bg-blue-50 border-2 border-blue-200">
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                                        ${this.app.userStats.rank}
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-800">${this.app.currentUser.name} (You)</p>
                                        <p class="text-xs text-gray-500">${this.app.userStats.total_challenges} challenges</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="font-bold text-blue-600">${this.app.currentUser.total_points}</p>
                                    <p class="text-xs text-gray-500">points</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    attachEvents() {
        if (!this.showLeaderboard) return;
        
        const modal = document.getElementById('leaderboardModal');
        const closeBtn = document.getElementById('closeLeaderboardBtn');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal();
            });
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
