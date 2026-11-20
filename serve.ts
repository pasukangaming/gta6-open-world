// Solara Bay — a tiny static server for local play.
// Serves the game/ directory on a port (default 8080, or the first
// argument), nothing else. It exists so a human can open the game in a
// desktop browser without any install; the entrypoint main.ts does not
// need it, and the game itself never makes a network request.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const root = resolve(process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : 'game');
const portArg = process.argv.findIndex((a) => a === '--port');
const port = Number(process.env.PORT || (portArg >= 0 ? process.argv[portArg + 1] : null) || process.argv[3] || 8080);

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = join(root, rel);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Solara Bay on http://localhost:${port}/`);
});
