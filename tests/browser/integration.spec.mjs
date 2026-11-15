import {test,expect,chromium} from '@playwright/test';

for(const base of ['/','/skyo/']){
  test(`KRYO-9 y GLTF remoto ${base}: carga diferida, Draco y modelo`,async({},info)=>{
    test.setTimeout(120000);
    const browser=await chromium.launch({headless:true,args:['--disable-gpu','--enable-unsafe-swiftshader'],...(process.env.SKYO_BROWSER?{executablePath:process.env.SKYO_BROWSER}:{})});
    try {
      const page=await browser.newPage({reducedMotion:'no-preference'});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));

      await page.goto(base);
      expect(await page.evaluate(()=>typeof window.THREE)).toBe('undefined');
      expect(await page.locator('.eclipse-o').evaluate(el=>getComputedStyle(el,'::before').content)).toBe('""');

      await page.getByRole('button',{name:/Activar KRYO-9 3D|Animar eclipse 3D/}).click();
      await expect(page.locator('#kryo9-status-text')).toContainText(/KRYO-9/, {timeout:30000});
      await expect(page.locator('.eclipse-o')).toHaveClass(/eclipse-ready/, {timeout:30000});

      // Comprobar diseño móvil y ausencia de desborde horizontal
      await page.setViewportSize({width:390,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.setViewportSize({width:1280,height:800});
      await page.evaluate(()=>window.scrollTo(0,0));

      await page.screenshot({path:info.outputPath(base==='/'?'kryo-raiz.png':'kryo-subruta.png')});
      await page.getByRole('link',{name:'Explorar el cielo'}).click();
      await expect(page.locator('body')).toHaveAttribute('data-route','explorar', {timeout:15000});
      await page.getByRole('link',{name:'Fases',exact:true}).click();
      await expect(page.locator('body')).toHaveAttribute('data-route','fases');
      expect(errors).toEqual([]);
      await page.close();
    } finally {await browser.close();}
  });
}
