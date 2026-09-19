/**
 * Cloudflare Pages Function: API Reverse Proxy
 * Automatically proxies all requests to /api/* to your ERP Backend
 * with full CORS and streaming support, without requiring cross-origin rules in _redirects.
 */
export async function onRequest(context) {
  const { request, env } = context;

  // Handle preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Backend target from environment variable or default fallback
  const backendBase = (env.API_BACKEND_URL || 'https://api.anvimitra.com').replace(/\/+$/, '');
  const url = new URL(request.url);
  const targetUrl = `${backendBase}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  try {
    headers.set('host', new URL(backendBase).host);
  } catch (_) {}

  const init = {
    method: request.method,
    headers: headers,
    redirect: 'follow',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  try {
    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Backend API is currently unreachable or starting up',
      target: targetUrl,
      message: error.message
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
