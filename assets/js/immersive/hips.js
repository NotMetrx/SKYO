import {healpixTile,skyDirection,skyPixel} from './sky-math.js';
import {sha256} from '../science/contracts.js';
import {planSky,skyVertices,kernelStatus} from '../science/wasm-bridge.js';
export const HIPS_URL='https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube';
export function sameEdition(a,b){return ['hips_release_date','hips_frame','hips_order','hips_tile_width','data_cube_crval3_arr'].every(key=>a[key]===b[key]);}
export function parseProperties(text){
  const p=Object.fromEntries(text.split(/\r?\n/).filter(s=>s.trim()&&!s.trim().startsWith('#')&&s.includes('=')).map(s=>{const at=s.indexOf('=');return [s.slice(0,at).trim(),s.slice(at+1).trim()];}));
  const waves=(p.data_cube_crval3_arr||'').split(/\s+/).map(Number);
  if(p.hips_frame!=='equatorial'||Number(p.hips_cube_depth)!==102||!Number.isInteger(Number(p.hips_order))||Number(p.hips_order)<0||Number(p.hips_order)>5||Number(p.hips_tile_width)!==512||waves.length!==102||!waves.every(v=>Number.isFinite(v)&&v>0))throw Error('Metadatos HiPS incompatibles');
  return {properties:p,wavelengths:waves,blank:[50,51]};
}
export function tileUrl(order,pixel,channel){
  if(!Number.isInteger(channel)||channel<0||channel>101||!Number.isInteger(order)||order<0||order>5||!Number.isInteger(pixel)||pixel<0||pixel>=12*4**order)throw Error('Tesela/canal inválidos');
  return `${HIPS_URL}/Norder${order}/Dir${Math.floor(pixel/10000)*10000}/Npix${pixel}/Npix${pixel}${channel?`_${channel}`:''}.png`;
}
export function tileGeometry(T,order,pixel,radius=1000){
  const steps=order===0?24:8,positions=[],uv=[],indices=[];
  const vertices=skyVertices(order,pixel,steps,radius);
  for(let j=0;j<=steps;j++)for(let i=0;i<=steps;i++){
    const u=i/steps,v=j/steps;
    if(!vertices){const {ra,dec}=healpixTile(order,pixel,1-v,u);positions.push(...skyDirection(ra,dec,radius));}uv.push(u,v);
  }
  for(let j=0;j<steps;j++)for(let i=0;i<steps;i++){const a=j*(steps+1)+i,b=a+steps+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(vertices||new Float32Array(positions),3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingSphere();return g;
}
export function viewTiles(T,camera,height,maxOrder=5){
  camera.updateMatrixWorld();const matrix=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  const fov=2*Math.atan(1/camera.projectionMatrix.elements[5])*180/Math.PI;
  const origin=camera.getWorldPosition(new T.Vector3()),native=planSky(matrix.elements,height,fov,maxOrder,origin.toArray());
  if(native?.length){const tiles=[];for(let i=1;i<native.length;i+=2)tiles.push({order:native[i],pixel:native[i+1]});return {order:native[0],tiles,engine:'Rust/WASM'};}
  let order=0;const tiles=[],demand=height*58.632301/(512*fov),nearest=1000-origin.length(),frustum=new T.Frustum().setFromProjectionMatrix(matrix),sphere=new T.Sphere(new T.Vector3());
  function visit(level,pixel){
    const {ra,dec}=healpixTile(level,pixel,.5,.5);sphere.center.fromArray(skyDirection(ra,dec,1000));sphere.radius=level===0?901:1100/2**level+1;
    if(!frustum.intersectsSphere(sphere))return;
    tiles.push({order:level,pixel});order=Math.max(order,level);
    const distance=Math.max(nearest,sphere.center.distanceTo(origin)-sphere.radius);
    if(level<maxOrder&&2**level<demand*1000/distance)for(let i=0;i<4;i++)visit(level+1,pixel*4+i);
  }
  for(let i=0;i<12;i++)visit(0,i);return {order,tiles,engine:'JavaScript (fallback)'};
}
export function createSky(T,scene,{manifest,onStatus}){
  const group=new T.Group();scene.add(group);
  let channel=manifest.channel,displayChannel=null,active=0,disposed=false,remote=false,remoteAllowed=false,last=0,signature='',order=0,engine='JavaScript (fallback)';
  const tiles=new Map(),queue=[],requests=new Set();let wanted=new Set();
  const key=(c,o,p)=>`${c}/${o}/${p}`;
  const baseReady=c=>manifest.items.reduce((n,i)=>n+Number(tiles.get(key(c,0,i.pixel))?.loaded===true),0);
  const stats=()=>({channel,displayChannel,ready:baseReady(channel),failures:[...tiles.values()].filter(t=>t.channel===channel&&t.error).length,pending:queue.filter(t=>t.channel===channel).length+[...requests].filter(t=>t.channel===channel).length,tiles:tiles.size,remoteBlocked:!remoteAllowed,order,engine,detailWanted:wanted.size,detailReady:[...wanted].filter(k=>tiles.get(k)?.loaded).length});
  const report=()=>onStatus?.(stats());
  function remove(tile){
    tile.controller?.abort();
    if(tile.mesh){group.remove(tile.mesh);tile.mesh.geometry.dispose();tile.mesh.material.map.image.close?.();tile.mesh.material.map.dispose();tile.mesh.material.dispose();}
    tiles.delete(tile.key);
  }
  function show(){
    if(![50,51].includes(channel)&&baseReady(channel)===12)displayChannel=channel;
    if([50,51].includes(channel))displayChannel=null;
    for(const tile of tiles.values())if(tile.mesh)tile.mesh.visible=tile.channel===displayChannel&&(tile.order===0||tile.channel!==channel||wanted.has(tile.key));
  }
  function trim(){
    const channels=new Set([channel,displayChannel]);for(let d=-2;d<=2;d++)if(channel+d>=0&&channel+d<=101)channels.add(channel+d);
    for(const t of [...tiles.values()])if(!channels.has(t.channel))remove(t);
    // Keep the complete visible footprint; evict cached detail before a visible tile.
    for(const t of [...tiles.values()].filter(t=>t.order>0&&!wanted.has(t.key)&&!(displayChannel!==channel&&t.channel===displayChannel)).sort((a,b)=>a.used-b.used)){
      if(tiles.size<=256)break;remove(t);
    }
  }
  function request(c,o,p){
    const k=key(c,o,p);if(tiles.has(k)){tiles.get(k).used=performance.now();return;}
    const local=o===0&&c===manifest.channel&&!remote?manifest.items.find(i=>i.pixel===p):null;
    if(!local&&!remoteAllowed)return;
    const tile={key:k,channel:c,order:o,pixel:p,used:performance.now(),url:local?new URL(`datasets/immersive-sky/${local.file}`,location.href).href:tileUrl(o,p,c),hash:local?.sha256};
    tiles.set(k,tile);queue.push(tile);
  }
  function prefetch(){
    if(!remoteAllowed||[50,51].includes(channel)||baseReady(channel)!==12||[...wanted].some(k=>!tiles.get(k)?.loaded)||[...requests].some(t=>t.channel===channel))return;
    for(const d of [1,-1,2,-2]){const c=channel+d;if(c>=0&&c<=101&&![50,51].includes(c))for(let p=0;p<12;p++)request(c,0,p);}
  }
  async function load(tile){
    const controller=new AbortController();tile.controller=controller;requests.add(tile);
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(tile.url,{signal:controller.signal});if(!response.ok)throw Error(`HiPS HTTP ${response.status}`);
      if(Number(response.headers.get('Content-Length'))>1_000_000)throw Error('Tesela excesiva');
      const bytes=await response.arrayBuffer();if(bytes.byteLength>1_000_000)throw Error('Tesela excesiva');
      if(tile.hash&&await sha256(bytes)!==tile.hash)throw Error('Hash HiPS incorrecto');
      const bitmap=await createImageBitmap(new Blob([bytes]),{imageOrientation:'flipY'});
      if(disposed||controller.signal.aborted||tiles.get(tile.key)!==tile){bitmap.close();return;}
      if(bitmap.width!==512||bitmap.height!==512){bitmap.close();throw Error('Dimensiones HiPS incompatibles');}
      const map=new T.Texture(bitmap);map.flipY=false;map.minFilter=T.LinearFilter;map.magFilter=T.LinearFilter;map.generateMipmaps=false;map.needsUpdate=true;
      tile.mesh=new T.Mesh(tileGeometry(T,tile.order,tile.pixel,1000),new T.MeshBasicMaterial({map,side:T.DoubleSide,transparent:true,depthWrite:false}));
      tile.mesh.renderOrder=tile.order;tile.loaded=true;group.add(tile.mesh);show();trim();
    }catch(error){if(tiles.get(tile.key)===tile){if(controller.signal.aborted)tiles.delete(tile.key);else tile.error=error.message;}}
    finally{clearTimeout(timeout);requests.delete(tile);active--;report();pump();}
  }
  function pump(){
    if(disposed)return;prefetch();
    queue.sort((a,b)=>(a.channel===channel?0:2)-(b.channel===channel?0:2)||a.order-b.order);
    while(active<4&&queue.length){const t=queue.shift();if(tiles.get(t.key)!==t)continue;active++;load(t);}
    report();
  }
  function setChannel(value,{fresh=false}={}){
    if(!Number.isInteger(value)||value<0||value>101)throw Error('Canal inválido');
    if(fresh!==remote){for(const t of [...tiles.values()])remove(t);displayChannel=null;}
    channel=value;remote=fresh;wanted=new Set();signature='';
    for(const t of [...tiles.values()])if(!t.loaded&&(t.channel!==channel||t.error))remove(t);
    if(![50,51].includes(channel))for(let p=0;p<12;p++)request(channel,0,p);
    show();trim();pump();
  }
  function update(camera,now,force=false,height=innerHeight*devicePixelRatio){
    if((!force&&now-last<160)||[50,51].includes(channel))return;last=now;
    camera.updateMatrixWorld();
    const next=[channel,height,kernelStatus(),...camera.projectionMatrix.elements,...camera.matrixWorld.elements].join('/');if(next===signature)return;signature=next;
    const plan=viewTiles(T,camera,height,Number(manifest.properties.hips_order));order=plan.order;engine=plan.engine;
    wanted=new Set();
    for(const t of plan.tiles)if(t.order>0)wanted.add(key(channel,t.order,t.pixel));
    for(const t of [...tiles.values()])if(!t.loaded&&t.order>0&&!wanted.has(t.key))remove(t);
    for(const k of wanted){const [c,o,p]=k.split('/').map(Number);request(c,o,p);}
    show();trim();pump();
  }
  setChannel(channel);
  return {setChannel,update,allowRemote(value){
    remoteAllowed=value;signature='';
    if(!value){for(const t of [...tiles.values()])if(t.hash===undefined)remove(t);}
    else if(![50,51].includes(channel))for(let p=0;p<12;p++)request(channel,0,p);
    if(displayChannel!==null&&baseReady(displayChannel)!==12)displayChannel=null;
    show();pump();
  },dispose(){disposed=true;queue.length=0;for(const t of [...tiles.values()])remove(t);scene.remove(group);},get stats(){return stats();}};
}
