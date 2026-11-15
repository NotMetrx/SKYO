/** Genera dos FITS sinteticos, exclusivamente para probar el pipeline local. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pixelToWorld,worldToPixel,wcsFromHeader} from '../frontend/assets/js/science/wcs.js';
const outDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data/sample-fits');
const WIDTH=128,HEIGHT=128;
const ORIGIN='SKYO SYNTHETIC';
const reference={
 CRPIX1:64.5,CRPIX2:64.5,CRVAL1:210.80227,CRVAL2:54.34895,
 CTYPE1:'RA---TAN-SIP',CTYPE2:'DEC--TAN-SIP',
 CD1_1:-0.001698,CD1_2:0.000071,CD2_1:0.000071,CD2_2:0.001698,
 A_ORDER:2,B_ORDER:2,A_2_0:1.2e-6,B_0_2:-8e-7
};
const second={...reference,
 CRVAL1:reference.CRVAL1+0.0017,CRVAL2:reference.CRVAL2-0.0013,
 CD1_1:-0.001688,CD1_2:0.000181,CD2_1:0.000181,CD2_2:0.001688};
const wRef=wcsFromHeader(reference);
const starPixels=[[25,27,84],[45,95,116],[85,30,73],[103,95,108],
  [75,66,142],[53,42,55],[112,48,45],[19,108,90],[97,109,65]];
const stars=starPixels.map(([x,y,amp])=>({...pixelToWorld(wRef,x,y),amp}));
const movingSkyA=pixelToWorld(wRef,37,63);
const movingSkyB=pixelToWorld(wRef,44,69);
function createScene(h,epoch){
  const w=wcsFromHeader(h),n=WIDTH*HEIGHT;
  const img=new Float32Array(n),variance=new Float32Array(n),zodi=new Float32Array(n),flags=new Int32Array(n);
  const all=[...stars,{...(epoch==='A'?movingSkyA:movingSkyB),amp:105}];
  const spots=all.map(s=>({...worldToPixel(w,s.ra,s.dec),amp:s.amp}));
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    const i=y*WIDTH+x;
    let flux=55+(epoch==='A'?0:7)+1.8*Math.sin(x*0.05)+1.3*Math.cos(y*.035);
    // Ruido sintético determinista con distinta semilla para cada epoca.
    const seed=(x*73856093)^(y*19349663)^(epoch==='A'?5323:49201);
    const noise=(((Math.imul(seed,1664525)+1013904223)>>>0)%1000/500-1)*1.4;
    flux+=noise;
    for(const spot of spots){
      const r2=(x-spot.x)**2+(y-spot.y)**2;
      if(r2<120)flux+=spot.amp*Math.exp(-r2/(2*1.45**2));
    }
    img[i]=flux;variance[i]=2.5**2;zodi[i]=8;
  }
  if(epoch==='B')flags[43*WIDTH+28]=1<<1; // HOT (bit 1)
  return {img,variance,zodi,flags};
}
function card(key,value,comment=''){
  let raw='';
  if(key==='END')raw='END';
  else {
    const left=key.padEnd(8,' ');
    let right;
    if(typeof value==='string')right=`'${value.replaceAll("'","''")}'`;
    else if(typeof value==='boolean')right=value?'T':'F';
    else right=String(value).replace('e','E');
    raw=`${left}= ${right.padStart(typeof value==='string'?0:20,' ')}`;
    if(comment)raw+=` / ${comment}`;
  }
  if(raw.length>80)throw Error(`Tarjeta demasiado larga: ${key}`);
  return raw.padEnd(80,' ');
}
function headerBlock(keyValues){
  const text=Object.entries(keyValues).map(([key,val])=>card(key,val)).join('')+card('END');
  const padded=text.padEnd(Math.ceil(text.length/2880)*2880,' ');
  return Buffer.from(padded,'ascii');
}
function imageBlock(values,bitpix){
  const bytes=Math.abs(bitpix)/8;
  const buf=Buffer.alloc(Math.ceil(values.length*bytes/2880)*2880);
  for(let i=0;i<values.length;i++){
    if(bitpix===-32)buf.writeFloatBE(values[i],i*4);
    else if(bitpix===32)buf.writeInt32BE(values[i],i*4);
    else throw Error('bitpix no implementado');
  }
  return buf;
}
function makeHdu(extname,data,bitpix,extra={}){
  const header={XTENSION:'IMAGE',BITPIX:bitpix,NAXIS:2,NAXIS1:WIDTH,NAXIS2:HEIGHT,
    PCOUNT:0,GCOUNT:1,EXTNAME:extname,...extra};
  return [headerBlock(header),imageBlock(data,bitpix)];
}
function assemble(h,epoch){
  const s=createScene(h,epoch);
  const primary=headerBlock({SIMPLE:true,BITPIX:8,NAXIS:0,EXTEND:true,ORIGIN});
  const common={...h,BUNIT:'MJy / sr'};
  delete common['DATE-OBS'];
  const imageMeta={...common,ORIGIN,DETECTOR:2,'DATE-OBS':epoch==='A'?'2025-11-05T13:45:00':'2026-05-07T13:45:00',
    WAVELEN:1.33,BANDWID:0.025};
  return Buffer.concat([primary,
    ...makeHdu('IMAGE',s.img,-32,imageMeta),
    ...makeHdu('FLAGS',s.flags,32,{MSKN0000:'TRANSIENT',MSKN0001:'HOT',MSKD0001:'Hot pixel'}),
    ...makeHdu('VARIANCE',s.variance,-32,{BUNIT:'MJy2 / sr2'}),
    ...makeHdu('ZODI',s.zodi,-32,{BUNIT:'MJy / sr'})
  ]);
}
await fs.mkdir(outDir,{recursive:true});
for(const [h,epoch] of [[reference,'A'],[second,'B']]){
  const file=path.join(outDir,`epoca_${epoch}.fits`);
  await fs.writeFile(file,assemble(h,epoch));
  console.log(`${file} (datos sintéticos, NO NASA)`);
}
