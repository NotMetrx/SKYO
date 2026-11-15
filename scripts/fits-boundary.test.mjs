import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseFits,buildQualityMask} from '../assets/js/science/fits.js';
import {wcsFromHeader,pixelToWorld,worldToPixel,reprojectToReference} from '../assets/js/science/wcs.js';
const block=2880;
function hdu(cards,values=[]){
  const raw=Object.entries(cards).map(([k,v])=>(k.padEnd(8)+'= '+(typeof v==='string'?`'${v}'`:typeof v==='boolean'?(v?'T':'F'):String(v))).padEnd(80)).join('')+'END'.padEnd(80);
  const bytes=new Uint8Array(Math.ceil(raw.length/block)*block+Math.ceil(values.length*4/block)*block);bytes.fill(32,0,Math.ceil(raw.length/block)*block);bytes.set(new TextEncoder().encode(raw));
  const view=new DataView(bytes.buffer);values.forEach((v,i)=>cards.BITPIX===-32?view.setFloat32(Math.ceil(raw.length/block)*block+i*4,v):view.setInt32(Math.ceil(raw.length/block)*block+i*4,v));return bytes;
}
function fits({image={},flags={},pixels=[1,2,3,4],flagPixels}={}){
  const parts=[hdu({SIMPLE:true,BITPIX:8,NAXIS:0}),hdu({XTENSION:'IMAGE',BITPIX:-32,NAXIS:2,NAXIS1:2,NAXIS2:2,PCOUNT:0,GCOUNT:1,EXTNAME:'IMAGE',...image},pixels)];
  if(flagPixels)parts.push(hdu({XTENSION:'IMAGE',BITPIX:32,NAXIS:2,NAXIS1:2,NAXIS2:2,PCOUNT:0,GCOUNT:1,EXTNAME:'FLAGS',...flags},flagPixels));
  const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out.buffer;
}
const header={CTYPE1:'RA---TAN',CTYPE2:'DEC--TAN',CRVAL1:210,CRVAL2:54,CRPIX1:1,CRPIX2:1,CDELT1:-.0017,CDELT2:.0017};
test('FLAGS conserva Uint32 y BZERO, con SOURCE separada del fondo',()=>{
  const fit=parseFits(fits({flags:{BZERO:2147483648,MSKN0029:'SATELLITE_HALO',MSKN0031:'HOT',MSKN0021:'SOURCE'},flagPixels:[-2147483648,-2147483648+(2**29),0,-2147483648+(2**21)]}));
  assert.ok(fit.flags instanceof Uint32Array);assert.equal(fit.flags[2],2**31);
  assert.deepEqual([...buildQualityMask(fit).mask],[1,0,0,1]);
  assert.deepEqual([...buildQualityMask(fit,{purpose:'background'}).mask],[1,0,0,0]);
  assert.throws(()=>parseFits(fits({flags:{BSCALE:2},flagPixels:[0,0,0,0]})),/BSCALE/);
});
test('FITS rechaza dimensiones negativas, límites por eje, truncado y escalas inválidas',()=>{
  assert.throws(()=>parseFits(fits({image:{NAXIS1:-2,NAXIS2:-2}})),/dimensi|NAXIS/i);
  assert.throws(()=>parseFits(fits({image:{NAXIS1:513,NAXIS2:1},pixels:Array(513).fill(1)})),/512|eje|grande/i);
  assert.throws(()=>parseFits(fits().slice(0,-1)),/incompleto|truncado|bloque/i);
  assert.throws(()=>parseFits(fits({image:{BSCALE:'NaN'}})),/BSCALE|escala/);
  assert.throws(()=>parseFits(fits({image:{XTENSION:'UNKNOWN'}})),/XTENSION/);
  assert.throws(()=>parseFits(fits({image:{BUNIT:100}})),/BUNIT/);
  assert.throws(()=>parseFits(fits({image:{NAXIS1:'2'}})),/NAXIS|dimensi/i);
  assert.throws(()=>parseFits(fits({image:{BSCALE:true}})),/BSCALE/);
  assert.throws(()=>parseFits(fits({image:{BITPIX:64},pixels:[2147483647,2147483647,0,0]})),/incompleto|BITPIX/);
});
test('Parser admite imagen primaria y preserva inventario sin convertir BLANK a cero',()=>{
  const data=hdu({SIMPLE:true,BITPIX:32,NAXIS:2,NAXIS1:2,NAXIS2:2,BLANK:-999},[1,-999,3,4]);
  const fit=parseFits(data.buffer);assert.ok(Number.isNaN(fit.image[1]));assert.equal(fit.hdus[0].name,'PRIMARY');
});
test('WCS solo acepta ejes ecuatoriales TAN, grados e ICRS',()=>{
  for(const extra of [{CTYPE1:'GLON-TAN',CTYPE2:'GLAT-TAN'},{CUNIT1:'rad'},{RADESYS:'FK5'},{EQUINOX:1950},{CTYPE1:'RA---TANX'}])assert.throws(()=>wcsFromHeader({...header,...extra}),/WCS|ICRS|marco|unidad|eje/i);
  const w=wcsFromHeader(header);assert.equal(w.frame,'ICRS');assert.match(w.framePolicy,/default|ausen/i);
  assert.equal(wcsFromHeader({...header,RADESYS:'ICRS',CUNIT1:'deg',CUNIT2:'deg'}).frame,'ICRS');
  assert.throws(()=>wcsFromHeader({...header,CRVAL1:''}),/WCS/);
  assert.throws(()=>wcsFromHeader({...header,CD1_1:-.0017}),/WCS/);
  assert.equal(wcsFromHeader({...header,CD1_1:-.0017,CD2_2:.0017}).cd12,0);
});
test('Reproyección limita cada dimensión antes de reservar matrices',()=>{
  const fit={width:513,height:1,header,image:new Float32Array(513)},mask=new Uint8Array(513).fill(1);
  assert.throws(()=>reprojectToReference(fit,fit,mask,mask),/512|eje/);
});
const real=JSON.parse(await fs.readFile(new URL('../tests/fixtures/wcs-real.json',import.meta.url),'utf8'));
for(const fixture of real)test(`WCS NASA D${fixture.detector}: centro/bordes frente a Astropy ${fixture.astropyVersion}`,t=>{
  const w=wcsFromHeader(fixture.header);let maxPixelError=0;
  for(const sample of fixture.samples){
    const world=pixelToWorld(w,sample.x,sample.y),back=worldToPixel(w,sample.ra,sample.dec);
    assert.ok(Math.abs(world.dec-sample.dec)<1e-8);assert.ok(Math.abs(world.ra-sample.ra)<1e-8);
    maxPixelError=Math.max(maxPixelError,Math.hypot(back.x-sample.x,back.y-sample.y));
  }
  assert.ok(maxPixelError<1e-4,`Error ${maxPixelError} px`);t.diagnostic(`Máximo ${maxPixelError} px en ${fixture.samples.length} puntos reales`);
});
