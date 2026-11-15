import test from 'node:test';
import assert from 'node:assert/strict';
import {buildComparison,compareJavaScript} from '../../frontend/assets/js/science/pipeline.js';
function image(){
  const width=48,height=48,n=width*height;
  return {width,height,header:{CTYPE1:'RA---TAN',CTYPE2:'DEC--TAN',CRVAL1:210,CRVAL2:54,CRPIX1:24,CRPIX2:24,CDELT1:-.0017,CDELT2:.0017,BUNIT:'MJy / sr'},image:new Float32Array(n),variance:new Float32Array(n).fill(1),flags:new Uint32Array(n),flagNames:{21:'SOURCE'},zodi:new Float32Array(n).fill(2),detector:2,wavelengthUm:1.5,bandwidthUm:.04};
}
test('Fondo excluye SOURCE de A y B, conserva fuentes para análisis y no altera originales',()=>{
  const a=image(),b=image();
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)a.image[y*a.width+x]=20+3*(2*x/(a.width-1)-1)-1.5*(2*y/(a.height-1)-1);
  const sourceA=15*48+15,sourceB=25*48+25;
  a.flags[sourceA]=1<<21;a.image[sourceA]+=1000;b.flags[sourceB]=1<<21;b.image[sourceB]+=2000;
  const originalA=a.image.slice(),originalB=b.image.slice();
  const result=buildComparison(a,b),packed=compareJavaScript(result.a,result.b,result.va,result.vb,result.valid,result.offset);
  assert.ok(result.background.sourceExclusions.A>=1);assert.ok(result.background.sourceExclusions.B>=1);
  assert.equal(result.valid[sourceA],1);assert.equal(result.valid[sourceB],1);
  assert.ok(Math.abs(result.background.gradientX-3)<.01);assert.ok(Math.abs(result.background.gradientY+1.5)<.01);
  assert.ok(Math.abs(packed[20*48+20])<.01);assert.ok(packed[sourceA]>900);assert.ok(packed[sourceB]<-1900);
  assert.deepEqual(a.image,originalA);assert.deepEqual(b.image,originalB);
});
test('Unidades incompatibles se rechazan y A/A se identifica como control',()=>{
  const a=image(),b=image();b.header={...b.header,BUNIT:'uJy'};
  assert.throws(()=>buildComparison(a,b),/unidad/i);
  a.meta={observation_id:'same',mjd:1};
  const result=buildComparison(a,a);
  assert.equal(result.controlIdentical,true);
});
