import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
for(const base of ['/','/skyo/']){
  test(`FPA real ${base}: seis texturas WASM, cámara, contraste y móvil`,async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}espectral.html`);
    await expect(page.locator('#fpa')).toHaveAttribute('data-loaded','6',{timeout:45000});
    await expect(page.locator('#detectors li')).toHaveCount(6);
    await expect(page.locator('#detectors')).toContainText('NASA-DERIVED');
    await expect(page.locator('#detectors')).toContainText('Rust / WebAssembly');
    const canvas=page.locator('#fpa'),before=await canvas.screenshot();
    await canvas.focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Shift+ArrowUp');await page.keyboard.press('+');
    await page.waitForTimeout(100);
    expect((await canvas.screenshot()).equals(before)).toBe(false);
    await page.getByRole('button',{name:'Encuadrar D1–D6'}).click();
    await page.selectOption('#stretch','percentile');
    await expect(page.locator('#fpa')).toHaveAttribute('data-loaded','6');
    await page.screenshot({path:info.outputPath('fpa-real.png')});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('FPA: hash erróneo controlado, reintento y búsqueda IRSA con inspector enlazado',async({page})=>{
  let corrupt=true;
  await page.route('**/datasets/fpa-dr1/D1.fits',async route=>{
    const data=await fs.readFile('frontend/public/datasets/fpa-dr1/D1.fits');if(corrupt)data[3000]^=1;
    await route.fulfill({body:data});
  });
  await page.route('https://irsa.ipac.caltech.edu/TAP/sync?**',route=>route.fulfill({contentType:'application/xml',body:`<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/><TABLE>${['uri','observationid','collection','energy_bandpassname','time_bounds_lower','footprint'].map(name=>`<FIELD name="${name}"/>`).join('')}<DATA><TABLEDATA><TR><TD>ibe/data/spherex/dr1/level2/example.fits</TD><TD>2025W20_2D_0065_1</TD><TD>spherex_dr1</TD><TD>SPHEREx-D2</TD><TD>60888</TD><TD>POLYGON ICRS 210 54 212 54 212 55 210 55</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`}));
  await page.route('https://irsa.ipac.caltech.edu/ibe/data/spherex/**',async route=>route.fulfill({body:await fs.readFile('tests/fixtures/l2/observation.fits')}));
  await page.goto('/espectral.html');
  await expect(page.locator('#detectors li').first()).toContainText('Hash FITS incorrecto',{timeout:45000});
  corrupt=false;await page.getByRole('button',{name:'Recargar conjunto real'}).click();
  await expect(page.locator('#fpa')).toHaveAttribute('data-loaded','6');
  await page.getByRole('button',{name:'Buscar imágenes',exact:true}).click();
  await expect(page.locator('#search-status')).toContainText('1 resultados');
  await page.getByRole('button',{name:'Ver imagen D2: 2025W20_2D_0065_1',exact:true}).click();
  await expect(page.locator('#fits-status')).toContainText('29 × 29');
  await expect(page.locator('#results tr[aria-selected=true]')).toContainText('2025W20_2D_0065_1');
  await expect(page.locator('#coverage-map path.selected')).toHaveCount(1);
  await expect(page.locator('#fpa')).toHaveAttribute('data-loaded','6');
});
test('Explorar abre imágenes reales y descarga el visor al cambiar de pestaña',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:'Explorar el cielo'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-explore-view','espectral');
  await expect(page.frameLocator('#spectral-frame').locator('#sky')).toHaveAttribute('data-ready','12',{timeout:45000});
  await page.getByRole('tab',{name:'Laboratorio FITS'}).click();
  await expect(page.locator('#spectral-frame')).toHaveAttribute('src','about:blank');
  await page.getByRole('tab',{name:'Espacio inmersivo'}).click();
  await expect(page.frameLocator('#spectral-frame').locator('#sky')).toHaveAttribute('data-ready','12');
  await page.getByRole('link',{name:'Fases',exact:true}).click();
  await expect(page.locator('#spectral-frame')).toHaveAttribute('src','about:blank');
  await page.getByRole('link',{name:'Explorar',exact:true}).click();
  await expect(page.frameLocator('#spectral-frame').locator('#sky')).toHaveAttribute('data-ready','12');
});

for(const base of ['/','/skyo/'])test(`Entrada directa ${base}index.html#explorar muestra el cielo integrado`,async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}index.html#explorar`);
  await expect(page.getByRole('tab',{name:'Espacio inmersivo'})).toHaveAttribute('aria-selected','true');
  const frame=page.frameLocator('#spectral-frame');
  await expect(frame.locator('#sky')).toHaveAttribute('data-ready','12',{timeout:45000});
  await expect(page).toHaveURL(new RegExp(`${base}index\\.html#explorar$`));
  await expect(frame.locator('body')).toHaveClass('embedded');
  await expect(frame.locator('header')).toBeHidden();
  await expect(page.locator('#hb')).toBeHidden();
  const overlaps=(a,b)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y);
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:740},{width:768,height:1024}]){
    await page.setViewportSize(size);
    await expect.poll(()=>page.locator('#spectral-frame').boundingBox()).toEqual({x:0,y:0,...size});
    await expect.poll(()=>frame.locator('#sky').boundingBox()).toEqual({x:0,y:0,...size});
    expect(await page.locator('#spectral-frame').evaluate(el=>[getComputedStyle(el).borderWidth,getComputedStyle(el).borderRadius])).toEqual(['0px','0px']);
    expect(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight/2)?.id)).toBe('spectral-frame');
    expect(await frame.locator('#sky').evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight/2)?.id)).toBe('sky');
    const hud=await frame.locator('.hud').boundingBox(),actions=await frame.locator('.actions').boundingBox();
    expect(overlaps(hud,actions)).toBe(false);
    expect((await page.locator('#explore-view-tabs').boundingBox()).y+(await page.locator('#explore-view-tabs').boundingBox()).height).toBeLessThanOrEqual(hud.y);
    expect(overlaps(await frame.locator('.spectrum').boundingBox(),await page.locator('#nav').boundingBox())).toBe(false);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`cielo-completo-${size.width}.png`)});
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#bitacora-btn').click();
  await expect(page.locator('#bitacora-panel')).toHaveAttribute('aria-hidden','false');
  expect(await page.locator('#bitacora-panel').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+20,r.y+20));})).toBe(true);
  await page.locator('#bitacora-btn').click();
  await frame.getByText('Controles y procedencia',{exact:true}).click();
  await expect(frame.getByRole('navigation',{name:'Herramientas científicas'})).toBeVisible();
  await frame.getByText('Controles y procedencia',{exact:true}).click();
  await frame.locator('#sky').focus();await page.keyboard.down('w');
  try{await expect.poll(async()=>Number(await frame.locator('#sky').getAttribute('data-travel'))).toBeGreaterThan(0);}finally{await page.keyboard.up('w');}
  await page.getByRole('tab',{name:'Laboratorio FITS'}).click();
  await expect(page.locator('#spectral-frame')).toHaveAttribute('src','about:blank');
  await page.getByRole('tab',{name:'Espacio inmersivo'}).click();
  await expect(frame.locator('#sky')).toHaveAttribute('data-ready','12');
  expect(errors).toEqual([]);
});
