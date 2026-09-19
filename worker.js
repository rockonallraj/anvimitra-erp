/**
 * Cloudflare Worker Entrypoint for Anvi Mitra ERP
 *
 * Handles:
 * 1. API reverse proxying to backend with CORS support and fallback diagnostics.
 * 2. Static asset serving via Cloudflare Workers Assets (env.ASSETS).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. API Route Handling & Proxying
    if (url.pathname.startsWith('/api/')) {
      // Handle CORS preflight OPTIONS
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

      const backendBase = (env.API_BACKEND_URL || '').trim().replace(/\/+$/, '');

      if (!backendBase) {
        return new Response(
          JSON.stringify({
            error: 'Backend API is not configured',
            message:
              'The Cloudflare frontend is running, but no backend server URL is configured. ' +
              'To connect your backend, set the API_BACKEND_URL environment variable in your Cloudflare Worker Settings (e.g. your Render, Railway, or VPS server URL). ' +
              'Alternatively, in the web browser console, you can run: localStorage.setItem("anvi_erp_api_base", "https://your-api-url")',
            requestedPath: url.pathname,
            status: 'backend_unconfigured',
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
            },
          }
        );
      }

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
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: 'ERP backend is currently unreachable',
            target: targetUrl,
            message: err.message,
            hint: 'Ensure your backend Node.js process and PostgreSQL database are online.',
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // 2. Serve Static Assets via Cloudflare Assets
    return env.ASSETS.fetch(request);
  },
};
