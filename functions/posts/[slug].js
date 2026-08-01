export async function onRequest(context) {
    const slug = context.params.slug;
    
    return new Response(null, {
        status: 301,
        headers: {
            'Location': `https://postingan.poswarga.com/posts/${slug}`,
            'Cache-Control': 'public, max-age=31536000, immutable'
        }
    });
}
