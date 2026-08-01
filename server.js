import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const API_ARTICLES = "https://poswarga-api.webusaha000.workers.dev/articles";
const BASE_URL = "https://poswarga.com";

async function buildSitemapXml() {
  try {
    console.log("Mengambil data artikel terbaru...");
    const response = await fetch(API_ARTICLES);
    
    if (!response.ok) throw new Error(`Gagal: ${response.statusText}`);
    
    const articles = await response.json();
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. URL Beranda
    xml += `  <url>\n<loc>${BASE_URL}</loc>\n<lastmod>${today}</lastmod>\n<changefreq>daily</changefreq>\n<priority>1.0</priority>\n</url>\n`;

    // 2. Loop Artikel Ke Format Clean URL (/posts/) untuk Google
    articles.forEach(article => {
      if (article.status === 'published' || !article.status) { 
        let articleDate = today;
        if (article.updated_at || article.created_at) {
          articleDate = new Date(article.updated_at || article.created_at).toISOString().split('T')[0];
        }

        // Bersihkan slug dari sisa-sisa string lama jika ada
        let cleanSlug = article.slug || "";
        if (cleanSlug.includes('share/')) cleanSlug = cleanSlug.split('share/')[1];
        if (cleanSlug.includes('posts/')) cleanSlug = cleanSlug.split('posts/')[1];
        cleanSlug = cleanSlug.replace(/^\/+|\/+$/g, '');

        // Cetak format /posts/ yang sangat SEO Friendly
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/posts/${cleanSlug}</loc>\n`;
        xml += `    <lastmod>${articleDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    });

    xml += `</urlset>`;

    const sitemapPath = path.join(__dirname, 'sitemap-posts.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`[SUKSES] sitemap-posts.xml (/posts/) diperbarui pukul ${new Date().toLocaleTimeString()}`);
    return true;
  } catch (error) {
    console.error("[ERROR] Gagal:", error.message);
    return false;
  }
}

app.post('/webhook-supabase', async (req, res) => {
  const success = await buildSitemapXml();
  return res.status(success ? 200 : 500).json({ success });
});

buildSitemapXml();
app.listen(PORT);
