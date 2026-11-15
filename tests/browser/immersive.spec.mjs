import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
const plane=await fs.readFile('tests/fixtures/immersive/plane-445-ch62.bin');
const header=await fs.readFile('tests/fixtures/immersive/header-445.bin');
async function sources(page){
  await page.route('https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/**',route=>{
    const range=route.request().headers().range;
    if(!route.request().url().includes('Npix445_cube.fits'))return route.fulfill({status:404,body:'No fixture for this tile'});
    const bytes=range==='bytes=0-17279'?header:plane;
    return route.fulfill({status:206,body:bytes,headers:{'Content-Range':range.replace('=',' ')+'/320909760','Content-Length':String(bytes.length),'Access-Control-Allow-Origin':'*'}});
  });
  await page.route('https://irsa.ipac.caltech.edu/data/hips/**',async route=>{
    if(route.request().url().endsWith('/properties'))return route.fulfill({contentType:'text/plain',body:await fs.readFile('public/datasets/immersive-sky/properties.txt')});
    const match=route.request().url().match(/Npix(\d+)(?:_\d+)?\.png$/);if(!match)return route.abort();
    const pixel=Number(match[1]);if(pixel>11)return route.fulfill({status:404,body:'No fixture for LOD'});
    return route.fulfill({contentType:'image/png',body:await fs.readFile(`public/datasets/immersive-sky/Npix${pixel}_62.png`)});
  });
  await page.route('https://irsa.ipac.caltech.edu/TAP/sync?**',route=>route.fulfill({contentType:'application/xml',body:`<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/><TABLE>${['uri','observationid','collection','time_bounds_lower'].map(name=>`<FIELD name="${name}"/>`).join('')}<DATA><TABLEDATA><TR><TD>ibe/data/spherex/dr1/level2/example.fits</TD><TD>new-published-observation</TD><TD>spherex_dr1</TD><TD>61000</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`}));
}
for(const base of ['/','/skyo/'])test(`Clic informativo ${base}: fija punto real, copia, exporta y descarta al cambiar canal`,async({page},info)=>{
  await sources(page);await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}}));
  await page.goto(base+'inmersivo.html');await expect(page.locator('#flux')).toContainText('12.0051',{timeout:30000});
  const canvas=page.locator('#sky'),box=await canvas.boundingBox();await page.mouse.click(box.width/2,box.height/2);
  const panel=page.locator('#selection-panel');await expect(panel).toBeVisible();await expect(panel).toContainText('12.005');await expect(panel).toContainText('Mosaico HiPS');
  const pinned=await page.locator('#selection-data').innerText();await canvas.focus();await page.keyboard.down('w');await page.waitForTimeout(150);await page.keyboard.up('w');expect(await page.locator('#selection-data').innerText()).toBe(pinned);
  await page.locator('#selection-copy').click();expect(await page.evaluate(()=>window.__copied)).toMatch(/60\.81099.*, 51\.34040/);
  const download=page.waitForEvent('download');await page.locator('#selection-save').click();const report=JSON.parse(await fs.readFile(await(await download).path(),'utf8'));expect(report.flux).toBeCloseTo(12.0051,3);expect(report.icrs.ra).toBeCloseTo(60.8109955,5);expect(report.pixel.pixel).toBe(445);
  await page.screenshot({path:info.outputPath('punto-fijo.png')});
  if(base==='/'){
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.setViewportSize({width:800,height:600});expect((await panel.boundingBox()).height).toBeGreaterThan(200);await page.setViewportSize({width:1280,height:720});
  }
  await page.locator('#selection-close').click();await expect(panel).toBeHidden();await canvas.focus();await page.keyboard.press('Enter');await expect(panel).toBeVisible();
  await page.locator('#channel').fill('50');await page.locator('#channel').dispatchEvent('change');await expect(panel).toBeHidden();
  await page.getByRole('button',{name:'Consultar punto bajo la retícula'}).click();await expect(panel).toContainText('Canal vacío');await expect(page.locator('#selection-source')).toBeHidden();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#selection-close').click();
});
test('Clic pendiente cancela lectura automática anterior y un error libera la retícula',async({page})=>{
  await sources(page);await page.addInitScript(()=>{window.__jobs=[];const W=Worker;window.Worker=class extends W{constructor(url,...rest){super(url,...rest);if(String(url).includes('cube-worker'))window.__cube=this;}postMessage(data,...rest){if('pixel' in data){window.__jobs.push(data);return;}return super.postMessage(data,...rest);}};});
  await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');await page.mouse.click(760,400);
  await expect(page.locator('#selection-panel')).toBeVisible();
  const pinned=await page.evaluate(()=>({count:window.__jobs.length,id:window.__jobs.at(-1)?.id}));expect(pinned.count).toBeGreaterThan(0);
  // An automatic read may already have started before the click on a slow machine.
  await page.waitForTimeout(1300);expect(await page.evaluate(()=>window.__jobs.length)).toBe(pinned.count);
  await page.evaluate(id=>window.__cube.onmessage({data:{id,error:'fallo de prueba'}}),pinned.id);
  await expect(page.locator('#selection-status')).toContainText('fallo de prueba');await expect.poll(()=>page.evaluate(()=>window.__jobs.length)).toBeGreaterThan(pinned.count);
});
for(const base of ['/','/skyo/'])test(`Inmersivo ${base}: cielo real, vuelo, píxel NASA, canales y export`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await sources(page);await page.goto(base+'inmersivo.html');
  await expect(page.locator('#sky')).toHaveAttribute('data-ready','12',{timeout:30000});
  await expect(page.locator('#flux')).toContainText('12.0051',{timeout:30000});
  await expect(page.locator('#epoch')).toContainText('2025-08-19');
  const canvas=page.locator('#sky'),before=await canvas.screenshot();await canvas.focus();await page.keyboard.down('w');await expect.poll(async()=>Number(await canvas.getAttribute('data-travel'))).toBeGreaterThan(0);await page.keyboard.up('w');
  expect(Number(await canvas.getAttribute('data-travel'))).toBeGreaterThan(0);await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);expect((await canvas.screenshot()).equals(before)).toBe(false);
  await page.getByRole('button',{name:'Volver al origen',exact:true}).click();
  await page.locator('#channel').fill('50');await page.locator('#channel').dispatchEvent('change');await expect(canvas).toHaveAttribute('data-channel','50');await expect(canvas).toHaveAttribute('data-ready','0');await expect(page.locator('#flux')).toContainText('Canal vacío');
  await page.locator('#channel').fill('62');await page.locator('#channel').dispatchEvent('change');await expect(canvas).toHaveAttribute('data-ready','12');await expect(page.locator('#flux')).toContainText('12.0051');
  await page.getByText('Controles y procedencia',{exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar selección y procedencia'}).click();
  const report=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));expect(report.scienceReady).toBe(false);expect(report.channelIndex0).toBe(62);expect(report.flux).toBeCloseTo(12.0051,3);expect(report.source.byteRange[1]-report.source.byteRange[0]+1).toBe(1048576);
  await page.getByText('Controles y procedencia',{exact:true}).click();await page.screenshot({path:info.outputPath('cielo-inmersivo.png')});expect(errors).toEqual([]);
});
test('Inmersivo móvil: arrastre, controles táctiles y permiso gyro rechazado',async({page})=>{
  await sources(page);await page.addInitScript(()=>{window.DeviceOrientationEvent={requestPermission:async()=>'denied'};});
  await page.setViewportSize({width:390,height:844});await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const canvas=page.locator('#sky'),before=await canvas.getAttribute('data-ra');await page.mouse.move(250,400);await page.mouse.down();await page.mouse.move(320,430,{steps:6});await page.mouse.up();await expect(canvas).not.toHaveAttribute('data-ra',before);
  await page.getByRole('button',{name:'Activar giroscopio'}).click();await expect(page.locator('#xr-status')).toContainText('no concedido');await expect(page.locator('#gyro')).toHaveAttribute('aria-pressed','false');
  const button=page.getByRole('button',{name:'Volar hacia delante'}),box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();expect(Number(await canvas.getAttribute('data-travel'))).toBeGreaterThan(0);
});
test('Giroscopio: calibra la vista actual y responde a orientación sin salto inicial',async({page})=>{
  await sources(page);await page.addInitScript(()=>{window.DeviceOrientationEvent={requestPermission:async()=>'granted'};});
  await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');
  const before=Number(await page.locator('#sky').getAttribute('data-ra'));await page.locator('#gyro').click();
  const sensor=alpha=>page.evaluate(alpha=>{const e=new Event('deviceorientation');Object.assign(e,{alpha,beta:90,gamma:0});dispatchEvent(e);},alpha);
  await sensor(0);await expect(page.locator('#gyro')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect.poll(async()=>Math.abs(Number(await page.locator('#sky').getAttribute('data-ra'))-before)).toBeLessThan(.001);
  await sensor(30);await expect.poll(async()=>Math.abs(Number(await page.locator('#sky').getAttribute('data-ra'))-before)).toBeGreaterThan(20);
  await page.locator('#gyro').click();await expect(page.locator('#gyro')).toHaveAttribute('aria-pressed','false');
});
test('Ratón capturado selecciona bajo la retícula y no en coordenadas de cursor congeladas',async({page})=>{
  await sources(page);await page.addInitScript(()=>{window.__cubeJobs=[];const original=Worker.prototype.postMessage;Worker.prototype.postMessage=function(data,...rest){window.__cubeJobs.push(data);return original.call(this,data,...rest);};});
  await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');await expect(page.locator('#flux')).toContainText('12.0051');
  await page.mouse.move(900,450);await page.evaluate(()=>{window.__cubeJobs=[];Object.defineProperty(document,'pointerLockElement',{configurable:true,get:()=>document.getElementById('sky')});});
  await page.mouse.down();await page.mouse.up();await expect.poll(()=>page.evaluate(()=>window.__cubeJobs.at(-1)?.pixel)).toBe(445);
});
test('Retícula final actualiza RA/Dec aunque el arrastre termine dentro del intervalo HUD',async({page})=>{
  await sources(page);await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');await page.waitForTimeout(400);
  await page.mouse.move(600,450);await page.mouse.down();await page.mouse.move(602,450);await page.waitForTimeout(35);await page.mouse.move(650,450);await page.mouse.up();
  const expected=60.8109955-50*.003*180/Math.PI;
  await expect.poll(async()=>Math.abs(Number(await page.locator('#sky').getAttribute('data-ra'))-expected)).toBeLessThan(.00002);
});
test('Una edición nueva bloquea otros canales y LOD antes de aplicar el mosaico',async({page})=>{
  await sources(page);let remotePng=0;
  await page.route('**/spherex_allsky_cube/properties',async route=>route.fulfill({contentType:'text/plain',body:(await fs.readFile('public/datasets/immersive-sky/properties.txt','utf8')).replace('2026-11-01T01:58Z','2026-11-16T00:00Z')}));
  page.on('request',request=>{if(request.url().startsWith('https://irsa.ipac.caltech.edu/data/hips/')&&request.url().endsWith('.png'))remotePng++;});
  await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');
  await page.locator('#next').click();await expect(page.locator('#sky')).toHaveAttribute('data-channel','63');await page.waitForTimeout(500);expect(remotePng).toBe(0);
  await page.locator('#updates-title').click();await expect(page.locator('#apply-mosaic')).toBeVisible();await page.locator('#apply-mosaic').click();await expect.poll(()=>remotePng).toBeGreaterThan(0);
});
test('Inmersivo: WebXR denegado conserva cámara y nuevos datos se anuncian sin cambiar selección',async({page})=>{
  await sources(page);await page.addInitScript(()=>Object.defineProperty(navigator,'xr',{configurable:true,value:{addEventListener(){},removeEventListener(){},isSessionSupported:async()=>true,requestSession:async()=>{throw new DOMException('Permiso VR rechazado','NotAllowedError');}}}));
  await page.goto('/inmersivo.html');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');await expect(page.locator('#vr')).toBeEnabled();await page.locator('#vr').click();await expect(page.locator('#xr-status')).toContainText('No se pudo entrar');
  await page.locator('#updates-title').click();await expect(page.locator('#observations')).toContainText('new-published-observation');
  await page.route('**/spherex_allsky_cube/properties',async route=>route.fulfill({contentType:'text/plain',body:(await fs.readFile('public/datasets/immersive-sky/properties.txt','utf8')).replace('2026-11-01T01:58Z','2026-11-16T00:00Z')}));
  await page.locator('#refresh').click();await expect(page.locator('#apply-mosaic')).toBeVisible();await expect(page.locator('#sky')).toHaveAttribute('data-channel','62');
  await page.locator('#apply-mosaic').click();await expect(page.locator('#updates-status')).toContainText('Flujo deshabilitado');await page.locator('#read').click();await expect(page.locator('#status')).toContainText('cubo FITS asociado/verificado');
});

test('Detalle nativo completo, precarga espectral y caché FITS sin nuevas descargas',async({browser})=>{
  test.setTimeout(120000);
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:2,reducedMotion:'reduce'});
  try{
    const page=await context.newPage();await sources(page);
    await page.addInitScript(()=>{window.__cubeResponses=[];const W=Worker;window.Worker=class extends W{constructor(...args){super(...args);this.addEventListener('message',e=>window.__cubeResponses.push({id:e.data.id,channel:e.data.channel,cacheHit:e.data.cacheHit}));}};});
    const rootCounts=new Map();let rangeRequests=0;
    page.on('request',r=>{if(r.url().startsWith('https://nasa-irsa-spherex.'))rangeRequests++;});
    // Deliberately repeated real PNGs exercise scheduling/cache, not sky photometry.
    const png=await fs.readFile('public/datasets/immersive-sky/Npix1_62.png');
    await page.route('https://irsa.ipac.caltech.edu/data/hips/**/*.png',route=>{
      const u=route.request().url(),m=u.match(/Norder0\/.*Npix\d+_(\d+)\.png$/);
      if(m)rootCounts.set(Number(m[1]),(rootCounts.get(Number(m[1]))||0)+1);
      return route.fulfill({contentType:'image/png',body:png});
    });
    await page.goto('/inmersivo.html');const canvas=page.locator('#sky');
    await expect(canvas).toHaveAttribute('data-spatial-kernel','Rust/WASM');
    await expect(canvas).toHaveAttribute('data-lod','2');
    expect(await canvas.evaluate(el=>el.height)).toBe(1600);
    await expect.poll(async()=>Number(await canvas.getAttribute('data-detail-wanted'))).toBeGreaterThan(24);
    await expect.poll(async()=>await canvas.getAttribute('data-detail-ready')===await canvas.getAttribute('data-detail-wanted'),{timeout:60000}).toBe(true);
    await expect.poll(()=>rootCounts.get(63),{timeout:30000}).toBe(12);
    await expect(page.locator('#flux')).toContainText('12.0051');
    const before=rangeRequests,previousResponses=await page.evaluate(()=>window.__cubeResponses.length);
    await page.locator('#read').click();await expect.poll(()=>page.evaluate(n=>window.__cubeResponses.length>n&&window.__cubeResponses.at(-1).cacheHit,previousResponses)).toBe(true);expect(rangeRequests).toBe(before);
    await page.locator('#next').click();await expect(canvas).toHaveAttribute('data-display-channel','63');expect(rootCounts.get(63)).toBe(12);
    await page.locator('#previous').click();await expect(canvas).toHaveAttribute('data-display-channel','62');
    await canvas.focus();await page.mouse.move(640,400);for(let i=0;i<8;i++)await page.mouse.wheel(0,-500);
    await expect(canvas).toHaveAttribute('data-lod','5');
    await expect.poll(async()=>await canvas.getAttribute('data-detail-ready')===await canvas.getAttribute('data-detail-wanted'),{timeout:60000}).toBe(true);
  }finally{await context.close();}
});
