import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/g5live.svg', ['g5live.svg', 'image/svg+xml']],
  ['/fonts/Snake.ttf', ['fonts/Snake.ttf', 'font/ttf']],
  ['/fonts/ArchitectsDaughter-Regular.ttf', ['fonts/ArchitectsDaughter-Regular.ttf', 'font/ttf']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/web.js', ['web.js', 'text/javascript; charset=utf-8']],
  ['/subnet-core.js', ['subnet-core.js', 'text/javascript; charset=utf-8']],
]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const route = routes.get(pathname);
  if (!route || request.method !== 'GET') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  try {
    const [filename, contentType] = route;
    const content = await readFile(join(root, filename));
    response.writeHead(200, {
      'content-type': contentType,
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    });
    response.end(content);
  } catch {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Could not load the calculator files.');
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => {
  console.log(`Subnet Calculator ready at http://127.0.0.1:${port}`);
  console.log('Leave this terminal open while using the browser calculator. Press Ctrl+C to stop it.');
});
