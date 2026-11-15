import {parseFits,buildQualityMask} from './fits.js';
import {buildComparison} from './pipeline.js';
import {imageRgba} from './render.js';
import {initKernel,processDifference} from './wasm-bridge.js';

export function createScienceWorkerState(){
  return {
    images:{A:null,B:null},
    summaries:{A:null,B:null},
    latestLoadJob:{A:0,B:0},
    latestCompareJob:0,
    comparison:null,
    kernel:'Cargando...'
  };
}

function summary(side,fit,quality,jobId) {
  return {side,loadJobId:jobId??null,width:fit.width,height:fit.height,detector:fit.detector,
    origin:fit.origin,
    sourceKind:fit.sourceKind,
    provenanceKind:fit.provenanceKind,
    provenanceLabel:fit.provenanceLabel,
    filename:fit.meta?.local_file||fit.meta?.filename||null,
    sha256:fit.meta?.sha256||null,
    dataRelease:fit.meta?.source_release||null,
    version:fit.version||null,
    hasEpsf:Boolean(fit.hasEpsf),
    epsfDims:fit.epsfDims||null,
    finast:fit.finast,
    bunit:fit.bunit,
    observationTime:fit.meta?.observation_utc||fit.observationTime||'No verificada',
    flagsAvailable:quality.flagsAvailable,
    flagsCompressed:fit.flagsCompressed,
    maskedCount:quality.maskedCount,
    maskPolicyVersion:quality.policyVersion,
    wavelengthUm:fit.meta?.wavelength_um??fit.wavelengthUm??'Sin calibrar',
    hasVariance:!!fit.variance,
    sourceUrl:fit.meta?.source_url||null,
    note: fit.flagsCompressed && !fit.flags ? 'FLAGS comprimidos: se requiere paquete curado para validar calidad' : null};
}

function renderProduct(state,target){
  let arr,width,height,valid,kind;
  if(target==='A'||target==='B'){
    const fit=state.images[target];if(!fit)throw new Error(`Observacion ${target} no cargada`);
    arr=fit.image;width=fit.width;height=fit.height;
    valid=buildQualityMask(fit).mask;kind='science';
  } else if(target==='difference'||target==='snr'){
    if(!state.comparison)throw new Error('Compara las epocas antes de renderizar la diferencia');
    arr=target==='difference'?state.comparison.difference:state.comparison.snr;
    width=state.comparison.width;height=state.comparison.height;valid=state.comparison.valid;
    kind='difference';
  } else throw new Error(`Producto desconocido: ${target}`);
  return {width,height,rgba:imageRgba(arr,width,height,valid,{kind})};
}

export function handleWorkerMessage(state,data,post){
  const {event,side,jobId}=data;
  try{
    if(event==='load'){
      if(!['A','B'].includes(side))throw new Error('Debe indicar epoca A o B');
      if(Number.isInteger(jobId)&&jobId<state.latestLoadJob[side])return;
      if(Number.isInteger(jobId))state.latestLoadJob[side]=jobId;
      const fit=parseFits(data.buffer);
      fit.meta=data.meta || {};
      state.images[side]=fit;
      state.comparison=null;
      const quality=buildQualityMask(fit);
      const sum=summary(side,fit,quality,jobId);
      state.summaries[side]=sum;
      const rgba=imageRgba(fit.image,fit.width,fit.height,quality.mask);
      post({event:'loaded',jobId,summary:sum,rgba},[rgba.buffer]);
    } else if(event==='compare'){
      if(Number.isInteger(jobId)&&jobId<state.latestCompareJob)return;
      if(Number.isInteger(jobId))state.latestCompareJob=jobId;
      if(!state.images.A||!state.images.B)throw new Error('Carga ambos recortes antes de comparar');
      const result=buildComparison(state.images.A,state.images.B);
      const packed=processDifference(result.a,result.b,result.va,result.vb,result.valid,result.offset);
      const n=result.a.length;
      if(packed.length!==n*2)throw new Error('El kernel numerico devolvio longitud incorrecta');
      state.comparison={difference:packed.subarray(0,n),snr:packed.subarray(n),
        width:result.width,height:result.height,valid:result.valid};
      const rgba=imageRgba(state.comparison.difference,result.width,result.height,result.valid,{kind:'difference'});
      post({event:'compared',jobId,rgba,
        products:{differenceId:'difference',snrId:'snr',workerResident:true},
        info:{
          width:result.width,height:result.height,kernel:state.kernel,
          offset:result.offset,validCount:result.validCount,
          spectral:result.spectral,
          flagsReady:result.flagsReady,
          varianceReady:result.varianceReady,
          background:result.background,
          isNegativeControl:Boolean(result.isNegativeControl),
          status:result.status,
          notes:result.notes,
          snapshot:{
            jobA:state.latestLoadJob.A,jobB:state.latestLoadJob.B,
            sha256A:state.summaries.A?.sha256||null,sha256B:state.summaries.B?.sha256||null
          },
          inputs:{A:state.summaries.A,B:state.summaries.B},
          observations:[state.summaries.A,state.summaries.B]
        }},[rgba.buffer]);
    } else if(event==='render'){
      const product=renderProduct(state,data.target);
      post({event:'rendered',jobId,target:data.target,...product},[product.rgba.buffer]);
    } else if(event==='clear'){
      state.images.A=null;state.images.B=null;
      state.summaries.A=null;state.summaries.B=null;
      state.comparison=null;
      post({event:'cleared',jobId});
    } else throw new Error(`Evento de worker desconocido: ${event}`);
  }catch(err){
    post({event:'error',jobId,side,eventType:event,operation:event,message:String(err.message||err)});
  }
}

if(typeof self!=='undefined'&&typeof self.postMessage==='function'){
  const state=createScienceWorkerState();
  initKernel().then(k=>{state.kernel=k;self.postMessage({event:'kernel',jobId:0,kernel:k});});
  self.onmessage=async({data})=>handleWorkerMessage(state,data,(msg,tx)=>self.postMessage(msg,tx));
}
