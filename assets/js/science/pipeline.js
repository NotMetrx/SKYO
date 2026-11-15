/** Etapas exploratorias: mascaras -> registro TAN/SIP -> fondo -> diferencia. */
import {buildQualityMask} from './fits.js';
import {reprojectToReference} from './wcs.js';

export function median(values){
  const seq=values?.length!=null?values:Array.from(values||[]);
  const srcLen=seq.length;
  if(!srcLen)return NaN;
  const buf=new Float64Array(srcLen);
  let count=0;
  for(let i=0;i<srcLen;i++){
    const v=seq[i];
    if(Number.isFinite(v)) buf[count++]=v;
  }
  if(!count)return NaN;
  const sorted=count===srcLen?buf:buf.subarray(0,count);
  sorted.sort();
  const m=count>>1;
  return (count&1)?sorted[m]:(sorted[m-1]+sorted[m])*0.5;
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

function solve3x3(A,b){
  const m=A.map((row,i)=>[...row,b[i]]);
  for(let i=0;i<3;i++){
    let pivot=i;
    for(let j=i+1;j<3;j++) if(Math.abs(m[j][i])>Math.abs(m[pivot][i])) pivot=j;
    if(Math.abs(m[pivot][i])<1e-9) return null;
    [m[i],m[pivot]]=[m[pivot],m[i]];
    const v=m[i][i];for(let k=i;k<4;k++) m[i][k]/=v;
    for(let j=0;j<3;j++) if(j!==i){const f=m[j][i];for(let k=i;k<4;k++) m[j][k]-=f*m[i][k];}
  }
  return [m[0][3],m[1][3],m[2][3]];
}
function leastSquaresPlane(points){
  let n=0,sx=0,sy=0,sxx=0,sxy=0,syy=0,sz=0,sxz=0,syz=0;
  for(const p of points){n++;sx+=p.x;sy+=p.y;sxx+=p.x*p.x;sxy+=p.x*p.y;syy+=p.y*p.y;sz+=p.z;sxz+=p.x*p.z;syz+=p.y*p.z;}
  return solve3x3([[n,sx,sy],[sx,sxx,sxy],[sy,sxy,syy]],[sz,sxz,syz]);
}
/** Plano de fondo robusto por medianas en celdas; excluye SOURCE de A y B sin borrarlas del analisis. */
export function robustBackgroundPlane(a,b,valid,width,height,flags=null,sourceBit=null,extraExcludeMask=null){
  const pieces=[];
  const grid=Math.min(8,Math.max(3,Math.floor(Math.min(width,height)/16)));
  const sourceMask=sourceBit==null?0:((1<<sourceBit)>>>0);
  for(let gy=0;gy<grid;gy++) for(let gx=0;gx<grid;gx++){
    const values=[];
    const xMin=Math.floor(gx*width/grid),xMax=Math.floor((gx+1)*width/grid);
    const yMin=Math.floor(gy*height/grid),yMax=Math.floor((gy+1)*height/grid);
    for(let y=yMin;y<yMax;y++) for(let x=xMin;x<xMax;x++){
      const i=y*width+x;
      if(!valid[i]||(flags&&sourceMask&&(((flags[i]>>>0)&sourceMask)!==0))||(extraExcludeMask&&extraExcludeMask[i])) continue;
      const z=a[i]-b[i];if(Number.isFinite(z)) values.push(z);
    }
    if(values.length>=Math.max(6,Math.floor((xMax-xMin)*(yMax-yMin)*0.1))){
      pieces.push({x:2*((xMin+xMax-1)*0.5)/(width-1)-1,
        y:2*((yMin+yMax-1)*0.5)/(height-1)-1,z:median(values)});
    }
  }
  let coeff=pieces.length>=6?leastSquaresPlane(pieces):null;
  if(coeff&&pieces.length>=10){
    const residuals=pieces.map(p=>p.z-(coeff[0]+coeff[1]*p.x+coeff[2]*p.y));
    const middle=median(residuals),mad=median(residuals.map(v=>Math.abs(v-middle)));
    const limit=Math.max(1e-6,4*1.4826*mad);
    const clipped=pieces.filter((p,i)=>Math.abs(residuals[i]-middle)<=limit);
    if(clipped.length>=6) coeff=leastSquaresPlane(clipped)||coeff;
  }
  if(!coeff){
    const c=robustOffset(a,b,valid);
    return {offset:c,gradientX:0,gradientY:0,tiles:pieces.length,method:'scalar-fallback'};
  }
  return {offset:coeff[0],gradientX:coeff[1],gradientY:coeff[2],tiles:pieces.length,method:'robust-plane'};
}

export function buildComparison(a,b,{maxPixels=512*512}={}) {
  const spectral=checkSpectralPair(a,b);
  if(spectral.hardIncompatible)throw new Error('Comparacion bloqueada: '+spectral.reason);
  const sourceBitA=Object.entries(a.flagNames||{}).find(([,name])=>name==='SOURCE')?.[0];
  const sourceBitB=Object.entries(b.flagNames||{}).find(([,name])=>name==='SOURCE')?.[0];
  const maskA=buildQualityMask(a),maskB=buildQualityMask(b);
  const projected=reprojectToReference(a,b,maskA.mask,maskB.mask,{
    maxPixels,
    bSourceBit:sourceBitB==null?null:Number(sourceBitB)
  });
  const n=a.width*a.height;
  const valid=new Uint8Array(n),va=new Float32Array(n),fluxA=new Float32Array(n),fluxB=new Float32Array(n);
  fluxA.fill(NaN);fluxB.fill(NaN);
  const zodiReady=!!a.zodi && !!b.zodi;
  let validCount=0;
  for(let i=0;i<n;i++) {
    if(!maskA.mask[i] || !projected.mask[i]) continue;
    if(zodiReady && (!Number.isFinite(a.zodi[i]) || !Number.isFinite(projected.zodi[i]))) continue;
    valid[i]=1;validCount++;
    fluxA[i]=a.image[i]-(zodiReady?a.zodi[i]:0);
    fluxB[i]=projected.image[i]-(zodiReady?projected.zodi[i]:0);
    va[i]=a.variance?.[i]??NaN;
  }
  if(validCount < Math.min(32,Math.floor(n/10))) throw new Error('Solapamiento util insuficiente entre las dos imagenes');
  const bg=robustBackgroundPlane(fluxA,fluxB,valid,a.width,a.height,a.flags,sourceBitA==null?null:Number(sourceBitA),projected.sourceMask);
  if(!Number.isFinite(bg.offset)) throw new Error('No se pudo estimar fondo');
  const bPrepared=new Float32Array(n);bPrepared.fill(NaN);
  for(let i=0;i<n;i++) if(valid[i]){
    const x=i%a.width,y=Math.floor(i/a.width);
    const xx=2*x/(a.width-1)-1,yy=2*y/(a.height-1)-1;
    bPrepared[i]=fluxB[i]+bg.gradientX*xx+bg.gradientY*yy;
  }
  const sameHash=Boolean(a.meta?.sha256 && b.meta?.sha256 && a.meta.sha256===b.meta.sha256);
  const sameTime=Boolean(a.observationTime && b.observationTime && a.observationTime===b.observationTime);
  const isNegativeControl=Boolean((sameHash || sameTime) && a.width===b.width && a.height===b.height && Math.abs(bg.offset)<1e-6);
  const flagsReady=maskA.flagsAvailable && maskB.flagsAvailable &&
    maskA.flagDefinitionsAvailable && maskB.flagDefinitionsAvailable;
  const varianceReady=!!a.variance && !!b.variance;
  const notes=[
    'Reproyeccion WCS TAN-SIP; validar el error con astropy.wcs',
    'Varianza interpolada aproximada; se desconoce covarianza entre pixeles',
    zodiReady?'Se resto ZODI en copias temporales; su incertidumbre no esta incorporada':'ZODI ausente: fondo ajustado solamente con residuos espaciales',
    'La diferencia no basta para demostrar un nuevo objeto astronómico'
  ];
  if(isNegativeControl) notes.push('Control negativo detectado (épocas o archivos idénticos sin diferencia temporal)');
  return {a:fluxA,b:bPrepared,va,vb:projected.variance,valid,offset:bg.offset,
    spectral,flagsReady,varianceReady,validCount,width:a.width,height:a.height,
    background:{...bg,zodiApplied:zodiReady,model:zodiReady?'zodi-plus-residual':'no-zodi-plus-residual'},
    isNegativeControl,
    // Validacion final requiere mapas espectrales per pixel y ePSF: no se declaran descubrimientos.
    status:'exploratorio',
    notes
  };
}
