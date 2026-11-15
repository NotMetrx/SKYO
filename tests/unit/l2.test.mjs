import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spectralTable,wavelengthAt,channelBounds} from '../../frontend/assets/js/immersive/spectral.js';
import {inspectCutout,cutoutUrl,cutoutVertices,observationIdentity} from '../../frontend/assets/js/immersive/detail-data.js';
import {parseFits} from '../../frontend/assets/js/science/fits.js';
import {worldToPixel,pixelToWorld,wcsFromHeader} from '../../frontend/assets/js/science/wcs.js';
import {skyCoordinates} from '../../frontend/assets/js/immersive/sky-math.js';
import {skyDirection} from '../../frontend/assets/js/immersive/sky-math.js';
import vm from 'node:vm';
const bytes=await fs.readFile('tests/fixtures/l2/observation.fits'),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const fixture=JSON.parse(await fs.readFile('tests/fixtures/l2/astropy.json')),waves=JSON.parse(await fs.readFile('frontend/public/datasets/immersive-sky/manifest.json')).wavelengths_um;
test('L2 original: WCS espacial y espectral contrastados con Astropy sin cambiar originales',()=>{
  const f=parseFits(buffer),w=wcsFromHeader(f.header),t=spectralTable(buffer,f.header);
  for(const p of fixture.samples){
    const at=worldToPixel(w,p.ra,p.dec),s=wavelengthAt(t,p.x,p.y);assert.ok(Math.hypot(at.x-p.x,at.y-p.y)<1e-5);
    assert.ok(Math.abs(s.wavelength-p.wavelength)<1e-10);assert.ok(Math.abs(s.bandwidth-p.bandwidth)<1e-10);
  }
  const d=inspectCutout(buffer,fixture.samples[1],2,channelBounds(waves,20));assert.ok(d.valid.some(Boolean));assert.equal(d.fits.width,29);
  const g=cutoutVertices(w,29,29),p=skyCoordinates(Array.from(g.positions.subarray(0,3))),expected=pixelToWorld(w,-.5,-.5);assert.ok(Math.abs(p.dec-expected.dec)<1e-5);assert.ok(Math.abs(p.ra-expected.ra)<1e-5);
});
test('L2 rechaza otro detector/canal, datos fuera de tabla y fuentes no permitidas',()=>{
  assert.throws(()=>inspectCutout(buffer,fixture.samples[1],4,channelBounds(waves,20)));
  assert.throws(()=>inspectCutout(buffer,fixture.samples[1],2,channelBounds(waves,62)));
  assert.throws(()=>channelBounds(waves,50));assert.throws(()=>cutoutUrl('https://example.com/evil.fits',0,0));
  assert.throws(()=>cutoutUrl('ibe/data/spherex/dr1/level2/../x.fits',0,0));
  const f=parseFits(buffer),t=spectralTable(buffer,f.header);assert.equal(wavelengthAt(t,-1e6,0),null);
  assert.ok(cutoutUrl('ibe/data/spherex/dr1/level2/example.fits',0,0).includes('size=.25'));
  const row={observationid:'2025W20_2D_0065_1',collection:'spherex_dr1'},url=cutoutUrl('ibe/data/spherex/dr1/level2/example.fits',0,0);
  assert.equal(observationIdentity(f,row,url),row.observationid);assert.throws(()=>observationIdentity(f,{...row,observationid:'wrong'},url));assert.throws(()=>observationIdentity(f,{...row,collection:'spherex_qr3'},url));
});
test('Capa L2 conserva la misma esfera celeste durante vuelo tangencial',async()=>{
  const context={};vm.runInNewContext(await fs.readFile('frontend/assets/js/vendor/three.min.js','utf8'),context);const T=context.THREE;
  const f=parseFits(buffer),w=wcsFromHeader(f.header),g=cutoutVertices(w,29,29),at=(8*17+8)*3;
  const overlay=new T.Vector3().fromArray(g.positions,at),p=pixelToWorld(w,14,14),target=new T.Vector3(...skyDirection(p.ra,p.dec,1000));
  const camera=new T.PerspectiveCamera(.05,16/9,.1,2200);camera.position.crossVectors(target,new T.Vector3(0,1,0)).setLength(750);camera.lookAt(target);camera.updateMatrixWorld();
  const projected=overlay.project(camera);assert.ok(Math.abs(projected.x)<.001&&Math.abs(projected.y)<.001);
});
