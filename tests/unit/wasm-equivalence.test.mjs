import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {compareJavaScript} from '../../frontend/assets/js/science/pipeline.js';
import {buildComparison} from '../../frontend/assets/js/science/pipeline.js';
import {parseFits} from '../../frontend/assets/js/science/fits.js';
import {CURATED_DATASETS} from '../../frontend/assets/js/science/datasets.js';
const url=new URL('../../frontend/assets/js/science/wasm/pkg/skyo_wasm.js',import.meta.url);
test('WASM/JS: misma salida f32, máscaras, NaN, varianza y offset preciso',{skip:!existsSync(url)},async()=>{
  const module=await import(url.href);await module.default({module_or_path:await fs.readFile(new URL('skyo_wasm_bg.wasm',url))});
  const cases=[
    {a:[12,NaN,12,Infinity,1],b:[7,0,1,0,0],va:[4,1,1,1,-1],vb:[5,1,1,1,1],valid:[1,1,0,1,1],offset:2},
    {a:[16777218],b:[0],va:[1],vb:[1],valid:[1],offset:16777217},
    {a:[1e20],b:[0],va:[3e38],vb:[3e38],valid:[1],offset:0}
  ];
  let maxError=0;
  const dataset=CURATED_DATASETS['m101-visual-v2'];
  for(const region of dataset.regions){
    const fits=[];
    for(const side of ['A','B']){
      const name=region.files[side],bytes=await fs.readFile(new URL(`../../frontend/public/datasets/m101-visual-v2/${name}`,import.meta.url));
      const fit=parseFits(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));fit.meta=dataset.items.find(item=>item.local_file===name);fits.push(fit);
    }
    const result=buildComparison(...fits);cases.push(result);
  }
  for(const input of cases){
    const args=['a','b','va','vb'].map(key=>new Float32Array(input[key]));args.push(new Uint8Array(input.valid),input.offset);
    const expected=compareJavaScript(...args),actual=module.compare_flux(...args);assert.equal(actual.length,expected.length);
    for(let i=0;i<expected.length;i++){
      if(Number.isNaN(expected[i])){assert.ok(Number.isNaN(actual[i]));continue;}
      const error=Math.abs(actual[i]-expected[i]);maxError=Math.max(maxError,error);assert.ok(error<=1e-6*Math.max(1,Math.abs(expected[i])));
    }
  }
  assert.equal(maxError,0);
  await fs.mkdir('docs/evidence/t07-wasm-20261114',{recursive:true});
  await fs.writeFile('docs/evidence/t07-wasm-20261114/equivalence.json',JSON.stringify({cases:cases.length,includesRealNasaRegions:2,maxAbsoluteError:maxError,nanMaskAgreement:true,kernelSha256:module.SKYO_BUILD.wasmSha256},null,2));
});
