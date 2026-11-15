import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.wasm':'application/wasm','.otf':'font/otf','.ttf':'font/ttf','.webp':'image/webp'};
http.createServer(async(req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname.startsWith('/skyo/'))pathname=pathname.slice(5);
    if(pathname==='/')pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    let data=await fs.readFile(file);
    const revision=new URL(req.url,'http://localhost').searchParams.get('revision');
    if(pathname==='/sw.js' && revision==='next') data=Buffer.from(data.toString().replace(/const VERSION='([^']+)';/, "const VERSION='$1-next';"));
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Vary':'Origin'}).end(data);
  } catch {res.writeHead(404).end();}
}).listen(Number(process.env.SKYO_TEST_PORT || 4180),'127.0.0.1');
