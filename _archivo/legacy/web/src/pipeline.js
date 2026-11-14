/** SKYO 2.1. Exploratory FITS comparison; never automatically claims discovery. */
import {buildQualityMask} from './fits.js';
import {reprojectToReference} from './wcs.js';

export function median(values) {
  const sorted=Array.from(values).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return NaN;
  const m=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;
}
export function robustOffset(a,b,valid,maxSamples=20000) {
  const n=valid.length,step=Math.max(1,Math.floor(n/maxSamples)), d=[];
  for(let i=0;i<n;i+=step) if(valid[i]&&Number.isFinite(a[i])&&Number.isFinite(b[i]))d.push(a[i]-b[i]);
  return median(d);
}

export function compareJavaScript(a,b,va,vb,valid,offset) {
  const n=a.length;
  if(b.length!==n||va.length!==n||vb.length!==n||valid.length!==n)throw Error('Arreglos incompatibles');
  const out=new Float32Array(n*2);out.fill(NaN);
  for(let i=0;i<n;i++){
    if(!valid[i]||!Number.isFinite(a[i])||!Number.isFinite(b[i]))continue;
    const d=a[i]-b[i]-offset;
    out[i]=d;
    if(Number.isFinite(va[i])&&va[i]>=0&&Number.isFinite(vb[i])&&vb[i]>=0){
      const total=va[i]+vb[i];
      if(total>0)out[n+i]=d/Math.sqrt(total);
    }
  }
  return out;
}

export function checkSpectralPair(fitsA,fitsB) {
  const a=fitsA.meta||{},b=fitsB.meta||{};
  if(!fitsA.detector||!fitsB.detector)return {verified:false,reason:'Detector no registrado'};
  if(fitsA.detector!==fitsB.detector)return {verified:false,hardIncompatible:true,reason:'Detectores diferentes'};
  const wa=Number(a.wavelength_um??fitsA.wavelengthUm);
  const wb=Number(b.wavelength_um??fitsB.wavelengthUm);
  const ba=Number(a.bandwidth_um??fitsA.bandwidthUm);
  const bb=Number(b.bandwidth_um??fitsB.bandwidthUm);
  if(![wa,wb,ba,bb].every(v=>Number.isFinite(v)&&v>0)){
    return {verified:false,reason:'Falta WCS-WAVE calibrado; solo exploratorio'};
  }
  const delta=Math.abs(wa-wb);
  if(delta>0.25*Math.min(ba,bb))return {verified:false,hardIncompatible:true,reason:'Longitudes de onda centrales incompatibles'};
  return {verified:true,reason:'Filtro preliminar por centro ROI; falta verificacion WCS-WAVE por pixel'};
}

