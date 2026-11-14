// Reproduces two observed defects; assertions establish the observed behavior, not acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from '/home/metrx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const evidence=path.resolve('docs/evidence/preparacion-spec-20261113');
const result={utc:new Date().toISOString(),syntheticOnly:true};
const browser=await chromium.launch({headless:true,executablePath:'/home/metrx/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
let server;
try{
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const file=path.resolve('web/public/demo/epoca_A.fits');
  await page.locator('#file-a').setInputFiles(file);await page.locator('#file-b').setInputFiles(file);
  await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
  await page.locator('#compare').click();await page.waitForFunction(()=>!document.querySelector('#save-report').disabled);
  async function download(name){const pending=page.waitForEvent('download');await page.locator('#save-report').click();const d=await pending;const f=path.join(evidence,name);await d.saveAs(f);return JSON.parse(await fs.readFile(f,'utf8'));}
  const before=await download('validacion-app-stale-before-AA.json');
  await page.locator('#load-demo').click();await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
  const after=await download('validacion-app-stale-after-AB-no-compare.json');
  result.staleReport={steps:['cargar epoca_A.fits en A y B','comparar A/A y descargar','cargar simulación A/B','descargar SIN volver a comparar'],expectedDownloadEnabled:false,actualDownloadEnabled:await page.locator('#save-report').isEnabled(),reportsIdentical:JSON.stringify(before)===JSON.stringify(after),oldReportCreatedUtc:before.created_utc,afterReportCreatedUtc:after.created_utc,oldReportOffset:before.offset,currentNameB:await page.locator('#name-b').innerText()};
  assert.equal(result.staleReport.reportsIdentical,true);assert.match(result.staleReport.currentNameB,/Simulacion B/);
  await context.close();
  let vary=false;
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.fits':'application/fits','.webmanifest':'application/manifest+json','.json':'application/json'};
  server=http.createServer(async(req,res)=>{
    try{let name=new URL(req.url,'http://localhost').pathname;if(name==='/')name='/index.html';const file=path.resolve('dist','.'+name);if(!file.startsWith(path.resolve('dist')+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'};if(vary)headers.Vary='Origin';res.writeHead(200,headers).end(data);}catch{res.writeHead(404).end('Not found');}
  });
  await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));
  result.varyOrigin=[];
  for(const value of [false,true]){
    vary=value;const context=await browser.newContext();const page=await context.newPage();const run={varyOrigin:value,failedRequests:[]};
    page.on('requestfailed',r=>run.failedRequests.push({url:r.url(),headers:r.headers(),failure:r.failure()}));
    await page.goto('http://127.0.0.1:4175/',{waitUntil:'networkidle'});
    await page.locator('#kernel-status').filter({hasText:'JavaScript'}).waitFor();
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
    await context.setOffline(true);await page.reload({waitUntil:'networkidle'});
    try{await page.locator('#kernel-status').filter({hasText:'JavaScript'}).waitFor({timeout:3500});run.offlineSuccess=true;}catch{run.offlineSuccess=false;}
    result.varyOrigin.push(run);await context.close();
  }
  assert.deepEqual(result.varyOrigin.map(r=>r.offlineSuccess),[true,false]);
}finally{await fs.writeFile(path.join(evidence,'validacion-app-regresiones.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
