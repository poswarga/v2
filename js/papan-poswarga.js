// Papan POS WARGA - Logic (v20260503)
import { supabase } from './supabase-client.js';

const MAX_MESSAGES = 10;
let notificationSound;

document.addEventListener('DOMContentLoaded', () => {
  notificationSound = document.getElementById('notificationSound');
  loadMessages();
  subscribeRealtime();
});

// Load 10 pesan terakhir
async function loadMessages() {
  const { data, error } = await supabase
    .from('info_board')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(MAX_MESSAGES);
  
  if (!error && data) {
    renderMessages(data);
  }
}

// Render pesan
function renderMessages(messages) {
  const container = document.getElementById('papanMessages');
  container.innerHTML = messages.map(msg => `
    <div class="papan-message" id="msg-${msg.id}">
      <div class="message-header">
        <img src="${msg.sender_avatar || '/assets/default-avatar.png'}" 
             class="sender-avatar" alt="${msg.sender_name}">
        <span class="sender-name">${msg.sender_name}</span>
        <span class="badge-role badge-${msg.sender_role}">${msg.sender_role}</span>
      </div>
      <p class="message-text">${escapeHtml(msg.message)}</p>
      <div class="message-time">${formatTime(msg.created_at)}</div>
    </div>
  `).join('');
  
  updateLastUpdate();
}

// Subscribe realtime
function subscribeRealtime() {
  supabase
    .channel('info-board-changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'info_board', filter: 'is_active=eq.true' },
      (payload) => {
        addNewMessage(payload.new);
      }
    )
    .subscribe();
}

// Tambah pesan baru realtime
function addNewMessage(message) {
  const container = document.getElementById('papanMessages');
  const currentMessages = container.children;
  
  // Hapus pesan ke-11 jika ada
  if (currentMessages.length >= MAX_MESSAGES) {
    container.lastElementChild.remove();
  }
  
  // Tambah di atas
  const messageHTML = `
    <div class="papan-message" id="msg-${message.id}" style="animation: slideDown 0.3s ease-out;">
      <div class="message-header">
        <img src="${message.sender_avatar || '/assets/default-avatar.png'}" 
             class="sender-avatar" alt="${message.sender_name}">
        <span class="sender-name">${message.sender_name}</span>
        <span class="badge-role badge-${message.sender_role}">${message.sender_role}</span>
      </div>
      <p class="message-text">${escapeHtml(message.message)}</p>
      <div class="message-time">Baru saja</div>
    </div>
  `;
  
  container.insertAdjacentHTML('afterbegin', messageHTML);
  
  // Auto-scroll ke atas
  container.scrollTop = 0;
  
  // Play sound notifikasi
  playNotificationSound();
  
  // Update indikator live
  updateLastUpdate();
}

// Play sound notifikasi
function playNotificationSound() {
  if (notificationSound) {
    notificationSound.currentTime = 0;
    notificationSound.play().catch(() => {
      // Browser mungkin block autoplay
      console.log('Suara notifikasi di-block browser');
    });
  }
}

// Update waktu terakhir
function updateLastUpdate() {
  const lastUpdate = document.getElementById('lastUpdate');
  if (lastUpdate) {
    lastUpdate.innerHTML = '🟢 Live • Baru saja';
  }
}

// Format waktu
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return date.toLocaleDateString('id-ID');
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}