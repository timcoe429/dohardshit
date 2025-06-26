// === MODAL FUNCTIONALITY ===
class ModalManager {
    constructor(app) {
        this.app = app;
        this.showCreateChallenge = false;
        this.newChallenge = { name: '', duration: 7, goals: [''] };
    }

    showCreateChallengeModal() {
        this.showCreateChallenge = true;
        this.renderModal();
    }

    hideCreateChallengeModal() {
        this.showCreateChallenge = false;
        this.newChallenge = { name: '', duration: 7, goals: [''] };
        const modal = document.getElementById('challengeModal');
        if (modal) {
            modal.remove();
        }
    }

    renderModal() {
        const existingModal = document.getElementById('challengeModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = this.renderCreateChallengeModal();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachModalEvents();
    }

    renderCreateChallengeModal() {
        if (!this.showCreateChallenge) return '';
        
        return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in" id="challengeModal">
                <div class="bg-white rounded-xl p-6 w-full max-w-md slide-in-from-bottom-4" style="animation: slideInFromBottom 0.3s ease-out;">
                    <h3 class="text-lg font-bold text-gray-800 mb-4">Create New Challenge</h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Challenge Name</label>
                            <input 
                                type="text" 
                                id="challengeName"
                                value="${this.newChallenge.name}"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter challenge name"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                            <input 
                                type="number" 
                                id="challengeDuration"
                                value="${this.newChallenge.duration}"
                                min="1"
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Daily Goals</label>
                            <div class="space-y-2" id="goalsList">
                                ${this.newChallenge.goals.map((goal, index) => `
                                    <div class="flex items-center space-x-2">
                                        <input 
                                            type="text" 
                                            value="${goal}"
                                            data-goal-index="${index}"
                                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 goal-input"
                                            placeholder="Goal ${index + 1}"
                                        />
                                        ${this.newChallenge.goals.length > 1 ? `
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
    }

    async createChallenge() {
        const name = this.newChallenge.name.trim();
        const validGoals = this.newChallenge.goals.filter(g => g.trim());
        
        if (name && validGoals.length > 0 && this.app.currentUser) {
            const challengeData = {
                user_id: this.app.currentUser.id,
                name: name,
                duration: this.newChallenge.duration,
                goals: validGoals
            };
            
            try {
                const challenge = await ChallengeAPI.createChallenge(challengeData);
                
                if (challenge) {
                    if (!Array.isArray(this.app.challenges)) {
                        this.app.challenges = [];
                    }
                    
                    this.app.challenges.push(challenge);
                    this.app.activeChallenge = challenge;
                    this.hideCreateChallengeModal();
                    await this.app.progressManager.initTodayProgress();
                    this.app.render();
                }
            } catch (err) {
                console.error('Error creating challenge:', err);
                alert('Failed to create challenge. Please try again.');
            }
        }
    }

    addGoal() {
        this.newChallenge.goals.push('');
        this.updateModalGoals();
    }

    removeGoal(index) {
        if (this.newChallenge.goals.length > 1) {
            this.newChallenge.goals.splice(index, 1);
            this.updateModalGoals();
        }
    }

    updateGoal(index, value) {
        this.newChallenge.goals[index] = value;
    }

    updateModalGoals() {
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = `
                ${this.newChallenge.goals.map((goal, index) => `
                    <div class="flex items-center space-x-2">
                        <input 
                            type="text" 
                            value="${goal}"
                            data-goal-index="${index}"
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 goal-input"
                            placeholder="Goal ${index + 1}"
                        />
                        ${this.newChallenge.goals.length > 1 ? `
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
            this.attachModalGoalEvents();
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
                this.hideCreateChallengeModal();
            });
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createChallenge();
            });
        }
        
        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.newChallenge.name = e.target.value;
            });
        }
        
        if (durationInput) {
            durationInput.addEventListener('input', (e) => {
                this.newChallenge.duration = parseInt(e.target.value) || 7;
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCreateChallengeModal();
                }
            });
        }
        
        this.attachModalGoalEvents();
    }

    attachModalGoalEvents() {
        const addGoalBtn = document.getElementById('addGoalBtn');
        
        if (addGoalBtn) {
            addGoalBtn.addEventListener('click', () => {
                this.addGoal();
            });
        }
        
        document.querySelectorAll('.goal-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.getAttribute('data-goal-index'));
                this.updateGoal(index, e.target.value);
            });
        });
        
        document.querySelectorAll('.remove-goal').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-goal-index'));
                this.removeGoal(index);
            });
        });
    }
}
