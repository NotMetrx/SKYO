import {mountFitsInspector} from './fits-inspector.js';
import {coveragePaths} from './science/archive-data.js';
import {cutoutUrl} from './immersive/detail-data.js';
const $=id=>document.getElementById(id);
const T=window.THREE;
const ranges=['0.75–1.11','1.11–1.64','1.64–2.41','2.42–3.15','3.15–4.10','4.10–5.01'];
const slots=Array.from({length:6},(_,i)=>({detector:i+1,token:0}));
const jobs=new Map();let nextId=0,worker,renderer,scene,camera;
const inspector=mountFitsInspector((message,transfer=[])=>{if(!worker)startWorker();const id=++nextId;worker.postMessage({...message,id},transfer);return id;});
let manualVersion=0;
function openInspector(meta,bytes){manualVersion++;inspector.open(meta,bytes);}
const meshes=[],badges=[];
const pose={yaw:0,pitch:0.08,distance:9,x:0,y:0};
let pendingFrame=0;
function draw(){
  pendingFrame=0;
  if(document.hidden || !renderer)return;
  camera.position.set(pose.x+pose.distance*Math.sin(pose.yaw)*Math.cos(pose.pitch),pose.y+pose.distance*Math.sin(pose.pitch),pose.distance*Math.cos(pose.yaw)*Math.cos(pose.pitch));
  camera.lookAt(pose.x,pose.y,0);
  renderer.render(scene,camera);
  const {width,height}=renderer.domElement.getBoundingClientRect();
  meshes.forEach((mesh,i)=>{
    badges[i].textContent=width<500?`D${i+1}`:`D${i+1} · ${ranges[i]} µm`;
    const p=mesh.position.clone();p.y+=1.05;p.project(camera);
    badges[i].style.left=`${(p.x+1)*width/2}px`;badges[i].style.top=`${(1-p.y)*height/2}px`;
    badges[i].hidden=p.z>1 || p.z< -1;
  });
}
function invalidate(){if(!pendingFrame && !document.hidden)pendingFrame=requestAnimationFrame(draw);}
function reset(){const r=$('viewport').getBoundingClientRect();Object.assign(pose,{yaw:0,pitch:0.08,distance:Math.max(4.5,6.7/(r.width/r.height))/(2*Math.tan(Math.PI/8))*1.08,x:0,y:0});invalidate();}
function zoom(factor){pose.distance=Math.max(2,Math.min(30,pose.distance*factor));invalidate();}
function move(dx,dy,pan){
  if(pan){pose.x-=dx*pose.distance/700;pose.y+=dy*pose.distance/700;}
  else{pose.yaw-=dx*.006;pose.pitch=Math.max(-1.45,Math.min(1.45,pose.pitch+dy*.006));}
  invalidate();
}
function cameraControls(canvas){
  const pointers=new Map();
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
  canvas.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old)return;
    const next={x:e.clientX,y:e.clientY};
    if(pointers.size===2){
      const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];
      const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(next.x-other.x,next.y-other.y);
      if(after>0)zoom(before/after);
      move((next.x-old.x)/2,(next.y-old.y)/2,true);
    }else move(next.x-old.x,next.y-old.y,e.shiftKey || e.buttons===2);
    pointers.set(e.pointerId,next);
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>pointers.delete(e.pointerId));
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-.5,Math.min(.5,e.deltaY*.001))));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    const d={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
    if(d){e.preventDefault();move(...d,e.shiftKey);}
    else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')reset();else zoom(e.key==='-'?1.15:1/1.15);}
  });
}
function summary(){
  const count=slots.filter(s=>s.loaded).length;
  $('status').textContent=`${count}/6 detectores visibles · ${slots.filter(s=>s.loading).length} cargando · ${slots.filter(s=>s.error).length} con error. Procesamiento Rust/WASM; texturas reutilizadas al mover cámara.`;
  $('fpa').dataset.loaded=String(count);
}
function provenance(slot){
  const el=slot.element;el.replaceChildren();
  const button=document.createElement('button');button.textContent=`D${slot.detector} · ${ranges[slot.detector-1]} µm`;
  button.onclick=()=>{const m=meshes[slot.detector-1];Object.assign(pose,{x:m.position.x,y:m.position.y,yaw:0,pitch:0,distance:3.7});invalidate();};el.append(button);
  const text=document.createElement('p');
  text.textContent=slot.loading?'Cargando FITS…':slot.error || (slot.loaded?`${slot.meta.sourceKind} · ${slot.meta.release || 'archivo local'} · ${slot.meta.observation_id || slot.meta.file || ''}\n${slot.meta.observation_utc || ''}\n${slot.width}×${slot.height} · ${slot.processingMs.toFixed(1)} ms FITS→RGBA\n${slot.meta.units || ''}\n${slot.meta.transform || 'IMAGE completa a resolución original, sin máscara de calidad'}`:'Sin imagen');
  text.style.whiteSpace='pre-line';el.append(text);
  if(slot.loaded){
    const inspect=document.createElement('button');inspect.textContent=`Inspeccionar D${slot.detector}`;inspect.onclick=()=>openInspector(slot.meta);el.append(inspect);
    const hash=document.createElement('details'),label=document.createElement('summary'),value=document.createElement('p');
    label.textContent='Integridad y motor';value.textContent=`SHA256 ${slot.sha256}\n${slot.kernel}\nLímites de contraste: ${slot.low} / ${slot.high}`;hash.append(label,value);el.append(hash);
    if(slot.meta.source_url){const link=document.createElement('a');link.href=slot.meta.source_url;link.target='_blank';link.rel='noopener';link.textContent='FITS original IRSA ↗';el.append(link);}
    if(slot.meta.sourceKind==='NASA-DERIVED' && slot.meta.cloud_url){
      const full=document.createElement('button');full.textContent=`Ver resolución original (~${Math.ceil(slot.meta.original_bytes/1e6)} MB)`;
      full.onclick=()=>load({...slot.meta,sourceKind:'NASA-ORIGINAL',url:slot.meta.cloud_url,sha256:slot.meta.original_sha256,transform:'IMAGE completa a resolución original, sin máscara de calidad'});el.append(document.createElement('br'),full);
    }
  }
}
function startWorker(){
  worker?.terminate();jobs.clear();
  worker=new Worker(new URL('./science/fpa-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data:r})=>{
    if(r.event==='inspected'||r.event==='inspector-error'){inspector.receive(r);return;}
    const job=jobs.get(r.id);jobs.delete(r.id);if(!job)return;
    const slot=slots[job.detector-1];if(slot.token!==r.id)return;
    slot.loading=false;
    if(r.error){slot.error=r.error;}
    else{
      const texture=new T.DataTexture(r.rgba,r.width,r.height,T.RGBAFormat,T.UnsignedByteType);
      texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
      const mesh=meshes[job.detector-1];mesh.material.map?.dispose();mesh.material.map=texture;mesh.material.color.setHex(0xffffff);mesh.material.needsUpdate=true;
      mesh.scale.x=r.width/r.height;Object.assign(slot,r,{loaded:true,error:null,meta:job.meta});
    }
    provenance(slot);summary();invalidate();
  };
  worker.onerror=()=>{inspector.error('El lector FITS dejó de responder. Recarga el conjunto y vuelve a abrir la imagen.');for(const s of slots.filter(s=>s.loading)){s.loading=false;s.error='Worker indisponible. Recarga el conjunto para reintentar.';provenance(s);}summary();};
}
function load(meta,bytes){
  const detector=meta.detector;
  if(!Number.isInteger(detector)||detector<1||detector>6)throw Error('Detector inválido');
  const slot=slots[detector-1],id=++nextId;
  jobs.delete(slot.token);
  // Remove the old texture while loading so provenance cannot describe an earlier image.
  const mesh=meshes[detector-1];mesh.material.map?.dispose();mesh.material.map=null;mesh.material.color.setHex(0x182638);mesh.material.needsUpdate=true;
  Object.assign(slot,{token:id,loading:true,loaded:false,error:null,request:meta});provenance(slot);summary();invalidate();
  jobs.set(id,{detector,meta});
  worker.postMessage({id,detector,url:meta.url,sha256:meta.sha256,zscale:$('stretch').value==='zscale',bytes},bytes?[bytes]:[]);
}
let curatedGeneration=0;
async function curated(){
  const generation=++curatedGeneration;
  startWorker();
  for(const slot of slots){slot.loading=false;slot.token=++nextId;}
  try{
    const response=await fetch(new URL('datasets/fpa-dr1/manifest.json',location.href));if(!response.ok)throw Error(`Manifiesto HTTP ${response.status}`);
    const manifest=await response.json();
    if(generation!==curatedGeneration)return;
    if(manifest.schema!=='skyo-fpa-display-1'||manifest.items.length!==6||new Set(manifest.items.map(m=>m.detector)).size!==6)throw Error('Manifiesto FPA incompatible');
    for(const meta of manifest.items){
      if(!/^D[1-6]\.fits$/.test(meta.file)||meta.file!==`D${meta.detector}.fits`||! /^[a-f0-9]{64}$/.test(meta.sha256)||! /^[a-f0-9]{64}$/.test(meta.original_sha256)||meta.sourceKind!=='NASA-DERIVED'||!meta.source_url?.startsWith('https://irsa.ipac.caltech.edu/ibe/data/spherex/dr1/')||!meta.cloud_url?.startsWith('https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com/dr1/'))throw Error('Procedencia curada inválida');
      load({...meta,url:new URL(`datasets/fpa-dr1/${meta.file}`,location.href).href});
    }
  }catch(error){if(generation===curatedGeneration)$('status').textContent=error.message;}
}
let searchController;
function showResults(rows,center){
  const ns='http://www.w3.org/2000/svg',map=$('coverage-map'),coverage=coveragePaths(rows,center),paths=[];
  map.replaceChildren();$('archive-coverage').hidden=!rows.length;
  const table=document.createElement('table'),caption=document.createElement('caption'),head=document.createElement('thead'),body=document.createElement('tbody');
  caption.textContent='Observaciones encontradas';table.append(caption,head,body);
  const header=document.createElement('tr');for(const name of ['Detector','Observación · MJD','Imagen']){const th=document.createElement('th');th.scope='col';th.textContent=name;header.append(th);}head.append(header);
  function select(index){
    [...body.rows].forEach((row,i)=>{row.setAttribute('aria-selected',String(index===i));paths[i]?.classList.toggle('selected',index===i);});
    const r=rows[index],source_url=`https://irsa.ipac.caltech.edu/${r.uri}`;
    openInspector({detector:r.detector,observation_id:r.observationid,release:r.collection,sourceKind:'NASA-ORIGINAL',source_url,url:cutoutUrl(r.uri,center.ra,center.dec),transform:'Recorte IBE de 0.25° del FITS original; sin fotometría validada'});
  }
  rows.forEach((r,index)=>{
    const row=document.createElement('tr'),detector=document.createElement('td'),observation=document.createElement('td'),action=document.createElement('td'),button=document.createElement('button');
    row.setAttribute('aria-selected','false');detector.textContent=`D${r.detector}`;observation.textContent=`${r.observationid} · ${r.time_bounds_lower||'fecha no disponible'}`;
    button.textContent='Ver imagen';button.setAttribute('aria-label',`Ver imagen D${r.detector}: ${r.observationid}`);button.onclick=()=>select(index);action.append(button);row.append(detector,observation,action);body.append(row);
    if(coverage.paths[index]){
      const path=document.createElementNS(ns,'path');path.setAttribute('d',coverage.paths[index]);path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',`Ver huella D${r.detector}: ${r.observationid}`);
      path.onclick=()=>select(index);path.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(index);}};map.append(path);paths[index]=path;
    }
  });
  const target=document.createElementNS(ns,'circle');target.setAttribute('cx',coverage.target.x);target.setAttribute('cy',coverage.target.y);target.setAttribute('r','3');target.classList.add('search-target');map.append(target);
  $('coverage-status').textContent=`${paths.filter(Boolean).length}/${rows.length} huellas disponibles · norte arriba, este a la izquierda. El punto marca tu búsqueda. Las huellas ausentes no se estiman.`;
  $('results').replaceChildren(table);
}
$('search').onsubmit=async e=>{
  e.preventDefault();searchController?.abort();const controller=new AbortController();searchController=controller;
  const ra=Number($('ra').value),dec=Number($('dec').value);
  if(!Number.isFinite(ra)||ra<0||ra>=360||!Number.isFinite(dec)||Math.abs(dec)>90)return;
  const query=`SELECT TOP 60 ar.uri,o.observationid,o.collection,p.energy_bandpassname,p.time_bounds_lower,p.provenance_version,p.poly AS footprint FROM spherex.artifact ar JOIN spherex.plane p ON ar.planeid=p.planeid JOIN spherex.observation o ON o.obsid=p.obsid WHERE 1=CONTAINS(POINT('ICRS',${ra},${dec}),p.poly) AND o.collection IN ('spherex_dr1','spherex_qr3') ORDER BY p.time_bounds_lower DESC`;
  const url=new URL('https://irsa.ipac.caltech.edu/TAP/sync');url.search=new URLSearchParams({REQUEST:'doQuery',LANG:'ADQL',FORMAT:'votable',QUERY:query});
  $('results').replaceChildren();$('archive-coverage').hidden=true;$('search-status').textContent='Consultando IRSA…';$('cancel-search').hidden=false;
  const timeout=setTimeout(()=>controller.abort('Tiempo de espera agotado'),30000);
  try{
    const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error(`IRSA HTTP ${response.status}`);
    const text=await response.text();if(text.length>2_000_000)throw Error('Respuesta IRSA demasiado grande');
    const xml=new DOMParser().parseFromString(text,'application/xml');
    if(xml.querySelector('parsererror')||[...xml.querySelectorAll('INFO')].some(n=>n.getAttribute('name')==='QUERY_STATUS' && n.getAttribute('value')==='ERROR'))throw Error('IRSA devolvió un error de consulta');
    const fields=[...xml.querySelectorAll('FIELD')].map(n=>n.getAttribute('name'));
    if(!['uri','observationid','collection','energy_bandpassname'].every(f=>fields.includes(f)))throw Error('Respuesta IRSA incompatible');
    const rows=[...xml.querySelectorAll('TABLEDATA TR')].slice(0,60),results=[];
    if(searchController!==controller)return;
    if(controller.signal.aborted)throw Error('Búsqueda cancelada');
    for(const row of rows){
      const values=[...row.querySelectorAll('TD')].map(n=>n.textContent),r=Object.fromEntries(fields.map((key,i)=>[key,values[i]]));
      if(!/^ibe\/data\/spherex\/(dr1|qr3)\/level2\/[\w./-]+\.fits$/.test(r.uri)||r.uri.includes('..'))continue;
      const detector=Number(/^SPHEREx-D([1-6])$/.exec(r.energy_bandpassname)?.[1]);if(!detector)continue;
      results.push({...r,detector});
    }
    showResults(results,{ra,dec});
    const overflow=[...xml.querySelectorAll('INFO')].some(n=>n.getAttribute('name')==='QUERY_STATUS'&&n.getAttribute('value')==='OVERFLOW');
    $('search-status').textContent=`${results.length} resultados${rows.length===60||overflow?' · límite alcanzado; consulta el archivo IRSA para más resultados':''}. Elige una imagen o su huella para inspeccionarla.`;
  }catch(error){if(searchController===controller)$('search-status').textContent=controller.signal.aborted?'Búsqueda cancelada o tiempo agotado. Puedes reintentar.':`${error.message}. Reintenta o abre IRSA.`;}
  finally{clearTimeout(timeout);if(searchController===controller)$('cancel-search').hidden=true;}
};
$('cancel-search').onclick=()=>searchController?.abort();
$('stretch').onchange=()=>{for(const slot of slots){if(slot.request?.url)load(slot.request);}};
$('reset').onclick=reset;$('retry').onclick=curated;
$('inspect-local').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  const version=++manualVersion;
  if(file.size>96_000_000){$('status').textContent='FITS supera 96 MB; utiliza un recorte.';return;}
  try{const bytes=await file.arrayBuffer();if(version!==manualVersion)return;openInspector({file:file.name,sourceKind:'USER-LOCAL'},bytes);}catch(error){if(version===manualVersion)$('status').textContent=error.message;}
  e.target.value='';
};
document.addEventListener('visibilitychange',invalidate);
try{
  renderer=new T.WebGLRenderer({canvas:$('fpa'),antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  scene=new T.Scene();camera=new T.PerspectiveCamera(45,1,.1,100);
  slots.forEach((slot,i)=>{
    const mesh=new T.Mesh(new T.PlaneGeometry(1.9,1.9),new T.MeshBasicMaterial({color:0x182638,side:T.DoubleSide,transparent:true}));
    mesh.position.set((i%3-1)*2.25,i<3?1.18:-1.18,0);meshes.push(mesh);scene.add(mesh);
    const outline=new T.LineSegments(new T.EdgesGeometry(mesh.geometry),new T.LineBasicMaterial({color:0x7cc8ff}));outline.position.copy(mesh.position);outline.position.z=.002;scene.add(outline);
    const badge=document.createElement('span');badge.textContent=`D${i+1} · ${ranges[i]} µm`;$('labels').append(badge);badges.push(badge);
    slot.element=document.createElement('li');$('detectors').append(slot.element);provenance(slot);
  });
  new ResizeObserver(()=>{const rect=$('viewport').getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();invalidate();}).observe($('viewport'));
  cameraControls($('fpa'));reset();curated();
}catch(error){$('status').textContent=`WebGL no disponible: ${error.message}. Los originales están accesibles en IRSA.`;}
window.addEventListener('pagehide',()=>{worker?.terminate();searchController?.abort();cancelAnimationFrame(pendingFrame);meshes.forEach(m=>{m.material.map?.dispose();m.material.dispose();m.geometry.dispose();});renderer?.dispose();});
