/** Falso color unicamente de presentacion; nunca modifica la matriz cientifica. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function percentile(values,p){
  if(!values.length)return NaN;
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return NaN;
  const at=clamp(p,0,1)*(sorted.length-1);
  const i=Math.floor(at),t=at-i;
  return sorted[i]*(1-t)+sorted[Math.min(i+1,sorted.length-1)]*t;
}
function quantiles(data,valid){
  const sample=[];
  const stride=Math.max(1,Math.ceil(data.length/15000));
  for(let i=0;i<data.length;i+=stride){
    if((!valid||valid[i])&&Number.isFinite(data[i]))sample.push(data[i]);
  }
  return [percentile(sample,.02),percentile(sample,.995)];
}
export function imageRgba(data,width,height,valid=null,{kind='science',contrast=1}={}) {
  if(data.length!==width*height)throw new Error('Tamanos incompatibles de render');
  const rgba=new Uint8ClampedArray(width*height*4);
  let [lo,hi]=quantiles(data,valid);
  if(kind==='difference'){
    const amplitude=Math.max(Math.abs(lo),Math.abs(hi),1e-9);
    lo=-amplitude;hi=amplitude;
  }
  const span=Math.max(1e-9,hi-lo);
  for(let i=0;i<data.length;i++) {
    const j=i*4;
    if((valid&&!valid[i])||!Number.isFinite(data[i])){
      rgba[j]=7;rgba[j+1]=7;rgba[j+2]=10;rgba[j+3]=255;continue;
    }
    if(kind==='difference') {
      const v=clamp((data[i]-lo)/span,0,1);
      const z=(v-0.5)*2;
      const mag=Math.min(1,Math.abs(z));
      // colormap divergente de campaña: Sky Blue negativo, Laser Crimson positivo; centro obsidiana.
      const base=[18,19,24],pos=[255,92,122],neg=[124,200,255];
      const color=z>=0?pos:neg;
      for(let k=0;k<3;k++)rgba[j+k]=base[k]+mag*(color[k]-base[k]);
    }else{
      const t=clamp((data[i]-lo)/span,0,1)**(1/contrast);
      const g=Math.round(255*Math.asinh(10*t)/Math.asinh(10));
      rgba[j]=g;rgba[j+1]=g;rgba[j+2]=g;
    }
    rgba[j+3]=255;
  }
  return rgba;
}
