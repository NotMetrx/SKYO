import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {skyDirection,skyCoordinates,healpixFace,healpixTile,skyPixel,sphereHit} from '../../frontend/assets/js/immersive/sky-math.js';
import {parseProperties,tileUrl,sameEdition,createSky} from '../../frontend/assets/js/immersive/hips.js';
import {cubePixel,cubeHeader,fetchRange} from '../../frontend/assets/js/immersive/cube.js';
import {createXR} from '../../frontend/assets/js/immersive/xr.js';
const angle=(a,b)=>Math.abs(((a-b+540)%360)-180);
test('Caché HiPS expulsa detalle fuera de pantalla durante una órbita completa',async()=>{
  const context={};vm.runInNewContext(await fs.readFile('frontend/assets/js/vendor/three.min.js','utf8'),context);const T=context.THREE;
  const before={fetch:global.fetch,location:global.location,createImageBitmap:global.createImageBitmap};let closed=0,sky;
  try{
    global.location={href:'http://localhost/'};const bytes=new Uint8Array(),hash=createHash('sha256').update(bytes).digest('hex');
    global.fetch=async()=>new Response(bytes);global.createImageBitmap=async()=>({width:512,height:512,close(){closed++;}});
    const manifest={channel:62,properties:{hips_order:'5'},items:Array.from({length:12},(_,pixel)=>({pixel,file:`Npix${pixel}_62.png`,sha256:hash}))};
    sky=createSky(T,new T.Scene(),{manifest});
    const settle=async()=>{for(let n=0;n<30;n++)await new Promise(setImmediate);};
    await settle();sky.allowRemote(true);await settle();const camera=new T.PerspectiveCamera(2,1.6,.1,2200);
    for(let ra=0;ra<360;ra+=10){camera.lookAt(new T.Vector3(...skyDirection(ra,0)));sky.update(camera,ra+1000,true,1575);await settle();}
    assert.ok(sky.stats.tiles<=256);assert.equal(sky.stats.detailReady,sky.stats.detailWanted);assert.ok(closed>0);
  }finally{sky?.dispose();for(const [name,value] of Object.entries(before)){if(value===undefined)delete global[name];else global[name]=value;}}
});
test('Curación HiPS rechaza una edición nueva antes de reutilizar o relabelar los PNG',()=>{
  execFileSync('python3',['-c',`from backend.python.curate_immersive_sky import previous_manifest
from pathlib import Path
import tempfile,json
with tempfile.TemporaryDirectory() as root:
 p=Path(root)/'manifest.json'
 props={'hips_release_date':'old','hips_frame':'equatorial','hips_order':'5','hips_tile_width':'512','data_cube_crval3_arr':'1 2'}
 p.write_text(json.dumps({'properties':props,'items':[]}))
 original=p.read_bytes()
 assert previous_manifest(p,props)['properties']==props
 try: previous_manifest(p,dict(props,hips_release_date='new'))
 except ValueError: pass
 else: raise AssertionError('Edition mismatch accepted')
 assert p.read_bytes()==original
`]);
});
test('ICRS: cardinales, costura RA y polos conservan coordenadas',()=>{
  const zero=skyDirection(0,0),east=skyDirection(90,0),north=skyDirection(0,90);
  assert.ok(Math.abs(zero[0])<1e-12&&Math.abs(zero[1])<1e-12&&zero[2]===-1);
  const cross=[zero[1]*east[2]-zero[2]*east[1],zero[2]*east[0]-zero[0]*east[2],zero[0]*east[1]-zero[1]*east[0]];
  assert.ok(cross.reduce((sum,v,i)=>sum+v*north[i],0)>.999999,'ICRS parity must be a rotation, not a mirror');
  for(const ra of [0,.001,45,179,359.999])for(const dec of [-89.999,-30,0,45,89.999]){
    const r=skyCoordinates(skyDirection(ra,dec));assert.ok(angle(r.ra,ra)<1e-8);assert.ok(Math.abs(r.dec-dec)<1e-7);
  }
  const r=sphereHit({x:100,y:0,z:0},{x:0,y:0,z:-1});assert.ok(Math.abs(Math.hypot(r.x,r.y,r.z)-1000)<1e-9);
});
test('Range FITS rechaza HTTP200 y un rango truncado sin aceptar el cubo entero',async()=>{
  const original=global.fetch;let canceled=false;
  try{
    global.fetch=async()=>({status:200,body:{cancel:async()=>{canceled=true;}}});
    await assert.rejects(fetchRange('https://example.test',0,3),/206/);assert.equal(canceled,true);
    global.fetch=async()=>new Response(new Uint8Array([1,2]),{status:206,headers:{'Content-Range':'bytes 0-3/100'}});
    await assert.rejects(fetchRange('https://example.test',0,3),/truncado/);
    global.fetch=async()=>new Response(new Uint8Array([1,2,3,4,5]),{status:206,headers:{'Content-Range':'bytes 0-3/100'}});
    await assert.rejects(fetchRange('https://example.test',0,3),/presupuesto/);
  }finally{global.fetch=original;}
});
test('WebXR r128: sesión, panel, mandos, vuelo y giro con antirrepetición',async()=>{
  const context={};vm.runInNewContext(await fs.readFile('frontend/assets/js/vendor/three.min.js','utf8'),context);const T=context.THREE;
  const oldDocument=global.document,oldNavigator=Object.getOwnPropertyDescriptor(global,'navigator'),oldSecure=global.isSecureContext;
  const listeners=new Map(),session={visibilityState:'visible',addEventListener:(n,f)=>listeners.set(n,f),end:async()=>listeners.get('end')?.()};
  global.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
  Object.defineProperty(global,'navigator',{configurable:true,value:{xr:{isSessionSupported:async()=>true,requestSession:async()=>session}}});global.isSecureContext=true;
  try{
    const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera();scene.add(player);player.add(camera);const controllers=[new T.Group(),new T.Group()];
    let reads=0,picks=0;
    const renderer={xr:{setReferenceSpaceType(){},getController:i=>controllers[i],setSession:async()=>{}}};
    const xr=createXR(T,renderer,scene,camera,player,{onSelect:()=>picks++,onChannel(){},onRead:()=>reads++,onReset(){},onStatus(){},getText:()=>[],wake(){}});
    assert.equal((await xr.check()).supported,true);await xr.enter();assert.equal(xr.active,true);
    const left={handedness:'left',gamepad:{axes:[0,0,0,-1]}},right={handedness:'right',gamepad:{axes:[0,0,1,0]}};
    controllers[0].dispatchEvent({type:'connected',data:left});controllers[1].dispatchEvent({type:'connected',data:right});xr.update(1,1000);assert.ok(player.position.length()>40);assert.ok(Math.abs(player.rotation.y+Math.PI/4)<1e-9);
    xr.update(0,1001);assert.ok(Math.abs(player.rotation.y+Math.PI/4)<1e-9);
    player.position.set(0,0,0);player.rotation.set(0,0,0);controllers[0].quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),new T.Vector3(0,-.75,-1.7).normalize());scene.updateMatrixWorld(true);controllers[0].dispatchEvent({type:'selectstart'});assert.equal(reads,1);
    controllers[0].quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),new T.Vector3(0,2,-1).normalize());scene.updateMatrixWorld(true);controllers[0].dispatchEvent({type:'selectstart'});assert.equal(picks,1);
    await session.end();assert.equal(xr.active,false);xr.dispose();
  }finally{global.document=oldDocument;global.isSecureContext=oldSecure;if(oldNavigator)Object.defineProperty(global,'navigator',oldNavigator);else delete global.navigator;}
});
test('Rust/WASM: plano IMAGE real y flujo bajo retícula coinciden con binario NASA',async()=>{
  const w=await import('../../frontend/assets/js/science/wasm/pkg/skyo_wasm.js');await w.default({module_or_path:await fs.readFile('frontend/assets/js/science/wasm/pkg/skyo_wasm_bg.wasm')});
  const bytes=await fs.readFile('tests/fixtures/immersive/plane-445-ch62.bin'),p=w.float_plane_to_texture(bytes,512,512,1,0,true);
  try{
    const data=p.pixels(),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    assert.equal(p.rgba().length,512*512*4);
    assert.equal(createHash('sha256').update(p.rgba()).digest('hex'),'89484e7bdf50aaa624e04dee2c89ab1708d5ee121d8208e67fa224cf994cd78b');
    for(let i=0;i<data.length;i+=127){const expected=view.getFloat32(i*4,false);assert.ok(Object.is(data[i],expected)||Number.isNaN(data[i])&&Number.isNaN(expected));}
    const at=cubePixel(60.8109955,51.3404038);assert.equal(at.pixel,445);assert.ok(Math.abs(data[at.y*512+at.x]-12.0051)<.0001);
  }finally{p.free();}
});
test('Rust HEALPix: geometría y cobertura de toda la pantalla en polos, costura y vuelo',async()=>{
  const w=await import('../../frontend/assets/js/science/wasm/pkg/skyo_wasm.js');await w.default({module_or_path:await fs.readFile('frontend/assets/js/science/wasm/pkg/skyo_wasm_bg.wasm')});
  const context={};vm.runInNewContext(await fs.readFile('frontend/assets/js/vendor/three.min.js','utf8'),context);const T=context.THREE;
  for(const [ra,dec] of [[0,0],[359.99,50],[60.811,51.34],[170,89.9],[15,-89.9]])for(const [fov,aspect,height] of [[70,1.6,1575],[70,.46,2532],[2,1.6,1575],[95,3,2160]])for(const travel of [0,750])for(const look of [1,-1]){
    const c=new T.PerspectiveCamera(fov,aspect,.1,2200),dir=new T.Vector3(...skyDirection(ra,dec));c.position.copy(dir).multiplyScalar(travel);c.lookAt(c.position.clone().addScaledVector(dir,look));c.updateMatrixWorld();
    const matrix=new T.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse);
    const plan=w.sky_tiles(matrix.elements,height,fov,5,c.position.toArray()),order=plan[0],tiles=[];
    for(let i=1;i<plan.length;i+=2)tiles.push({order:plan[i],pixel:plan[i+1]});
    const keys=new Set(tiles.map(t=>`${t.order}/${t.pixel}`)),leaves=new Set(tiles.filter(t=>![0,1,2,3].some(i=>keys.has(`${t.order+1}/${t.pixel*4+i}`))).map(t=>`${t.order}/${t.pixel}`));
    assert.ok(order>=1&&order<=5);assert.ok(tiles.length>0);
    for(let x=-.99;x<=1;x+=.11)for(let y=-.99;y<=1;y+=.11){
      const ray=new T.Vector3(x,y,.5).unproject(c).sub(c.position).normalize(),hit=sphereHit(c.position,ray),p=skyCoordinates(hit);
      assert.ok(Array.from({length:6},(_,level)=>leaves.has(`${level}/${skyPixel(p.ra,p.dec,level).pixel}`)).some(Boolean),`missing ${ra}/${dec}/${fov}/${aspect}/${travel}/${look} at ${x}/${y}`);
    }
    const pixel=tiles[0].pixel,level=tiles[0].order,vertices=w.hips_vertices(level,pixel,8,1000);
    for(let j=0;j<=8;j++)for(let i=0;i<=8;i++){
      const p=healpixTile(level,pixel,1-j/8,i/8),expected=skyDirection(p.ra,p.dec,1000),at=(j*9+i)*3;
      for(let a=0;a<3;a++)assert.ok(Math.abs(vertices[at+a]-expected[a])<.0001);
    }
  }
});
test('HiPS: metadatos reales,102canales y URLs incluidas carpetas por Npix',async()=>{
  const text=await fs.readFile('frontend/public/datasets/immersive-sky/properties.txt','utf8'),p=parseProperties(text);
  assert.equal(p.wavelengths.length,102);assert.deepEqual(p.blank,[50,51]);
  assert.equal(p.wavelengths[0],.753);assert.equal(p.wavelengths[101],4.988);
  assert.ok(tileUrl(5,12000,0).endsWith('/Norder5/Dir10000/Npix12000/Npix12000.png'));
  assert.ok(tileUrl(0,0,62).endsWith('/Npix0/Npix0_62.png'));
  assert.throws(()=>tileUrl(5,0,102));assert.throws(()=>parseProperties(text.replace('equatorial','galactic')));
  assert.ok(sameEdition(p.properties,p.properties));assert.equal(sameEdition(p.properties,{...p.properties,data_cube_crval3_arr:'different'}),false);
});
test('FITS HPX: orientación de texela y píxel contra WCS Astropy real',async()=>{
  const f=JSON.parse(await fs.readFile('tests/fixtures/immersive/cube-header.json'));
  for(const p of f.orientation_samples){
    const sky=healpixTile(5,0,1-(p.y+.5)/512,(p.x+.5)/512);
    assert.ok(angle(sky.ra,p.ra)<1e-7);assert.ok(Math.abs(sky.dec-p.dec)<1e-7);
    const pixel=cubePixel(p.ra,p.dec);assert.equal(pixel.pixel,0);assert.ok(Math.abs(pixel.x-p.x)<=.51);assert.ok(Math.abs(pixel.y-p.y)<=.51);
  }
  const raw=await fs.readFile('tests/fixtures/immersive/header-0.bin'),buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
  const meta=cubeHeader(buffer,0);assert.equal(meta.offset,8640);assert.equal(meta.header.BUNIT,'MJy/sr');
  assert.throws(()=>cubeHeader(buffer,1),/compatible/);
});
test('HEALPix: cara y NEST contra 48 posiciones independientes Astropy',async()=>{
  const fixture=JSON.parse(await fs.readFile('tests/fixtures/immersive/healpix-astropy.json'));
  for(const p of fixture.samples){
    const actual=healpixFace(p.face,p.x,p.y);assert.ok(angle(actual.ra,p.ra)<1e-8);assert.ok(Math.abs(actual.dec-p.dec)<1e-8);
    assert.equal(skyPixel(p.ra,p.dec,0).pixel,p.face);
  }
  for(let order=0;order<=5;order++)for(let pixel=0;pixel<12*4**order;pixel+=Math.max(1,Math.floor(4**order/7))){
    const {ra,dec}=healpixTile(order,pixel,.5,.5);assert.equal(skyPixel(ra,dec,order).pixel,pixel);
  }
  assert.throws(()=>skyPixel(0,91,3));assert.throws(()=>healpixTile(5,999999,.5,.5));
});
