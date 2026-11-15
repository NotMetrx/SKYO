import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.fits': 'application/fits',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Redirección amigable SPA si el usuario entra sin almohadilla '#'
    const spaRoutes = {
      '/inicio': '/#inicio',
      '/explorar': '/#explorar',
      '/3d': '/#3d',
      '/fases': '/#fases',
      '/lab': '/lab.html'
    };
    if (spaRoutes[pathname]) {
      res.writeHead(302, { Location: spaRoutes[pathname] }).end();
      return;
    }

    if (pathname === '/' || pathname === '') pathname = '/index.html';

    const fullPath = path.resolve(root, '.' + pathname);
    if (fullPath !== root && !fullPath.startsWith(root + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let stats;
    try {
      stats = statSync(fullPath);
      if (stats.isDirectory()) {
        const indexHtml = path.join(fullPath, 'index.html');
        stats = statSync(indexHtml);
        pathname = path.join(pathname, 'index.html');
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found: ' + pathname);
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    };

    // Range support para archivos binarios / multimedia
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
      headers['Accept-Ranges'] = 'bytes';
      headers['Content-Length'] = chunkSize;
      res.writeHead(206, headers);
      createReadStream(fullPath, { start, end }).pipe(res);
      return;
    }

    headers['Content-Length'] = stats.size;
    res.writeHead(200, headers);
    createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Error interno: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 SKYO corriendo en: http://${HOST}:${PORT}`);
  console.log(`   - Aplicación principal: http://${HOST}:${PORT}/`);
  console.log(`   - Laboratorio FITS:      http://${HOST}:${PORT}/lab.html\n`);
});
