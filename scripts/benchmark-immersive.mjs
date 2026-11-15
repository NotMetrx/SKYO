import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const arg=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:null;
const plane=await fs.readFile('tests/fixtures/immersive/plane-445-ch62.bin');
const reference=JSON.parse(await fs.readFile('docs/evidence/immersive-quality-20261115/reference-texture.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const variants=[...(arg('--baseline')?[{name:'baseline',dir:arg('--baseline')}]:[]),{name:arg('--name')||'current',dir:'assets/js/science/wasm/pkg'}];
const modules=[];
for(const v of variants){
  const mod=await import(pathToFileURL(path.resolve(v.dir,'skyo_wasm.js'))),bytes=await fs.readFile(path.join(v.dir,'skyo_wasm_bg.wasm'));
  await mod.default({module_or_path:bytes});const t=mod.float_plane_to_texture(plane,512,512,1,0,true);
  try{assert.equal(hash(t.rgba()),reference.rgba);assert.equal(hash(new Uint8Array(t.pixels().buffer)),reference.pixels);assert.equal(t.low,reference.low);assert.equal(t.high,reference.high);}finally{t.free();}
  modules.push({...v,mod,bytes:bytes.length,sha256:hash(bytes),times:[]});
}
for(let i=0;i<35;i++)for(const v of modules){
  const start=performance.now(),t=v.mod.float_plane_to_texture(plane,512,512,1,0,true);t.rgba();t.pixels();t.free();
  if(i>=5)v.times.push(performance.now()-start);
}
const result={date:new Date().toISOString(),node:process.version,source:'NASA IMAGE 512x512 float32, identical input, RGBA and pixel hashes',warmup:5,runs:30,variants:modules.map(v=>{v.times.sort((a,b)=>a-b);return {name:v.name,bytes:v.bytes,sha256:v.sha256,medianMs:v.times[15],p95Ms:v.times[28],correct:true};})};
if(arg('--out'))await fs.writeFile(arg('--out'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
