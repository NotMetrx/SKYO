import {parseFits,buildQualityMask} from './fits.js';
import {buildComparison} from './pipeline.js';
import {imageRgba} from './render.js';
import {initKernel,processDifference} from './wasm-bridge.js';

const images={A:null,B:null};
let kernel='Cargando...';
initKernel().then(k=>{kernel=k;self.postMessage({event:'kernel',kernel});});

function summary(side,fit,quality) {
  return {side,width:fit.width,height:fit.height,detector:fit.detector,
    origin:fit.origin,observationTime:fit.meta?.observation_utc||fit.observationTime||'No verificada',
    flagsAvailable:quality.flagsAvailable,
    flagsCompressed:fit.flagsCompressed,
    maskedCount:quality.maskedCount,
    wavelengthUm:fit.meta?.wavelength_um??fit.wavelengthUm??'Sin calibrar',
    hasVariance:!!fit.variance,
    sourceUrl:fit.meta?.source_url||null,
    note: fit.flagsCompressed && !fit.flags ? 'FLAGS comprimidos: se requiere paquete curado para validar calidad' : null};
}

self.onmessage=async({data})=>{
  const {event,side}=data;
  try{
    if(event==='load'){
      const fit=parseFits(data.buffer);
      fit.meta=data.meta || {};
      images[side]=fit;
      const quality=buildQualityMask(fit);
      const rgba=imageRgba(fit.image,fit.width,fit.height,quality.mask);
      self.postMessage({event:'loaded',summary:summary(side,fit,quality),rgba},[rgba.buffer]);
    }
    if(event==='compare'){
      if(!images.A||!images.B)throw new Error('Carga ambos recortes antes de comparar');
      const result=buildComparison(images.A,images.B);
      const packed=processDifference(result.a,result.b,result.va,result.vb,result.valid,result.offset);
      const diff=packed.subarray(0,result.a.length);
      const rgba=imageRgba(diff,result.width,result.height,result.valid,{kind:'difference'});
      self.postMessage({event:'compared',rgba,info:{
        width:result.width,height:result.height,kernel,
        offset:result.offset,validCount:result.validCount,
        spectral:result.spectral,
        flagsReady:result.flagsReady,
        varianceReady:result.varianceReady,
        status:result.status,
        notes:result.notes
      }},[rgba.buffer]);
    }
  }catch(err){self.postMessage({event:'error',message:String(err.message||err)});}
};
