import {test,expect} from '@playwright/test';
for(const base of ['/','/skyo/'])test(`Portada ${base}: acceso por teclado, cielo y regreso`,async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 expect(await page.evaluate(()=>typeof window.THREE)).toBe('undefined');
 const entry=page.getByRole('link',{name:'Explorar el cielo',exact:true});await entry.focus();await page.keyboard.press('Enter');
 await expect(page.locator('body')).toHaveAttribute('data-route','explorar');
 await expect(page.frameLocator('#spectral-frame').locator('#sky')).toHaveAttribute('data-ready','12',{timeout:45000});
 await page.getByRole('link',{name:'SKYO Inicio'}).click();await expect(page.locator('body')).toHaveAttribute('data-route','inicio');
 await page.setViewportSize({width:320,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('portada-movil.png')});expect(errors).toEqual([]);
});
