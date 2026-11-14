/** Exporta vistas sinteticas para QA grafica. No son NASA ni una deteccion. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseFits,buildQualityMask} from '../assets/js/science/fits.js';
import {buildComparison,compareJavaScript} from '../assets/js/science/pipeline.js';
import {imageRgba} from '../assets/js/science/render.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data/sample-fits');
const outDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/img/previews');
async function load(which){
 const b=await fs.readFile(path.join(base,`epoca_${which}.fits`));
 return parseFits(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
}
const a=await load('A'),b=await load('B');
const comparison=buildComparison(a,b);
const packed=compareJavaScript(comparison.a,comparison.b,comparison.va,comparison.vb,comparison.valid,comparison.offset);
const layers=[['A',a.image,buildQualityMask(a).mask,'science'],['B',b.image,buildQualityMask(b).mask,'science'],['D',packed.subarray(0,a.image.length),comparison.valid,'difference']];
for(const [name,data,mask,kind] of layers){
 const rgba=imageRgba(data,a.width,a.height,mask,{kind});
 const rgb=Buffer.alloc(a.width*a.height*3);
 for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
   const src=((a.height-1-y)*a.width+x)*4,dst=(y*a.width+x)*3;
   rgb[dst]=rgba[src];rgb[dst+1]=rgba[src+1];rgb[dst+2]=rgba[src+2];
 }
 const header=Buffer.from(`P6\n${a.width} ${a.height}\n255\n`,'ascii');
 await fs.writeFile(path.join(outDir,`preview_${name}.ppm`),Buffer.concat([header,rgb]));
}
console.log('Tres PPM de simulacion generados en assets/img/previews/preview_*.ppm');
