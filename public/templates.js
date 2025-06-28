// templates.js - Challenge Templates
const CHALLENGE_TEMPLATES = [
    {
        id: '75-hard',
        name: '75 Hard',
        description: 'Transform your mind and body with zero compromises',
        duration: 75,
        difficulty: 'EXTREME',
        category: 'Mind & Body',
        icon: '🔥',
        color: 'from-red-500 to-orange-600',
        goals: [
            'Follow a diet (no cheat meals)',
            'Complete two 45-minute workouts (one must be outdoors)',
            'Drink 1 gallon of water',
            'Read 10 pages of non-fiction',
            'Take a progress photo',
            'No alcohol'
        ]
    },
    {
        id: 'psycho-mode',
        name: 'PSYCHO MODE',
        description: '150 days of pure mental warfare. Not for the weak.',
        duration: 150,
        difficulty: 'PSYCHO',
        category: 'Elite Performance',
        icon: '💀',
        color: 'from-black to-red-900',
        goals: [
            'Wake up at 4:30 AM',
            'Cold shower (5 minutes)',
            'Morning workout (60 min)',
            'Evening workout (45 min)',
            'Read 20 pages',
            'Meditate 20 minutes',
            'Journal 10 minutes',
            'No social media',
            'Strict carnivore diet'
        ]
    },
    {
        id: 'shred-mode',
        name: 'Shred Mode',
        description: 'Cut fat, reveal the beast within',
        duration: 30,
        difficulty: 'HARD',
        category: 'Weight Loss',
        icon: '⚡',
        color: 'from-blue-500 to-purple-600',
        goals: [
            'Track all calories (deficit)',
            'Morning cardio (30 min fasted)',
            'Weight training (45 min)',
            '10,000 steps minimum',
            'No processed foods',
            'Sleep 8 hours'
        ]
    },
    {
        id: 'beast-builder',
        name: 'Beast Builder',
        description: 'Pack on serious muscle mass',
        duration: 60,
        difficulty: 'HARD',
        category: 'Muscle Gain',
        icon: '💪',
        color: 'from-green-600 to-blue-600',
        goals: [
            'Hit protein target (1g/lb bodyweight)',
            'Heavy compound lifts',
            'Track progressive overload',
            'Eat in caloric surplus',
            'Sleep 8+ hours',
            'Supplement stack'
        ]
    },
    {
        id: 'warrior-monk',
        name: 'Warrior Monk',
        description: 'Master your mind, forge your spirit',
        duration: 21,
        difficulty: 'MEDIUM',
        category: 'Mental Toughness',
        icon: '🧘‍♂️',
        color: 'from-purple-600 to-pink-600',
        goals: [
            'Morning meditation (15 min)',
            'Breathwork (10 min)',
            'Physical training (30 min)',
            'Read philosophy/stoicism',
            'Digital sunset at 8 PM'
        ]
    },
    {
        id: 'kickstart',
        name: 'Kickstart',
        description: 'Build momentum with simple daily wins',
        duration: 7,
        difficulty: 'EASY',
        category: 'Beginner',
        icon: '🚀',
        color: 'from-green-400 to-blue-400',
        goals: [
            '85oz of water',
            'Walk for 20 minutes',
            'No phone for first 90 min of day'
        ]
    },
    {
        id: 'morning-champion',
        name: 'Morning Champion',
        description: 'Win your mornings, win your life',
        duration: 14,
        difficulty: 'EASY',
        category: 'Routine Building',
        icon: '☀️',
        color: 'from-yellow-400 to-orange-400',
        goals: [
            'Make your bed',
            'Stretch for 15 minutes',
            'Write 3 things you\'re grateful for'
        ]
    },
    {
        id: 'hydration-hero',
        name: 'Hydration Hero',
        description: 'Master the basics of health',
        duration: 10,
        difficulty: 'EASY',
        category: 'Health Basics',
        icon: '💧',
        color: 'from-blue-400 to-cyan-400',
        goals: [
            'Drink 85oz water',
            'Take a 15-minute walk after lunch',
            'Eat one serving of vegetables'
        ]
    }
];

