import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const base of ['/','/skyo/']) {
  test(`${base} navegación, teclado y responsive`,async({page},info)=>{
    test.setTimeout(180000);
    const errors=[];const requests=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
    await page.goto(base);
    await expect(page.getByRole('link',{name:'Explorar el cielo'})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>typeof window.THREE)).toBe('object');
    expect(requests.some(url=>url.endsWith('.fits'))).toBe(false);
    await page.getByRole('link',{name:'Explorar el cielo'}).focus();await page.keyboard.press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-route','explorar');
    await page.getByRole('tab',{name:'Plano Focal IR'}).click();
    for(const width of [1440,768,390,360]) {
      await page.setViewportSize({width,height:900});
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(width<=780) await expect(page.locator('#hb')).not.toHaveClass(/show/);
      await expect(page.getByRole('tab',{name:'Plano Focal IR'})).toHaveAttribute('aria-selected','true');
      await page.screenshot({path:info.outputPath(`explorar-${width}.png`)});
    }
    await page.getByRole('link',{name:'Fases',exact:true}).click();await expect(page.locator('#fases')).toHaveAttribute('aria-hidden','false');
    await page.getByRole('link',{name:'SKYO Inicio',exact:true}).click();
    await expect(page.locator('#inicio')).toHaveAttribute('aria-hidden','false');
    const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(a11y.violations).toEqual([]);expect(errors).toEqual([]);
  });
  test(`${base} Worker, export y offline con Vary Origin`,async({page,context})=>{
    await page.goto(base);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await page.reload();
    await page.getByRole('link',{name:'Explorar el cielo'}).click();
    await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
    await page.locator('#lab-load-demo').click();
    await expect(page.locator('#lab-compare-btn')).toBeEnabled();await page.locator('#lab-compare-btn').click();
    await expect(page.locator('#lab-save-report')).toBeEnabled();
    const download=page.waitForEvent('download');await page.locator('#lab-save-report').click();expect((await download).suggestedFilename()).toContain('.json');
    await context.setOffline(true);await page.reload();
    await page.getByRole('tab',{name:/Laboratorio FITS/}).click();await page.locator('#lab-load-demo').click();
    await expect(page.locator('#lab-compare-btn')).toBeEnabled();await page.locator('#lab-compare-btn').click();await expect(page.locator('#lab-save-report')).toBeEnabled();
    await page.goto(base+'lab.html');await page.locator('#load-demo').click();await expect(page.locator('#compare')).toBeEnabled();
    await page.locator('#compare').click();await expect(page.locator('#save-report')).toBeEnabled();
  });
  test(`${base} manifiesto, iconos y aislamiento de caché`,async({page,request})=>{
    await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);
    const manifestUrl=await page.locator('link[rel=manifest]').getAttribute('href');
    const url=new URL(manifestUrl,page.url());const response=await request.get(url.href);expect(response.ok()).toBe(true);
    const manifest=await response.json();expect(new URL(manifest.start_url,url).pathname).toBe(base+'index.html');
    for(const icon of manifest.icons) expect((await request.get(new URL(icon.src,url).href)).ok()).toBe(true);
    const session=await page.context().newCDPSession(page);
    const installability=await session.send('Page.getInstallabilityErrors');
    expect(installability.installabilityErrors).toEqual([]);
    await page.evaluate(async()=>{await caches.open('other-app');const r=await navigator.serviceWorker.getRegistration();await r.update();});
    expect(await page.evaluate(()=>caches.has('other-app'))).toBe(true);
  });
}

test('contexto HiPS se carga bajo demanda y se descarga al salir',async({page})=>{
  await page.goto('/#explorar');
  await page.getByRole('tab',{name:'Contexto HiPS'}).click();
  const frame=page.frameLocator('#hips-frame');
  await expect(frame.getByRole('button',{name:'Cargar mapa'})).toBeVisible();
  await frame.getByRole('button',{name:'Cargar mapa'}).click();
  await expect(frame.locator('#sky-status')).toContainText(/Visor listo|No se pudo abrir/, {timeout:30000});
  await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  await expect(page.locator('#hips-frame')).toHaveAttribute('src','about:blank');
});
test('actualización PWA espera al usuario y conserva cachés ajenas',async({page})=>{
  await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.evaluate(async()=>{await caches.open('other-app');await navigator.serviceWorker.register('./sw.js?revision=next');});
  await expect(page.getByRole('button',{name:'Actualizar',exact:true})).toBeVisible({timeout:30000});
  expect(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).not.toContain('revision=next');
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.getByRole('button',{name:'Actualizar',exact:true}).click()]);
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL)).toContain('revision=next');
  expect(await page.evaluate(()=>caches.has('other-app'))).toBe(true);
});
