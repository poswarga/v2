// js/shared-theme.js
// Core untuk deteksi role, tema, dan navigasi dinamis
// Digunakan oleh semua halaman di folder /shared/

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =====================================================
// KONFIGURASI SUPABASE (AMAN - NO HARDCODE)
// =====================================================
const API_URL = 'https://api.poswarga.com/api/config';
let cachedConfig = null;
let supabaseInstance = null;

export async function loadConfig() {
    if (cachedConfig) return cachedConfig;
    
    const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
        throw new Error(`Server error (${response.status})`);
    }
    
    cachedConfig = await response.json();
    
    if (!cachedConfig.SUPABASE_URL || !cachedConfig.SUPABASE_ANON_KEY) {
        throw new Error('Konfigurasi server tidak lengkap');
    }
    
    console.log('✅ Config loaded from API (shared-theme)');
    return cachedConfig;
}

export async function getSupabase() {
    if (supabaseInstance) return supabaseInstance;
    
    const config = await loadConfig();
    supabaseInstance = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected (shared-theme)');
    return supabaseInstance;
}

// =====================================================
// DETEKSI ROLE USER
// =====================================================
export async function getUserRole(supabase, userId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.warn('⚠️ Gagal load profile:', error);
            return { role: 'user', fullName: null };
        }
        
        return {
            role: profile?.role || 'user',
            fullName: profile?.full_name || null
        };
    } catch (e) {
        console.warn('⚠️ Error getUserRole:', e);
        return { role: 'user', fullName: null };
    }
}

// =====================================================
// TEMA BERDASARKAN ROLE
// =====================================================
export function getThemeColors(role) {
    const themes = {
        user: {
            name: 'user',
            primary: 'yellow',
            primaryLight: 'yellow-50',
            primaryMedium: 'yellow-100',
            primaryDark: 'yellow-700',
            primaryDarker: 'yellow-800',
            gradient: 'from-yellow-400 to-amber-500',
            gradientHover: 'from-yellow-500 to-amber-600',
            text: 'text-yellow-600',
            textDark: 'text-yellow-800',
            bg: 'bg-yellow-600',
            bgLight: 'bg-yellow-50',
            bgHover: 'hover:bg-yellow-700',
            border: 'border-yellow-600',
            borderLight: 'border-yellow-200',
            ring: 'ring-yellow-500',
            badge: 'bg-yellow-100 text-yellow-800',
            icon: 'text-yellow-500'
        },
        member: {
            name: 'member',
            primary: 'purple',
            primaryLight: 'purple-50',
            primaryMedium: 'purple-100',
            primaryDark: 'purple-700',
            primaryDarker: 'purple-800',
            gradient: 'from-purple-600 to-purple-500',
            gradientHover: 'from-purple-700 to-purple-600',
            text: 'text-purple-600',
            textDark: 'text-purple-800',
            bg: 'bg-purple-600',
            bgLight: 'bg-purple-50',
            bgHover: 'hover:bg-purple-700',
            border: 'border-purple-600',
            borderLight: 'border-purple-200',
            ring: 'ring-purple-500',
            badge: 'bg-purple-100 text-purple-800',
            icon: 'text-purple-500'
        },
        editor: {
            name: 'editor',
            primary: 'blue',
            primaryLight: 'blue-50',
            primaryMedium: 'blue-100',
            primaryDark: 'blue-700',
            primaryDarker: 'blue-800',
            gradient: 'from-blue-600 to-blue-500',
            gradientHover: 'from-blue-700 to-blue-600',
            text: 'text-blue-600',
            textDark: 'text-blue-800',
            bg: 'bg-blue-600',
            bgLight: 'bg-blue-50',
            bgHover: 'hover:bg-blue-700',
            border: 'border-blue-600',
            borderLight: 'border-blue-200',
            ring: 'ring-blue-500',
            badge: 'bg-blue-100 text-blue-800',
            icon: 'text-blue-500'
        },
        admin: {
            name: 'admin',
            primary: 'red',
            primaryLight: 'red-50',
            primaryMedium: 'red-100',
            primaryDark: 'red-700',
            primaryDarker: 'red-800',
            gradient: 'from-red-600 to-red-500',
            gradientHover: 'from-red-700 to-red-600',
            text: 'text-red-600',
            textDark: 'text-red-800',
            bg: 'bg-red-600',
            bgLight: 'bg-red-50',
            bgHover: 'hover:bg-red-700',
            border: 'border-red-600',
            borderLight: 'border-red-200',
            ring: 'ring-red-500',
            badge: 'bg-red-100 text-red-800',
            icon: 'text-red-500'
        }
    };
    
    return themes[role] || themes.user;
}

// =====================================================
// URL DASHBOARD BERDASARKAN ROLE
// =====================================================
export function getDashboardUrl(role) {
    const urls = {
        user: '../user/dashboard.html',
        member: '../member/dashboard.html',
        editor: '../editor/dashboard.html',
        admin: '../admin/dashboard.html'
    };
    
    return urls[role] || '../user/dashboard.html';
}

// =====================================================
// URL MENU BERDASARKAN ROLE
// =====================================================
export function getMenuUrl(role) {
    return './menu.html';
}

// =====================================================
// CEK SESSION & DAPATKAN USER + ROLE
// =====================================================
export async function checkSession(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return { 
            isLoggedIn: false, 
            user: null, 
            role: null, 
            theme: null 
        };
    }
    
    const user = session.user;
    const { role, fullName } = await getUserRole(supabase, user.id);
    const theme = getThemeColors(role);
    
    return {
        isLoggedIn: true,
        user: user,
        userId: user.id,
        email: user.email,
        role: role,
        fullName: fullName,
        theme: theme,
        dashboardUrl: getDashboardUrl(role)
    };
}

// =====================================================
// REDIRECT KE LOGIN JIKA BELUM LOGIN
// =====================================================
export function redirectToLogin() {
    window.location.href = '../auth/login.html';
}

// =====================================================
// RENDER BADGE ROLE
// =====================================================
export function renderRoleBadge(role, theme) {
    const roleNames = {
        user: 'User',
        member: 'Member',
        editor: 'Editor',
        admin: 'Admin'
    };
    
    return `
        <span class="text-xs px-2 py-1 ${theme.badge} rounded-full">
            ${roleNames[role] || role}
        </span>
    `;
}

// =====================================================
// TOAST NOTIFICATION
// =====================================================
export function showToast(message, type = 'success', theme = null) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    
    if (!toast || !msg) return;
    
    toast.classList.remove('bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-purple-500');
    
    if (type === 'success') {
        toast.classList.add('bg-green-500');
    } else if (type === 'error') {
        toast.classList.add('bg-red-500');
    } else if (type === 'warning') {
        toast.classList.add('bg-yellow-500');
    } else if (type === 'info') {
        toast.classList.add('bg-blue-500');
    } else {
        toast.classList.add('bg-green-500');
    }
    
    msg.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

// =====================================================
// FORMAT RUPIAH
// =====================================================
export function formatRupiah(amount) {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
}

// =====================================================
// GET PAYMENT METHOD TEXT
// =====================================================
export function getPaymentMethodText(method) {
    const methods = {
        transfer: 'Transfer Bank',
        qris: 'QRIS',
        whatsapp: 'WhatsApp'
    };
    return methods[method] || method || '-';
}

console.log('✅ shared-theme.js loaded');