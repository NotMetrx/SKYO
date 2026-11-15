import {createReadStream,statSync} from 'node:fs';
import path from 'node:path';
import {defineConfig} from 'vite';

const dataRoot=path.resolve('data');
function mountDataMiddleware(){
  return (req,res,next)=>{
    if(!req.url?.startsWith('/data/'))return next();
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const fullPath=path.resolve(dataRoot,'.'+pathname.slice('/data'.length));
    if(fullPath!==dataRoot&&!fullPath.startsWith(dataRoot+path.sep))return res.writeHead(403).end();
    try{
      const stats=statSync(fullPath);
      if(!stats.isFile())return next();
      const mime=fullPath.endsWith('.json')?'application/json':fullPath.endsWith('.fits')?'application/fits':'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Content-Length':stats.size});
      createReadStream(fullPath).pipe(res);
    }catch{next();}
  };
}

export default defineConfig({
  root:path.resolve('frontend'),
  base:'./',
  publicDir:path.resolve('frontend/public'),
  plugins:[{name:'skyo-data-mount',configureServer(s){s.middlewares.use(mountDataMiddleware());},configurePreviewServer(s){s.middlewares.use(mountDataMiddleware());}}],
  build:{
    outDir:path.resolve('dist'),
    emptyOutDir:true,
    target:'es2022',
    rollupOptions:{
      input:{
        main:path.resolve('frontend/index.html'),
        lab:path.resolve('frontend/lab.html'),
        contexto:path.resolve('frontend/contexto.html'),
        espectral:path.resolve('frontend/espectral.html'),
        inmersivo:path.resolve('frontend/inmersivo.html')
      }
    }
  },
  worker:{format:'es'}
});
