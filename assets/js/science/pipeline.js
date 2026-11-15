/** Etapas exploratorias: mascaras -> registro TAN/SIP -> fondo -> diferencia. */
import {buildQualityMask} from './fits.js';
import {reprojectToReference} from './wcs.js';

export function median(values){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return NaN;
  const m=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;
}
export function robustOffset(a,b,valid,maxSamples=20000){
  const n=valid.length, step=Math.max(1,Math.floor(n/maxSamples));
  const d=[];
  for(let i=0;i<n;i+=step) if(valid[i] && Number.isFinite(a[i]) && Number.isFinite(b[i])) d.push(a[i]-b[i]);
  return median(d);
}
export function robustBackgroundPlane(a,b,valid,width,height){
  const points=[],step=Math.max(1,Math.ceil(valid.length/20000));
  for(let i=0;i<valid.length;i+=step)if(valid[i]&&Number.isFinite(a[i])&&Number.isFinite(b[i]))points.push([2*(i%width)/Math.max(1,width-1)-1,2*Math.floor(i/width)/Math.max(1,height-1)-1,a[i]-b[i]]);
  if(!points.length)throw Error('No hay píxeles sin fuentes para estimar el fondo');
  let fit=[median(points.map(p=>p[2])),0,0],used=points.length;
  for(let iteration=0;iteration<6;iteration++){
    const residual=points.map(([x,y,z])=>z-fit[0]-fit[1]*x-fit[2]*y);
    const center=median(residual),sigma=1.4826*median(residual.map(r=>Math.abs(r-center))),threshold=Math.max(1e-5,3*sigma);
    const matrix=Array.from({length:3},()=>[0,0,0,0]);used=0;
    for(let index=0;index<points.length;index++){
      if(Math.abs(residual[index]-center)>threshold)continue;
      const [x,y,z]=points[index],row=[1,x,y];used++;
      for(let i=0;i<3;i++){for(let j=0;j<3;j++)matrix[i][j]+=row[i]*row[j];matrix[i][3]+=row[i]*z;}
    }
    let singular=used<3;
    for(let col=0;col<3&&!singular;col++){
      let pivot=col;for(let row=col+1;row<3;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;
      [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
      const scale=matrix[col][col];if(Math.abs(scale)<1e-10){singular=true;break;}
      for(let j=col;j<4;j++)matrix[col][j]/=scale;
      for(let row=0;row<3;row++)if(row!==col){const factor=matrix[row][col];for(let j=col;j<4;j++)matrix[row][j]-=factor*matrix[col][j];}
    }
    if(singular)return {method:'median-offset',offset:fit[0],gradientX:0,gradientY:0,samples:points.length,used,reason:'Geometría insuficiente para ajustar plano'};
    const next=matrix.map(row=>row[3]),change=next.reduce((sum,v,i)=>sum+Math.abs(v-fit[i]),0);fit=next;
    if(change<1e-7)break;
  }
  return {method:'robust-plane',offset:fit[0],gradientX:fit[1],gradientY:fit[2],samples:points.length,used};
}

export function compareJavaScript(a,b,va,vb,valid,offset){
  const n=a.length;
  if(b.length!==n||va.length!==n||vb.length!==n||valid.length!==n)throw new Error('Arreglos incompatibles');
  const out=new Float32Array(n*2);out.fill(NaN);
  for(let i=0;i<n;i++) {
    if(!valid[i] || !Number.isFinite(a[i]) || !Number.isFinite(b[i]))continue;
    const d=a[i]-b[i]-offset;
    out[i]=d;
    if(Number.isFinite(va[i])&&va[i]>=0 && Number.isFinite(vb[i])&&vb[i]>=0) {
      const denom=va[i]+vb[i];
      if(denom>0)out[n+i]=d/Math.sqrt(denom);
    }
  }
  return out;
}

export function checkSpectralPair(fitsA,fitsB){
  const a=fitsA.meta||{},b=fitsB.meta||{};
  if(!fitsA.detector || !fitsB.detector) return {verified:false,reason:'Detector no registrado'};
  if(fitsA.detector!==fitsB.detector) return {verified:false,hardIncompatible:true,reason:'Distintos detectores; no comparar sin calibracion espectral adicional'};
  const wa=Number(a.wavelength_um??fitsA.wavelengthUm);
  const wb=Number(b.wavelength_um??fitsB.wavelengthUm);
  const ba=Number(a.bandwidth_um??fitsA.bandwidthUm);
  const bb=Number(b.bandwidth_um??fitsB.bandwidthUm);
  if(![wa,wb,ba,bb].every(x=>Number.isFinite(x)&&x>0)) {
    return {verified:false,reason:'WCS-WAVE no calibrado: faltan longitud de onda y ancho de banda por region'};
  }
  const deviation=Math.abs(wa-wb);
  // Heuristica de seleccion de pares, NO sustituto del mapa espectral por pixel.
  if(deviation>0.25*Math.min(ba,bb)) {
    return {verified:false,hardIncompatible:true,reason:`Centros espectrales incompatibles (${deviation.toFixed(5)} micras de separacion)`};
  }
  return {verified:true,reason:'Compatible de forma preliminar por centro de ROI; validar WCS-WAVE por pixel para deteccion'};
}

export function buildComparison(a,b,{maxPixels=512*512}={}) {
  if([a.width,a.height,b.width,b.height].some(axis=>!Number.isSafeInteger(axis)||axis<1||axis>512)||a.width*a.height>maxPixels||b.width*b.height>maxPixels)throw Error('Recorte mayor de 512 por eje; reduce la ROI');
  const unitsA=String(a.header.BUNIT??'').replaceAll(' ',''),unitsB=String(b.header.BUNIT??'').replaceAll(' ','');
  if(unitsA&&unitsB&&unitsA!==unitsB)throw Error('Comparación bloqueada: unidades incompatibles, sin conversión calibrada');
  const zodiApplied=!!a.zodi&&!!b.zodi;
  const prepare=fit=>zodiApplied?Float32Array.from(fit.image,(value,i)=>value-fit.zodi[i]):fit.image.slice();
  const preparedA=prepare(a),preparedB=prepare(b);
  const maskA=buildQualityMask(a),maskB=buildQualityMask(b);
  const backgroundA=buildQualityMask(a,{purpose:'background'}),backgroundB=buildQualityMask(b,{purpose:'background'});
  const projected=reprojectToReference({...a,image:preparedA},{...b,image:preparedB},maskA.mask,maskB.mask,{maxPixels,refBackgroundMask:backgroundA.mask,otherBackgroundMask:backgroundB.mask});
  const n=a.width*a.height;
  const valid=new Uint8Array(n),va=new Float32Array(n);
  let validCount=0;
  for(let i=0;i<n;i++) {
    valid[i]=maskA.mask[i] && projected.mask[i] && Number.isFinite(preparedA[i]) ? 1 : 0;
    if(valid[i])validCount++;
    va[i]=a.variance?.[i]??NaN;
  }
  if(validCount < Math.min(32,Math.floor(n/10))) throw new Error('Solapamiento util insuficiente entre las dos imagenes');
  const backgroundMask=Uint8Array.from(projected.backgroundMask,(value,i)=>value&&valid[i]?1:0);
  const plane=robustBackgroundPlane(preparedA,projected.image,backgroundMask,a.width,a.height);
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)preparedA[y*a.width+x]-=plane.gradientX*(2*x/Math.max(1,a.width-1)-1)+plane.gradientY*(2*y/Math.max(1,a.height-1)-1);
  const offset=plane.offset;
  const spectral=checkSpectralPair(a,b);
  if(spectral.hardIncompatible)throw new Error('Comparacion bloqueada: '+spectral.reason);
  const flagsReady=maskA.flagsAvailable && maskB.flagsAvailable &&
    maskA.flagDefinitionsAvailable && maskB.flagDefinitionsAvailable;
  const varianceReady=!!a.variance && !!b.variance;
  return {a:preparedA,b:projected.image,va,vb:projected.variance,valid,offset,
    controlIdentical:a===b||!!a.sha256&&a.sha256===b.sha256,
    background:{...plane,model:zodiApplied?'zodi-plus-residual':'no-zodi-plus-residual',zodiApplied,sourceExclusions:projected.sourceExclusions},
    spectral,flagsReady,varianceReady,validCount,width:a.width,height:a.height,
    // Validacion final requiere mapas espectrales per pixel y ePSF: no se declaran descubrimientos.
    status:'exploratorio',
    notes:[
      'Reproyeccion WCS TAN-SIP; validar el error con astropy.wcs',
      'Varianza interpolada aproximada; se desconoce covarianza entre pixeles',
      'Fondo residual robusto; SOURCE excluida en ambas épocas. La incertidumbre del ajuste no está propagada.',
      zodiApplied?'ZODI restado en copias temporales de ambas épocas.':'ZODI no restado: falta al menos una de las dos capas.',
      'La diferencia no basta para demostrar un nuevo objeto astronómico'
    ]
  };
}
