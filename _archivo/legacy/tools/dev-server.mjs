import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm',
 '.fits':'application/fits','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const full=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(full!==root && !full.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    let location=full;
    let file;
    try{file=await fs.readFile(location);}
    catch{
      location=path.resolve(root,'public','.'+pathname);
      const pub=path.resolve(root,'public');
      if(location!==pub&&!location.startsWith(pub+path.sep)){res.writeHead(403).end();return;}
      file=await fs.readFile(location);
    }
    res.writeHead(200,{'Content-Type':mime[path.extname(location)]||'application/octet-stream',
      'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(file);
  }catch(_){res.writeHead(404).end('Not found');}
});
server.listen(4173,'127.0.0.1',()=>console.log('SKYO laboratorio local: http://127.0.0.1:4173'));
