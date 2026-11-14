import {parseFits,buildQualityMask} from './src/fits.js';
import {buildComparison} from './src/pipeline.js';
import {imageRgba} from './src/render.js';
import {initKernel,processDifference} from './src/wasm-bridge.js';

const images={A:null,B:null};
let comparison=null;
let kernel='Inicializando';
initKernel().then(k=>{kernel=k;self.postMessage({event:'kernel',jobId:0,kernel});});

function summary(side,fit,quality){
  return {side,width:fit.width,height:fit.height,detector:fit.detector,origin:fit.origin,
    observationTime:fit.meta?.observation_utc||fit.observationTime||'No verificada',
    flagsAvailable:quality.flagsAvailable,flagsCompressed:fit.flagsCompressed,
    maskedCount:quality.maskedCount,wavelengthUm:fit.meta?.wavelength_um??fit.wavelengthUm??'Sin calibrar',
    hasVariance:!!fit.variance,sourceUrl:fit.meta?.source_url||null,
    note:fit.flagsCompressed&&!fit.flags?'FLAGS comprimidas requieren conversion validada':null};
}
function renderProduct(target){
  let arr,width,height,valid,kind;
  if(target==='A'||target==='B'){
    const fit=images[target];if(!fit)throw Error(`Observacion ${target} no cargada`);
    arr=fit.image;width=fit.width;height=fit.height;
    valid=buildQualityMask(fit).mask;kind='science';
  } else if(target==='difference'||target==='snr'){
    if(!comparison)throw Error('Compara las epocas antes de renderizar la diferencia');
    arr=target==='difference'?comparison.difference:comparison.snr;
    width=comparison.width;height=comparison.height;valid=comparison.valid;
    kind='difference';
  } else throw Error(`Producto desconocido: ${target}`);
  return {width,height,rgba:imageRgba(arr,width,height,valid,{kind})};
}
self.onmessage=async({data})=>{
  const {event,side,jobId}=data;
  try{
    if(event==='load'){
      if(!['A','B'].includes(side))throw Error('Debe indicar epoca A o B');
      const fit=parseFits(data.buffer);
      fit.meta=data.meta||{};
      images[side]=fit;comparison=null;
      const quality=buildQualityMask(fit);
      const rgba=imageRgba(fit.image,fit.width,fit.height,quality.mask);
      self.postMessage({event:'loaded',jobId,summary:summary(side,fit,quality),rgba},[rgba.buffer]);
    } else if(event==='compare'){
      if(!images.A||!images.B)throw Error('Carga ambos recortes antes de comparar');
      const result=buildComparison(images.A,images.B);
      const packed=processDifference(result.a,result.b,result.va,result.vb,result.valid,result.offset);
      const n=result.a.length;
      if(packed.length!==n*2)throw Error('El kernel numerico devolvio longitud incorrecta');
      comparison={difference:packed.subarray(0,n),snr:packed.subarray(n),
        width:result.width,height:result.height,valid:result.valid};
      const rgba=imageRgba(comparison.difference,result.width,result.height,result.valid,{kind:'difference'});
      self.postMessage({event:'compared',jobId,rgba,
        products:{differenceId:'difference',snrId:'snr',workerResident:true},
        info:{width:result.width,height:result.height,kernel,
          offset:result.offset,validCount:result.validCount,spectral:result.spectral,
          flagsReady:result.flagsReady,varianceReady:result.varianceReady,
          background:result.background,status:result.status,notes:result.notes}},[rgba.buffer]);
    } else if(event==='render'){
      const product=renderProduct(data.target);
      self.postMessage({event:'rendered',jobId,target:data.target,...product},[product.rgba.buffer]);
    } else if(event==='clear'){
      images.A=null;images.B=null;comparison=null;
      self.postMessage({event:'cleared',jobId});
    } else throw Error(`Evento de worker desconocido: ${event}`);
  }catch(err){self.postMessage({event:'error',jobId,side,operation:event,message:String(err.message||err)});}
};