// Template selector component
class TemplateSelector {
    constructor(app) {
        this.app = app;
        this.showTemplates = false;
    }

    show() {
        this.showTemplates = true;
        this.render();
    }

    hide() {
        this.showTemplates = false;
        const modal = document.getElementById('templateModal');
        if (modal) modal.remove();
    }

    selectTemplate(template) {
        if (template) {
            // Pre-populate the new challenge with template data
            this.app.newChallenge = {
                name: template.name,
                duration: template.duration,
                goals: [...template.goals] // Copy array to allow editing
            };
        } else {
            // Custom challenge - reset to defaults
            this.app.newChallenge = {
                name: '',
                duration: 7,
                goals: ['']
            };
        }
        
        this.hide();
        // Small delay to ensure template modal is fully closed
        setTimeout(() => {
            this.app.showCreateChallengeModal();
        }, 100);
    }

    render() {
        const existingModal = document.getElementById('templateModal');
        if (existingModal) existingModal.remove();
        
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" id="templateModal">
                <div class="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" style="animation: slideInFromBottom 0.3s ease-out;">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h2 class="text-2xl font-black text-gray-800">CHOOSE YOUR BATTLE</h2>
                            <p class="text-gray-600 mt-1">Select a proven challenge or create your own</p>
                        </div>
                        <button onclick="window.app.templateSelector.hide()" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                    </div>
                    
                    <!-- Template Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        ${CHALLENGE_TEMPLATES.map(template => `
                            <div 
                                onclick="window.app.templateSelector.selectTemplate(${JSON.stringify(template).replace(/"/g, '&quot;')})"
                                class="border-2 border-gray-200 rounded-lg p-4 cursor-pointer hover:border-black transition-all transform hover:scale-105"
                            >
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-2xl">${template.icon}</span>
                                            <h3 class="font-bold text-lg">${template.name}</h3>
                                        </div>
                                        <span class="inline-block px-2 py-1 text-xs font-bold rounded mt-1 ${
                                            template.difficulty === 'PSYCHO' ? 'bg-black text-white' :
template.difficulty === 'EXTREME' ? 'bg-red-600 text-white' :
template.difficulty === 'HARD' ? 'bg-orange-500 text-white' :
template.difficulty === 'MEDIUM' ? 'bg-yellow-500 text-white' :
'bg-green-500 text-white'
                                        }">
                                            ${template.difficulty}
                                        </span>
                                    </div>
                                    <span class="text-sm font-bold text-gray-500">${template.duration} DAYS</span>
                                </div>
                                
                                <p class="text-sm text-gray-600 mb-3">${template.description}</p>
                                
                                <div class="space-y-1">
                                    <p class="text-xs font-bold text-gray-700 mb-1">${template.goals.length} Daily Tasks:</p>
                                    ${template.goals.slice(0, 3).map(goal => `
                                        <p class="text-xs text-gray-600">• ${goal}</p>
                                    `).join('')}
                                    ${template.goals.length > 3 ? `
                                        <p class="text-xs text-gray-400 italic">+ ${template.goals.length - 3} more...</p>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                        
                        <!-- Custom Challenge Option -->
                        <div 
                            onclick="window.app.templateSelector.selectTemplate(null)"
                            class="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-black transition-all transform hover:scale-105 flex flex-col items-center justify-center text-center"
                        >
                            <span class="text-4xl mb-2">🛠️</span>
                            <h3 class="font-bold text-lg mb-1">Create Custom</h3>
                            <p class="text-sm text-gray-600">Design your own challenge with custom goals and duration</p>
                        </div>
                    </div>
                    
                    <div class="text-center">
                        <p class="text-sm text-gray-500">💡 Pro tip: Start with a shorter challenge to build momentum</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CHALLENGE_TEMPLATES, TemplateSelector };
}
