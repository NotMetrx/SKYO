import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseFits,buildQualityMask} from '../web/src/fits.js';
import {wcsFromHeader,pixelToWorld,worldToPixel,reprojectToReference} from '../web/src/wcs.js';
import {buildComparison,compareJavaScript,checkSpectralPair} from '../web/src/pipeline.js';
import {imageRgba} from '../web/src/render.js';
const dir=new URL('../web/public/demo/',import.meta.url);
async function fits(epoch){const buf=await fs.readFile(new URL(`epoca_${epoch}.fits`,dir));
 return parseFits(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));}
test('FITS MEF: IMAGE/FLAGS/VARIANCE/ZODI con datos originales',async()=>{
 const a=await fits('A');
 assert.equal(a.width,128);assert.equal(a.height,128);assert.equal(a.detector,2);
 assert.ok(a.flags);assert.ok(a.variance);assert.ok(a.zodi);
 assert.equal(a.observationTime,'2025-11-05T13:45:00');
 assert.equal(a.flagsCompressed,false);assert.ok(a.image[0]>0);
});
test('WCS TAN-SIP respeta transformacion ida/vuelta subpixel',async()=>{
 const a=await fits('A');const w=wcsFromHeader(a.header);
 for(const [x,y] of [[10,20],[50,40],[100,116]]){
   const sky=pixelToWorld(w,x,y);const result=worldToPixel(w,sky.ra,sky.dec);
   assert.ok(Math.abs(result.x-x)<1e-5,`x ${x}: ${result.x}`);
   assert.ok(Math.abs(result.y-y)<1e-5,`y ${y}: ${result.y}`);
 }
});
test('mascaras decodifican banderas de mala calidad sin eliminar SOURCE',async()=>{
 const b=await fits('B');const r=buildQualityMask(b);
 assert.equal(b.flagNames[1],'HOT');assert.equal(r.mask[43*128+28],0);
 assert.equal(r.flagsAvailable,true);assert.equal(r.maskedCount,1);
});
test('el motor reproyecta B usando WCS de A',async()=>{
 const a=await fits('A'),b=await fits('B');
 const ma=buildQualityMask(a),mb=buildQualityMask(b);
 const reproj=reprojectToReference(a,b,ma.mask,mb.mask);
 assert.ok(reproj.mask[64*128+64]);
 assert.ok(Number.isFinite(reproj.image[64*128+64]));
});
test('calculo de diferencia con varianza y filtro de datos nulos',()=>{
 const out=compareJavaScript(new Float32Array([12,4]),new Float32Array([7,3]),new Float32Array([4,4]),new Float32Array([5,5]),new Uint8Array([1,0]),2);
 assert.equal(out.length,4);assert.equal(out[0],3);assert.equal(out[2],1);
 assert.ok(Number.isNaN(out[1]));
});
test('pipeline extremo a extremo sintético mantiene calificativo exploratorio',async()=>{
 const a=await fits('A'),b=await fits('B');
 const result=buildComparison(a,b);
 assert.equal(result.status,'exploratorio');
 assert.ok(result.flagsReady);assert.ok(result.varianceReady);assert.ok(result.spectral.verified);
 assert.ok(result.validCount>8000);
 const packed=compareJavaScript(result.a,result.b,result.va,result.vb,result.valid,result.offset);
 const diff=packed.subarray(0,a.image.length);
 const rgba=imageRgba(diff,a.width,a.height,result.valid,{kind:'difference'});
 assert.equal(rgba.length,a.image.length*4);
});
test('sin longitud de onda calibrada se rechaza validar compatibilidad',async()=>{
 const a=await fits('A'),b=await fits('B');
 b.wavelengthUm=null;
 const result=checkSpectralPair(a,b);
 assert.equal(result.verified,false);
});

test('bloquea comparaciones con filtros realmente incompatibles',async()=>{
 const a=await fits('A'),b=await fits('B');
 b.detector=3;
 assert.throws(()=>buildComparison(a,b),/bloqueada/);
});

test('mascara FLAGS conserva bits altos y BZERO 2^31 sin Float32', async()=>{
  const {decodeFlags32}=await import('../web/src/fits.js');
  const bytes=new ArrayBuffer(16),view=new DataView(bytes);
  view.setInt32(0,-2147483648,false);
  view.setInt32(4,2147483647,false);
  view.setInt32(8,-1,false);
  view.setInt32(12,0,false);
  const signed=decodeFlags32(view,0,4,0);
  assert.equal(signed[0],0x80000000);
  assert.equal(signed[2],0xffffffff);
  const offset=decodeFlags32(view,0,4,2147483648);
  assert.equal(offset[0],0);
  assert.equal(offset[1],0xffffffff);
  assert.equal(offset[2],2147483647);
  assert.throws(()=>decodeFlags32(view,0,4,0,2),/BSCALE/);
});

test('propagacion de varianza bilineal emplea pesos cuadrados',async()=>{
  const a=await fits('A'),b=await fits('B');
  // Sample variance is constant 6.25. At an interpolated interior pixel,
  // sum(w^2)*6.25 must be <=6.25; bilinear interpolation of variance would give 6.25.
  const ma=buildQualityMask(a),mb=buildQualityMask(b);
  const p=reprojectToReference(a,b,ma.mask,mb.mask);
  const sample=p.variance[60*128+60];
  assert.ok(sample>0 && sample<=6.25);
  assert.ok(sample<6.25,`expected strict decrease for fractional pixel weights, got ${sample}`);
});

test('plano robusto corrige fondo espacial sintético',async()=>{
  const {robustBackgroundPlane}=await import('../web/src/pipeline.js');
  const width=48,height=48,n=width*height;
  const a=new Float32Array(n),b=new Float32Array(n),valid=new Uint8Array(n).fill(1);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x;
    a[i]=20 + 3*(2*x/(width-1)-1) - 1.5*(2*y/(height-1)-1);
  }
  const fit=robustBackgroundPlane(a,b,valid,width,height);
  assert.equal(fit.method,'robust-plane');
  assert.ok(Math.abs(fit.offset-20)<0.2,JSON.stringify(fit));
  assert.ok(Math.abs(fit.gradientX-3)<0.2,JSON.stringify(fit));
  assert.ok(Math.abs(fit.gradientY+1.5)<0.2,JSON.stringify(fit));
});

test('comparacion explora resta de ZODI y declara modelo de fondo',async()=>{
  const a=await fits('A'),b=await fits('B');
  const report=buildComparison(a,b);
  assert.equal(report.background.zodiApplied,true);
  assert.equal(report.background.model,'zodi-plus-residual');
  assert.equal(report.status,'exploratorio');
  const copy={...b,zodi:null};
  const incomplete=buildComparison(a,copy);
  assert.equal(incomplete.background.zodiApplied,false);
  assert.equal(incomplete.background.model,'no-zodi-plus-residual');
});
