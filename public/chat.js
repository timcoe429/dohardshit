// Chat functionality
class ChatManager {
    constructor(userId, userName) {
        this.userId = userId;
        this.userName = userName;
        this.messages = [];
        this.chatContainer = null;
        this.isOpen = false;
        this.unreadCount = 0;
        this.lastMessageTime = null;
        this.init();
    }

    init() {
        this.createChatButton();
        this.createChatWindow();
        this.loadMessages();
        // Poll for new messages every 2 seconds
        setInterval(() => this.loadMessages(), 2000);
        // Check for shame notifications
        this.checkShameNotifications();
    }

    createChatButton() {
        const button = document.createElement('div');
        button.className = 'fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full p-4 cursor-pointer shadow-lg hover:scale-110 transition-transform z-50';
        button.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
            <span id="unread-badge" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hidden"></span>
        `;
        button.onclick = () => this.toggleChat();
        document.body.appendChild(button);
        this.chatButton = button;
    }

    createChatWindow() {
        const window = document.createElement('div');
        window.className = 'fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl hidden z-50 flex flex-col';
        window.innerHTML = `
            <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-bold">Squad Chat 💬</h3>
                    <button onclick="window.chatManager.toggleChat()" class="text-white hover:text-gray-200">✕</button>
                </div>
            </div>
            
            <div id="messages-container" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"></div>
            
            <div class="p-4 border-t bg-white rounded-b-2xl">
                <div class="flex gap-2">
                    <input 
                        type="text" 
                        id="chat-input" 
                        placeholder="Type a message or /command" 
                        class="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                        onkeypress="if(event.key==='Enter') window.chatManager.sendMessage()"
                    >
                    <button 
                        onclick="window.chatManager.sendMessage()" 
                        class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-shadow"
                    >
                        Send
                    </button>
                </div>
                <div class="mt-2 text-xs text-gray-500">
                    Commands: /excuse, /roast @user, /motivate
                </div>
            </div>
        `;
        document.body.appendChild(window);
        this.chatContainer = window;
        this.messagesContainer = document.getElementById('messages-container');
        window.chatManager = this;
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.chatContainer.classList.toggle('hidden');
        if (this.isOpen) {
            this.unreadCount = 0;
            this.updateUnreadBadge();
            document.getElementById('chat-input').focus();
            this.scrollToBottom();
        }
    }

    async loadMessages() {
        try {
            const response = await fetch('/api/chat/messages');
            const messages = await response.json();
            
            // Check for new messages
            if (messages.length > this.messages.length && this.messages.length > 0) {
                if (!this.isOpen) {
                    this.unreadCount += messages.length - this.messages.length;
                    this.updateUnreadBadge();
                }
                // Play notification sound for new messages
                this.playNotificationSound();
            }
            
            this.messages = messages;
            this.renderMessages();
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    }

    renderMessages() {
        this.messagesContainer.innerHTML = this.messages.map(msg => {
            const isMe = msg.user_name === this.userName;
            const time = new Date(msg.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
            });
            
            return `
                <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="${isMe ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-white border'} 
                                rounded-2xl px-4 py-2 max-w-[80%] shadow-sm">
                        ${!isMe ? `<div class="text-xs font-semibold mb-1 ${msg.message_type === 'bot' ? 'text-purple-600' : 'text-gray-600'}">${msg.user_name}</div>` : ''}
                        <div class="${msg.message_type === 'bot' ? 'italic' : ''}">${msg.message}</div>
                        <div class="text-xs ${isMe ? 'text-purple-100' : 'text-gray-400'} mt-1">${time}</div>
                        ${msg.reactions && msg.reactions.length > 0 ? `
                            <div class="flex gap-1 mt-2">
                                ${msg.reactions.map(r => `<span class="text-sm">${r.reaction}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        if (this.isOpen) {
            this.scrollToBottom();
        }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        try {
            await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: this.userId, message })
            });
            
            input.value = '';
            this.loadMessages();
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    updateUnreadBadge() {
        const badge = document.getElementById('unread-badge');
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLaizsIGGS48+2hUBEKTKXj8LllHgg1jdT0z3szBSh+x/PdlEYKFle06+2rWxUIRJzh8sFuIAUheMTw3JVMChRP');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if autoplay is blocked
    }

    async checkShameNotifications() {
        // Check every hour if someone hasn't checked in today
        setInterval(async () => {
            const hour = new Date().getHours();
            if (hour === 20) { // 8 PM check
                const response = await fetch(`/api/challenges/${window.activeChallenge?.id}/today-progress`);
                const progress = await response.json();
                
                const slackers = progress.filter(p => p.points === 0);
                if (slackers.length > 0) {
                    const shameMessage = `🔔 SHAME BELL: ${slackers.map(s => s.name).join(', ')} haven't checked in today! 😤`;
                    
                    await fetch('/api/chat/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            user_id: this.userId, 
                            message: shameMessage,
                            message_type: 'bot' 
                        })
                    });
                }
            }
        }, 3600000); // Check every hour
    }
}
