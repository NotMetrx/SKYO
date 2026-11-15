import {test,expect,chromium} from '@playwright/test';
test('WebGL2: Aladin real y pausa del motor Three.js fuera de vista',async({},info)=>{
  test.setTimeout(120000);
  const browser=await chromium.launch({headless:true,args:['--disable-gpu','--enable-unsafe-swiftshader'],...(process.env.SKYO_BROWSER?{executablePath:process.env.SKYO_BROWSER}:{})});
  try {
    const page=await browser.newPage({reducedMotion:'no-preference'});
    await page.addInitScript(()=>{
      window.__rafTicks=0;
      const requestFrame=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=callback=>requestFrame(time=>{window.__rafTicks++;callback(time);});
    });
    await page.goto('/contexto.html');
    await page.getByRole('button',{name:'Cargar mapa'}).click();
    await expect(page.locator('body')).toHaveAttribute('data-map-ready','true',{timeout:45000});
    await page.locator('#sky-ra').fill('210');await page.getByRole('button',{name:'Ir a coordenadas'}).click();
    await page.screenshot({path:info.outputPath('aladin.png')});
    await page.goto('/#3d');
    await expect.poll(()=>page.evaluate(()=>window.__rafTicks),{timeout:45000}).toBeGreaterThan(10);
    await page.getByRole('link',{name:'Fases',exact:true}).click();
    await expect(page.locator('body')).toHaveAttribute('data-route','fases');
    await page.waitForTimeout(300);
    const draws=await page.evaluate(()=>window.__rafTicks);
    await page.waitForTimeout(300);
    expect(await page.evaluate(()=>window.__rafTicks)).toBe(draws);
    await page.screenshot({path:info.outputPath('fases-sin-render.png')});
  } finally {await browser.close();}
});
