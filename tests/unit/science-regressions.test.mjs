// Recovered regression checks against the CURRENT engine; failures belong to T03/T04.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseFits,buildQualityMask} from '../../frontend/assets/js/science/fits.js';
import {wcsFromHeader,pixelToWorld,worldToPixel,reprojectToReference} from '../../frontend/assets/js/science/wcs.js';
import {buildComparison,compareJavaScript,checkSpectralPair} from '../../frontend/assets/js/science/pipeline.js';
import {imageRgba} from '../../frontend/assets/js/science/render.js';
const dir=new URL('../../data/sample-fits/',import.meta.url);
async function fits(epoch){const buf=await fs.readFile(new URL(`epoca_${epoch}.fits`,dir));
 return parseFits(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));}
test('mascara FLAGS conserva bits altos y BZERO 2^31 sin Float32', async()=>{
  const {decodeFlags32}=await import('../../frontend/assets/js/science/fits.js');
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
  const {robustBackgroundPlane}=await import('../../frontend/assets/js/science/pipeline.js');
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
