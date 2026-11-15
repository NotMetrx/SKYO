import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const entry of ['lab.html','contexto.html','espectral.html','inmersivo.html']) test(`accesibilidad de controles en ${entry}`,async({page})=>{
  await page.goto('/'+entry);
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});

test('accesibilidad del cielo completo con controles flotantes en Explorar',async({page})=>{
  await page.goto('/index.html#explorar');
  await expect(page.frameLocator('#spectral-frame').locator('#sky')).toHaveAttribute('data-ready','12',{timeout:30000});
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});
