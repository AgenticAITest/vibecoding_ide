import { Router } from 'express';
import http from 'http';

/**
 * Script injected into HTML responses to capture console.* and fetch calls,
 * forwarding them to the parent window via postMessage for the Console tab.
 */
const INTERCEPTOR_SCRIPT = `<script data-vibecoder-interceptor>
(function() {
  if (window.__vibecoderInterceptorInstalled) return;
  window.__vibecoderInterceptorInstalled = true;

  function safeSer(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (val instanceof Error) return val.stack || val.message || String(val);
    if (typeof val === 'string') return val;
    try {
      var seen = new Set();
      return JSON.stringify(val, function(k, v) {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      });
    } catch(e) { return String(val); }
  }

  var levels = ['log', 'info', 'warn', 'error'];
  levels.forEach(function(level) {
    var orig = console[level];
    console[level] = function() {
      orig.apply(console, arguments);
      try {
        var args = [];
        for (var i = 0; i < arguments.length; i++) args.push(safeSer(arguments[i]));
        window.parent.postMessage({ type: 'vibecoder-console', level: level, args: args }, '*');
      } catch(e) {}
    };
  });

  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    var method = (init && init.method) ? init.method.toUpperCase() : 'GET';
    var url = (typeof input === 'string') ? input : (input && input.url) || String(input);
    var start = Date.now();
    return origFetch.apply(window, arguments).then(function(response) {
      var duration = Date.now() - start;
      var clone = response.clone();
      clone.text().then(function(body) {
        var snippet = body.length > 200 ? body.substring(0, 200) + '...' : body;
        window.parent.postMessage({
          type: 'vibecoder-network',
          method: method, url: url,
          status: response.status, duration: duration,
          responseSnippet: snippet
        }, '*');
      }).catch(function() {
        window.parent.postMessage({
          type: 'vibecoder-network',
          method: method, url: url,
          status: response.status, duration: duration,
          responseSnippet: ''
        }, '*');
      });
      return response;
    }).catch(function(err) {
      var duration = Date.now() - start;
      window.parent.postMessage({
        type: 'vibecoder-network',
        method: method, url: url,
        status: null, duration: duration,
        responseSnippet: '',
        error: err.message || String(err)
      }, '*');
      throw err;
    });
  };
})();
</script>`;

function injectInterceptor(html: string, port: number): string {
  // Detect Flutter HTML: main.dart.js is the Dart compiled output,
  // flutter.js / flutter_bootstrap.js are the Flutter engine loaders.
  const isFlutterHtml =
    html.includes('main.dart.js') ||
    html.includes('flutter.js') ||
    html.includes('flutter_bootstrap.js');

  // For Flutter: use proxy-relative base so all asset/script requests go through
  // our proxy, avoiding CORS issues (Flutter's dev server has no CORS headers).
  // For Expo: use direct base pointing to Metro, which supports CORS.
  const baseTag = isFlutterHtml
    ? `<base href="/api/preview-proxy/${port}/" />`
    : `<base href="http://localhost:${port}/" />`;

  // Remove any existing <base> tag from the HTML so ours takes sole effect.
  // Flutter's HTML template includes <base href="/"> which would conflict.
  let processed = html.replace(/<base\s+href="[^"]*"\s*\/?>/i, '');

  // Patch history.replaceState/pushState so that URLs resolved against <base>
  // (which point to Metro's origin or the proxy path) are rewritten to the document's actual origin.
  // Without this, expo-router's replaceState calls fail with a cross-origin error.
  const historyPatch = `<script data-vibecoder-history-patch>
(function() {
  var origReplace = history.replaceState.bind(history);
  var origPush = history.pushState.bind(history);
  function fixUrl(url) {
    if (url == null) return url;
    try {
      var parsed = new URL(String(url), document.baseURI);
      if (parsed.origin !== location.origin) {
        return location.origin + parsed.pathname + parsed.search + parsed.hash;
      }
    } catch(e) {}
    return url;
  }
  history.replaceState = function(s, t, u) { return origReplace(s, t, fixUrl(u)); };
  history.pushState = function(s, t, u) { return origPush(s, t, fixUrl(u)); };
  // Rewrite the proxy path to "/" so expo-router sees the app root, not "/api/preview-proxy/..."
  // Must use absolute URL — relative "/" would resolve against <base> to Metro's origin.
  if (location.pathname.indexOf('/api/preview-proxy') === 0) {
    origReplace(null, '', location.origin + '/');
  }
})();
</script>`;

  const injection = baseTag + historyPatch + INTERCEPTOR_SCRIPT;

  // Inject after <head> so <base> takes effect before other tags
  const headOpen = processed.indexOf('<head>');
  if (headOpen !== -1) {
    const pos = headOpen + '<head>'.length;
    return processed.slice(0, pos) + injection + processed.slice(pos);
  }
  // Fallback: inject at the start
  return injection + processed;
}

