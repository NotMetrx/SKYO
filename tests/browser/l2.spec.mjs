import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const bytes=await fs.readFile('tests/fixtures/l2/observation.fits'),ref=JSON.parse(await fs.readFile('tests/fixtures/l2/astropy.json')),point=ref.samples[1];
async function setup(page){
  await page.route('https://irsa.ipac.caltech.edu/TAP/sync?**',route=>route.fulfill({contentType:'application/xml',body:`<VOTABLE><RESOURCE><INFO name="QUERY_STATUS" value="OK"/><TABLE>${['uri','observationid','collection','time_bounds_lower'].map(name=>`<FIELD name="${name}"/>`).join('')}<DATA><TABLEDATA><TR><TD>ibe/data/spherex/dr1/level2/fixture.fits</TD><TD>2025W20_2D_0065_1</TD><TD>spherex_dr1</TD><TD>60810</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`}));
  await page.route('https://irsa.ipac.caltech.edu/data/hips/**',async route=>{
    if(route.request().url().endsWith('/properties'))return route.fulfill({body:await fs.readFile('public/datasets/immersive-sky/properties.txt')});
    return route.fulfill({contentType:'image/png',body:await fs.readFile('public/datasets/immersive-sky/Npix1_62.png')});
  });
  await page.route('https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/**',route=>route.fulfill({status:404}));
}
async function approach(page,base,embedded=false){
  await page.goto(base+(embedded?'index.html#explorar':'inmersivo.html'));const ui=embedded?page.frameLocator('#spectral-frame'):page;
  await expect(ui.locator('#sky')).toHaveAttribute('data-ready','12');
  await ui.locator('#channel').fill('20');await ui.locator('#channel').dispatchEvent('change');await expect(ui.locator('#sky')).toHaveAttribute('data-channel','20');
  const dx=-(point.ra-60.8109955)*Math.PI/180/.003,dy=-(point.dec-51.3404038)*Math.PI/180/.003;
  for(let i=0;i<2;i++){await page.mouse.move(1000,450);await page.mouse.down();await page.mouse.move(1000+dx/2,450+dy/2,{steps:3});await page.mouse.up();}
  await ui.locator('#sky').focus();for(let i=0;i<31;i++)await page.keyboard.press('+');
  await expect.poll(async()=>Number(await ui.locator('#sky').getAttribute('data-fov'))).toBeLessThan(.5);return ui;
}
for(const base of ['/','/skyo/'])test(`Zoom L2 ${base}: FITS real, λ/fecha/flujo propios, export y retorno`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
  await page.route('**/ibe/data/spherex/dr1/level2/fixture.fits?**',route=>route.fulfill({body:bytes}));
  await approach(page,base);await expect(page.locator('#sky')).toHaveAttribute('data-detail-layer','ready',{timeout:30000});
  await expect(page.locator('#wave')).toContainText('L2 real 1.1935');await expect(page.locator('#epoch')).toContainText('2025-05-15');
  await expect(page.locator('#flux')).toContainText('observación L2');
  await page.getByRole('button',{name:'Consultar punto bajo la retícula'}).click();await expect(page.locator('#selection-panel')).toContainText('Observación L2 original');await expect(page.locator('#selection-panel')).toContainText('1.19349');await expect(page.locator('#selection-panel')).toContainText('2025W20_2D_0065_1');await page.locator('#selection-close').click();
  await page.getByText('Controles y procedencia',{exact:true}).click();const download=page.waitForEvent('download');await page.locator('#export').click();const report=JSON.parse(await fs.readFile(await(await download).path(),'utf8'));
  expect(report.source.type).toBe('L2-observation');expect(report.source.sha256).toBe(ref.sha256);expect(report.source.x).toBe(15);expect(report.source.y).toBe(15);expect(report.scienceReady).toBe(false);
  await page.getByText('Controles y procedencia',{exact:true}).click();await page.screenshot({path:info.outputPath('native-l2.png')});
  await page.locator('#sky').focus();for(let i=0;i<18;i++)await page.keyboard.press('-');await expect(page.locator('#sky')).toHaveAttribute('data-detail-layer','mosaic');await expect(page.locator('#flux')).not.toContainText('observación L2');expect(errors).toEqual([]);
});
test('Zoom L2 integrado en Explorar con controles flotantes',async({page})=>{
  await setup(page);await page.route('**/ibe/data/spherex/dr1/level2/fixture.fits?**',route=>route.fulfill({body:bytes}));
  const ui=await approach(page,'/',true);await expect(ui.locator('#sky')).toHaveAttribute('data-detail-layer','ready',{timeout:30000});
  await expect(ui.locator('#flux')).toContainText('observación L2');await expect(page).toHaveURL(/index\.html#explorar$/);
  await page.getByRole('tab',{name:'Laboratorio FITS'}).click();await expect(page.locator('#spectral-frame')).toHaveAttribute('src','about:blank');
});
test('Zoom L2: respuesta tardía se descarta al cambiar canal y error conserva panorama',async({page})=>{
  await setup(page);let release;const held=new Promise(resolve=>release=resolve);let started=false;
  await page.route('**/ibe/data/spherex/dr1/level2/fixture.fits?**',async route=>{started=true;await held;await route.fulfill({body:bytes}).catch(()=>{});});
  await approach(page,'/');await expect.poll(()=>started).toBe(true);
  await page.locator('#channel').fill('62');await page.locator('#channel').dispatchEvent('change');await expect(page.locator('#sky')).toHaveAttribute('data-channel','62');release();
  await expect(page.locator('#detail-status')).toContainText(/incompatible|no disponible|no contiene|fuera del canal/,{timeout:30000});
  await expect(page.locator('#sky')).toHaveAttribute('data-detail-layer','mosaic');await expect(page.locator('#flux')).not.toContainText('observación L2');await expect(page.locator('#sky')).toHaveAttribute('data-ready','12');
});
