import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);
const report=JSON.parse(await fs.readFile(new URL('skyo-build-report.json',root)));
assert.ok(report.precache.length>0);
assert.ok(report.runtime.includes('assets/models/eclipse.glb'));
assert.ok((await fs.stat(new URL('assets/models/eclipse.glb',root))).size>0);
for(const file of report.precache) {
  assert.ok(!file.startsWith('skills/')&&!file.startsWith('node_modules/')&&!file.endsWith('.fits'),file);
  assert.ok((await fs.stat(new URL(file,root))).size>0,file);
}
for(const file of ['index.html','lab.html','contexto.html','espectral.html','inmersivo.html']) {
  const html=await fs.readFile(new URL(file,root),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/assets\/[^"#]+)"/g)) await fs.access(new URL(match[1],root));
  const link=html.match(/<link[^>]*rel="manifest"[^>]*href="([^"]+)"/);
  if(link){
    const url=new URL(link[1],new URL(file,root)),manifest=JSON.parse(await fs.readFile(url));
    for(const base of ['https://example.org/','https://example.org/skyo/']){
      const published=new URL(link[1],base+file);
      assert.equal(new URL(manifest.start_url,published).href,base+'index.html',`${file}: start_url del manifiesto enlazado`);
      assert.equal(new URL(manifest.scope,published).href,base,`${file}: scope del manifiesto enlazado`);
    }
    for(const icon of manifest.icons)assert.ok((await fs.stat(new URL(icon.src,url))).isFile(),icon.src);
  }
}
assert.equal(report.wasmPresent,!!await fs.stat(new URL('assets/js/science/wasm/pkg/skyo_wasm.js',root)).catch(()=>null));
console.log(`Build verificado: ${report.precache.length} recursos, manifiesto raíz/subruta y entradas válidas`);
