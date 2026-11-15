import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {compareJavaScript} from '../../frontend/assets/js/science/pipeline.js';
const present=existsSync(new URL('../../frontend/assets/js/science/wasm/pkg/build-info.json',import.meta.url));
test.use({serviceWorkers:'block'});
for(const base of ['/','/skyo/'])test(`WASM Worker ${base}: carga real, identidad y fallback`,async({page,context})=>{
  test.skip(!present,'Kernel opcional no compilado');
  await page.goto(base+'lab.html');await page.locator('#load-demo').click();await expect(page.locator('#compare')).toBeEnabled();await page.locator('#compare').click();await expect(page.locator('#save-report')).toBeEnabled();
  await expect(page.locator('#kernel-status')).toHaveText(/Rust \/ WebAssembly/);
  const download=page.waitForEvent('download');await page.locator('#save-report').click();
  const report=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
  expect(report.kernelVersion).toMatch(/sha256:[a-f0-9]{64}/);
  await context.route('**/assets/js/science/wasm/pkg/*',route=>route.abort());
  await page.reload();await page.locator('#load-demo').click();await expect(page.locator('#compare')).toBeEnabled();await page.locator('#compare').click();await expect(page.locator('#save-report')).toBeEnabled();
  await expect(page.locator('#kernel-status')).toContainText('JavaScript');
});
test('WASM corrupto o que lanza excepción conserva fallback explícito',async({page})=>{
  test.skip(!present,'Kernel opcional no compilado');
  const info=JSON.parse(await fs.readFile(new URL('../../frontend/assets/js/science/wasm/pkg/build-info.json',import.meta.url)));
  await page.route('**/assets/js/science/wasm/pkg/skyo_wasm.js',route=>route.fulfill({contentType:'text/javascript',body:`export const SKYO_BUILD=${JSON.stringify(info)};export default async()=>{};export function compare_flux(){throw Error('trap de prueba');}`}));
  await page.goto('/lab.html');await page.locator('#load-demo').click();await expect(page.locator('#compare')).toBeEnabled();await page.locator('#compare').click();await expect(page.locator('#save-report')).toBeEnabled();
  await expect(page.locator('#kernel-status')).toContainText('JavaScript (fallback');
  await page.unroute('**/assets/js/science/wasm/pkg/skyo_wasm.js');
  await page.route('**/assets/js/science/wasm/pkg/skyo_wasm_bg.wasm',route=>route.fulfill({contentType:'application/wasm',body:Buffer.from([0,1,2,3])}));
  await page.reload();await page.locator('#load-demo').click();await expect(page.locator('#compare')).toBeEnabled();await page.locator('#compare').click();await expect(page.locator('#save-report')).toBeEnabled();
  await expect(page.locator('#kernel-status')).toContainText('JavaScript');
});
test('WASM y JavaScript: benchmark de kernel en Worker Chromium',async({page})=>{
  test.skip(!present,'Kernel opcional no compilado');
  await page.goto('/lab.html');
  const result=await page.evaluate(async source=>{
    const moduleUrl=new URL('assets/js/science/wasm/pkg/skyo_wasm.js',location.href).href;
    const script=`import init,{compare_flux} from ${JSON.stringify(moduleUrl)};const reference=(${source});await init();const results=[];for(const n of [144,16384,262144]){const a=new Float32Array(n).fill(12),b=new Float32Array(n).fill(7),va=new Float32Array(n).fill(4),vb=new Float32Array(n).fill(5),valid=new Uint8Array(n).fill(1),args=[a,b,va,vb,valid,2];const iterations=n>20000?12:n>1000?80:400;const times={};for(const [name,fn] of [['JavaScript',reference],['WASM',compare_flux]]){for(let i=0;i<20;i++)fn(...args);const samples=[];for(let round=0;round<5;round++){const start=performance.now();for(let i=0;i<iterations;i++)fn(...args);samples.push((performance.now()-start)/iterations);}samples.sort((a,b)=>a-b);times[name]=samples[2];}results.push({pixels:n,medianMs:times});}postMessage(results);`;
    return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([script],{type:'text/javascript'})),worker=new Worker(url,{type:'module'});worker.onmessage=event=>{worker.terminate();URL.revokeObjectURL(url);resolve(event.data);};worker.onerror=error=>{worker.terminate();reject(Error(error.message));};});
  },compareJavaScript.toString());
  await fs.mkdir('docs/evidence/t07-wasm-20261114',{recursive:true});
  await fs.writeFile('docs/evidence/t07-wasm-20261114/benchmark.json',JSON.stringify({runtime:'Chromium headless Worker, V8',scope:'Kernel solo; incluye copia del glue. Excluye WCS, fondo, carga inicial y Android físico.',results:result},null,2));
  expect(result).toHaveLength(3);
});
