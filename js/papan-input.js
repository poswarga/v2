// Papan POS WARGA - Input Logic (v20260503)
import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('papanMessage');
  const charCount = document.getElementById('charCount');
  const btnKirim = document.getElementById('btnKirim');
  const statusDiv = document.getElementById('kirimStatus');
  
  // Character counter
  textarea.addEventListener('input', () => {
    const count = textarea.value.length;
    charCount.textContent = `${count}/280`;
    btnKirim.disabled = count === 0 || count > 280;
  });
  
  // Kirim pesan
  btnKirim.addEventListener('click', async () => {
    const message = textarea.value.trim();
    if (!message) return;
    
    btnKirim.disabled = true;
    btnKirim.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    
    try {
      // Ambil data user dari session
      const { data: { user } } = await supabase.auth.getUser();
      
      // Ambil profile user
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, avatar_url')
        .eq('id', user.id)
        .single();
      
      // Insert ke info_board
      const { error } = await supabase
        .from('info_board')
        .insert({
          message: message,
          sender_name: profile.name || user.email,
          sender_role: profile.role || 'user',
          sender_avatar: profile.avatar_url || null
        });
      
      if (error) throw error;
      
      // Sukses
      textarea.value = '';
      charCount.textContent = '0/280';
      statusDiv.innerHTML = '<span class="text-green-600">✅ Pesan terkirim!</span>';
      
      setTimeout(() => {
        statusDiv.innerHTML = '';
      }, 3000);
      
    } catch (error) {
      console.error('Error:', error);
      statusDiv.innerHTML = '<span class="text-red-600">❌ Gagal mengirim pesan</span>';
    } finally {
      btnKirim.disabled = true;
      btnKirim.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim';
    }
  });
});