import {initKernel,processFitsTexture,kernelStatus} from '../science/wasm-bridge.js';
import {sha256} from '../science/contracts.js';
import {cutoutUrl,inspectCutout,cutoutVertices,observationIdentity} from './detail-data.js';
const ready=initKernel();let active;
self.onmessage=async({data:job})=>{
  active?.abort();const controller=new AbortController();active=controller;
  if(job.cancel)return;
  const timeout=setTimeout(()=>controller.abort(),60000);let total=0,last='Sin observaciones compatibles';
  try{
    if(!Array.isArray(job.rows)||job.rows.length>12||!Number.isInteger(job.detector)||job.detector<1||job.detector>6||!Array.isArray(job.bounds)||job.bounds.length!==2||!job.bounds.every(Number.isFinite)||job.bounds[0]>=job.bounds[1])throw Error('Trabajo L2 inválido');
    for(const row of job.rows.slice(0,6)){
      if(controller.signal.aborted)return;
      try{
        const url=cutoutUrl(row.uri,job.point.ra,job.point.dec),r=await fetch(url,{signal:controller.signal});
        if(!r.ok)throw Error(`Recorte HTTP ${r.status}`);
        if(Number(r.headers.get('Content-Length'))>32_000_000){await r.body?.cancel();throw Error('Recorte supera presupuesto');}
        const reader=r.body?.getReader();if(!reader)throw Error('Recorte vacío');const chunks=[];let size=0;
        try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;total+=value.length;if(size>32_000_000||total>64_000_000)throw Error('Recortes superan presupuesto');chunks.push(value);}}finally{await reader.cancel();}
        const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
        const {fits,wcs,spectral,valid,date,wave}=inspectCutout(bytes.buffer,job.point,job.detector,job.bounds);
        const observation=observationIdentity(fits,row,url);
        await ready;if(controller.signal.aborted)return;
        const result=processFitsTexture(bytes,true);for(let i=0;i<valid.length;i++)if(!valid[i])result.rgba[i*4+3]=0;
        const geometry=cutoutVertices(wcs,fits.width,fits.height),hash=await sha256(bytes.buffer);
        if(controller.signal.aborted)return;
        self.postMessage({id:job.id,...result,...geometry,wcs,spectral,valid,pixels:fits.image,date,wave,sourceUrl:url,sha256:hash,sourceBytes:size,observation,release:row.collection,version:fits.header.VERSION??fits.headerPrimary.VERSION,header:fits.header,primary:fits.headerPrimary,kernel:kernelStatus()},[result.rgba.buffer,geometry.positions.buffer,geometry.uv.buffer,geometry.indices.buffer,valid.buffer,fits.image.buffer]);return;
      }catch(error){last=error.message;if(total>64_000_000)break;}
    }
    if(!controller.signal.aborted)throw Error(last);
  }catch(error){if(active===controller&&!controller.signal.aborted)self.postMessage({id:job.id,error:error.message});}
  finally{clearTimeout(timeout);if(active===controller&&controller.signal.aborted)self.postMessage({id:job.id,error:'Tiempo del recorte agotado'});}
};
