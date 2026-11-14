import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json',
  '.webmanifest':'application/manifest+json',
  '.wasm':'application/wasm',
  '.fits':'application/fits',
  '.png':'image/png',
  '.webp':'image/webp',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.woff2':'font/woff2',
  '.otf':'font/otf',
  '.ttf':'font/ttf'
};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const full=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(full!==root && !full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const file=await fs.readFile(full);
    res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream',
      'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(file);
  }catch(_){res.writeHead(404).end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('SKYO laboratorio local: http://127.0.0.1:4173'));
