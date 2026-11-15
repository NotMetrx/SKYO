import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {inspectFits,readFitsPlane,parseFits} from '../../frontend/assets/js/science/fits.js';
import {angularDistance,parseFootprint,coveragePaths,inspectorFrame} from '../../frontend/assets/js/science/archive-data.js';
const file=await fs.readFile('tests/fixtures/l2/observation.fits');
const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);

test('Inspector: HDU/IMAGE/FLAGS originales, máscara y contraste sin alterar FITS',()=>{
  const original=new Uint8Array(buffer).slice(),hdus=inspectFits(buffer),index=hdus.findIndex(h=>h.name==='IMAGE');
  const parsed=parseFits(buffer),a=inspectorFrame(buffer,index,0),b=inspectorFrame(buffer,index,0,1.6);
  assert.deepEqual(a.image,parsed.image);assert.equal(a.width,29);
  assert.ok(a.quality instanceof Uint8Array);assert.notDeepEqual(a.rgba,b.rgba);
  assert.deepEqual(a.image,b.image);assert.deepEqual(new Uint8Array(buffer),original);
  const flags=readFitsPlane(buffer,hdus.findIndex(h=>h.name==='FLAGS'));
  assert.ok(flags.image instanceof Uint32Array);assert.deepEqual(flags.image,parsed.flags);
  assert.throws(()=>readFitsPlane(buffer,hdus.findIndex(h=>h.xtension==='BINTABLE')),/HDU/);
  assert.throws(()=>inspectorFrame(buffer,index,0,Infinity),/Contraste/);
});

function cube(){
  const cards={SIMPLE:'T',BITPIX:-32,NAXIS:3,NAXIS1:2,NAXIS2:2,NAXIS3:3};
  const text=Object.entries(cards).map(([k,v])=>(k.padEnd(8)+'= '+v).padEnd(80)).join('')+'END'.padEnd(80);
  const b=new ArrayBuffer(5760);new Uint8Array(b).set(new TextEncoder().encode(text.padEnd(2880)));
  for(let i=0;i<12;i++)new DataView(b).setFloat32(2880+i*4,i===10?NaN:i+.5,false);
  return b;
}
test('Inspector: lee un solo plano de cubo, conserva NaN y rechaza límites/truncados',()=>{
  const b=cube(),last=readFitsPlane(b,0,2);
  assert.deepEqual([...last.image],[8.5,9.5,NaN,11.5]);assert.equal(last.planes,3);
  assert.throws(()=>readFitsPlane(b,0,3),/fuera de rango/);
  assert.throws(()=>readFitsPlane(b,0,-1),/fuera de rango/);
  assert.throws(()=>readFitsPlane(b,0,.5),/fuera de rango/);
  assert.throws(()=>readFitsPlane(b,1),/HDU/);
  assert.throws(()=>inspectFits(b.slice(0,-1)),/truncado/);
  assert.throws(()=>parseFits(b),/2D/);
});
test('Cobertura: polígonos ICRS, costura RA y polos; ninguna huella inventada como fallback',()=>{
  const text='POLYGON ICRS 359.9 89.8 0.1 89.8 0.1 89.9 359.9 89.9';
  assert.equal(parseFootprint(text).length,4);
  for(const invalid of ['',null,'POLYGON FK5 1 2 3 4 5 6','POLYGON ICRS 360 0 1 1 2 2','POLYGON ICRS 0 91 1 1 2 2','POLYGON ICRS 0 0 1'])assert.equal(parseFootprint(invalid),null);
  const c=coveragePaths([{footprint:text},{footprint:null}],{ra:0,dec:89.85});
  assert.ok(c.paths[0].startsWith('M'));assert.ok(!c.paths[0].includes('NaN'));
  assert.equal(c.paths[1],null);assert.ok(c.target.x>=0&&c.target.x<=360);
});
test('Regla angular: costura, polos y extremos según geometría esférica',()=>{
  assert.ok(Math.abs(angularDistance({ra:359.9,dec:0},{ra:.1,dec:0})-.2)<1e-10);
  assert.ok(angularDistance({ra:0,dec:90},{ra:180,dec:90})<1e-10);
  assert.equal(angularDistance({ra:0,dec:0},{ra:180,dec:0}),180);
});
