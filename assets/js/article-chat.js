// assets/js/article-chat.js
// Widget Chat Multi-Role — User/Member/Editor/Admin
// Dependency: window.supabase (Supabase client)
// Version: 20260502

class ArticleChat {
    constructor(articleId, currentUserId, currentUserRole) {
        this.articleId = articleId;
        this.currentUserId = currentUserId;
        this.currentUserRole = currentUserRole;
        this.supabase = window.supabase;
        this.channel = null;
        this.messagesCache = [];
        this._cachedSession = null;
        this._retryCount = 0;
        this._maxRetries = 3;
        
        // DOM elements
        this.container = document.getElementById('articleChat');
        if (!this.container) {
            console.error('ArticleChat: container #articleChat tidak ditemukan');
            return;
        }
        
        this.messagesList = document.getElementById('chatMessagesList');
        this.loadingEl = document.getElementById('chatLoading');
        this.emptyEl = document.getElementById('chatEmpty');
        this.errorEl = document.getElementById('chatError');
        this.typingEl = document.getElementById('chatTyping');
        this.chatForm = document.getElementById('chatForm');
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.charCount = document.getElementById('chatCharCount');
        this.badge = document.getElementById('chatBadge');
        
        console.log('ArticleChat: Init untuk artikel', articleId, 'role:', currentUserRole);
        this.init();
    }
    
