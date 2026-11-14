// Evidence harness; exercises the existing build without changing application files.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from '/home/metrx/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root=process.cwd();
const evidence=path.join(root,'docs/evidence/preparacion-spec-20261113');
const qaDir=(await fs.readFile(path.join(evidence,'validacion-app-browser-temp-dir.txt'),'utf8')).trim();
const result={startedUtc:new Date().toISOString(),syntheticOnly:true,checks:[],runs:[]};
const check=(name,details)=>{result.checks.push({name,...details});console.log(name,JSON.stringify(details));};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.fits':'application/fits','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.startsWith('/skyo/'))pathname=pathname.slice('/skyo'.length);
    if(pathname==='/')pathname='/index.html';
    const full=path.resolve(root,'dist','.'+pathname);
    if(!full.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403).end();return;}
    const bytes=await fs.readFile(full);
    res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-cache'}).end(bytes);
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:process.env.SKYO_CHROMIUM||'/home/metrx/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'});
result.browser=browser.version();
async function sampleCanvas(page,id){return page.locator(id).evaluate(canvas=>{
  const bytes=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let sum=0,min=255,max=0;for(let i=0;i<bytes.length;i+=4){sum+=bytes[i]+bytes[i+1]+bytes[i+2];min=Math.min(min,bytes[i],bytes[i+1],bytes[i+2]);max=Math.max(max,bytes[i],bytes[i+1],bytes[i+2]);}
  return {width:canvas.width,height:canvas.height,sum,min,max};
});}
async function axe(page){
  await page.addScriptTag({path:path.join(qaDir,'node_modules/axe-core/axe.min.js')});
  return page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({html:n.html,target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),passes:r.passes.length};});
}
try{
  for(const [label,url,width] of [['desktop','http://127.0.0.1:4174/',1440],['mobile360','http://127.0.0.1:4174/',360],['mobile390','http://127.0.0.1:4174/',390],['tablet','http://127.0.0.1:4174/',768],['subdirectory','http://127.0.0.1:4174/skyo/',1440],['vite-preview','http://127.0.0.1:4173/',1440]]){
    const context=await browser.newContext({viewport:{width,height:960},acceptDownloads:true});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    const run={label,url,width,phase:'online',console:[],pageErrors:[],httpErrors:[],failedRequests:[],workerUrls:[]};result.runs.push(run);
    page.on('console',m=>{if(['error','warning'].includes(m.type()))run.console.push({phase:run.phase,type:m.type(),text:m.text()});});
    page.on('pageerror',e=>run.pageErrors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)run.httpErrors.push({phase:run.phase,url:r.url(),status:r.status()});});
    page.on('requestfailed',r=>run.failedRequests.push({phase:run.phase,url:r.url(),failure:r.failure(),headers:r.headers()}));
    page.on('worker',w=>run.workerUrls.push(w.url()));
    await page.goto(url,{waitUntil:'networkidle'});
    await page.locator('#kernel-status').filter({hasText:'JavaScript'}).waitFor();
    run.title=await page.title();run.initialKernel=await page.locator('#kernel-status').innerText();
    await page.locator('#load-demo').click();
    await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
    run.a=await sampleCanvas(page,'#canvas-a');run.b=await sampleCanvas(page,'#canvas-b');
    assert.equal(run.a.width,128);assert.equal(run.b.width,128);assert.notEqual(run.a.sum,run.b.sum);
    await page.locator('#compare').click();await page.waitForFunction(()=>!document.querySelector('#save-report').disabled);
    run.difference=await sampleCanvas(page,'#canvas-difference');
    assert.equal(run.difference.width,128);assert.ok(run.difference.max>run.difference.min);
    run.reportText=await page.locator('#result-table').innerText();
    assert.match(run.reportText,/exploratoria/);
    const downloadPromise=page.waitForEvent('download');await page.locator('#save-report').click();const download=await downloadPromise;
    await download.saveAs(path.join(evidence,`validacion-app-report-${label}.json`));
    run.downloadName=download.suggestedFilename();
    const report=JSON.parse(await fs.readFile(path.join(evidence,`validacion-app-report-${label}.json`),'utf8'));
    assert.equal(report.scientific_status,'exploratory_not_validated');assert.ok(report.validCount>8000);
    run.reportSummary={status:report.status,scientific_status:report.scientific_status,validCount:report.validCount,kernel:report.kernel,hasObservationProvenance:!!(report.observations||report.provenance)};
    run.layout=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflows:[...document.querySelectorAll('main,section,button,input,canvas')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&((b.left<-.5)||(b.right>innerWidth+.5));}).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
    run.a11y=await axe(page);
    await page.screenshot({path:path.join(evidence,`validacion-app-${label}.png`),fullPage:true});
    run.pwa=await page.evaluate(async()=>{const registration=await navigator.serviceWorker.ready;await new Promise(resolve=>{if(navigator.serviceWorker.controller)resolve();else navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});});const keys=await caches.keys();const cached={};for(const key of keys){cached[key]=(await (await caches.open(key)).keys()).map(r=>r.url);}return {secure:isSecureContext,scope:registration.scope,active:registration.active?.state,controller:navigator.serviceWorker.controller?.scriptURL,cached,manifest:await (await fetch('./manifest.webmanifest')).json()};});
    if(['desktop','subdirectory','vite-preview'].includes(label)){
      run.phase='offline';
      await context.setOffline(true);await page.reload({waitUntil:'networkidle'});
      try{
        await page.locator('#kernel-status').filter({hasText:'JavaScript'}).waitFor();
        await page.locator('#load-demo').click();await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
        await page.locator('#compare').click();await page.waitForFunction(()=>!document.querySelector('#save-report').disabled);
        run.offlineDemo=true;
      }catch(error){run.offlineDemo=false;run.offlineError=error.message;run.offlineCache=await page.evaluate(async()=>{const cache=await caches.open('skyo-2.1-shell-v2');return Promise.all((await cache.keys()).map(async req=>({url:req.url,requestHeaders:Object.fromEntries(req.headers),responseHeaders:Object.fromEntries((await cache.match(req)).headers)})));});}
      await context.setOffline(false);run.phase='online-after-offline';await page.reload({waitUntil:'networkidle'});
    }
    if(label==='desktop'){
      await page.locator('#file-a').setInputFiles(path.join(root,'web/public/demo/epoca_A.fits'));
      await page.locator('#file-b').setInputFiles(path.join(root,'web/public/demo/epoca_B.fits'));
      await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
      await page.locator('#save-local').click();await page.locator('#toast').filter({hasText:'guardadas en OPFS'}).waitFor();
      await page.reload({waitUntil:'networkidle'});await page.locator('#load-local').click();
      await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
      run.opfs={restoredNames:[await page.locator('#name-a').innerText(),await page.locator('#name-b').innerText()]};
      assert.deepEqual(run.opfs.restoredNames,['epoca_A.fits','epoca_B.fits']);
      await page.locator('#compare').click();await page.waitForFunction(()=>!document.querySelector('#save-report').disabled);
      await page.locator('#load-demo').click();await page.waitForFunction(()=>!document.querySelector('#compare').disabled);
      run.staleReportAfterDemoReload={enabled:await page.locator('#save-report').isEnabled(),text:await page.locator('#result-table').innerText()};
      await page.locator('#manifest').setInputFiles({name:'invalid-manifest.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
      await page.locator('#toast').filter({hasText:'Manifiesto invalido'}).waitFor();run.invalidManifestRecovered=true;
      await page.locator('#file-a').setInputFiles({name:'invalid.fits',mimeType:'application/fits',buffer:Buffer.from('not a FITS')});
      await page.locator('#toast').filter({hasText:/FITS|IMAGE|cabecera|HDU|imagen/i}).waitFor();run.invalidFitsToast=await page.locator('#toast').innerText();
      await page.reload({waitUntil:'networkidle'});
      run.keyboard=[];for(let i=0;i<7;i++){await page.keyboard.press('Tab');run.keyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,text:document.activeElement.textContent?.trim().slice(0,100),outlineStyle:getComputedStyle(document.activeElement).outlineStyle})));}
    }
    assert.equal(run.pageErrors.length,0);
    check(label,{kernel:run.initialKernel,validCount:run.reportSummary.validCount,overflow:run.layout.scrollWidth>width,axeViolations:run.a11y.violations.map(v=>v.id),pageErrors:run.pageErrors.length,offlineDemo:run.offlineDemo||false});
    await context.close();
  }
}catch(error){result.fatal={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
finally{result.finishedUtc=new Date().toISOString();await fs.writeFile(path.join(evidence,'validacion-app-browser.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
