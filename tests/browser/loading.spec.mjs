import {test,expect} from '@playwright/test';
test('Cambiar canal mientras carga el manifiesto no rompe el visor',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/datasets/immersive-sky/manifest.json',async route=>{await gate;await route.continue();});
  await page.goto('/inmersivo.html',{waitUntil:'domcontentloaded'});
  try{await page.locator('#next').evaluate(e=>e.click());await page.locator('#channel').fill('80');await page.locator('#channel').dispatchEvent('change');await page.waitForTimeout(250);expect(errors).toEqual([]);}finally{release();}
  await expect(page.locator('#sky')).toHaveAttribute('data-ready','12',{timeout:30000});
  await expect(page.locator('#channel')).toHaveValue('62');
});
test('Controles inmersivos separados en móvil horizontal',async({page})=>{
  for(const size of [{width:844,height:390},{width:568,height:320}]){
  await page.setViewportSize(size);
  await page.goto('/inmersivo.html',{waitUntil:'domcontentloaded'});
  const boxes=await Promise.all(['.hud','.actions','.updates','.spectrum'].map(s=>page.locator(s).boundingBox()));
  for(const box of boxes){expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];expect(Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)).toBe(false);}
  }
});
