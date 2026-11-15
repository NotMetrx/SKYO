import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
for(const integrated of [false,true])test(`NASA real ${integrated?'integrado':'independiente'}: regiones, blink manual, informe y offline`,async({page,context})=>{
  const route=integrated?'/#explorar':'/lab.html';
  const id=name=>page.locator('#'+(integrated?'lab-':'')+name);
  const compare=page.locator(integrated?'#lab-compare-btn':'#compare'),save=page.locator(integrated?'#lab-save-report':'#save-report');
  if(integrated)await page.setViewportSize({width:390,height:844});
  await page.goto(route);
  if(integrated)await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cached=await page.evaluate(async()=>{const all=await Promise.all((await caches.keys()).map(async key=>(await (await caches.open(key)).keys()).map(r=>r.url)));return all.flat().filter(url=>url.includes('/datasets/')&&url.endsWith('.fits'));});
  expect(cached.filter(url=>!url.includes('/datasets/fpa-dr1/'))).toEqual([]);
  await id('load-real').click();await expect(compare).toBeEnabled();await compare.click();await expect(save).toBeEnabled();
  await id('blink-manual').click();await expect(id('render-view')).toHaveValue('A');
  await id('blink-manual').click();await expect(id('render-view')).toHaveValue('B');
  await id('render-view').selectOption('snr');
  await expect(page.locator(integrated?'#canvas-lab-difference':'#canvas-difference')).toHaveAttribute('aria-label',/SNR aproximado/);
  const download=page.waitForEvent('download');await save.click();const report=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
  expect(report.observations.map(o=>o.sourceKind)).toEqual(['NASA-DERIVED','NASA-DERIVED']);
  expect(report.observations[0].observationId).not.toBe(report.observations[1].observationId);
  expect(report.spectralCompatibility.visualMap.compatibleFractionOfOverlap).toBe(1);expect(report.uncertainty.significanceCalibrated).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const accessibility=await new AxeBuilder({page}).include(integrated?'#view-lab':'main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await id('real-region').selectOption('sureste');await expect(save).toBeDisabled();await expect(compare).toBeEnabled();
  await compare.click();await expect(save).toBeEnabled();
  await context.setOffline(true);await page.reload();
  if(integrated)await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  await id('real-region').selectOption('sureste');await expect(compare).toBeEnabled();await compare.click();await expect(save).toBeEnabled();
});

test('320 px: las cinco pestañas flotantes son accesibles al desplazar la barra',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.goto('/#explorar');
  for(const tab of await page.getByRole('tab').all()){
    await tab.scrollIntoViewIfNeeded();await tab.focus();const box=await tab.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);
  }
  const frame=await page.locator('#view-espectral').boundingBox();
  expect(frame).toEqual({x:0,y:0,width:320,height:568});
});
