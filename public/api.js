// === API CALLS ===
class ChallengeAPI {
    static async createUser(name) {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            return await response.json();
        } catch (err) {
            console.error('Create user error:', err);
            return null;
        }
    }

    static async loadChallenges(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/challenges`);
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Load challenges error:', err);
            return [];
        }
    }

    static async createChallenge(challengeData) {
        try {
            const response = await fetch('/api/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(challengeData)
            });
            return await response.json();
        } catch (err) {
            console.error('Create challenge error:', err);
            return null;
        }
    }

    static async loadDailyProgress(userId, challengeId, date) {
        try {
            const response = await fetch(`/api/progress/${userId}/${challengeId}/${date}`);
            return await response.json();
        } catch (err) {
            console.error('Load progress error:', err);
            return {};
        }
    }

    static async updateProgress(userId, challengeId, date, goalIndex, completed) {
        try {
            const response = await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    challenge_id: challengeId,
                    date,
                    goal_index: goalIndex,
                    completed
                })
            });
            return await response.json();
        } catch (err) {
            console.error('Update progress error:', err);
            return null;
        }
    }

    static async loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            return await response.json();
        } catch (err) {
            console.error('Load leaderboard error:', err);
            return [];
        }
    }

    static async loadUserStats(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/stats`);
            return await response.json();
        } catch (err) {
            console.error('Load user stats error:', err);
            return { rank: 0, total_challenges: 0, total_completed_goals: 0, current_streak: 0 };
        }
    }

    // === SHARED CHALLENGE API METHODS ===
    static async getAvailableChallenges() {
        try {
            const response = await fetch('/api/challenges/available');
            return await response.json();
        } catch (err) {
            console.error('Get available challenges error:', err);
            return [];
        }
    }

    static async joinChallenge(challengeId, userId, goals) {
        try {
            const response = await fetch(`/api/challenges/${challengeId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, goals })
            });
            return await response.json();
        } catch (err) {
            console.error('Join challenge error:', err);
            return null;
        }
    }

    static async createSharedChallenge(challengeData) {
        try {
            const response = await fetch('/api/challenges/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(challengeData)
            });
            return await response.json();
        } catch (err) {
            console.error('Create shared challenge error:', err);
            return null;
        }
    }

    static async getUserCurrentChallenges(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/current-challenges`);
            return await response.json();
        } catch (err) {
            console.error('Get user current challenges error:', err);
            return [];
        }
    }

    static async getChallengeLeaderboard(challengeId) {
        try {
            const response = await fetch(`/api/challenges/${challengeId}/leaderboard`);
            return await response.json();
        } catch (err) {
            console.error('Get challenge leaderboard error:', err);
            return [];
        }
    }

    static async getChallengeByCode(inviteCode) {
        try {
            const response = await fetch(`/api/challenges/code/${inviteCode}`);
            return await response.json();
        } catch (err) {
            console.error('Get challenge by code error:', err);
            return null;
        }
    }
}