export const previewRouter = Router();

/**
 * Proxy all requests to the web dev server (Expo/Flutter),
 * stripping X-Frame-Options and CSP headers so the page
 * can be embedded in an iframe.
 */
previewRouter.use('/', (req, res) => {
  // Extract port from path: /api/preview-proxy/PORT/rest-of-path
  // Falls back to query param for backwards compatibility, then default 8081
  const portMatch = req.originalUrl.match(/^\/api\/preview-proxy\/(\d+)(\/.*)?/);
  const targetPort = portMatch
    ? parseInt(portMatch[1])
    : parseInt(req.query._port as string) || 8081;
  let targetPath = portMatch ? (portMatch[2] || '/') : '/';
  if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;

  const fwdHeaders: Record<string, string | string[] | undefined> = { ...req.headers };
  fwdHeaders['host'] = `localhost:${targetPort}`;
  delete fwdHeaders['origin'];
  delete fwdHeaders['referer'];
  // Remove accept-encoding to get uncompressed responses (simpler proxying)
  delete fwdHeaders['accept-encoding'];

  const options: http.RequestOptions = {
    // Use 'localhost' instead of '127.0.0.1' so Node resolves via OS DNS.
    // Flutter binds to [::1] (IPv6); '127.0.0.1' is IPv4-only and would
    // get ECONNREFUSED. 'localhost' tries IPv6 first on modern Windows.
    hostname: 'localhost',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: fwdHeaders,
  };

  console.log(`[Preview Proxy] ${req.method} localhost:${targetPort}${targetPath}`);

  const proxyReq = http.request(options, (proxyRes) => {
    // Copy status code
    res.statusCode = proxyRes.statusCode || 200;

    const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
    const isHtml = contentType.includes('text/html');

    // Copy headers, stripping frame-blocking ones
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      const lk = key.toLowerCase();
      if (lk === 'x-frame-options') continue;
      if (lk === 'content-security-policy') continue;
      if (lk === 'x-content-security-policy') continue;
      // Skip content-length for HTML — we'll modify the body
      if (isHtml && lk === 'content-length') continue;
      if (value !== undefined) {
        res.setHeader(key, value);
      }
    }

    if (!isHtml) {
      // Non-HTML: pipe through unchanged
      proxyRes.pipe(res);
      return;
    }

    // HTML: buffer, inject interceptor script, then send
    const chunks: Buffer[] = [];
    proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
    proxyRes.on('end', () => {
      let html = Buffer.concat(chunks).toString('utf-8');
      html = injectInterceptor(html, targetPort);
      res.setHeader('content-length', Buffer.byteLength(html, 'utf-8'));
      res.end(html);
    });
  });

  proxyReq.on('error', (err: NodeJS.ErrnoException) => {
    const isRefused = err.code === 'ECONNREFUSED';
    const detail = isRefused
      ? `Waiting for dev server on port ${targetPort}...`
      : err.message || err.code || 'Unknown error';
    console.error(`[Preview Proxy] Error: ${detail}`);
    if (!res.headersSent) {
      // Return an HTML page that auto-retries instead of raw JSON.
      // This way the iframe shows a friendly message and keeps trying
      // until Metro finishes starting up.
      res.status(502).setHeader('Content-Type', 'text/html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { margin:0; height:100vh; display:flex; align-items:center; justify-content:center;
         background:#1e1e2e; color:#cdd6f4; font-family:system-ui,sans-serif; }
  .box { text-align:center; }
  .spinner { display:inline-block; width:24px; height:24px; border:3px solid #45475a;
             border-top-color:#89b4fa; border-radius:50%; animation:spin 0.8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  p { margin:16px 0 0; font-size:14px; color:#a6adc8; }
  .detail { font-size:12px; color:#6c7086; margin-top:8px; }
</style>
${isRefused ? '<script>setTimeout(()=>location.reload(),3000)</script>' : ''}
</head><body><div class="box">
  <div class="spinner"></div>
  <p>${isRefused ? 'Waiting for dev server to start...' : detail}</p>
  <p class="detail">${isRefused ? 'Auto-retrying every 3 seconds' : 'Check the terminal for errors'}</p>
</div></body></html>`);
    }
  });

  // Pipe request body for POST etc.
  req.pipe(proxyReq);
});
