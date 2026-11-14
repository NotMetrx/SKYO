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
  const maskA=buildQualityMask(a),maskB=buildQualityMask(b);
  const projected=reprojectToReference(a,b,maskA.mask,maskB.mask,{maxPixels});
  const n=a.width*a.height;
  const valid=new Uint8Array(n),va=new Float32Array(n);
  let validCount=0;
  for(let i=0;i<n;i++) {
    valid[i]=maskA.mask[i] && projected.mask[i] ? 1 : 0;
    if(valid[i])validCount++;
    va[i]=a.variance?.[i]??NaN;
  }
  if(validCount < Math.min(32,Math.floor(n/10))) throw new Error('Solapamiento util insuficiente entre las dos imagenes');
  const offset=robustOffset(a.image,projected.image,valid);
  const spectral=checkSpectralPair(a,b);
  if(spectral.hardIncompatible)throw new Error('Comparacion bloqueada: '+spectral.reason);
  const flagsReady=maskA.flagsAvailable && maskB.flagsAvailable &&
    maskA.flagDefinitionsAvailable && maskB.flagDefinitionsAvailable;
  const varianceReady=!!a.variance && !!b.variance;
  return {a:a.image,b:projected.image,va,vb:projected.variance,valid,offset,
    spectral,flagsReady,varianceReady,validCount,width:a.width,height:a.height,
    // Validacion final requiere mapas espectrales per pixel y ePSF: no se declaran descubrimientos.
    status:'exploratorio',
    notes:[
      'Reproyeccion WCS TAN-SIP; validar el error con astropy.wcs',
      'Varianza interpolada aproximada; se desconoce covarianza entre pixeles',
      'Fondo escalar robusto; no reemplaza modelado de luz zodiacal ni calibracion PSF',
      'La diferencia no basta para demostrar un nuevo objeto astronómico'
    ]
  };
}