    async init() {
        if (!this.supabase) {
            console.error('ArticleChat: window.supabase tidak tersedia');
            this.showError('Koneksi database tidak tersedia. Refresh halaman.');
            return;
        }
        
        // Cache session
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this._cachedSession = session;
                console.log('ArticleChat: Session cached');
            }
        } catch(e) {
            console.warn('ArticleChat: Gagal cache session:', e.message);
        }
        
        // Event listeners
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => this.handleSend(e));
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('input', () => this.updateCharCount());
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.chatForm?.requestSubmit();
                }
            });
        }
        
        // Load messages with retry
        await this.loadMessagesWithRetry();
        
        // Realtime
        this.subscribeRealtime();
    }
    
    async loadMessagesWithRetry() {
        this._retryCount = 0;
        let success = false;
        
        while (this._retryCount < this._maxRetries && !success) {
            try {
                await this.loadMessages();
                success = true;
            } catch (e) {
                this._retryCount++;
                console.warn(`ArticleChat: Retry ${this._retryCount}/${this._maxRetries}`, e.message);
                if (this._retryCount < this._maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * this._retryCount));
                }
            }
        }
        
        if (!success) {
            this.showError('Gagal memuat pesan setelah beberapa kali percobaan.');
        }
    }
    
    showLoading() {
        if (this.loadingEl) { this.loadingEl.style.display = 'flex'; this.loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Memuat percakapan...</span>'; }
        if (this.emptyEl) this.emptyEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
        if (this.messagesList) this.messagesList.innerHTML = '';
    }
    
    showEmpty() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'flex';
        if (this.errorEl) this.errorEl.style.display = 'none';
    }
    
    showError(message) {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
        if (this.messagesList) this.messagesList.innerHTML = '';
        if (this.errorEl) {
            this.errorEl.style.display = 'flex';
            const span = this.errorEl.querySelector('span');
            if (span) span.textContent = message || 'Gagal memuat percakapan.';
            const retryBtn = this.errorEl.querySelector('.chat-retry-btn');
            if (retryBtn) {
                retryBtn.onclick = () => {
                    this.showLoading();
                    this.loadMessagesWithRetry();
                };
            }
        }
    }
    
    hideStates() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
        if (this.emptyEl) this.emptyEl.style.display = 'none';
        if (this.errorEl) this.errorEl.style.display = 'none';
    }
    
    async loadMessages() {
        if (!this.supabase) throw new Error('Supabase tidak tersedia');
        if (!this.articleId) throw new Error('Article ID tidak ditemukan');
        
        this.showLoading();
        console.log('ArticleChat: Loading messages for article', this.articleId);
        
        const { data, error } = await this.supabase
            .from('article_chats')
            .select('*')
            .eq('article_id', this.articleId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('ArticleChat loadMessages error:', error.message, error.code);
            throw new Error(error.message);
        }
        
        console.log('ArticleChat: Loaded', data?.length || 0, 'messages');
        this.messagesCache = data || [];
        
        if (!this.messagesCache || this.messagesCache.length === 0) {
            this.showEmpty();
            return;
        }
        
        this.hideStates();
        this.renderMessages(this.messagesCache);
        this.scrollToBottom();
    }
    
    renderMessages(messages) {
        if (!this.messagesList) {
            console.error('ArticleChat: chatMessagesList tidak ditemukan');
            return;
        }
        
        if (!messages || messages.length === 0) {
            this.showEmpty();
            return;
        }
        
        let html = '';
        let lastDate = '';
        
        messages.forEach(msg => {
            if (!msg) return;
            
            try {
                const msgDate = new Date(msg.created_at).toLocaleDateString('id-ID', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });
                
                if (msgDate !== lastDate) {
                    html += `<div class="chat-date-divider">${msgDate}</div>`;
                    lastDate = msgDate;
                }
                
                const isMe = msg.author_id === this.currentUserId;
                const roleClass = msg.author_role || 'user';
                const time = msg.created_at 
                    ? new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    : '';
                
                let avatarIcon = 'fa-user';
                if (roleClass === 'editor') avatarIcon = 'fa-pen';
                else if (roleClass === 'admin') avatarIcon = 'fa-shield-alt';
                else if (roleClass === 'member') avatarIcon = 'fa-star';
                
                let name = msg.author_name || null;
                if (!name || name === 'user' || name === 'member' || name === 'editor' || name === 'admin') {
                    const roleLabels = { user: 'User', member: 'Member ✨', editor: 'Editor', admin: 'Admin' };
                    name = roleLabels[roleClass] || roleClass;
                }
                
                let bubbleClass = roleClass;
                if (isMe) bubbleClass = 'user';
                
                html += `
                    <div class="chat-bubble ${bubbleClass}">
                        <div class="chat-avatar ${roleClass}" title="${this.escapeHtml(name)}">
                            <i class="fas ${avatarIcon}"></i>
                        </div>
                        <div class="chat-bubble-content">
                            <div class="chat-bubble-meta">
                                <span class="chat-bubble-name">${this.escapeHtml(name)}</span>
                                <span class="chat-bubble-time">${time}</span>
                            </div>
                            <p class="chat-message-text">${this.formatMessage(msg.message || '')}</p>
                        </div>
                    </div>
                `;
            } catch(e) {
                console.warn('ArticleChat: Gagal render pesan', msg.id, e.message);
            }
        });
        
        this.messagesList.innerHTML = html || '<div class="text-center text-gray-400 py-4 text-sm">Tidak dapat merender pesan</div>';
    }
    
    formatMessage(text) {
        if (!text) return '';
        let formatted = this.escapeHtml(text);
        formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline break-all">$1</a>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }
    
    async handleSend(e) {
        e.preventDefault();
        
        if (!this.supabase) { this.showToast('Database tidak tersedia', 'error'); return; }
        
        const message = this.chatInput?.value?.trim();
        if (!message) return;
        
        // Disable form
        if (this.chatSendBtn) { this.chatSendBtn.disabled = true; this.chatSendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        if (this.chatInput) this.chatInput.disabled = true;
        
        try {
            const authorName = await this.getUserName();
            
            const payload = {
                article_id: this.articleId,
                author_id: this.currentUserId,
                author_role: this.currentUserRole,
                author_name: authorName || this.currentUserRole,
                message: message
            };
            
            console.log('ArticleChat: Sending', payload);
            
            const { error } = await this.supabase.from('article_chats').insert(payload);
            
            if (error) {
                console.error('ArticleChat send error:', error.message, error.code);
                this.showToast('Gagal mengirim: ' + error.message, 'error');
                return;
            }
            
            if (this.chatInput) { this.chatInput.value = ''; this.updateCharCount(); this.chatInput.focus(); }
            this.showToast('✅ Pesan terkirim');
            
        } catch (e) {
            console.error('ArticleChat send exception:', e);
            this.showToast('Gagal mengirim pesan', 'error');
        } finally {
            if (this.chatSendBtn) { this.chatSendBtn.disabled = false; this.chatSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span class="chat-send-text">Kirim</span>'; }
            if (this.chatInput) this.chatInput.disabled = false;
        }
    }
    
    async getUserName() {
        // Method 1: DOM elements
        const nameEls = [
            document.getElementById('userName'),
            document.getElementById('adminName'),
            document.getElementById('editorName'),
            document.querySelector('[data-user-name]')
        ];
        
        for (const el of nameEls) {
            if (el?.textContent) {
                const name = el.textContent.trim();
                if (name && !['User','Admin','Editor','Member','-'].includes(name)) {
                    return name;
                }
            }
        }
        
        // Method 2: Cached session
        if (this._cachedSession?.user) {
            if (this._cachedSession.user.user_metadata?.full_name) return this._cachedSession.user.user_metadata.full_name;
            if (this._cachedSession.user.email) return this._cachedSession.user.email.split('@')[0];
        }
        
        // Method 3: Fetch profiles
        if (this.supabase && this.currentUserId) {
            try {
                const { data } = await this.supabase.from('profiles').select('full_name').eq('id', this.currentUserId).single();
                if (data?.full_name) return data.full_name;
            } catch(e) {}
        }
        
        // Fallback
        const labels = { user: 'User', member: 'Member', editor: 'Editor', admin: 'Admin' };
        return labels[this.currentUserRole] || this.currentUserRole;
    }
    
    subscribeRealtime() {
        if (!this.supabase || !this.articleId) return;
        
        try {
            if (this.channel) { this.supabase.removeChannel(this.channel).catch(() => {}); this.channel = null; }
            
            console.log('ArticleChat: Subscribe realtime untuk artikel', this.articleId);
            
            this.channel = this.supabase
                .channel('article-chats-' + this.articleId)
                .on(
                    'postgres_changes',
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'article_chats', 
                        filter: 'article_id=eq.' + this.articleId 
                    },
                    (payload) => {
                        console.log('ArticleChat: Realtime INSERT diterima!', payload.new.id);
                        
                        if (!this.messagesCache.some(m => m.id === payload.new.id)) {
                            this.messagesCache.push(payload.new);
                            this.hideStates();
                            this.renderMessages(this.messagesCache);
                            this.scrollToBottom();
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ ArticleChat: Realtime subscribed');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ ArticleChat: Realtime channel error');
                    } else {
                        console.log('ArticleChat: Realtime status:', status);
                    }
                });
        } catch(e) {
            console.warn('ArticleChat: Realtime error', e.message);
        }
    }
    
    updateCharCount() {
        if (this.charCount) {
            const len = this.chatInput?.value?.length || 0;
            this.charCount.textContent = `${len}/2000`;
            this.charCount.style.color = len > 1800 ? '#ef4444' : len > 1500 ? '#f59e0b' : '#9ca3af';
        }
    }
    
    scrollToBottom() {
        const mc = document.getElementById('chatMessages');
        if (mc) setTimeout(() => { mc.scrollTop = mc.scrollHeight; }, 150);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    showToast(message, type = 'success') {
        if (typeof window.showToastGlobal === 'function') {
            window.showToastGlobal(message, type); return;
        }
        const toast = document.getElementById('toast');
        const msg = document.getElementById('toastMessage');
        if (toast && msg) {
            toast.className = `fixed bottom-4 right-4 text-white px-4 py-3 rounded-lg shadow-lg z-50 transition-all ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'}`;
            msg.textContent = message;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
        }
    }
    
    destroy() {
        if (this.channel) { try { this.supabase?.removeChannel(this.channel); } catch(e) {} this.channel = null; }
        console.log('ArticleChat: Destroyed');
    }
}

window.ArticleChat = ArticleChat;
console.log('ArticleChat class loaded v20260502');