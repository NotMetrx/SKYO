/** Package only runtime resources; derive the offline cache from the actual build. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
for (const rel of ['assets/js/vendor', 'assets/img', 'assets/models', 'data/sample-fits']) {
  await fs.cp(new URL(rel, root), new URL(rel, dist), {recursive:true});
}
const wasm = 'assets/js/science/wasm/pkg';
const wasmPresent = !!await fs.stat(new URL(`${wasm}/skyo_wasm.js`, root)).catch(() => null);
if (wasmPresent) await fs.cp(new URL(wasm, root), new URL(wasm, dist), {recursive:true});
await fs.mkdir(new URL('licenses/aladin-lite/', dist), {recursive:true});
for (const file of ['LICENSE','COPYING','COPYING.LESSER','README.md']) {
  await fs.copyFile(new URL(`node_modules/aladin-lite/${file}`, root), new URL(`licenses/aladin-lite/${file}`, dist));
}
async function allFiles(dir, prefix='') {
  const files=[];
  for (const entry of await fs.readdir(dir, {withFileTypes:true})) {
    if(entry.name.startsWith('.')) continue;
    const rel=path.posix.join(prefix,entry.name);
    if(entry.isDirectory()) files.push(...await allFiles(new URL(`${entry.name}/`,dir),rel));
    else files.push(rel);
  }
  return files.sort();
}
// Demo FITS enter the runtime cache only when explicitly requested by the user.
const published=(await allFiles(dist)).filter(file=>!file.startsWith('data/') && !['sw.js','skyo-build-report.json'].includes(file));
const runtime=published.filter(file=>file.startsWith('assets/js/vendor/') || file.startsWith('assets/js/science/wasm/') || file.startsWith('assets/models/') || file.startsWith('datasets/') || file.startsWith('assets/aladin-'));
const files=published.filter(file=>!runtime.includes(file));
const template=await fs.readFile(new URL('sw.js',root),'utf8');
const hash=createHash('sha256').update(template);
for(const file of published) hash.update(file).update(await fs.readFile(new URL(file,dist)));
const version=hash.digest('hex').slice(0,16);
let sw=template;
sw=sw.replace("const VERSION='development';", `const VERSION='${version}';`).replace('const FILES=[];',`const FILES=${JSON.stringify(files)};`).replace('const RUNTIME=[];',`const RUNTIME=${JSON.stringify(runtime)};`);
await fs.writeFile(new URL('sw.js',dist),sw);
await fs.writeFile(new URL('skyo-build-report.json',dist),JSON.stringify({version,precache:files,runtime,wasmPresent},null,2)+'\n');
console.log(`Build SKYO OK: ${files.length} recursos precache; WASM ${wasmPresent?'presente':'fallback JS'}`);
