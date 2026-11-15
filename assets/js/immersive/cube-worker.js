import {CUBE_ROOT,cubeHeader,fetchRange} from './cube.js';
import {initKernel,processFloatPlane,kernelStatus} from '../science/wasm-bridge.js';
import {sha256} from '../science/contracts.js';
const ready=initKernel();let active;
const cache=new Map(),headers=new Map();
self.onmessage=async({data:job})=>{
  active?.abort();const controller=new AbortController();active=controller;
  const timeout=setTimeout(()=>controller.abort(),30000);
  try{
    if(!Number.isInteger(job.pixel)||job.pixel<0||job.pixel>=12288||!Number.isInteger(job.channel)||job.channel<0||job.channel>101||[50,51].includes(job.channel))throw Error('Canal/tesela inválidos o sin datos');
    const key=`${job.pixel}/${job.channel}`,cached=cache.get(key);
    if(cached){
      cache.delete(key);cache.set(key,cached);const start=performance.now(),rgba=cached.rgba.slice(),pixels=cached.pixels.slice();
      self.postMessage({...cached,id:job.id,rgba,pixels,cacheHit:true,processingMs:performance.now()-start},[rgba.buffer,pixels.buffer]);return;
    }
    const url=`${CUBE_ROOT}/Norder5/Dir${Math.floor(job.pixel/10000)*10000}/Npix${job.pixel}_cube.fits`;
    let meta=headers.get(job.pixel);
    if(!meta){meta=cubeHeader(await fetchRange(url,0,17279,controller.signal),job.pixel);headers.set(job.pixel,meta);if(headers.size>4)headers.delete(headers.keys().next().value);}
    const from=meta.offset+job.channel*512*512*4,to=from+512*512*4-1;
    const bytes=await fetchRange(url,from,to,controller.signal);
    await ready;if(controller.signal.aborted)return;
    const start=performance.now(),result=processFloatPlane(new Uint8Array(bytes),512,512,meta.header.BSCALE??1,meta.header.BZERO??0);
    const hash=await sha256(bytes);if(controller.signal.aborted)return;
    const entry={pixel:job.pixel,channel:job.channel,...result,primary:meta.primary,header:meta.header,sourceUrl:url,sha256:hash,range:[from,to],kernel:kernelStatus()};
    cache.set(key,entry);if(cache.size>5)cache.delete(cache.keys().next().value);
    const rgba=result.rgba.slice(),pixels=result.pixels.slice();
    self.postMessage({...entry,id:job.id,rgba,pixels,cacheHit:false,processingMs:performance.now()-start},[rgba.buffer,pixels.buffer]);
  }catch(error){if(active===controller)self.postMessage({id:job.id,error:controller.signal.aborted?'Consulta FITS cancelada o tiempo agotado':error.message});}
  finally{clearTimeout(timeout);}
};
