export async function onRequest(context) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += '  <sitemap>\n';
    xml += '    <loc>https://poswarga.com/sitemap-static.xml</loc>\n';
    xml += '    <lastmod>2026-06-26</lastmod>\n';
    xml += '  </sitemap>\n';
    xml += '  <sitemap>\n';
    xml += '    <loc>https://postingan.poswarga.com/sitemap.xml</loc>\n';
    xml += '    <lastmod>2026-06-26</lastmod>\n';
    xml += '  </sitemap>\n';
    xml += '</sitemapindex>';
    
    return new Response(xml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
    });
}
