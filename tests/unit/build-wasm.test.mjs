import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('WASM precompilado funciona sin Cargo y rechaza artefactos corruptos',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'skyo-prebuilt-'));
  try{
    await fs.mkdir(path.join(root,'scripts'),{recursive:true});
    await fs.mkdir(path.join(root,'backend/science-core'),{recursive:true});
    await fs.mkdir(path.join(root,'frontend/assets/js/science/wasm'),{recursive:true});
    await fs.copyFile('scripts/build-wasm.mjs',path.join(root,'scripts/build-wasm.mjs'));
    await fs.copyFile('backend/science-core/Cargo.lock',path.join(root,'backend/science-core/Cargo.lock'));
    await fs.copyFile('package.json',path.join(root,'package.json'));
    await fs.cp('frontend/assets/js/science/wasm/pkg',path.join(root,'frontend/assets/js/science/wasm/pkg'),{recursive:true});
    const run=(...args)=>spawnSync(process.execPath,['scripts/build-wasm.mjs',...args],{cwd:root,env:{...process.env,PATH:root},encoding:'utf8'});
    const valid=run();assert.equal(valid.status,0,valid.stderr);assert.match(valid.stdout,/precompilado verificado/);
    const forced=run('--rebuild');assert.notEqual(forced.status,0);assert.match(forced.stderr,/Falta Cargo/);
    await fs.writeFile(path.join(root,'frontend/assets/js/science/wasm/pkg/skyo_wasm_bg.wasm'),new Uint8Array([0]));
    const broken=run();assert.notEqual(broken.status,0);assert.match(broken.stderr,/Falta Cargo/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
