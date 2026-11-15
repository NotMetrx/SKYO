import {queryObservations} from './irsa.js';
import {channelBounds,wavelengthAt} from './spectral.js';
import {worldToPixel} from '../science/wcs.js';

export function createDetail(T,scene,{wake,onStatus}){
  const worker=new Worker(new URL('./detail-worker.js',import.meta.url),{type:'module'});
  let id=0,controller,timer=0,pending=null,data=null,mesh=null,currentChannel=-1,disposed=false,enabled=true;
  const failed=new Set();
  const key=(p,c)=>`${c}/${Math.round(p.ra*20)}/${Math.round(p.dec*20)}`;
  const distance=(a,b)=>Math.hypot((((a.ra-b.ra+540)%360)-180)*Math.cos(a.dec*Math.PI/180),a.dec-b.dec);
  function clear(){if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.map.dispose();mesh.material.dispose();}mesh=null;data=null;}
  function cancel(){id++;controller?.abort();clearTimeout(timer);timer=0;pending=null;worker.postMessage({cancel:true});}
  function inside(point,margin=0){
    if(!data)return null;const p=worldToPixel(data.wcs,point.ra,point.dec);
    return p.x>=margin&&p.y>=margin&&p.x<data.width-margin&&p.y<data.height-margin?p:null;
  }
  async function load(point,channel,waves,jobId){
    const request=new AbortController();controller=request;const timeout=setTimeout(()=>request.abort(),30000);
    onStatus('Buscando observación original para el zoom…');
    try{
      const rows=await queryObservations(point.ra,point.dec,channel,request.signal);
      if(disposed||jobId!==id)return;
      if(!rows.length)throw Error('Sin observaciones originales para esta región');
      onStatus('Cargando recorte L2 nativo; el panorama sigue disponible…');
      worker.postMessage({id:jobId,point,detector:Math.floor(channel/17)+1,bounds:channelBounds(waves,channel),rows});
    }catch(error){if(jobId===id&&!disposed){failed.add(key(point,channel));pending=null;onStatus(`Detalle L2 no disponible: ${error.message}. Se conserva el mosaico.`);wake();}}
    finally{clearTimeout(timeout);}
  }
  worker.onmessage=({data:r})=>{
    if(disposed||r.id!==id)return;
    if(r.error){if(pending)failed.add(key(pending,currentChannel));pending=null;onStatus(`Sin recorte compatible: ${r.error}. Se conserva el mosaico.`);wake();return;}
    clear();data=r;pending=null;
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(r.positions,3));geometry.setAttribute('uv',new T.BufferAttribute(r.uv,2));geometry.setIndex(new T.BufferAttribute(r.indices,1));geometry.computeBoundingSphere();
    const map=new T.DataTexture(r.rgba,r.width,r.height,T.RGBAFormat,T.UnsignedByteType);map.flipY=false;map.minFilter=T.LinearFilter;map.magFilter=T.LinearFilter;map.generateMipmaps=false;map.needsUpdate=true;
    mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({map,side:T.DoubleSide,transparent:true,depthWrite:false,opacity:0}));mesh.renderOrder=20;scene.add(mesh);
    onStatus(`Observación L2 ${r.observation} · UTC ${r.date} · λ central ${r.wave.wavelength.toFixed(4)} µm · resolución nativa`);wake();
  };
  worker.onerror=()=>{pending=null;onStatus('El Worker L2 falló; se conserva el mosaico.');wake();};
  return {
    update(point,fov,channel,waves){
      if(!enabled)return;
      if(channel!==currentChannel){cancel();clear();failed.clear();currentChannel=channel;}
      if(fov>=1.5||[50,51].includes(channel)){if(data||pending)onStatus('Vista panorámica; acércate para cargar una observación original.');if(pending||timer)cancel();clear();return;}
      if(mesh){mesh.material.opacity=Math.max(0,Math.min(1,(1.25-fov)/.75));mesh.visible=mesh.material.opacity>0;}
      if(fov>1.25)return;
      if(inside(point,Math.min(data?.width??0,data?.height??0)*.15))return;
      if(pending&&distance(point,pending)<.04)return;
      if(pending||timer)cancel();
      if(failed.has(key(point,channel)))return;
      clear();pending={...point};const jobId=++id,snapshot=pending;
      timer=setTimeout(()=>{timer=0;load(snapshot,channel,waves,jobId);},700);
    },
    sample(point){
      if(!mesh||mesh.material.opacity<.99)return null;
      const p=inside(point);if(!p)return null;const x=Math.round(p.x),y=Math.round(p.y);if(x>=data.width||y>=data.height)return null;
      const i=y*data.width+x,w=wavelengthAt(data.spectral,x,y);if(!data.valid[i]||!w)return null;
      return {value:data.pixels[i],wavelength:w.wavelength,bandwidth:w.bandwidth,date:data.date,observation:data.observation,release:data.release,version:data.version,sourceUrl:data.sourceUrl,sha256:data.sha256,sourceBytes:data.sourceBytes,x,y,kernel:data.kernel};
    },
    reset(){cancel();clear();failed.clear();onStatus('Acércate a menos de 1.25° para cargar una observación original.');},
    suspend(value){enabled=!value;if(value){cancel();clear();}},
    get state(){return data?'ready':pending?'loading':'mosaic';},
    dispose(){disposed=true;cancel();clear();worker.terminate();}
  };
}
