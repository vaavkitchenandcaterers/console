// Minimal static file server for local preview only (not for production).
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml',
                '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon' };

// Security headers applied to every response (mirrors the production intent in _headers).
function secureHeaders(extra) {
  return Object.assign({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }, extra || {});
}

http.createServer((req, res) => {
  // Only allow safe read methods.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, secureHeaders()); res.end('Method Not Allowed'); return;
  }

  let requested = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (requested === '' ) requested = '/';
  // Directory requests (root or any /path/) resolve to that folder's index.html — mirrors
  // Netlify/Apache clean-URL behaviour so /services/ works in local preview.
  if (requested.endsWith('/')) requested += 'index.html';

  // Resolve against root and confirm the result stays inside root (blocks ../ traversal).
  const file = path.resolve(root, '.' + requested);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403, secureHeaders()); res.end('Forbidden'); return;
  }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, secureHeaders()); res.end('Not found'); return; }
    const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, secureHeaders({ 'Content-Type': type }));
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(8765, () => console.log('serving on 8765'));
