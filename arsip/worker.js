// worker.js - POS WARGA Config Worker
// Deploy ke Cloudflare Workers, bind ke poswarga.com/api/*

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS headers
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        };
        
        // Handle OPTIONS (CORS preflight)
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }
        
        // Handle GET /api/config
        if (url.pathname === '/api/config' && request.method === 'GET') {
            const config = {
                SUPABASE_URL: env.SUPABASE_URL,
                SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
                RSS_WORKER_URL: env.RSS_WORKER_URL,
                CMS_FOOTER_URL: env.CMS_FOOTER_URL,
                SITE_URL: 'https://poswarga.com',
                SITE_NAME: 'POS WARGA',
                ENVIRONMENT: 'production'
            };
            
            // Validasi
            if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
                return new Response(
                    JSON.stringify({ error: 'Server configuration incomplete' }),
                    { status: 500, headers }
                );
            }
            
            return new Response(
                JSON.stringify(config),
                { status: 200, headers }
            );
        }
        
        // 404 untuk endpoint lain
        return new Response(
            JSON.stringify({ error: 'Not Found' }),
            { status: 404, headers }
        );
    }
};
