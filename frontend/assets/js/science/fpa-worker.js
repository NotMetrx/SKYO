import {initKernel,processFitsTexture,kernelStatus} from './wasm-bridge.js';
import {sha256} from './contracts.js';
import {inspectFits} from './fits.js';
import {inspectorFrame} from './archive-data.js';
const ready=initKernel();
const MAX=96_000_000;
let queue=Promise.resolve();
const latest=new Map();
let inspected=null,inspectionController;
self.onmessage=({data:job})=>{
  const key=job.event?.startsWith('inspect-')?'inspector':job.detector;
  latest.set(key,job.id);
  if(job.event==='inspect-open'||job.event==='inspect-close'){inspectionController?.abort();inspected=null;}
  if(job.event==='inspect-close')return;
  queue=queue.then(()=>latest.get(key)===job.id?run(job):undefined);
};
async function readBytes(job,signal=AbortSignal.timeout(60000)){
    let bytes=job.bytes;
    if(!bytes){
      const url=new URL(job.url);
      const local=url.origin===self.location.origin && url.pathname.includes('/datasets/fpa-dr1/');
      const irsa=url.origin==='https://irsa.ipac.caltech.edu'&&/^\/ibe\/data\/spherex\/(dr1|qr3)\/level2\/[\w./-]+\.fits$/.test(url.pathname)&&!url.pathname.includes('..');
      const cloud=url.origin==='https://nasa-irsa-spherex.s3.us-east-1.amazonaws.com'&&/^\/(dr1|qr3)\/level2\/[\w./-]+\.fits$/.test(url.pathname)&&!url.pathname.includes('..');
      if(!local&&!cloud&&!irsa)throw Error('Fuente FITS no admitida');
      const response=await fetch(url,{signal});
      if(!response.ok)throw Error(`FITS HTTP ${response.status}`);
      if(Number(response.headers.get('Content-Length'))>MAX)throw Error('FITS supera 96 MB');
      const reader=response.body.getReader(), chunks=[];
      let size=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX)throw Error('FITS supera 96 MB');chunks.push(value);}}
      finally{await reader.cancel();}
      const joined=new Uint8Array(size);let at=0;for(const c of chunks){joined.set(c,at);at+=c.length;}bytes=joined.buffer;
    }
    if(bytes.byteLength>MAX)throw Error('FITS supera 96 MB');
    const hash=await sha256(bytes);
    if(job.sha256 && hash!==job.sha256)throw Error('Hash FITS incorrecto');
    return {bytes,hash};
}
async function run(job){
  try{
    if(job.event?.startsWith('inspect-')){
      let hdus;
      if(job.event==='inspect-open'){
        const controller=inspectionController=new AbortController();
        const input=await readBytes(job,AbortSignal.any([controller.signal,AbortSignal.timeout(60000)]));
        if(latest.get('inspector')!==job.id)return;
        hdus=inspectFits(input.bytes);
        for(const h of hdus){
          const text=new TextDecoder('ascii').decode(new Uint8Array(input.bytes,h.headerOffset,h.dataOffset-h.headerOffset));
          const cards=text.match(/.{80}/g);h.cards=cards.slice(0,cards.findIndex(card=>card.slice(0,8).trim()==='END')+1).join('\n');
        }
        if(job.detector&&!hdus.some(h=>h.header.DETECTOR===job.detector))throw Error('DETECTOR no coincide con la observación seleccionada');
        if(job.observation&&!hdus.some(h=>h.header.OBSID===job.observation))throw Error('OBSID no coincide con la observación seleccionada');
        inspected={...input,id:job.id,hdus};
        job.hdu=hdus.findIndex(h=>h.name==='IMAGE'&&[2,3].includes(h.dims.length)&&!h.compressed);
        if(job.hdu<0)job.hdu=hdus.findIndex(h=>['PRIMARY','IMAGE'].includes(h.xtension)&&[2,3].includes(h.dims.length)&&!h.compressed);
        if(job.hdu<0)throw Error('El archivo no contiene una imagen o cubo compatible');
        job.plane=0;
      }
      if(!inspected||(job.event==='inspect-render'&&job.fileId!==inspected.id))throw Error('La selección del inspector cambió; vuelve a abrir el archivo');
      const frame=inspectorFrame(inspected.bytes,job.hdu,job.plane,job.contrast??1);
      self.postMessage({event:'inspected',id:job.id,fileId:inspected.id,sha256:inspected.hash,hdus,hdu:job.hdu,...frame},[frame.image.buffer,frame.rgba.buffer,...(frame.quality?[frame.quality.buffer]:[])]);
      return;
    }
    await ready;
    const {bytes,hash}=await readBytes(job);
    const start=performance.now();
    const result=processFitsTexture(new Uint8Array(bytes),job.zscale);
    if(job.detector && result.detector!==job.detector)throw Error('DETECTOR no coincide con la procedencia');
    if(result.detector<1 || result.detector>6)throw Error('Falta DETECTOR D1–D6');
    self.postMessage({id:job.id,...result,sha256:hash,processingMs:performance.now()-start,kernel:kernelStatus()},[result.rgba.buffer]);
  }catch(error){self.postMessage({event:job.event?.startsWith('inspect-')?'inspector-error':undefined,id:job.id,error:error.message});}
}
