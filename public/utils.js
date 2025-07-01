// === UTILITY FUNCTIONS ===
class ChallengeUtils {
    static getCurrentChallengeDay(challenge) {
        if (!challenge) return 1;
        
        const startDate = new Date(challenge.created_at);
        const today = new Date();
        const timeDiff = today.getTime() - startDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1; // +1 because day 1 is the start date
        
        // Don't go beyond the challenge duration
        return Math.min(dayDiff, challenge.duration);
    }

    static getChallengeProgress(challenge) {
        if (!challenge) return 0;
        
        const currentDay = this.getCurrentChallengeDay(challenge);
        return Math.round((currentDay / challenge.duration) * 100);
    }

    static getChallengeStatus(challenge) {
        const currentDay = this.getCurrentChallengeDay(challenge);
        const duration = challenge?.duration || 0;
        
        if (currentDay >= duration) {
            return { status: 'completed', message: 'Challenge Complete! 🎉' };
        } else if (currentDay > duration * 0.8) {
            return { status: 'almost-done', message: 'Almost there!' };
        } else if (currentDay > duration * 0.5) {
            return { status: 'halfway', message: 'Halfway through!' };
        } else {
            return { status: 'early', message: 'Keep going!' };
        }
    }

    static getTodayProgress(dailyProgress) {
        const today = new Date().toISOString().split('T')[0];
        return dailyProgress[today] || {};
    }

    static getTodayPoints(dailyProgress) {
        const todayProgress = this.getTodayProgress(dailyProgress);
        return Object.values(todayProgress).filter(Boolean).length;
    }

    static getCompletionPercentage(activeChallenge, dailyProgress) {
        if (!activeChallenge) return 0;
        const todayProgress = this.getTodayProgress(dailyProgress);
        const completed = Object.values(todayProgress).filter(Boolean).length;
        return Math.round((completed / activeChallenge.goals.length) * 100);
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    static getDaysUntilEnd(challenge) {
        if (!challenge) return 0;
        
        const currentDay = this.getCurrentChallengeDay(challenge);
        return Math.max(0, challenge.duration - currentDay);
    }
}

// === ANIMATION HELPERS ===
class AnimationUtils {
    static slideIn(element, direction = 'bottom', duration = 300) {
        if (!element) return;
        
        const animations = {
            bottom: 'slideInFromBottom',
            right: 'slideInFromRight',
            top: 'slideInFromTop',
            left: 'slideInFromLeft'
        };
        
        element.style.animation = `${animations[direction]} ${duration}ms ease-out`;
    }

    static fadeIn(element, duration = 300) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        
        setTimeout(() => {
            element.style.opacity = '1';
        }, 10);
    }

    static shake(element, duration = 500) {
        if (!element) return;
        
        element.style.animation = `shake ${duration}ms ease-in-out`;
        
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }
}

// === VALIDATION HELPERS ===
class ValidationUtils {
    static isValidChallengeName(name) {
        return name && name.trim().length >= 2 && name.trim().length <= 50;
    }

    static isValidDuration(duration) {
        return duration && Number.isInteger(duration) && duration >= 1 && duration <= 365;
    }

    static isValidGoals(goals) {
        if (!Array.isArray(goals)) return false;
        const validGoals = goals.filter(g => g && g.trim().length > 0);
        return validGoals.length >= 1 && validGoals.length <= 10;
    }

    static validateChallengeData(challengeData) {
        const errors = [];
        
        if (!this.isValidChallengeName(challengeData.name)) {
            errors.push('Challenge name must be 2-50 characters');
        }
        
        if (!this.isValidDuration(challengeData.duration)) {
            errors.push('Duration must be 1-365 days');
        }
        
        if (!this.isValidGoals(challengeData.goals)) {
            errors.push('Must have 1-10 valid goals');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// === DAILY MOTIVATIONAL QUOTES ===
const BRUTAL_QUOTES = [
    "Don't Be a Pussy Today. Get After It.",
    "Your Excuses Are Weak. Move Your Ass.",
    "You're Not Tired. You're Just Soft.",
    "If Today Breaks You, You Deserved It.",
    "Quit bitching. No one gives a fuck. Move.",
    "Weak men whine. Real ones shut the fuck up and work.",
    "You're not tired. You're just acting like a little bitch.",
    "Get your ass up. You ain't earned a break.",
    "Soft fucks scroll. You suffer. That's why you win.",
    "You don't need motivation. You need to stop being a pussy.",
    "Comfort's for cowards. Burn that shit down.",
    "If you lose today, it's because you fucked around.",
    "Stop making excuses and start making moves.",
    "Pain is just weakness leaving your pathetic body.",
    "Everyone else is sleeping. That's your advantage.",
    "You're either growing or you're dying. Pick one.",
    "Fuck your feelings. What did you accomplish?",
    "Average people make average excuses.",
    "You think champions care about your comfort?",
    "Discipline weighs ounces. Regret weighs tons.",
    "Your future self is judging your lazy ass right now.",
    "Winners don't wait for motivation. They create it.",
    "Stop being a spectator in your own fucking life.",
    "The grind doesn't stop because you're tired.",
    "Mediocrity is a choice. Stop choosing it."
];

class MotivationUtils {
    static getDailyQuote() {
        // Use today's date as seed for consistent daily quote
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Simple hash function to convert date to number
        let hash = 0;
        for (let i = 0; i < dateString.length; i++) {
            const char = dateString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Ensure positive index
        const index = Math.abs(hash) % BRUTAL_QUOTES.length;
        return BRUTAL_QUOTES[index];
    }
}
