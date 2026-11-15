import './style.css';
import {createSky,parseProperties,tileGeometry,HIPS_URL,sameEdition} from './hips.js';
import {skyCoordinates,sphereHit} from './sky-math.js';
import {cubePixel} from './cube.js';
import {createControls} from './controls.js';
import {createXR} from './xr.js';
import {queryObservations} from './irsa.js';
import {initKernel} from '../science/wasm-bridge.js';
import {createDetail} from './detail.js';
import {createInspector} from './inspector.js';
const $=id=>document.getElementById(id),T=window.THREE;
if(window.self!==window.top){
  document.body.classList.add('embedded');
  document.querySelector('.hud details').append(document.querySelector('header nav'));
}
let renderer,scene,camera,player,sky,controls,xr,manifest,cubeWorker,cube,cubeMesh,detail,inspector;
let channel=62,aim={ra:60.8109955,dec:51.3404038},queryTarget={...aim};
let detailXR=false;
let loop=false,lastFrame=0,lastHud=0,disposed=false,cubeId=0,pendingCube=null,cubeTimer=0,channelTimer=0,queryController,refreshTimer=0,mosaicAvailable=null,cubeCompatible=true,freshMosaic=false;
const failedCubes=new Set(),raycaster=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3();
function wake(){if(renderer&&!loop&&!disposed){loop=true;renderer.setAnimationLoop(frame);}}
function pause(){renderer?.setAnimationLoop(null);loop=false;lastFrame=0;}
function clearCube(){cube=null;if(cubeMesh){scene.remove(cubeMesh);cubeMesh.geometry.dispose();cubeMesh.material.map.dispose();cubeMesh.material.dispose();cubeMesh=null;}}
function sample(point=aim){
  if(!cube||cube.channel!==channel)return null;
  const p=cubePixel(point.ra,point.dec);if(p.pixel!==cube.pixel)return null;
  const value=cube.pixels[p.y*512+p.x];return {...p,value:Number.isFinite(value)?value:null};
}
function epochText(){const d=detail?.sample(aim);if(d)return `Observación L2 UTC ${d.date}`;return cube&&sample()?`Mosaico UTC ${cube.primary['DATE-BEG']} → ${cube.primary['DATE-END']}`:'Mosaico multiepochas · la fecha depende de las observaciones combinadas';}
function textLines(){
  const d=detail?.sample(aim),s=d??sample(),wave=manifest?.wavelengths_um[channel];
  const shown=sky?.stats.displayChannel;
  return [`ICRS RA ${aim.ra.toFixed(5)}° · Dec ${aim.dec.toFixed(5)}°`,`Canal ${channel+1}/102 · λ ${wave?.toFixed(3)} µm${d?` · L2 real ${d.wavelength.toFixed(4)} µm`:''}${shown!=null&&shown!==channel?` · cargando, imagen canal ${shown+1}`:''}`,s?`Flujo ${s.value===null?'sin dato':s.value.toPrecision(6)} ${d?'MJy/sr · observación L2':cube.header.BUNIT}`:'Flujo pendiente: seleccionar / leer FITS',epochText(),'Vuelo visual · distancias físicas desconocidas','Gatillo selecciona · palancas vuelan / giro45°'];
}
function hud(){
  const lines=textLines();$('position').textContent=lines[0];$('wave').textContent=lines[1];$('flux').textContent=[50,51].includes(channel)?'Canal vacío por diseño instrumental':lines[2];$('epoch').textContent=lines[3];
  $('sky').dataset.ra=aim.ra.toFixed(5);$('sky').dataset.dec=aim.dec.toFixed(5);$('sky').dataset.travel=player.position.length().toFixed(2);
}
function frame(now){
  if(document.hidden||xr?.active&&!xr.visible){pause();return;}
  const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):0;lastFrame=now;
  const moving=controls.update(dt);xr.update(dt,now);player.updateMatrixWorld(true);
  camera.getWorldPosition(origin);camera.getWorldDirection(direction);
  const point=sphereHit(origin,direction);if(point)aim=skyCoordinates(point);
  if(detailXR!==xr.active){detailXR=xr.active;detail?.suspend(detailXR);$('detail-status').textContent=detailXR?'En VR se muestra el mosaico panorámico; el detalle L2 usa zoom en pantalla.':'Acércate a menos de 1.25° para cargar una observación original.';}
  if(!xr.active)detail?.update(aim,camera.fov,channel,manifest.wavelengths_um);
  $('sky').dataset.fov=camera.fov.toFixed(3);$('sky').dataset.detailLayer=detail?.state??'mosaic';
  if(cubeMesh)cubeMesh.visible=camera.fov<=8&&!xr.active&&sky?.stats.displayChannel===channel;
  sky?.update(xr.active?renderer.xr.getCamera(camera):camera,now,!moving&&!xr.active,$('sky').height);
  if(moving)$('sky').dataset.travel=player.position.length().toFixed(2);
  if(now-lastHud>150||!moving&&!xr.active){hud();lastHud=now;scheduleCube();}
  inspector?.update(camera,xr.active);inspector?.refresh();
  renderer.render(scene,camera);
  if(!moving&&!xr.active){pause();}
}
function pick(clientX,clientY){
  const r=$('sky').getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);
  selectRay(raycaster.ray.origin,raycaster.ray.direction);
}
function selectRay(from,vector){
  const point=sphereHit(from,vector);if(!point)return;
  clearTimeout(cubeTimer);cubeTimer=0;
  queryTarget=skyCoordinates(point);inspector.select(queryTarget);
  if(!detail?.sample(queryTarget))loadCube(queryTarget,true);refresh();
}
function scheduleCube(){
  if(inspector?.pending||!sky?.stats.ready||!cubeCompatible||[50,51].includes(channel))return;
  const p=cubePixel(aim.ra,aim.dec),key=`${channel}/${p.pixel}`;
  if(sample()||pendingCube===key||failedCubes.has(key))return;
  if(cubeTimer)return;
  const snapshot={...aim},current=channel;
  cubeTimer=setTimeout(()=>{cubeTimer=0;if(disposed||document.hidden||current!==channel||inspector?.pending)return;const now=cubePixel(aim.ra,aim.dec);if(now.pixel===p.pixel)loadCube(snapshot);else scheduleCube();},900);
}
function loadCube(point=aim,manual=false){
  if(!cubeCompatible){inspector?.error('Flujo no disponible: el mosaico nuevo requiere un cubo compatible.');$('status').textContent='El nuevo mosaico aún no tiene un cubo FITS asociado/verificado; flujo no disponible.';return;}
  if([50,51].includes(channel)){inspector?.error('Canal vacío por diseño instrumental.');return;}
  const p=cubePixel(point.ra,point.dec),key=`${channel}/${p.pixel}`;
  if(!manual&&(pendingCube===key||failedCubes.has(key)))return;
  pendingCube=key;const id=++cubeId;
  $('status').textContent='Leyendo plano IMAGE FITS por rangos (~1 MiB), en Worker/Rust…';
  cubeWorker.postMessage({id,pixel:p.pixel,channel});
}
function setChannel(value){
  inspector?.clear();
  detail?.reset();
  channel=Math.max(0,Math.min(101,value));cubeId++;pendingCube=null;failedCubes.clear();clearTimeout(cubeTimer);cubeTimer=0;clearCube();
  queryController?.abort();$('observations').replaceChildren();$('updates-title').textContent='Publicaciones IRSA';
  $('channel').value=channel;$('channel-label').textContent=`${channel+1}/102`;sky.setChannel(channel,{fresh:freshMosaic});hud();wake();
  $('read').disabled=[50,51].includes(channel);$('channel-preview').textContent=`D${Math.floor(channel/17)+1}, canal ${channel%17+1} · vista λ ${manifest.wavelengths_um[channel].toFixed(3)} µm${[50,51].includes(channel)?' · sin datos':''}`;
  refresh();
}
async function refresh(){
  if(!manifest||disposed||document.hidden)return;
  queryController?.abort();const controller=new AbortController();queryController=controller;
  const timeout=setTimeout(()=>controller.abort(),30000),point={...queryTarget},selectedChannel=channel;
  $('updates-status').textContent='Consultando publicaciones y versión del mosaico…';
  function checkMosaic(latest){
    if(disposed||queryController!==controller||document.hidden)return latest;
    const same=sameEdition(latest.properties,manifest.properties);
    sky.allowRemote(same);
    if(!same){mosaicAvailable=latest;$('apply-mosaic').hidden=false;$('updates-status').textContent='Nueva edición HiPS disponible; no se mezclarán teselas con la edición actual.';}
    return latest;
  }
  const results=await Promise.allSettled([
    fetch(`${HIPS_URL}/properties`,{cache:'no-cache',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error(`HiPS HTTP${r.status}`);return checkMosaic(parseProperties(await r.text()));}),
    queryObservations(point.ra,point.dec,selectedChannel,controller.signal)
  ]);
  clearTimeout(timeout);if(disposed||queryController!==controller||document.hidden||selectedChannel!==channel)return;
  const messages=[];
  if(results[0].status==='fulfilled'){
    const latest=results[0].value;
    if(!sameEdition(latest.properties,manifest.properties)){mosaicAvailable=latest;$('apply-mosaic').hidden=false;messages.push('Nuevo mosaico disponible; aplica cuando quieras cambiar la vista.');}
    else messages.push(`Mosaico ${latest.properties.hips_release_date}.`);
  }else messages.push('No se pudo comprobar la versión del mosaico.');
  if(results[1].status==='fulfilled'){
    const rows=results[1].value;$('observations').replaceChildren();
    rows.forEach(r=>{const article=document.createElement('article'),a=document.createElement('a');const mjd=Number(r.time_bounds_lower);const date=Number.isFinite(mjd)?new Date((mjd-40587)*86400000).toISOString():'Fecha no disponible';a.textContent=`${r.observationid} · ${r.collection} · ${date}`;a.href=`https://irsa.ipac.caltech.edu/${r.uri}`;a.target='_blank';a.rel='noopener';article.append(a);$('observations').append(article);});
    $('updates-title').textContent=`Publicaciones IRSA · ${rows.length}${rows.length===12?'+':''} resultados`;messages.push(`Consulta ICRS ${point.ra.toFixed(3)}, ${point.dec.toFixed(3)}, D${Math.floor(selectedChannel/17)+1}; ${rows.length===12?'límite12, consulta IRSA para más':''}`);
  }else messages.push('IRSA no respondió a la consulta de observaciones; no significa ausencia de cobertura.');
  $('updates-status').textContent=messages.join(' ');
}
function selectionReport(point=aim){
  const d=detail?.sample(point),s=sample(point);return {schema:'skyo-immersive-selection-1',created:new Date().toISOString(),icrs:{...point},pixel:s?{x:s.x,y:s.y,pixel:s.pixel}:null,channelIndex0:channel,wavelengthUm:d?.wavelength??manifest.wavelengths_um[channel],sourceKind:'NASA-DERIVED',mosaicProperties:manifest.properties,flux:d?.value??s?.value??null,units:d?'MJy/sr':s?cube.header.BUNIT:null,source:d?{...d,type:'L2-observation',spectralPolicy:'Only pixels inside selected channel interval; wavelength varies spatially',qualityPolicy:'FLAGS display mask'}:s?{url:cube.sourceUrl,byteRange:cube.range,planeSha256:cube.sha256,header:cube.header,primary:cube.primary,kernel:cube.kernel}:null,limitations:['Visualization sphere; no physical radial distances',d?'Single L2 observation, not mosaic epoch':'Mosaic, not single epoch','No validated photometry or calibrated detection'],scienceReady:false};
}
function exportSelection(){
  const report=selectionReport();
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='skyo-seleccion-inmersiva.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function start(){
  try{
    const r=await fetch(new URL('datasets/immersive-sky/manifest.json',location.href));if(!r.ok)throw Error(`Manifiesto HTTP${r.status}`);manifest=await r.json();
    if(manifest.schema!=='skyo-immersive-hips-1'||manifest.source_url!==HIPS_URL||manifest.wavelengths_um.length!==102||manifest.items.length!==12||new Set(manifest.items.map(i=>i.pixel)).size!==12||!manifest.items.every(i=>Number.isInteger(i.pixel)&&i.pixel>=0&&i.pixel<12&&/^Npix\d+_62\.png$/.test(i.file)&&/^[a-f0-9]{64}$/.test(i.sha256)))throw Error('Panorama curado incompatible');
    renderer=new T.WebGLRenderer({canvas:$('sky'),antialias:false,powerPreference:'high-performance'});renderer.setClearColor(0x02040a);
    scene=new T.Scene();player=new T.Group();scene.add(player);camera=new T.PerspectiveCamera(70,1,.1,2200);player.add(camera);
    inspector=createInspector(T,{getReport:selectionReport,wake});
    detail=createDetail(T,scene,{wake,onStatus:text=>{$('detail-status').textContent=text;}});
    xr=createXR(T,renderer,scene,camera,player,{onSelect:selectRay,onChannel:delta=>setChannel(channel+delta),onRead:()=>loadCube(aim,true),onReset:()=>controls.reset(),onStatus:text=>{$('xr-status').textContent=text;},getText:textLines,wake});
    controls=createControls(T,$('sky'),camera,player,{onSelect:pick,onChange:wake,isXR:()=>xr.active});
    sky=createSky(T,scene,{manifest,onStatus:s=>{
      $('sky').dataset.ready=String(s.ready);$('sky').dataset.channel=String(s.channel);
      $('sky').dataset.lod=String(s.order);$('sky').dataset.detailReady=String(s.detailReady);$('sky').dataset.detailWanted=String(s.detailWanted);$('sky').dataset.spatialKernel=s.engine;$('sky').dataset.displayChannel=String(s.displayChannel??'');
      $('sky').dataset.tiles=String(s.tiles);
      if(!cubeCompatible&&$('status').textContent.includes('cubo FITS asociado/verificado'))return;
      $('status').textContent=[50,51].includes(channel)?'Sin datos en este canal instrumental':`${s.ready}/12 base · detalle ${s.detailReady}/${s.detailWanted} (orden ${s.order}) · ${s.failures?'fallo de tesela: reintenta':s.remoteBlocked?'esperando verificar edición HiPS':'SPHEREx'} · ${s.pending} pendientes`;wake();
    }});
    initKernel().then(()=>wake());
    cubeWorker=new Worker(new URL('./cube-worker.js',import.meta.url),{type:'module'});
    cubeWorker.onmessage=({data:r})=>{
      if(r.id!==cubeId||disposed)return;
      const key=pendingCube;pendingCube=null;
      if(r.error){inspector?.error(`No se pudo leer este punto: ${r.error}`);if(key)failedCubes.add(key);$('status').textContent=`Flujo no disponible: ${r.error}. Puedes reintentar.`;wake();return;}
      clearCube();cube=r;inspector?.refresh();const tex=new T.DataTexture(r.rgba,512,512,T.RGBAFormat,T.UnsignedByteType);tex.flipY=false;tex.minFilter=T.LinearFilter;tex.magFilter=T.LinearFilter;tex.generateMipmaps=false;tex.needsUpdate=true;
      cubeMesh=new T.Mesh(tileGeometry(T,5,r.pixel,1000),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,transparent:true,depthWrite:false}));cubeMesh.renderOrder=10;scene.add(cubeMesh);
      $('status').textContent=`Plano FITS real · ${r.cacheHit?'caché del kernel Rust':'Rust/WASM'} ${r.processingMs.toFixed(1)} ms · sin máscara científica`;
      $('fits-source').href=r.sourceUrl;$('fits-source').hidden=false;$('provenance').textContent=`IMAGE canal${r.channel} · bytes ${r.range.join('–')} · SHA256 ${r.sha256}`;wake();
    };
    cubeWorker.onerror=()=>{inspector?.error('Worker FITS no disponible; vuelve a seleccionar para reintentar.');pendingCube=null;failedCubes.add(`${channel}/${cubePixel(aim.ra,aim.dec).pixel}`);$('status').textContent='Worker FITS no disponible; el cielo sigue navegable.';};
    const resize=()=>{const max=renderer.getContext().getParameter(renderer.getContext().MAX_RENDERBUFFER_SIZE);renderer.setPixelRatio(Math.min(devicePixelRatio,max/innerWidth,max/innerHeight));renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();wake();};window.addEventListener('resize',resize);resize();
    const support=await xr.check();$('vr').disabled=!support.supported;$('vr').textContent=support.supported?'Entrar en VR':'VR no disponible';$('xr-status').textContent=support.message;
    $('channel').value=channel;hud();refresh();refreshTimer=setInterval(refresh,10*60*1000);
  }catch(error){$('status').textContent=`No se pudo abrir el cielo: ${error.message}. Reintenta o abre el laboratorio.`;}
}
$('inspect').onclick=()=>{if(!camera||!inspector)return;camera.getWorldPosition(origin);camera.getWorldDirection(direction);selectRay(origin,direction);};
$('sky').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('inspect').click();}if(e.key==='Escape')inspector?.clear();});
$('channel').oninput=()=>{$('channel-preview').textContent=`Seleccionar canal ${Number($('channel').value)+1} · λ ${manifest?.wavelengths_um[Number($('channel').value)]?.toFixed(3)} µm; suelta para aplicar.`;};
$('channel').onchange=()=>{clearTimeout(channelTimer);const value=Number($('channel').value);channelTimer=setTimeout(()=>setChannel(value),150);};
$('previous').onclick=()=>setChannel(channel-1);$('next').onclick=()=>setChannel(channel+1);$('retry').onclick=()=>{detail?.reset();failedCubes.clear();sky?.setChannel(channel,{fresh:freshMosaic});wake();};
$('read').onclick=()=>{if(inspector?.pending)inspector.error('Consulta del punto sustituida por la lectura bajo la retícula. Vuelve a seleccionar para reintentar.');loadCube(aim,true);};$('origin').onclick=()=>{inspector?.clear();detail?.reset();controls?.reset();};$('mouse').onclick=()=>controls?.lock();$('vr').onclick=()=>xr?.enter();$('export').onclick=exportSelection;$('refresh').onclick=refresh;
$('gyro').onclick=async()=>{$('gyro').disabled=true;try{const enabled=await controls.toggleOrientation();$('gyro').setAttribute('aria-pressed',String(enabled));$('gyro').textContent=enabled?'Desactivar giroscopio':'Activar giroscopio';}catch(error){$('xr-status').textContent=error.message;}finally{$('gyro').disabled=false;}};
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('fly').addEventListener(name,()=>{controls?.fly(false);$('fly').setAttribute('aria-pressed','false');});
$('fly').onpointerdown=e=>{$('fly').setPointerCapture(e.pointerId);controls?.fly(true);$('fly').setAttribute('aria-pressed','true');};
$('fly').onkeydown=e=>{if(e.key===' '||e.key==='Enter')controls?.fly(true);};$('fly').onkeyup=()=>controls?.fly(false);
$('apply-mosaic').onclick=()=>{if(!mosaicAvailable)return;detail?.reset();inspector?.clear();cubeCompatible=false;freshMosaic=true;manifest.properties=mosaicAvailable.properties;manifest.wavelengths_um=mosaicAvailable.wavelengths;mosaicAvailable=null;clearCube();cubeId++;pendingCube=null;sky.allowRemote(true);sky.setChannel(channel,{fresh:true});$('apply-mosaic').hidden=true;$('updates-status').textContent='Nuevo panorama aplicado. Flujo deshabilitado hasta verificar el cubo FITS de esta edición.';hud();wake();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){detail?.suspend(true);pause();queryController?.abort();clearTimeout(cubeTimer);cubeTimer=0;}else{detail?.suspend(false);wake();refresh();}});
window.addEventListener('pagehide',()=>{disposed=true;pause();clearInterval(refreshTimer);clearTimeout(cubeTimer);clearTimeout(channelTimer);queryController?.abort();cubeWorker?.terminate();detail?.dispose();controls?.dispose();xr?.dispose();sky?.dispose();clearCube();renderer?.dispose();});
start();