function solve3x3(A,b) {
  const m=A.map((row,i)=>[...row,b[i]]);
  for(let i=0;i<3;i++){
    let pivot=i;
    for(let j=i+1;j<3;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;
    if(Math.abs(m[pivot][i])<1e-9)return null;
    [m[i],m[pivot]]=[m[pivot],m[i]];
    const v=m[i][i];for(let k=i;k<4;k++)m[i][k]/=v;
    for(let j=0;j<3;j++)if(j!==i){const f=m[j][i];for(let k=i;k<4;k++)m[j][k]-=f*m[i][k];}
  }
  return [m[0][3],m[1][3],m[2][3]];
}
function leastSquaresPlane(points){
  let n=0,sx=0,sy,sxx=0,sxy=0,syy=0,sz=0,sxz=0,syz=0;
  sy=0;
  for(const p of points){n++;sx+=p.x;sy+=p.y;sxx+=p.x*p.x;sxy+=p.x*p.y;syy+=p.y*p.y;sz+=p.z;sxz+=p.x*p.z;syz+=p.y*p.z;}
  return solve3x3([[n,sx,sy],[sx,sxx,sxy],[sy,sxy,syy]],[sz,sxz,syz]);
}
/** Robust background plane from cell medians; ignores sources when flagged in A. */
export function robustBackgroundPlane(a,b,valid,width,height,flags=null,sourceBit=null){
  const pieces=[];
  const grid=Math.min(8,Math.max(3,Math.floor(Math.min(width,height)/16)));
  const sourceMask=sourceBit==null?0:(1<<sourceBit)>>>0;
  for(let gy=0;gy<grid;gy++)for(let gx=0;gx<grid;gx++){
    const values=[];
    const xMin=Math.floor(gx*width/grid),xMax=Math.floor((gx+1)*width/grid);
    const yMin=Math.floor(gy*height/grid),yMax=Math.floor((gy+1)*height/grid);
    for(let y=yMin;y<yMax;y++)for(let x=xMin;x<xMax;x++){
      const i=y*width+x;
      if(!valid[i]||(flags&&sourceMask&&((flags[i]&sourceMask)!==0)))continue;
      const z=a[i]-b[i];if(Number.isFinite(z))values.push(z);
    }
    if(values.length>=Math.max(6,Math.floor((xMax-xMin)*(yMax-yMin)*.1))){
      pieces.push({x:2*((xMin+xMax-1)*.5)/(width-1)-1,
        y:2*((yMin+yMax-1)*.5)/(height-1)-1,z:median(values)});
    }
  }
  let coeff=pieces.length>=6?leastSquaresPlane(pieces):null;
  if(coeff&&pieces.length>=10){
    const residuals=pieces.map(p=>p.z-(coeff[0]+coeff[1]*p.x+coeff[2]*p.y));
    const middle=median(residuals),mad=median(residuals.map(v=>Math.abs(v-middle)));
    const limit=Math.max(1e-6,4*1.4826*mad);
    const clipped=pieces.filter((p,i)=>Math.abs(residuals[i]-middle)<=limit);
    if(clipped.length>=6)coeff=leastSquaresPlane(clipped)||coeff;
  }
  if(!coeff){
    const c=robustOffset(a,b,valid);
    return {offset:c,gradientX:0,gradientY:0,tiles:pieces.length,method:'scalar-fallback'};
  }
  return {offset:coeff[0],gradientX:coeff[1],gradientY:coeff[2],tiles:pieces.length,method:'robust-plane'};
}

/** Outputs A/B arrays prepared for the WASM numerical kernel; neither FITS is mutated. */
export function buildComparison(a,b,{maxPixels=512*512}={}) {
  const spectral=checkSpectralPair(a,b);
  if(spectral.hardIncompatible)throw Error('Comparacion bloqueada: '+spectral.reason);
  const maskA=buildQualityMask(a),maskB=buildQualityMask(b);
  const projected=reprojectToReference(a,b,maskA.mask,maskB.mask,{maxPixels});
  const n=a.width*a.height;
  const valid=new Uint8Array(n),va=new Float32Array(n),fluxA=new Float32Array(n),fluxB=new Float32Array(n);
  fluxA.fill(NaN);fluxB.fill(NaN);
  const zodiReady=!!a.zodi && !!b.zodi;
  let validCount=0;
  for(let i=0;i<n;i++){
    if(!maskA.mask[i]||!projected.mask[i])continue;
    if(zodiReady&&(!Number.isFinite(a.zodi[i])||!Number.isFinite(projected.zodi[i])))continue;
    valid[i]=1;validCount++;
    fluxA[i]=a.image[i]-(zodiReady?a.zodi[i]:0);
    fluxB[i]=projected.image[i]-(zodiReady?projected.zodi[i]:0);
    va[i]=a.variance?.[i]??NaN;
  }
  if(validCount<Math.min(32,Math.floor(n/10)))throw Error('Solapamiento util insuficiente');
  const sourceBit=Object.entries(a.flagNames||{}).find(([,name])=>name==='SOURCE')?.[0];
  const bg=robustBackgroundPlane(fluxA,fluxB,valid,a.width,a.height,a.flags,sourceBit==null?null:Number(sourceBit));
  if(!Number.isFinite(bg.offset))throw Error('No se pudo estimar fondo');
  const bPrepared=new Float32Array(n);bPrepared.fill(NaN);
  // Apply spatial gradient to B but keep the scalar intercept for WASM compare_flux.
  for(let i=0;i<n;i++)if(valid[i]){
    const x=i%a.width,y=Math.floor(i/a.width);
    const xx=2*x/(a.width-1)-1,yy=2*y/(a.height-1)-1;
    bPrepared[i]=fluxB[i]+bg.gradientX*xx+bg.gradientY*yy;
  }
  return {
    a:fluxA,b:bPrepared,va,vb:projected.variance,valid,offset:bg.offset,
    width:a.width,height:a.height,validCount,spectral,
    flagsReady:maskA.flagsAvailable&&maskB.flagsAvailable&&maskA.flagDefinitionsAvailable&&maskB.flagDefinitionsAvailable,
    varianceReady:!!a.variance&&!!b.variance,
    background:{...bg,zodiApplied:zodiReady,model:zodiReady?'zodi-plus-residual':'no-zodi-plus-residual'},
    status:'exploratorio',
    notes:[
      'Comparacion exploratoria, SIN validacion astrometrica contra datos NASA',
      'Varianza interpolada con pesos al cuadrado; correlaciones de remuestreo no modeladas',
      zodiReady?'Se resto ZODI de ambas epocas; su incertidumbre no esta incorporada':'ZODI ausente: fondo ajustado solamente con residuos espaciales',
      'No se ha calibrado PSF ni WCS-WAVE por pixel: no inferir descubrimientos'
    ]
  };
}
