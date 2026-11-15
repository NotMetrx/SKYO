import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {DEMO_HASHES} from '../../frontend/assets/js/science/contracts.js';
for(const integrated of [false,true])test(`OPFS ${integrated?'integrado':'independiente'}: fallo de segundo archivo, recuperación y borrado`,async({page})=>{
  await page.goto(integrated?'/#explorar':'/lab.html');
  if(integrated)await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  const demo=page.locator(integrated?'#lab-load-demo':'#load-demo'),store=page.locator(integrated?'#lab-save-local':'#save-local');
  const restore=page.locator(integrated?'#lab-load-local':'#load-local'),clear=page.locator(integrated?'#lab-clear-local':'#clear-local');
  const compare=page.locator(integrated?'#lab-compare-btn':'#compare'),save=page.locator(integrated?'#lab-save-report':'#save-report');
  const toast=page.locator(integrated?'#lab-toast':'#toast');
  await demo.click();await expect(store).toBeEnabled();await store.click();await expect(toast).toContainText('guardada localmente');
  await page.locator(integrated?'#lab-load-real':'#load-real').click();await expect(store).toBeEnabled();
  await page.evaluate(()=>{
    window.__createWritable=FileSystemFileHandle.prototype.createWritable;
    FileSystemFileHandle.prototype.createWritable=async function(...args){if(this.name==='B.fits')throw new DOMException('Cuota simulada','QuotaExceededError');return window.__createWritable.apply(this,args);};
  });
  await store.click();await expect(toast).toContainText('No se pudo guardar');
  await page.evaluate(()=>{FileSystemFileHandle.prototype.createWritable=window.__createWritable;});
  await restore.click();await expect(compare).toBeEnabled();await compare.click();await expect(save).toBeEnabled();
  const download=page.waitForEvent('download');await save.click();const report=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
  expect(report.snapshot.hashes).toEqual(DEMO_HASHES);expect(report.observations.map(o=>o.sourceKind)).toEqual(['SYNTHETIC','SYNTHETIC']);
  await clear.click();await expect(toast).toContainText('eliminada');
  await restore.click();await expect(compare).toBeDisabled();await expect(save).toHaveText(/diagnóstico/);
});

test('Bitácora conserva snapshot, no inventa movimiento y escapa nombres de archivo',async({page})=>{
  await page.goto('/#explorar');await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  const buffer=await fs.readFile(new URL('../../data/sample-fits/epoca_A.fits',import.meta.url));
  for(const side of ['a','b'])await page.locator('#file-lab-'+side).setInputFiles({name:'<img src=x onerror=window.__skyoXss=1>.fits',mimeType:'application/fits',buffer});
  await expect(page.locator('#lab-compare-btn')).toBeEnabled();await page.locator('#lab-compare-btn').click();await expect(page.locator('#lab-add-bitacora')).toBeEnabled();
  if(await page.locator('#hb').evaluate(el=>el.classList.contains('show')))await page.locator('#ha').click();
  await page.locator('#lab-add-bitacora').click();
  const entry=await page.evaluate(()=>JSON.parse(localStorage.getItem('skyo_bitacora_v1'))[0]);
  expect(entry.deltaArcsec).toBeNull();expect(entry.analysisId).toBeTruthy();expect(entry.snapshot.hashes.A).toBe(DEMO_HASHES.A);
  expect(await page.evaluate(()=>window.__skyoXss)).toBeUndefined();
  expect(await page.locator('.bit-meta img').count()).toBe(0);
});
