import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const sample=fileURLToPath(new URL('../../data/sample-fits/epoca_A.fits',import.meta.url));
async function exported(page,button){
  const download=page.waitForEvent('download');await button.click();
  return JSON.parse(await fs.readFile(await (await download).path(),'utf8'));
}
for(const integrated of [false,true]) test(`T01 ${integrated?'integrado':'independiente'}: cambiar demo invalida informe`,async({page})=>{
  await page.goto(integrated?'/#explorar':'/lab.html');
  if(integrated)await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  const demo=page.locator(integrated?'#lab-load-demo':'#load-demo');
  const compare=page.locator(integrated?'#lab-compare-btn':'#compare');
  const save=page.locator(integrated?'#lab-save-report':'#save-report');
  await demo.click();await expect(compare).toBeEnabled();await compare.click();await expect(save).toBeEnabled();
  await demo.click();await expect(save).toBeDisabled();
});
for(const integrated of [false,true])test(`T01 ${integrated?'integrado':'independiente'}: A/A→demo A/B, export y diagnóstico`,async({page})=>{
  await page.goto(integrated?'/#explorar':'/lab.html');
  if(integrated)await page.getByRole('tab',{name:/Laboratorio FITS/}).click();
  const input=side=>page.locator(integrated?`#file-lab-${side}`:`#file-${side}`);
  const compare=page.locator(integrated?'#lab-compare-btn':'#compare');
  const save=page.locator(integrated?'#lab-save-report':'#save-report');
  for(const side of ['a','b'])await input(side).setInputFiles(sample);
  await expect(compare).toBeEnabled();await compare.click();await expect(save).toBeEnabled();
  const identical=await exported(page,save);
  expect(identical.observations.map(o=>o.sourceKind)).toEqual(['USER-LOCAL','USER-LOCAL']);
  expect(identical.snapshot.hashes.A).toBe(identical.snapshot.hashes.B);
  await page.locator(integrated?'#lab-load-demo':'#load-demo').click();
  await expect(save).toBeDisabled();await expect(compare).toBeEnabled();await compare.click();await expect(save).toBeEnabled();
  const pair=await exported(page,save);
  expect(pair.analysisId).not.toBe(identical.analysisId);
  expect(pair.observations.map(o=>o.fileName)).toEqual(['epoca_A.fits','epoca_B.fits']);
  expect(pair.observations.map(o=>o.sourceKind)).toEqual(['SYNTHETIC','SYNTHETIC']);
  expect(pair.snapshot.hashes.A).not.toBe(pair.snapshot.hashes.B);
  await input('b').setInputFiles({name:'invalido.fits',mimeType:'application/fits',buffer:Buffer.from('<html>Error de descarga</html>')});
  await expect(save).toHaveText(/diagnóstico/);await expect(compare).toBeDisabled();
  const diagnostic=await exported(page,save);
  expect(diagnostic.schemaVersion).toBe('skyo-diagnostic-1');expect(diagnostic.observations[1]).toBeNull();
  expect(diagnostic.snapshot.hashes.B).toBeNull();expect(diagnostic.analysisId).toBeUndefined();
});
