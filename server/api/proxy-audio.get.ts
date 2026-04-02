export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const targetUrl = query.url as string;

  if (!targetUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing url parameter.'
    });
  }

  // Basic security check: ensure we are only proxying mvsep.com URLs
  if (!targetUrl.startsWith('https://mvsep.com/')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Proxy is restricted to MVSEP domains.'
    });
  }

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Failed to fetch from MVSEP: ${response.statusText}`
      });
    }

    // Set CORS headers so the browser allows the frontend to read this
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': response.headers.get('Content-Type') || 'audio/wav',
      'Content-Length': response.headers.get('Content-Length') || '',
      'Cache-Control': 'public, max-age=3600',
    });

    // Return the raw response body stream
    return response.body;
  } catch (error: any) {
    console.error('Proxy fetch error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to proxy audio file.'
    });
  }
});