import {parseFits,buildQualityMask} from './fits.js';
import {buildComparison} from './pipeline.js';
import {imageRgba} from './render.js';
import {initKernel,processDifference,kernelStatus} from './wasm-bridge.js';
import {sha256,observationFromFits,makeSnapshot,sameSnapshot,analysisReport,diagnosticReport} from './contracts.js';
const images={A:null,B:null},observations={A:null,B:null},versions={A:0,B:0},jobs={A:0,B:0},pending={A:null,B:null};
let comparison=null,kernel='Cargando…';
const kernelReady=initKernel().then(value=>{kernel=value;self.postMessage({event:'kernel',jobId:0,kernel});});
const snapshot=()=>makeSnapshot(versions,observations);
const validSide=side=>side==='A'||side==='B';
function requireCondition(value,message){if(!value)throw Error(message);}
function summary(side,fit,quality){return {side,width:fit.width,height:fit.height,detector:fit.detector,
  observation:observations[side],origin:fit.origin,
  observationTime:fit.meta?.observation_utc||fit.observationTime||'No verificada',
  flagsAvailable:quality.flagsAvailable,flagsCompressed:fit.flagsCompressed,maskedCount:quality.maskedCount,
  wavelengthUm:fit.meta?.wavelength_um??fit.wavelengthUm??'Sin calibrar',
  hasVariance:!!fit.variance,sourceUrl:fit.meta?.source_url||null,
  note:fit.flagsCompressed&&!fit.flags?'FLAGS comprimidos: se requiere paquete curado para validar calidad':null};}
self.onmessage=async({data})=>{
  const {event,side,jobId,version}=data??{};
  try {
    requireCondition(Number.isSafeInteger(jobId)&&jobId>0,'jobId inválido');
    if(event==='clear'||event==='load'){
      requireCondition(validSide(side)&&Number.isSafeInteger(version)&&version>0,'Lado o versión de selección inválidos');
      if(version<versions[side]||jobId<=jobs[side])return;
      if(event==='load'&&version===versions[side]&&images[side])return;
      versions[side]=version;jobs[side]=jobId;images[side]=null;observations[side]=null;comparison=null;pending[side]=null;
      if(event==='clear'){self.postMessage({event:'cleared',jobId,side,version,snapshot:snapshot()});return;}
      pending[side]=(async()=>{
        const digest=await sha256(data.buffer);
        if(version!==versions[side]||jobId!==jobs[side])return;
        if(data.observation?.sha256)requireCondition(data.observation.sha256===digest,'SHA-256 no coincide con los bytes recibidos');
        const fit=parseFits(data.buffer);
        const observation=observationFromFits(fit,{fileName:data.observation?.fileName??'archivo-local.fits',digest,bytes:data.buffer.byteLength,meta:data.meta??{},mode:data.mode,side,datasetId:data.datasetId});
        if(version!==versions[side]||jobId!==jobs[side])return;
        fit.meta=observation.declaredProvenance;fit.sha256=digest;
        images[side]=fit;observations[side]=observation;
        const quality=buildQualityMask(fit);
        const rgba=imageRgba(fit.image,fit.width,fit.height,quality.mask);
        self.postMessage({event:'loaded',jobId,side,version,summary:summary(side,fit,quality),snapshot:snapshot(),rgba},[rgba.buffer]);
      })();
      await pending[side];return;
    }
    if(event==='compare'){
      await kernelReady;
      await Promise.all(Object.values(pending));
      requireCondition(images.A&&images.B,'Carga ambos recortes antes de comparar');
      const current=snapshot();
      requireCondition(sameSnapshot(data.snapshot,current),'El par seleccionado cambió antes de comparar');
      comparison=null;
      const result=buildComparison(images.A,images.B);
      const packed=processDifference(result.a,result.b,result.va,result.vb,result.valid,result.offset);
      kernel=kernelStatus();
      const report=analysisReport({observations,snapshot:current,result,kernel,maskBits:{A:buildQualityMask(images.A).unsafeBits,B:buildQualityMask(images.B).unsafeBits}});
      comparison={result,packed,snapshot:current,report};
      const rgba=imageRgba(packed.subarray(0,result.a.length),result.width,result.height,result.valid,{kind:'difference'});
      self.postMessage({event:'compared',jobId,snapshot:current,rgba,report,info:{width:result.width,height:result.height,kernel,offset:result.offset,validCount:result.validCount,spectral:result.spectral,flagsReady:result.flagsReady,varianceReady:result.varianceReady,status:result.status,notes:result.notes,report}},[rgba.buffer]);return;
    }
    if(event==='render'){
      requireCondition(sameSnapshot(data.snapshot,snapshot()),'Render de una selección antigua');
      let values,width,height,mask;
      if(validSide(data.target)){
        const fit=images[data.target];requireCondition(fit,'Entrada no cargada');
        values=fit.image;width=fit.width;height=fit.height;mask=buildQualityMask(fit).mask;
      }else{
        requireCondition(comparison&&sameSnapshot(comparison.snapshot,snapshot())&&['difference','snr'].includes(data.target),'Producto no disponible para este snapshot');
        const {result,packed}=comparison;width=result.width;height=result.height;mask=result.valid;
        values=data.target==='snr'?packed.subarray(result.a.length):packed.subarray(0,result.a.length);
      }
      const rgba=imageRgba(values,width,height,mask,{kind:validSide(data.target)?'science':'difference'});
      self.postMessage({event:'rendered',jobId,target:data.target,snapshot:snapshot(),width,height,rgba},[rgba.buffer]);return;
    }
    throw Error('Evento no soportado');
  }catch(error){
    if(validSide(side)&&Number.isSafeInteger(version)&&version>0&&(version<versions[side]||jobId<jobs[side]))return;
    comparison=null;
    const report=diagnosticReport(typeof event==='string'?event:'protocol',error,observations,snapshot());
    self.postMessage({event:'error',jobId,side,version,operation:event,message:String(error.message||error),report,snapshot:snapshot()});
  }
};
