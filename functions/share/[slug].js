// functions/share/[slug].js
// Cloudflare Pages Function — OG Injector untuk Sharing Link
export async function onRequest(context) {
    const { request, env, params } = context;
    const slug = params.slug;
    const userAgent = request.headers.get('User-Agent') || '';
    
    // Deteksi scraper (WhatsApp, Facebook, Twitter, Telegram, dll.)
    const isScraper = /WhatsApp|FacebookExternalHit|Facebot|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|Pinterest|vkShare|redditbot|Snapchat|SkypeUriPreview/i.test(userAgent);
    
    // User biasa → redirect permanen ke SvelteKit SSR
    if (!isScraper) {
        return Response.redirect(
            `https://postingan.poswarga.com/posts/${encodeURIComponent(slug)}`,
            301  // Permanen
        );
    }
    
    // Scraper → fetch artikel dari Supabase & return OG tags
    try {
        const SUPABASE_URL = env.SUPABASE_URL;
        const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
        
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            return Response.redirect('https://poswarga.com/', 302);
        }
        
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/article_index?select=title,excerpt,featured_image,slug,category&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!res.ok) {
            return Response.redirect('https://poswarga.com/', 302);
        }
        
        const articles = await res.json();
        
        if (!articles || articles.length === 0) {
            return Response.redirect('https://poswarga.com/', 302);
        }
        
        const a = articles[0];
        const title = `${a.title} - POS WARGA`;
        const description = a.excerpt || a.title || 'Baca artikel lengkap dari warga POS WARGA.';
        const image = a.featured_image || 'https://ik.imagekit.io/1ctpzpi1o/Screenshot_20260502-192249.jpg';
        const fullUrl = `https://postingan.poswarga.com/posts/${encodeURIComponent(a.slug)}`;
        
        const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${fullUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${fullUrl}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="POS WARGA">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Redirect ke halaman SvelteKit -->
    <meta http-equiv="refresh" content="0;url=${fullUrl}">
    <script>window.location.href='${fullUrl}';</script>
</head>
<body style="font-family:Arial,sans-serif;text-align:center;padding:50px;">
    <p>Memuat artikel <strong>${escapeHtml(a.title)}</strong>...</p>
    <p><a href="${fullUrl}">Klik di sini jika tidak otomatis dialihkan</a></p>
</body>
</html>`;
        
        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600'
            }
        });
        
    } catch (e) {
        return Response.redirect('https://poswarga.com/', 302);
    }
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
