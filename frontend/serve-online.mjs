import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', 'dist');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const API_HOST = '127.0.0.1';
const API_PORT = 5000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Proxy API -> backend Express (port 5000)
  if (url.pathname.startsWith('/api/')) {
    const proxyReq = http.request(
      {
        host: API_HOST,
        port: API_PORT,
        method: req.method,
        path: url.pathname + url.search,
        headers: { ...req.headers, host: `localhost:${API_PORT}` }
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      }
    );
    proxyReq.on('error', (err) => {
      console.error('Proxy /api error:', err.message);
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Backend tidak tersedia (port 5000).' }));
    });
    req.pipe(proxyReq);
    return;
  }

  // Static files dari frontend/dist
  let filePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  let file = join(ROOT, filePath);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    // SPA fallback (React Router)
    file = join(ROOT, 'index.html');
  }
  const ext = extname(file);
  const isHashedAsset = /\/assets\/.+/.test(url.pathname);
  const cacheControl = isHashedAsset
    ? 'public, max-age=31536000, immutable'
    : 'no-cache, no-store, must-revalidate';
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': cacheControl
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`ILMS online server running on http://${HOST}:${PORT}`);
  console.log(`Serving static: ${ROOT}`);
});