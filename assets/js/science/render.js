/** Falso color unicamente de presentacion; nunca modifica la matriz cientifica. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sortedQuantile(sorted,count,p){
  const at=clamp(p,0,1)*(count-1);
  const i=Math.floor(at),t=at-i;
  return sorted[i]*(1-t)+sorted[Math.min(i+1,count-1)]*t;
}
export function percentile(values,p){
  const seq=values?.length!=null?values:Array.from(values||[]);
  if(!seq.length)return NaN;
  const buf=new Float64Array(seq.length);
  let count=0;
  for(let i=0;i<seq.length;i++){
    const v=seq[i];
    if(Number.isFinite(v))buf[count++]=v;
  }
  if(!count)return NaN;
  const sorted=count===seq.length?buf:buf.subarray(0,count);
  sorted.sort();
  return sortedQuantile(sorted,count,p);
}
function quantiles(data,valid){
  const stride=Math.max(1,Math.ceil(data.length/15000));
  const cap=Math.ceil(data.length/stride);
  const buf=new Float64Array(cap);
  let count=0;
  for(let i=0;i<data.length;i+=stride){
    const v=data[i];
    if((!valid||valid[i])&&Number.isFinite(v))buf[count++]=v;
  }
  if(!count)return [NaN,NaN];
  const sorted=count===cap?buf:buf.subarray(0,count);
  sorted.sort();
  return [sortedQuantile(sorted,count,.02),sortedQuantile(sorted,count,.995)];
}
export function imageRgba(data,width,height,valid=null,{kind='science'}={}) {
  if(data.length!==width*height)throw new Error('Tamanos incompatibles de render');
  const rgba=new Uint8ClampedArray(width*height*4);
  let [lo,hi]=quantiles(data,valid);
  if(kind==='difference'){
    const amplitude=Math.max(Math.abs(lo),Math.abs(hi),1e-9);
    lo=-amplitude;hi=amplitude;
  }
  const span=Math.max(1e-9,hi-lo);
  const invSpan=1/span;
  const invAsinh10=255/Math.asinh(10);
  const baseR=26,baseG=33,baseB=55;
  const dPosR=252-baseR,dPosG=181-baseG,dPosB=91-baseB;
  const dNegR=82-baseR,dNegG=202-baseG,dNegB=226-baseB;
  for(let i=0;i<data.length;i++) {
    const j=i*4;
    const val=data[i];
    if((valid&&!valid[i])||!Number.isFinite(val)){
      rgba[j]=12;rgba[j+1]=17;rgba[j+2]=34;rgba[j+3]=255;continue;
    }
    if(kind==='difference') {
      const v=clamp((val-lo)*invSpan,0,1);
      const z=(v-0.5)*2;
      const mag=Math.min(1,Math.abs(z));
      // colormap divergente: cian negativo, ambar positivo; centro oscuro.
      if(z>=0){
        rgba[j]=baseR+mag*dPosR;
        rgba[j+1]=baseG+mag*dPosG;
        rgba[j+2]=baseB+mag*dPosB;
      }else{
        rgba[j]=baseR+mag*dNegR;
        rgba[j+1]=baseG+mag*dNegG;
        rgba[j+2]=baseB+mag*dNegB;
      }
    }else{
      const t=clamp((val-lo)*invSpan,0,1);
      const g=Math.round(invAsinh10*Math.asinh(10*t));
      rgba[j]=g;rgba[j+1]=g;rgba[j+2]=g;
    }
    rgba[j+3]=255;
  }
  return rgba;
}
/** Invierte filas Y en memoria para origen FITS (0,0) inferior izquierdo sin canvas temporal. */
export function flipRgbaVertical(rgba,width,height){
  const flipped=new Uint8ClampedArray(width*height*4);
  if(rgba.byteOffset%4===0){
    const src32=new Uint32Array(rgba.buffer,rgba.byteOffset,width*height);
    const dst32=new Uint32Array(flipped.buffer);
    for(let y=0;y<height;y++){
      const srcRow=y*width;
      dst32.set(src32.subarray(srcRow,srcRow+width),(height-1-y)*width);
    }
  }else{
    const rowBytes=width*4;
    for(let y=0;y<height;y++){
      flipped.set(rgba.subarray(y*rowBytes,(y+1)*rowBytes),(height-1-y)*rowBytes);
    }
  }
  return flipped;
}
