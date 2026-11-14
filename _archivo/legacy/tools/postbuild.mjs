/** Stamp built filenames into the service-worker precache, test distributable. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const indexPath=path.join(dist,'index.html');
const swPath=path.join(dist,'sw.js');
const index=await fs.readFile(indexPath,'utf8');
let sw=await fs.readFile(swPath,'utf8');
async function allFiles(dir,prefix=''){
  const found=[];
  for(const e of await fs.readdir(dir,{withFileTypes:true})){
    const rel=prefix?`${prefix}/${e.name}`:e.name;
    if(e.isDirectory())found.push(...await allFiles(path.join(dir,e.name),rel));
    else found.push(rel);
  }
  return found;
}
const assets=(await allFiles(path.join(dist,'assets'))).map(x=>'./assets/'+x);
if(!assets.some(x=>x.endsWith('.js'))||!assets.some(x=>x.endsWith('.css')))throw Error('Build sin JS/CSS');
if(!index.includes('assets/'))throw Error('index.html no referencia assets compilados');
const files=['./','./index.html','./manifest.webmanifest','./icon.svg',...assets];
if((await fs.stat(path.join(dist,'wasm','pkg','skyo_wasm.js')).catch(()=>null))){
  files.push('./wasm/pkg/skyo_wasm.js','./wasm/pkg/skyo_wasm_bg.wasm');
}
if((await fs.stat(path.join(dist,'demo','epoca_A.fits')).catch(()=>null))){
  // The synthetic demo is small enough for optional offline use, labeled as synthetic.
  files.push('./demo/epoca_A.fits','./demo/epoca_B.fits');
}
const pattern=/const FILES=\[[^;]*\];/;
if(!pattern.test(sw))throw Error('No se encontro placeholder de precache');
sw=sw.replace(pattern,`const FILES=${JSON.stringify(files)};`);
await fs.writeFile(swPath,sw,'utf8');
const report={assets,precache:files,wasmPresent:!!(await fs.stat(path.join(dist,'wasm','pkg','skyo_wasm.js')).catch(()=>null))};
await fs.writeFile(path.join(dist,'skyo-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Build SKYO OK: ${assets.length} assets, ${files.length} precache; WASM ${report.wasmPresent?'presente':'fallback JS'}`);
