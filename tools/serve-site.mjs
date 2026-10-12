// ---------------------------------------------------------------------------
// tools/serve-dist.mjs — zero-dependency static server for previewing dist/
//   node tools/serve-dist.mjs [port]
// ---------------------------------------------------------------------------
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'site');
const PORT = Number(process.argv[2]) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.map': 'application/json',
};

if (!fs.existsSync(DIST)) {
  console.error('No site/ yet — run:  node tools/build-static.mjs');
  process.exit(1);
}

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(DIST, url === '/' ? 'index.html' : url);
  if (!file.startsWith(DIST)) { res.writeHead(403).end('Forbidden'); return; }   // no traversal
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    // a static host has no duel endpoint and no unknown files: say so plainly
    // rather than serving an HTML page with a 200, which breaks module parsing
    const looksLikeFile = /\.[a-z0-9]+$/i.test(url) || url === '/ws';
    if (looksLikeFile || url.startsWith('/ws')) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found (static deployment: no duel server here)');
      return;
    }
    file = path.join(DIST, 'index.html');
  }
  const body = fs.readFileSync(file);
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'content-length': body.length });
  res.end(body);
}).listen(PORT, '0.0.0.0', () => console.log(`static build served on http://0.0.0.0:${PORT}  (site/)`));
