import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseFits} from '../assets/js/science/fits.js';
test('FPA: seis FITS reales íntegros, metadatos y decodificación Rust contrastada con JS',async()=>{
  const manifest=JSON.parse(await fs.readFile('public/datasets/fpa-dr1/manifest.json'));
  const wasm=await import('../assets/js/science/wasm/pkg/skyo_wasm.js');
  await wasm.default({module_or_path:await fs.readFile('assets/js/science/wasm/pkg/skyo_wasm_bg.wasm')});
  assert.deepEqual(manifest.items.map(m=>m.detector),[1,2,3,4,5,6]);
  for(const item of manifest.items){
    const bytes=await fs.readFile(`public/datasets/fpa-dr1/${item.file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
    const fits=parseFits(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    const texture=wasm.fits_to_texture(bytes,false);
    try{
      assert.equal(texture.detector,item.detector);assert.equal(texture.width,fits.width);assert.equal(texture.height,fits.height);
      const data=Array.from(fits.image),sample=data.filter((_,i)=>i%Math.ceil(data.length/2000)===0).filter(Number.isFinite).sort((a,b)=>a-b);
      const low=sample[Math.floor((sample.length-1)*.02)],high=sample[Math.floor((sample.length-1)*.995)];
      assert.equal(texture.low,low);assert.equal(texture.high,high);
      const rgba=texture.rgba();
      for(let i=0;i<data.length;i++){
        if(!Number.isFinite(data[i])){assert.equal(rgba[i*4+3],0);continue;}
        const expected=Math.round(255*Math.asinh(10*Math.max(0,Math.min(1,(data[i]-low)/Math.max(1e-12,high-low))))/Math.asinh(10));
        assert.equal(rgba[i*4],expected);assert.equal(rgba[i*4+3],255);
      }
    }finally{texture.free();}
    assert.equal(item.sourceKind,'NASA-DERIVED');assert.equal(item.scienceReady,false);
  }
  assert.throws(()=>wasm.fits_to_texture(new Uint8Array(12),true),/Incomplete FITS/);
});
